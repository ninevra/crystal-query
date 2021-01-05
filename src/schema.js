import { Parser } from './parser.js';
import { GenericTermHandler } from './terms/GenericTermHandler.js';
import * as messages from './messages.js';

export class InvalidNodeError extends Error {
  constructor(astNode) {
    super(`Invalid AST node ${JSON.stringify(astNode)}`);
  }
}

export class Schema {
  constructor({
    termHandler = new GenericTermHandler(),
    ops = {
      describe: {
        And: ({ left, right }) =>
          messages.conjunction({
            left: left.ops.describe(),
            right: right.ops.describe()
          }),
        Or: ({ left, right }) =>
          messages.disjunction({
            left: left.ops.describe(),
            right: right.ops.describe()
          }),
        Parenthetical: ({ expression }, negated) =>
          messages.parenthetical({
            expression: expression.ops.describe(),
            negated
          }),
        Not: ({ expression }, negated) => expression.ops.describe(!negated)
      },
      predicate: {
        And: ({ left, right }, input) =>
          left.ops.predicate(input) && right.ops.predicate(input),
        Or: ({ left, right }, input) =>
          left.ops.predicate(input) || right.ops.predicate(input),
        Parenthetical: ({ expression }, input) =>
          expression.ops.predicate(input),
        Not: ({ expression }, input) => !expression.ops.predicate(input)
      }
    }
  } = {}) {
    this.parser = new Parser();
    this.termHandler = termHandler;
    this.ops = ops;
  }

  parse(query) {
    let { status, value: ast, index, expected } = this.parser.parse(query);
    let errors;
    if (status) {
      errors = this.validateNode(ast);
      status = errors.length === 0;
    } else {
      let subtype = 'unknown';
      const offset = index.offset;
      if (
        query[offset] === ')' &&
        this.parser.parse(query.slice(0, Math.max(0, offset))).status
      ) {
        subtype = 'unopened parenthetical';
      } else if (offset === query.length && expected.includes('closing )')) {
        subtype = 'unclosed parenthetical';
      } else if (offset === query.length && expected.includes('closing "')) {
        subtype = 'unclosed quotation';
      }

      errors = [{ type: 'syntax', index, expected, subtype }];
    }

    if (ast) {
      const ops = {};

      for (const operation of Object.keys(this.ops)) {
        ops[operation] = ast.ops[operation];
      }

      return { ops, status, errors, ast };
    }

    return { status, errors };
  }

  attachOps(astNode) {
    astNode.ops = astNode.ops ?? {};

    for (const operation of Object.keys(this.ops)) {
      if (astNode.name === 'Term') {
        const { field, operator, value } = astNode;
        astNode.ops[operation] = this.termHandler.get(field, operator, value)[
          operation
        ];
      } else {
        astNode.ops[operation] = (...args) =>
          this.ops[operation][astNode.name](astNode, ...args);
      }
    }
  }

  validateNode(astNode) {
    this.attachOps(astNode);

    switch (astNode.name) {
      case 'And':
      case 'Or':
        return [
          ...this.validateNode(astNode.left),
          ...this.validateNode(astNode.right)
        ];
      case 'Not':
        return this.validateNode(astNode.expression);
      case 'Parenthetical':
        return this.validateNode(astNode.expression);
      case 'Term': {
        const { field, operator, value: termValue } = astNode;
        const { status, error } = this.termHandler.get(
          field,
          operator,
          termValue
        );
        if (status) {
          return [];
        }

        const { start, end, value } = astNode;
        return [{ type: 'field', start, end, value, message: error }];
      }

      default:
        throw new InvalidNodeError(astNode);
    }
  }
}
