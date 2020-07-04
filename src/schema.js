import { Parser } from './parser.js';
import { GenericFieldHandler } from './fields.js';
import * as messages from './messages.js';

export class InvalidNodeError extends Error {
  constructor(astNode) {
    super(`Invalid AST node ${JSON.stringify(astNode)}`);
  }
}

export class Schema {
  constructor({
    operators = [':', '>=', '<=', '<', '=', '>'],
    fieldHandler = new GenericFieldHandler(),
    descriptors: {
      conjunction = ({ left, right }) => messages.conjunction({ left, right }),
      disjunction = ({ left, right }) => messages.disjunction({ left, right }),
      parenthetical = ({ expression }) => messages.parenthetical({ expression })
    } = {}
  } = {}) {
    this.parser = new Parser({ operators });
    this.fieldHandler = fieldHandler;
    this.descriptors = { conjunction, disjunction, parenthetical };
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
          expression: this.describeNode(astNode.value, negated)
        });
      case 'Term':
        return this.fieldHandler.get(...astNode.value).describe(negated);
      default:
        throw new InvalidNodeError(astNode);
    }
  }
  validateNode(astNode) {
    switch (astNode.name) {
      case 'And':
      case 'Or':
        return (
          this.validateNode(astNode.value[0]) &&
          this.validateNode(astNode.value[1])
        );
      case 'Not':
      case 'Parenthetical':
        return this.validateNode(astNode.value);
      case 'Nil':
        return true;
      case 'Term':
        return false; // TODO: implement or remove
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
        return (value) => left(value) && right(value);
      }
      case 'Or': {
        const left = this.evaluateNode(astNode.value[0]);
        const right = this.evaluateNode(astNode.value[1]);
        return (value) => left(value) || right(value);
      }
      case 'Not': {
        const child = this.evaluateNode(astNode.value);
        return (value) => !child(value);
      }
      case 'Term':
        return this.fieldHandler.get(...astNode.value).filter;
      case 'Nil':
        return () => false;
      case 'Parenthetical': {
        const child = this.evaluateNode(astNode.value);
        return (value) => child(value);
      }
      default:
        throw new InvalidNodeError(astNode);
    }
  }
}
