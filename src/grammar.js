import parsimmon from 'parsimmon';

export function operatorParser(...operators) {
  // TODO: also accept parsimmon parsers (test with Parsimmon.isParser()),
  // regexes (test how?)
  const individualParsers = operators.map((operator) =>
    parsimmon.string(operator)
  );
  return parsimmon.alt(...individualParsers);
}

export class Parser {
  constructor({
    operators = [':', '>', '>=', '=', '<=', '<'],
    conjunctionMsg = ({ left, right }) => `${left} and ${right}`,
    disjunctionMsg = ({ left, right }) => `${left} or ${right}`,
  } = {}) {
    this.conjunctionMsg = conjunctionMsg;
    this.disjunctionMsg = disjunctionMsg;
    this.language = parsimmon.createLanguage({
      operator: () => operatorParser(...operators),
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
      query: (l) => l.expression,
    });
  }

  parse(input) {
    return this.language.query.parse(input);
  }
}
