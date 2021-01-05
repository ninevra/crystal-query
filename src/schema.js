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
    operations = {
      describe: {
        And: ({ left, right }) =>
          messages.conjunction({
            left: left.describe(),
            right: right.describe()
          }),
        Or: ({ left, right }) =>
          messages.disjunction({
            left: left.describe(),
            right: right.describe()
          }),
        Parenthetical: ({ expression }, negated) =>
          messages.parenthetical({
            expression: expression.describe(),
            negated
          }),
        Not: ({ expression }, negated) => expression.describe(!negated),
        Nil: () => ''
      },
      predicate: {
        And: ({ left, right }, input) =>
          left.predicate(input) && right.predicate(input),
        Or: ({ left, right }, input) =>
          left.predicate(input) || right.predicate(input),
        Parenthetical: ({ expression }, input) => expression.predicate(input),
        Not: ({ expression }, input) => !expression.predicate(input),
        Nil: () => false
      }
    }
  } = {}) {
    this.parser = new Parser();
    this.termHandler = termHandler;
    this.operations = operations;
  }

  query(query) {
    const parsed = this.parse(query);
    if (parsed.status) {
      parsed.description = parsed.ast.describe();
      parsed.predicate = parsed.ast.predicate;
    }

    return parsed;
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

    return { status, errors, ast };
  }

  describe(query) {
    return this.parse(query).ast.describe();
  }

  attachOperations(astNode) {
    for (const operation of Object.keys(this.operations)) {
      if (astNode.name === 'Term') {
        const { field, operator, value } = astNode;
        astNode[operation] = this.termHandler.get(field, operator, value)[
          operation
        ];
      } else {
        astNode[operation] = (...args) =>
          this.operations[operation][astNode.name](astNode, ...args);
      }
    }
  }

  validateNode(astNode) {
    this.attachOperations(astNode);

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
      case 'Nil':
        return [];
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

  evaluate(query) {
    return this.parse(query).ast.predicate;
  }
}
