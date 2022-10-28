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
      value: (l) => alt(l.string, l.identifier),
      nothing: () => succeed(undefined),
      term: (l) =>
        alt(
          seq(l.field, l.operator, l.value),
          seq(l.nothing, l.operator, l.value),
          seq(l.field, l.operator, l.nothing),
          seq(l.nothing, l.operator, l.nothing),
          seq(l.nothing, l.nothing, l.value)
        )
          .map(([field, operator, value]) => ({ field, operator, value }))
          .thru(node('Term')),
      nil: () =>
        succeed({
          field: undefined,
          operator: undefined,
          value: undefined
        }).thru(node('Term')),
      parenthetical: (l) =>
        seqObj(
          string('('),
          optWhitespace,
          ['expression', l.optExpression],
          optWhitespace,
          string(')')
        ).thru(node('Parenthetical')),
      basic: (l) => alt(l.term, l.parenthetical),
      negation: (l) =>
        alt(
          seqObj(l.not, optWhitespace, ['expression', l.optNegation]).thru(
            node('Not')
          ),
          l.basic
        ),
      optNegation: (l) => alt(l.negation, l.nil),
      conjunction: (l) =>
        alt(
          seqObj(['left', l.optNegation], optWhitespace, l.and, optWhitespace, [
            'right',
            l.optConjunction
          ]).thru(node('And')),
          seqObj(['left', l.negation], optWhitespace, [
            'right',
            l.conjunction
          ]).thru(node('And')),
          l.negation
        ),
      optConjunction: (l) => alt(l.conjunction, l.nil),
      disjunction: (l) =>
        alt(
          seqObj(
            ['left', l.optConjunction],
            optWhitespace,
            l.or,
            optWhitespace,
            ['right', l.optDisjunction]
          ).thru(node('Or')),
          l.conjunction
        ),
      optDisjunction: (l) => alt(l.disjunction, l.nil),
      expression: (l) => l.disjunction,
      optExpression: (l) => alt(l.expression, l.nil),
      query: (l) => l.optExpression.trim(optWhitespace)
    });
  }

  parse(input) {
    return this.language.query.parse(input);
  }
}
