import { Parser } from './parser.js';
import * as messages from './messages.js';

export class InvalidNodeError extends Error {
  constructor(astNode) {
    super(`Invalid AST node ${JSON.stringify(astNode)}`);
  }
}

export const describe = {
  describe: {
    And: ({ left, right }) => () =>
      messages.conjunction({
        left: left.props.describe(),
        right: right.props.describe()
      }),
    Or: ({ left, right }) => () =>
      messages.disjunction({
        left: left.props.describe(),
        right: right.props.describe()
      }),
    Parenthetical: ({ expression }) => (negated) =>
      messages.parenthetical({
        expression: expression.props.describe(),
        negated
      }),
    Not: ({ expression }) => (negated) => expression.props.describe(!negated),
    Term: ({ field, operator, value }) => (negated) =>
      `${negated ? 'not ' : ''}${field ?? ''}${operator ?? ''}"${value ?? ''}"`
  }
};

export const predicate = {
  predicate: {
    And: ({ left, right }) => (input) =>
      left.props.predicate(input) && right.props.predicate(input),
    Or: ({ left, right }) => (input) =>
      left.props.predicate(input) || right.props.predicate(input),
    Parenthetical: ({ expression }) => (input) =>
      expression.props.predicate(input),
    Not: ({ expression }) => (input) => !expression.props.predicate(input),
    Term: ({ field, operator, value }) => (input) => {
      input = input?.[field];
      value = value ?? '';
      switch (operator) {
        case undefined:
        case ':':
          return input?.includes?.(value) ?? false;
        case '>':
          return input > value;
        case '>=':
          return input >= value;
        case '=':
          return input == value; // eslint-disable-line eqeqeq
        case '<=':
          return input <= value;
        case '<':
          return input < value;
        default:
          return false;
      }
    }
  }
};

export class Schema {
  constructor({ ignoreInvalid = false, props = [describe, predicate] } = {}) {
    this.parser = new Parser();
    this.ignoreInvalid = ignoreInvalid;
    this.props = normalizeProps(props);
  }

  parse(query) {
    let { status, value: ast, index, expected } = this.parser.parse(query);
    let errors;

    if (status) {
      attachProps(ast, this.props);
      errors = collectErrors(ast);
      if (this.ignoreInvalid) {
        ast = ignoringInvalidNodes(ast);
      } else {
        status = errors.length === 0;
      }
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

    if (status && ast) {
      const props = {};

      for (const prop of Object.keys(ast.props)) {
        props[prop] = ast.props[prop];
      }

      return { status, errors, ast, props };
    }

    return { status, errors };
  }
}

// Returns a new AST in which invalid terms have been removed, nodes with only
// invalid children have been removed, and nodes with one invalid child have
// been replaced by their valid child.
//
// The returned AST may be undefined if nothing remained.
//
// Returns [AST, errors]
function ignoringInvalidNodes(astNode) {
  if (astNode === undefined || astNode.props.status === false) {
    return undefined;
  }

  if (astNode.name === 'And' || astNode.name === 'Or') {
    const left = ignoringInvalidNodes(astNode.left);
    const right = ignoringInvalidNodes(astNode.right);

    if (left === undefined && right === undefined) {
      return undefined;
    } else if (left === undefined) {
      return right;
    } else if (right === undefined) {
      return left;
    }

    return { ...astNode, left, right };
  } else if (astNode.name === 'Not' || astNode.name === 'Parenthetical') {
    const expression = ignoringInvalidNodes(astNode.expression);

    if (expression === undefined) {
      return undefined;
    }

    return { ...astNode, expression };
  }

  return astNode;
}

function attachProps(astNode, props) {
  if (astNode === undefined) {
    return;
  }

  if (astNode.name === 'And' || astNode.name === 'Or') {
    attachProps(astNode.left, props);
    attachProps(astNode.right, props);
  } else if (astNode.name === 'Not' || astNode.name === 'Parenthetical') {
    attachProps(astNode.expression, props);
  }

  astNode.props = {};

  Object.assign(
    astNode.props,
    ...props.map((mixin) => {
      if (Object.prototype.hasOwnProperty.call(mixin, astNode.name)) {
        return mixin[astNode.name](astNode);
      }

      return undefined;
    })
  );
}

function normalizeProps(props) {
  if (!Array.isArray(props)) {
    props = [props];
  }

  return props.flatMap((mixin) => normalizeMixin(mixin));
}

function normalizeMixin(mixin) {
  if (
    Object.keys(mixin).some(
      (key) => !['And', 'Or', 'Not', 'Parenthetical', 'Term'].includes(key)
    )
  ) {
    // If any key of the mixin is _not_ a valid node name, then it's a
    // prop-first mixin. Map this to one node-first mixin per prop.
    return Object.entries(mixin).map(([prop, nodeImpls]) => {
      const normalized = {};
      for (const [nodeType, impl] of Object.entries(nodeImpls)) {
        normalized[nodeType] = (node) => ({ [prop]: impl(node) });
      }

      return normalized;
    });
  }

  // Otherwise it's already a node-first mixin
  return [mixin];
}

function collectErrors(astNode) {
  if (astNode === undefined) {
    return [];
  }

  const errors = astNode.props.error === undefined ? [] : [astNode.props.error];

  if (astNode.name === 'And' || astNode.name === 'Or') {
    return [
      ...errors,
      ...collectErrors(astNode.left),
      ...collectErrors(astNode.right)
    ];
  } else if (astNode.name === 'Not' || astNode.name === 'Parenthetical') {
    return [...errors, ...collectErrors(astNode.expression)];
  }

  return errors;
}
