import parsimmon from 'parsimmon';

import { And, Group, Or, Not, Literal, Term, Text, Word } from './nodes.js';

import { repairDelimiters, missingDelimiters, trimCst } from './delimiters.js';

const { seq, alt, any, string, regexp, optWhitespace, succeed } = parsimmon;

const _ = optWhitespace.thru(leaf(Literal));

function branch(Type) {
  return (parser) =>
    parser
      .thru(mark)
      .map(({ value, ...rest }) => new Type({ children: value, ...rest }));
}

function leaf(Type) {
  return (parser) => parser.thru(mark).map((node) => new Type(node));
}

function mark(parser) {
  return parser.mark().map(({ value, start, end }) => ({
    value,
    start: start.offset,
    end: end.offset
  }));
}

export function isNonEmpty(node) {
  return (
    node?.name === 'Word' ||
    node?.name === 'Text' ||
    (node?.children?.some((child) => isNonEmpty(child)) ?? false)
  );
}

export const language = parsimmon.createLanguage({
  operator: () =>
    alt(string(':'), regexp(/[<>]=/), regexp(/[<>=]/)).thru(leaf(Literal)),
  and: (l) => l.word.assert((word) => word === 'and').thru(leaf(Literal)),
  or: (l) => l.word.assert((word) => word === 'or').thru(leaf(Literal)),
  not: (l) => l.word.assert((word) => word === 'not').thru(leaf(Literal)),
  keyword: (l) => alt(l.and, l.or, l.not),
  escaped: () =>
    seq(string('\\'), any).map(([slash, char]) => ({
      raw: slash + char,
      value: char
    })),
  unescaped: () => regexp(/[^\\"]+/).map((value) => ({ raw: value, value })),
  stringContent: (l) =>
    alt(l.escaped, l.unescaped)
      .many()
      .map((parts) => ({
        raw: parts.map(({ raw }) => raw).join(''),
        value: parts.map(({ value }) => value).join('')
      }))
      .thru(mark)
      .map(({ value, ...rest }) => new Literal({ ...value, ...rest })),
  quote: () => string('"').thru(leaf(Literal)),
  string: (l) => seq(l.quote, l.stringContent, l.quote).thru(branch(Text)),
  word: () => regexp(/[^:<>="()\s]+/),
  identifier: (l) =>
    l.word.assert((word) => !l.keyword.parse(word).status).thru(leaf(Word)),
  simpleValue: (l) => alt(l.string, l.identifier),
  nothing: () => succeed(undefined),
  lparen: () => string('(').thru(leaf(Literal)),
  rparen: () => string(')').thru(leaf(Literal)),
  valueParen: (l) =>
    seq(l.lparen, _, l.optValueExpr, _, l.rparen).thru(branch(Group)),
  valueBasic: (l) => alt(l.valueParen, l.simpleValue),
  optValueBasic: (l) => alt(l.valueBasic, l.nothing),
  nonEmptyValueBasic: (l) => l.valueBasic.assert((node) => isNonEmpty(node)),
  valueNot: (l) =>
    alt(seq(l.not, _, l.optValueNot).thru(branch(Not)), l.valueBasic),
  optValueNot: (l) => alt(l.valueNot, l.nothing),
  valueAnd: (l) =>
    alt(
      seq(l.optValueNot, _, l.and, _, l.optValueAnd).thru(branch(And)),
      seq(l.valueNot, _, l.nothing, _, l.valueAnd).thru(branch(And)),
      l.valueNot
    ),
  optValueAnd: (l) => alt(l.valueAnd, l.nothing),
  valueOr: (l) =>
    alt(
      seq(l.optValueAnd, _, l.or, _, l.optValueOr).thru(branch(Or)),
      l.valueAnd
    ),
  optValueOr: (l) => alt(l.valueOr, l.nothing),
  valueExpr: (l) => l.valueOr,
  optValueExpr: (l) => alt(l.valueExpr, l.nothing),
  term: (l) =>
    alt(
      seq(l.optValueBasic, _, l.operator, _, l.optValueBasic),
      seq(l.nothing, _, l.nothing, _, l.nonEmptyValueBasic)
    ).thru(branch(Term)),
  parenthetical: (l) =>
    seq(l.lparen, _, l.optExpression, _, l.rparen).thru(branch(Group)),
  basic: (l) => alt(l.term, l.parenthetical),
  negation: (l) => alt(seq(l.not, _, l.optNegation).thru(branch(Not)), l.basic),
  optNegation: (l) => alt(l.negation, l.nothing),
  conjunction: (l) =>
    alt(
      seq(l.optNegation, _, l.and, _, l.optConjunction).thru(branch(And)),
      seq(l.negation, _, l.nothing, _, l.conjunction).thru(branch(And)),
      l.negation
    ),
  optConjunction: (l) => alt(l.conjunction, l.nothing),
  disjunction: (l) =>
    alt(
      seq(l.optConjunction, _, l.or, _, l.optDisjunction).thru(branch(Or)),
      l.conjunction
    ),
  optDisjunction: (l) => alt(l.disjunction, l.nothing),
  expression: (l) => l.disjunction,
  optExpression: (l) => alt(l.expression, l.nothing),
  query: (l) => l.optExpression.trim(_)
});

export class Parser {
  #repairDelimiters;

  constructor({ repairDelimiters = true } = {}) {
    this.#repairDelimiters = repairDelimiters;
  }

  parse(input) {
    if (this.#repairDelimiters) {
      const missing = missingDelimiters(input);
      const { balanced, prefix } = repairDelimiters(input, missing);
      const result = language.query.parse(balanced);
      if (result.status) {
        result.value = trimCst(result.value, prefix.length, input.length);
      }

      return result;
    }

    return language.query.parse(input);
  }
}
