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
    descriptors: {
      conjunction = ({ left, right }) => messages.conjunction({ left, right }),
      disjunction = ({ left, right }) => messages.disjunction({ left, right }),
      parenthetical = ({ expression, negated }) =>
        messages.parenthetical({ expression, negated })
    } = {}
  } = {}) {
    this.parser = new Parser();
    this.termHandler = termHandler;
    this.descriptors = { conjunction, disjunction, parenthetical };
  }

  query(query) {
    const parsed = this.parse(query);
    if (parsed.status) {
      parsed.description = this.describeNode(parsed.ast);
      parsed.predicate = this.evaluateNode(parsed.ast);
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
    return this.describeNode(this.parser.parse(query).value);
  }

  describeNode(astNode, negated = false) {
    switch (astNode.name) {
      case 'And':
        return this.descriptors.conjunction({
          left: this.describeNode(astNode.value[0]),
          right: this.describeNode(astNode.value[1])
        });
      case 'Or':
        return this.descriptors.disjunction({
          left: this.describeNode(astNode.value[0]),
          right: this.describeNode(astNode.value[1])
        });
      case 'Not':
        return this.describeNode(astNode.value, !negated);
      case 'Nil':
        return '';
      case 'Parenthetical':
        return this.descriptors.parenthetical({
          expression: this.describeNode(astNode.value),
          negated
        });
      case 'Term':
        return this.termHandler.get(...astNode.value).describe(negated);
      default:
        throw new InvalidNodeError(astNode);
    }
  }

  validateNode(astNode) {
    switch (astNode.name) {
      case 'And':
      case 'Or':
        return [
          ...this.validateNode(astNode.value[0]),
          ...this.validateNode(astNode.value[1])
        ];
      case 'Not':
      case 'Parenthetical':
        return this.validateNode(astNode.value);
      case 'Nil':
        return [];
      case 'Term': {
        const { status, error } = this.termHandler.get(...astNode.value);
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
    const { status, value: ast } = this.parser.parse(query);
    if (!status) throw new Error(`parse failed for "${query}"`);
    return this.evaluateNode(ast);
  }

  evaluateNode(astNode) {
    switch (astNode.name) {
      case 'And': {
        const left = this.evaluateNode(astNode.value[0]);
        const right = this.evaluateNode(astNode.value[1]);
        return (input) => left(input) && right(input);
      }

      case 'Or': {
        const left = this.evaluateNode(astNode.value[0]);
        const right = this.evaluateNode(astNode.value[1]);
        return (input) => left(input) || right(input);
      }

      case 'Not': {
        const child = this.evaluateNode(astNode.value);
        return (input) => !child(input);
      }

      case 'Term':
        return this.termHandler.get(...astNode.value).predicate;
      case 'Nil':
        return () => false;
      case 'Parenthetical': {
        const child = this.evaluateNode(astNode.value);
        return (input) => child(input);
      }

      default:
        throw new InvalidNodeError(astNode);
    }
  }
}
