import parsimmon from 'parsimmon';

import { And, Group, Or, Not, Literal, Term, Text, Word } from './nodes.js';

import { repairDelimiters, missingDelimiters, trimCst } from './delimiters.js';

const { seq, alt, any, string, regexp, whitespace, succeed } = parsimmon;

const nothing = succeed(undefined);

function opt(parser) {
  return alt(parser, nothing);
}

const _ = opt(whitespace.thru(leaf(Literal)));

const index = parsimmon.index.map(({ offset }) => offset);

function branch(Type) {
  return (parser) =>
    parser
      .thru(mark)
      .map(({ value, ...rest }) => new Type({ children: value, ...rest }));
}

function branchTail(Type) {
  return (parser) =>
    parser.thru(mark).map(({ value: [head, tail], start, end }) => {
      if (tail === undefined) {
        return head;
      }

      return new Type({ children: [head, ...tail], start, end });
    });
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
  lparen: () => string('(').thru(leaf(Literal)),
  rparen: () => string(')').thru(leaf(Literal)),
  valueParen: (l) =>
    seq(l.lparen, _, opt(l.valueExpr), _, l.rparen).thru(branch(Group)),
  valueBasic: (l) => alt(l.valueParen, l.simpleValue),
  valueNot: (l) =>
    alt(seq(l.not, _, opt(l.valueNot)).thru(branch(Not)), l.valueBasic),
  valueAnd: (l) =>
    alt(
      seq(nothing, _, l.and, _, opt(l.valueAnd)).thru(branch(And)),
      seq(
        l.valueNot,
        alt(
          seq(_, l.and, _, opt(l.valueAnd)),
          seq(_, nothing, _, l.valueAnd),
          nothing
        )
      ).thru(branchTail(And))
    ),
  valueOr: (l) =>
    alt(
      seq(nothing, _, l.or, opt(l.valueOr)).thru(branch(Or)),
      seq(l.valueAnd, opt(seq(_, l.or, _, opt(l.valueOr)))).thru(branchTail(Or))
    ),
  valueExpr: (l) => l.valueOr,
  term: (l) =>
    alt(
      seq(nothing, _, l.operator, _, opt(l.valueBasic)).thru(branch(Term)),
      seq(
        index,
        l.valueBasic,
        opt(seq(_, l.operator, _, opt(l.valueBasic))),
        index
      )
        .assert(([, head, rest]) => rest !== undefined || isNonEmpty(head))
        .map(([start, head, rest, end]) => {
          if (rest === undefined) {
            return new Term({ value: head, start, end });
          }

          return new Term({ children: [head, ...rest], start, end });
        })
    ),
  parenthetical: (l) =>
    seq(l.lparen, _, opt(l.expression), _, l.rparen).thru(branch(Group)),
  basic: (l) => alt(l.term, l.parenthetical),
  negation: (l) =>
    alt(seq(l.not, _, opt(l.negation)).thru(branch(Not)), l.basic),
  optNegation: (l) => alt(l.negation, nothing),
  conjunction: (l) =>
    alt(
      seq(nothing, _, l.and, _, opt(l.conjunction)).thru(branch(And)),
      seq(
        l.negation,
        alt(
          seq(_, l.and, _, opt(l.conjunction)),
          seq(_, nothing, _, l.conjunction),
          nothing
        )
      ).thru(branchTail(And))
    ),
  disjunction: (l) =>
    alt(
      seq(nothing, _, l.or, _, opt(l.disjunction)).thru(branch(Or)),
      seq(l.conjunction, opt(seq(_, l.or, _, opt(l.disjunction)))).thru(
        branchTail(Or)
      )
    ),
  expression: (l) => l.disjunction,
  query: (l) => opt(l.expression).trim(_)
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
