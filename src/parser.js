import parsimmon from 'parsimmon';

import {
  And,
  Paren,
  Or,
  Not,
  Literal,
  Term,
  NodeString,
  Ident
} from './nodes.js';

const { seq, alt, any, string, regexp, optWhitespace, succeed } = parsimmon;

const _ = optWhitespace.thru(mark);

function branchNode(Type) {
  return (parser) =>
    parser
      .thru(mark)
      .map(({ value, ...rest }) => new Type({ children: value, ...rest }));
}

function leafNode(Type) {
  return (parser) => parser.thru(mark).map((node) => new Type(node));
}

function mark(parser) {
  return parser.mark().map(({ value, start, end }) => ({
    value,
    start: start.offset,
    end: end.offset
  }));
}

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

function foldCst(cst, { preVisit = (x) => x, postVisit = (x) => x }) {
  cst = preVisit(cst);
  if (cst?.children !== undefined) {
    cst.children = cst.children.map((node) =>
      foldCst(node, { preVisit, postVisit })
    );
  }

  return postVisit(cst);
}

function trimCst(cst, prefixLength, inputLength) {
  return foldCst(cst, {
    preVisit(node) {
      if (node === undefined) {
        return undefined;
      }

      if (node.end <= prefixLength && node.start < prefixLength) {
        // Node exists wholely in the prefix
        return undefined;
      }

      node.start = Math.max(0, node.start - prefixLength);
      node.end -= prefixLength;

      if (node.start >= inputLength && node.end > inputLength) {
        // Node exists wholely in the suffix
        return undefined;
      }

      node.end = Math.min(inputLength, node.end);

      return node;
    }
  });
}

function removeLiterals(node) {
  return foldCst(node, {
    preVisit(node) {
      if (
        typeof node === 'object' &&
        (node?.name === undefined || node?.name === 'Identifier')
      ) {
        return node?.value;
      }

      return node;
    }
  });
}

function stringsToLiterals(node) {
  return foldCst(node, {
    preVisit(node) {
      if (node?.name === 'String') {
        const {
          start,
          end,
          content: { value, raw }
        } = node;
        return new Literal({ start, end, value, raw });
      }

      return node;
    }
  });
}

function minimizeChildren(node) {
  return foldCst(node, {
    postVisit(node) {
      switch (node?.name) {
        case 'And':
          return new And({ left: node.left, right: node.right });
        case 'Or':
          return new Or({ left: node.left, right: node.right });
        case 'Not':
          return new Not({ expression: node.expression });
        case 'Parenthetical':
          return new Paren({ expression: node.expression });
        case 'Term':
          return new Term({
            field: node.field,
            operator: node.operator,
            value: node.value
          });
        default:
          return node;
      }
    }
  });
}

function removeParens(node) {
  return foldCst(node, {
    preVisit(node) {
      if (node?.name === 'Parenthetical') {
        return node.expression;
      }

      return node;
    }
  });
}

function collapseIncomplete(node) {
  return foldCst(node, {
    postVisit(node) {
      switch (node?.name) {
        case 'And':
        case 'Or':
          if (node.left === undefined) {
            return node.right;
          }

          if (node.right === undefined) {
            return node.left;
          }

          return node;
        case 'Not':
        case 'Parenthetical':
          if (node.expression === undefined) {
            return node.expression;
          }

          return node;
        default:
          return node;
      }
    }
  });
}

function removeOffsets(node) {
  return foldCst(node, {
    preVisit(node) {
      if (node === undefined) {
        return undefined;
      }

      if (typeof node !== 'object') {
        return node;
      }

      const { start, end, ...rest } = node;

      return new node.constructor(rest);
    }
  });
}

function astFromCst(cst) {
  return removeOffsets(
    collapseIncomplete(
      removeParens(minimizeChildren(removeLiterals(stringsToLiterals(cst))))
    )
  );
}

export class Parser {
  constructor() {
    this.language = parsimmon.createLanguage({
      operator: () =>
        alt(string(':'), regexp(/[<>]=/), regexp(/[<>=]/)).thru(
          leafNode(Literal)
        ),
      and: (l) =>
        l.word.assert((word) => word === 'and').thru(leafNode(Literal)),
      or: (l) => l.word.assert((word) => word === 'or').thru(leafNode(Literal)),
      not: (l) =>
        l.word.assert((word) => word === 'not').thru(leafNode(Literal)),
      keyword: (l) => alt(l.and, l.or, l.not),
      escaped: () =>
        seq(string('\\'), any).map(([slash, char]) => ({
          raw: slash + char,
          value: char
        })),
      unescaped: () =>
        regexp(/[^\\"]+/).map((value) => ({ raw: value, value })),
      stringContent: (l) =>
        alt(l.escaped, l.unescaped)
          .many()
          .map((parts) => ({
            raw: parts.map(({ raw }) => raw).join(''),
            value: parts.map(({ value }) => value).join('')
          }))
          .thru(mark)
          .map(({ value, ...rest }) => new Literal({ ...value, ...rest })),
      quote: () => string('"').thru(leafNode(Literal)),
      string: (l) =>
        seq(l.quote, l.stringContent, l.quote).thru(branchNode(NodeString)),
      word: () => regexp(/[^:<>="()\s]+/),
      identifier: (l) =>
        l.word
          .assert((word) => !l.keyword.parse(word).status)
          .thru(leafNode(Ident)),
      field: (l) => l.identifier,
      simpleValue: (l) => alt(l.string, l.identifier),
      nothing: () => succeed(undefined),
      lparen: () => string('(').thru(leafNode(Literal)),
      rparen: () => string(')').thru(leafNode(Literal)),
      valueParen: (l) =>
        seq(l.lparen, _, l.valueExpr, _, l.rparen).thru(branchNode(Paren)),
      valueBasic: (l) => alt(l.valueParen, l.simpleValue),
      valueNot: (l) =>
        alt(seq(l.not, _, l.optValueNot).thru(branchNode(Not)), l.valueBasic),
      optValueNot: (l) => alt(l.valueNot, l.nothing),
      valueAnd: (l) =>
        alt(
          seq(l.optValueNot, _, l.and, _, l.optValueAnd).thru(branchNode(And)),
          seq(l.valueNot, _, l.nothing, _, l.valueAnd).thru(branchNode(And)),
          l.valueNot
        ),
      optValueAnd: (l) => alt(l.valueAnd, l.nothing),
      valueOr: (l) =>
        alt(
          seq(l.optValueAnd, _, l.or, _, l.optValueOr).thru(branchNode(Or)),
          l.valueAnd
        ),
      optValueOr: (l) => alt(l.valueOr, l.nothing),
      valueExpr: (l) => l.valueOr,
      term: (l) =>
        alt(
          seq(l.field, l.operator, l.valueBasic),
          seq(l.nothing, l.operator, l.valueBasic),
          seq(l.field, l.operator, l.nothing),
          seq(l.nothing, l.operator, l.nothing),
          seq(l.nothing, l.nothing, l.valueBasic)
        ).thru(branchNode(Term)),
      parenthetical: (l) =>
        seq(l.lparen, _, l.optExpression, _, l.rparen).thru(branchNode(Paren)),
      basic: (l) => alt(l.term, l.parenthetical),
      negation: (l) =>
        alt(seq(l.not, _, l.optNegation).thru(branchNode(Not)), l.basic),
      optNegation: (l) => alt(l.negation, l.nothing),
      conjunction: (l) =>
        alt(
          seq(l.optNegation, _, l.and, _, l.optConjunction).thru(
            branchNode(And)
          ),
          seq(l.negation, _, l.nothing, _, l.conjunction).thru(branchNode(And)),
          l.negation
        ),
      optConjunction: (l) => alt(l.conjunction, l.nothing),
      disjunction: (l) =>
        alt(
          seq(l.optConjunction, _, l.or, _, l.optDisjunction).thru(
            branchNode(Or)
          ),
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
      result.value = astFromCst(result.value);
    }

    return result;
  }
}
