import parsimmon from 'parsimmon';

function node(name) {
  return (parser) =>
    parsimmon
      .seq(parsimmon.index, parser, parsimmon.index)
      .map(([start, value, end]) => ({ start, end, name, ...value }));
}

export class Parser {
  constructor() {
    this.language = parsimmon.createLanguage({
      operator: () =>
        parsimmon.alt(
          ...[':', '>=', '<=', '<', '=', '>'].map((operator) =>
            parsimmon.string(operator)
          )
        ),
      and: (l) => l.word.assert((word) => word === 'and', 'and'),
      or: (l) => l.word.assert((word) => word === 'or', 'or'),
      not: (l) => l.word.assert((word) => word === 'not', 'not'),
      keyword: (l) => parsimmon.alt(l.and, l.or, l.not),
      lparen: () => parsimmon.string('('),
      rparen: () => parsimmon.string(')'),
      wordTerminator: (l) =>
        parsimmon.alt(
          l.lparen,
          l.rparen,
          l.quote,
          l.operator,
          parsimmon.whitespace
        ),
      word: (l) =>
        parsimmon
          .notFollowedBy(l.wordTerminator)
          .then(parsimmon.any)
          .atLeast(1)
          .tie(),
      identifier: (l) =>
        l.word.assert((word) => !l.keyword.parse(word).status, 'an identifier'),
      escaped: () => parsimmon.string('\\').then(parsimmon.any),
      phrase: (l) =>
        parsimmon.alt(l.escaped, parsimmon.noneOf('"')).many().tie(),
      quote: () => parsimmon.string('"'),
      quoted: (l) => l.phrase.wrap(l.quote, l.quote.desc('closing "')),
      value: (l) => parsimmon.alt(l.identifier, l.quoted),
      term: (l) =>
        parsimmon
          .alt(
            parsimmon.seq(l.identifier, l.operator, l.value),
            parsimmon.seq(l.identifier, l.operator, parsimmon.of(undefined)),
            parsimmon.seq(parsimmon.of(undefined), l.operator, l.value),
            parsimmon.seq(
              parsimmon.of(undefined),
              parsimmon.of(undefined),
              l.value
            ),
            parsimmon.seq(
              parsimmon.of(undefined),
              l.operator,
              parsimmon.of(undefined)
            )
          )
          .map(([field, operator, value]) => ({
            field,
            operator,
            value
          }))
          .thru(node('Term')),
      nil: () =>
        parsimmon.optWhitespace
          .result({ field: undefined, operator: undefined, value: undefined })
          .thru(node('Term')),
      parenthetical: (l) =>
        l.expression
          .wrap(l.lparen, l.rparen.desc('closing )'))
          .map((expression) => ({
            expression
          }))
          .thru(node('Parenthetical')),
      basic: (l) => parsimmon.alt(l.term, l.parenthetical),
      negation: (l) =>
        parsimmon.alt(
          l.not
            .then(parsimmon.optWhitespace.then(l.negation).or(l.nil))
            .map((expression) => ({
              expression
            }))
            .thru(node('Not')),
          l.basic
        ),
      conjunction: (l) =>
        parsimmon.alt(
          parsimmon
            .seq(
              l.negation.or(l.nil).skip(parsimmon.optWhitespace).skip(l.and),
              parsimmon.optWhitespace.then(l.conjunction).or(l.nil)
            )
            .map(([left, right]) => ({
              left,
              right
            }))
            .thru(node('And')),
          parsimmon
            .seq(l.negation.skip(parsimmon.optWhitespace), l.conjunction)
            .map(([left, right]) => ({
              left,
              right
            }))
            .thru(node('And')),
          l.negation
        ),
      disjunction: (l) =>
        parsimmon.alt(
          parsimmon
            .seq(
              l.conjunction.or(l.nil).skip(parsimmon.optWhitespace).skip(l.or),
              parsimmon.optWhitespace.then(l.disjunction).or(l.nil)
            )
            .map(([left, right]) => ({
              left,
              right
            }))
            .thru(node('Or')),
          l.conjunction
        ),
      expression: (l) =>
        parsimmon.alt(l.disjunction.trim(parsimmon.optWhitespace), l.nil),
      query: (l) => l.expression
    });
  }

  parse(input) {
    return this.language.query.parse(input);
  }
}
