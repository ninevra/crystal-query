import parsimmon from 'parsimmon';

const { seq, seqObj, alt, any, string, regexp, optWhitespace, succeed } =
  parsimmon;

function node(name) {
  return (parser) =>
    parser.thru(mark).map(({ value, ...rest }) => ({
      ...value,
      ...rest,
      name
    }));
}

function mark(parser) {
  return parser.mark().map(({ value, start, end }) => ({
    value,
    start: start.offset,
    end: end.offset
  }));
}

/* eslint-disable no-unused-vars */
function collapseBinary(node) {
  if (node.left === undefined) {
    return node.right;
  }

  if (node.right === undefined) {
    return node.left;
  }

  return node;
}

function collapseUnary(node) {
  if (node.expression === undefined) {
    return node.expression;
  }

  return node;
}

function collapseTerm(term) {
  if ((term.field ?? term.operator ?? term.value) === undefined) {
    return undefined;
  }

  return term;
}
/* eslint-enable no-unused-vars */

function missingParens(string) {
  let left = 0;
  let right = 0;
  let state = 'default';
  for (const char of string) {
    if (state === 'escape') {
      state = 'string';
    } else if (state === 'string') {
      if (char === '"') {
        state = 'default';
      } else if (char === '\\') {
        state = 'escape';
      }
    } else {
      switch (char) {
        case '"':
          state = 'string';
          break;
        case ')':
          if (right > 0) {
            right--;
          } else {
            left++;
          }

          break;
        case '(':
          right++;
          break;
        // No default
      }
    }
  }

  return { left, right };
}

function balance(string, left, right) {
  return '('.repeat(left) + string + ')'.repeat(right);
}

function trimCst(cst, prefixLength, inputLength) {
  if (cst === undefined) {
    return undefined;
  }

  if (cst.end <= prefixLength) {
    // Node exists wholely in the prefix
    return undefined;
  }

  cst.start = Math.max(0, cst.start - prefixLength);
  cst.end -= prefixLength;

  if (cst.start >= inputLength) {
    // Node exists wholely in the suffix
    return undefined;
  }

  cst.end = Math.min(inputLength, cst.end);

  for (const key of Object.getOwnPropertyNames(cst)) {
    if (typeof cst[key] === 'object' && cst[key] !== undefined) {
      cst[key] = trimCst(cst[key], prefixLength, inputLength);
    }
  }

  return cst;
}

export class Parser {
  constructor() {
    this.language = parsimmon.createLanguage({
      operator: () =>
        alt(string(':'), regexp(/[<>]=/), regexp(/[<>=]/)).thru(mark),
      and: (l) => l.word.assert((word) => word === 'and').thru(mark),
      or: (l) => l.word.assert((word) => word === 'or').thru(mark),
      not: (l) => l.word.assert((word) => word === 'not').thru(mark),
      keyword: (l) => alt(l.and, l.or, l.not),
      escaped: () =>
        seq(string('\\'), any).map(([slash, char]) => ({
          raw: slash + char,
          value: char
        })),
      unescaped: () => regexp(/[^"]+/).map((value) => ({ raw: value, value })),
      stringContent: (l) =>
        alt(l.escaped, l.unescaped)
          .many()
          .map((parts) => ({
            raw: parts.map(({ raw }) => raw).join(','),
            value: parts.map(({ value }) => value).join(',')
          })),
      string: (l) =>
        seqObj(
          ['open', string('"').thru(mark)],
          ['content', l.stringContent],
          ['close', string('"').thru(mark)]
        )
          .map(({ content, ...rest }) => ({ ...rest, ...content }))
          .thru(node('String')),
      word: () => regexp(/[^:<>="()\s]+/),
      identifier: (l) =>
        l.word.assert((word) => !l.keyword.parse(word).status).thru(mark),
      field: (l) => l.identifier,
      simpleValue: (l) => alt(l.string, l.identifier),
      nothing: () => succeed(undefined),
      lparen: () => string('(').thru(mark),
      rparen: () => string(')').thru(mark),
      valueParen: (l) =>
        seqObj(
          ['lparen', l.lparen],
          optWhitespace,
          ['expression', l.valueExpr],
          optWhitespace,
          ['rparen', l.rparen]
        ).thru(node('Parenthetical')),
      valueBasic: (l) => alt(l.valueParen, l.simpleValue),
      valueNot: (l) =>
        alt(
          seqObj(['not', l.not], optWhitespace, [
            'expression',
            alt(l.valueNot, l.nothing)
          ]).thru(node('Not')),
          l.valueBasic
        ),
      valueAnd: (l) =>
        alt(
          seqObj(
            ['left', alt(l.valueNot, l.nothing)],
            optWhitespace,
            ['and', l.and],
            optWhitespace,
            ['right', alt(l.valueAnd, l.nothing)]
          ).thru(node('And')),
          seqObj(['left', l.valueNot], optWhitespace, [
            'right',
            l.valueAnd
          ]).thru(node('And')),
          l.valueNot
        ),
      valueOr: (l) =>
        alt(
          seqObj(
            ['left', alt(l.valueAnd, l.nothing)],
            optWhitespace,
            ['or', l.or],
            optWhitespace,
            ['right', alt(l.valueOr, l.nothing)]
          ).thru(node('Or')),
          l.valueAnd
        ),
      valueExpr: (l) => l.valueOr,
      term: (l) =>
        alt(
          seq(l.field, l.operator, l.valueBasic),
          seq(l.nothing, l.operator, l.valueBasic),
          seq(l.field, l.operator, l.nothing),
          seq(l.nothing, l.operator, l.nothing),
          seq(l.nothing, l.nothing, l.valueBasic)
        )
          .map(([field, operator, value]) => ({ field, operator, value }))
          .thru(node('Term')),
      parenthetical: (l) =>
        seqObj(
          ['lparen', l.lparen],
          optWhitespace,
          ['expression', l.optExpression],
          optWhitespace,
          ['rparen', l.rparen]
        ).thru(node('Parenthetical')),
      basic: (l) => alt(l.term, l.parenthetical),
      negation: (l) =>
        alt(
          seqObj(['not', l.not], optWhitespace, [
            'expression',
            l.optNegation
          ]).thru(node('Not')),
          l.basic
        ),
      optNegation: (l) => alt(l.negation, l.nothing),
      conjunction: (l) =>
        alt(
          seqObj(
            ['left', l.optNegation],
            optWhitespace,
            ['and', l.and],
            optWhitespace,
            ['right', l.optConjunction]
          ).thru(node('And')),
          seqObj(['left', l.negation], optWhitespace, [
            'right',
            l.conjunction
          ]).thru(node('And')),
          l.negation
        ),
      optConjunction: (l) => alt(l.conjunction, l.nothing),
      disjunction: (l) =>
        alt(
          seqObj(
            ['left', l.optConjunction],
            optWhitespace,
            ['or', l.or],
            optWhitespace,
            ['right', l.optDisjunction]
          ).thru(node('Or')),
          l.conjunction
        ),
      optDisjunction: (l) => alt(l.disjunction, l.nothing),
      expression: (l) => l.disjunction,
      optExpression: (l) => alt(l.expression, l.nothing),
      query: (l) => l.optExpression.trim(optWhitespace)
    });
  }

  parse(input) {
    const { left, right } = missingParens(input);
    const balanced = balance(input, left, right);
    const result = this.language.query.parse(balanced);
    if (result.status) {
      result.value = trimCst(result.value, left, input.length);
    }

    return result;
  }
}
