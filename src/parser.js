import parsimmon from 'parsimmon';

const { seq, seqObj, alt, any, string, regexp, optWhitespace, succeed } =
  parsimmon;

const _ = optWhitespace.thru(mark);

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

function missingDelimiters(string) {
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

  const escape = state === 'escape';
  const quote = escape || state === 'string';

  return { left, right, escape, quote };
}

function repairDelimiters(string, { left, right, escape, quote }) {
  const prefix = '('.repeat(left);
  const suffix = (escape ? '\\' : '') + (quote ? '"' : '') + ')'.repeat(right);
  const balanced = prefix + string + suffix;
  return { prefix, suffix, balanced };
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

  if (cst.children) {
    cst.children = cst.children.map((node) =>
      trimCst(node, prefixLength, inputLength)
    );

    if (cst.name === 'And') {
      cst.left = cst.children[0];
      cst.and = cst.children[2];
      cst.right = cst.children[4];
    }
  } else {
    for (const key of Object.getOwnPropertyNames(cst)) {
      if (typeof cst[key] === 'object' && cst[key] !== undefined) {
        cst[key] = trimCst(cst[key], prefixLength, inputLength);
      }
    }
  }

  return cst;
}

function nodeAnd(parser) {
  return parser.mark().map(({ start, end, value }) => ({
    start: start.offset,
    end: end.offset,
    name: 'And',
    children: value,
    left: value[0],
    and: value[2],
    right: value[4]
  }));
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
        seqObj(['lparen', l.lparen], _, ['expression', l.valueExpr], _, [
          'rparen',
          l.rparen
        ]).thru(node('Parenthetical')),
      valueBasic: (l) => alt(l.valueParen, l.simpleValue),
      valueNot: (l) =>
        alt(
          seqObj(['not', l.not], _, [
            'expression',
            alt(l.valueNot, l.nothing)
          ]).thru(node('Not')),
          l.valueBasic
        ),
      valueAnd: (l) =>
        alt(
          seq(
            alt(l.valueNot, l.nothing),
            _,
            l.and,
            _,
            alt(l.valueAnd, l.nothing)
          ).thru(nodeAnd),
          seq(l.valueNot, _, l.nothing, _, l.valueAnd).thru(nodeAnd),
          l.valueNot
        ),
      valueOr: (l) =>
        alt(
          seqObj(['left', alt(l.valueAnd, l.nothing)], _, ['or', l.or], _, [
            'right',
            alt(l.valueOr, l.nothing)
          ]).thru(node('Or')),
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
        seqObj(['lparen', l.lparen], _, ['expression', l.optExpression], _, [
          'rparen',
          l.rparen
        ]).thru(node('Parenthetical')),
      basic: (l) => alt(l.term, l.parenthetical),
      negation: (l) =>
        alt(
          seqObj(['not', l.not], _, ['expression', l.optNegation]).thru(
            node('Not')
          ),
          l.basic
        ),
      optNegation: (l) => alt(l.negation, l.nothing),
      conjunction: (l) =>
        alt(
          seq(l.optNegation, _, l.and, _, l.optConjunction).thru(nodeAnd),
          seq(l.negation, _, l.nothing, _, l.conjunction).thru(nodeAnd),
          l.negation
        ),
      optConjunction: (l) => alt(l.conjunction, l.nothing),
      disjunction: (l) =>
        alt(
          seqObj(['left', l.optConjunction], _, ['or', l.or], _, [
            'right',
            l.optDisjunction
          ]).thru(node('Or')),
          l.conjunction
        ),
      optDisjunction: (l) => alt(l.disjunction, l.nothing),
      expression: (l) => l.disjunction,
      optExpression: (l) => alt(l.expression, l.nothing),
      query: (l) => l.optExpression.trim(_)
    });
  }

  parse(input) {
    const missing = missingDelimiters(input);
    const { balanced, prefix } = repairDelimiters(input, missing);
    const result = this.language.query.parse(balanced);
    if (result.status) {
      result.value = trimCst(result.value, prefix.length, input.length);
    }

    return result;
  }
}
