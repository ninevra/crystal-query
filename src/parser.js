import parsimmon from 'parsimmon';

const {
  seq,
  seqObj,
  alt,
  any,
  string,
  regexp,
  noneOf,
  optWhitespace,
  succeed
} = parsimmon;

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

function balanceParens(string) {
  let missingLeft = 0;
  let missingRight = 0;
  for (const char of string) {
    if (char === ')') {
      if (missingRight > 0) {
        missingRight--;
      } else {
        missingLeft++;
      }
    } else if (char === '(') {
      missingRight++;
    }
  }

  return '('.repeat(missingLeft) + string + ')'.repeat(missingRight);
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
      escaped: () => string('\\').then(any),
      string: (l) =>
        alt(l.escaped, noneOf('"')).many().tie().trim(string('"')).thru(mark),
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
    return this.language.query.parse(balanceParens(input));
  }
}
