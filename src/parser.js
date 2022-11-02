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
    parser.node(name).map(({ value, ...rest }) => ({ ...rest, ...value }));
}

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

export class Parser {
  constructor() {
    this.language = parsimmon.createLanguage({
      operator: () => alt(string(':'), regexp(/[<>]=/), regexp(/[<>=]/)),
      and: (l) => l.word.assert((word) => word === 'and'),
      or: (l) => l.word.assert((word) => word === 'or'),
      not: (l) => l.word.assert((word) => word === 'not'),
      keyword: (l) => alt(l.and, l.or, l.not),
      escaped: () => string('\\').then(any),
      string: (l) => alt(l.escaped, noneOf('"')).many().tie().trim(string('"')),
      word: () => regexp(/[^:<>="()\s]+/),
      identifier: (l) => l.word.assert((word) => !l.keyword.parse(word).status),
      field: (l) => l.identifier,
      simpleValue: (l) => alt(l.string, l.identifier),
      nothing: () => succeed(undefined),
      valueParen: (l) =>
        seqObj(
          string('('),
          optWhitespace,
          ['expression', l.valueExpr],
          optWhitespace,
          string(')')
        )
          .thru(node('Parenthetical'))
          .map((node) => collapseUnary(node)),
      valueBasic: (l) => alt(l.valueParen, l.simpleValue),
      valueNot: (l) =>
        alt(
          seqObj(l.not, optWhitespace, [
            'expression',
            alt(l.valueNot, l.nothing)
          ])
            .thru(node('Not'))
            .map((node) => collapseUnary(node)),
          l.valueBasic
        ),
      valueAnd: (l) =>
        alt(
          seqObj(
            ['left', alt(l.valueNot, l.nothing)],
            optWhitespace,
            l.and,
            optWhitespace,
            ['right', alt(l.valueAnd, l.nothing)]
          )
            .thru(node('And'))
            .map((node) => collapseBinary(node)),
          seqObj(['left', l.valueNot], optWhitespace, ['right', l.valueAnd])
            .thru(node('And'))
            .map((node) => collapseBinary(node)),
          l.valueNot
        ),
      valueOr: (l) =>
        alt(
          seqObj(
            ['left', alt(l.valueAnd, l.nothing)],
            optWhitespace,
            l.or,
            optWhitespace,
            ['right', alt(l.valueOr, l.nothing)]
          )
            .thru(node('Or'))
            .map((node) => collapseBinary(node)),
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
          .thru(node('Term'))
          .map((node) => collapseTerm(node)),
      parenthetical: (l) =>
        seqObj(
          string('('),
          optWhitespace,
          ['expression', l.optExpression],
          optWhitespace,
          string(')')
        )
          .thru(node('Parenthetical'))
          .map((node) => collapseUnary(node)),
      basic: (l) => alt(l.term, l.parenthetical),
      negation: (l) =>
        alt(
          seqObj(l.not, optWhitespace, ['expression', l.optNegation])
            .thru(node('Not'))
            .map((node) => collapseUnary(node)),
          l.basic
        ),
      optNegation: (l) => alt(l.negation, l.nothing),
      conjunction: (l) =>
        alt(
          seqObj(['left', l.optNegation], optWhitespace, l.and, optWhitespace, [
            'right',
            l.optConjunction
          ])
            .thru(node('And'))
            .map((node) => collapseBinary(node)),
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
            l.or,
            optWhitespace,
            ['right', l.optDisjunction]
          )
            .thru(node('Or'))
            .map((node) => collapseBinary(node)),
          l.conjunction
        ),
      optDisjunction: (l) => alt(l.disjunction, l.nothing),
      expression: (l) => l.disjunction,
      optExpression: (l) => alt(l.expression, l.nothing),
      query: (l) => l.optExpression.trim(optWhitespace)
    });
  }

  parse(input) {
    return this.language.query.parse(input);
  }
}
