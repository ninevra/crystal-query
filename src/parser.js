import parsimmon from 'parsimmon';

export function makeParser(value) {
  // TODO: also accept parsimmon parsers (test with Parsimmon.isParser()),
  // regexes (test how?)
  return parsimmon.string(value);
}

export class Parser {
  constructor({ operators = [':', '>=', '<=', '<', '=', '>'] } = {}) {
    this.language = parsimmon.createLanguage({
      operator: () => parsimmon.alt(...operators.map(makeParser)),
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
      phrase: () =>
        parsimmon
          .alt(parsimmon.string('\\"').result('"'), parsimmon.noneOf('"'))
          .many()
          .tie(),
      quote: () => parsimmon.string('"'),
      quoted: (l) => l.phrase.trim(l.quote),
      value: (l) => parsimmon.alt(l.identifier, l.quoted),
      term: (l) =>
        parsimmon
          .alt(
            parsimmon.seq(l.identifier.atMost(1).tie(), l.operator, l.value),
            l.value.map((value) => ['', '', value])
          )
          .node('Term'),
      parenthetical: (l) =>
        l.expression.wrap(l.lparen, l.rparen).node('Parenthetical'),
      basic: (l) => parsimmon.alt(l.term, l.parenthetical),
      negation: (l) =>
        parsimmon.alt(
          l.not.skip(parsimmon.optWhitespace).then(l.negation).node('Not'),
          l.basic
        ),
      conjunction: (l) =>
        parsimmon.alt(
          parsimmon
            .seq(
              l.negation.skip(l.and.trim(parsimmon.optWhitespace)),
              l.conjunction
            )
            .node('And'),
          l.negation
        ),
      disjunction: (l) =>
        parsimmon.alt(
          parsimmon
            .seq(
              l.conjunction.skip(l.or.trim(parsimmon.optWhitespace)),
              l.disjunction
            )
            .node('Or'),
          l.conjunction
        ),
      list: (l) =>
        parsimmon.alt(
          parsimmon
            .seq(l.disjunction.skip(parsimmon.optWhitespace), l.list)
            .node('And'),
          l.disjunction
        ),
      expression: (l) =>
        parsimmon.alt(l.list, parsimmon.optWhitespace.node('Nil')),
      query: (l) => l.expression
    });
  }

  parse(input) {
    return this.language.query.parse(input);
  }
}
