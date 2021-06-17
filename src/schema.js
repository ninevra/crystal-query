import { Parser } from './parser.js';
import * as messages from './messages.js';

export class PropError extends Error {
  constructor(message, data) {
    super(message);
    this.data = data;
  }

  static isPropError(error) {
    return error[Symbol.for('crystal-query:prop-error')] === true;
  }
}

PropError.prototype[Symbol.for('crystal-query:prop-error')] = true;

export const describe = {
  And:
    ({ left, right }) =>
    () =>
      messages.conjunction({
        left: left.props.describe(),
        right: right.props.describe()
      }),
  Or:
    ({ left, right }) =>
    () =>
      messages.disjunction({
        left: left.props.describe(),
        right: right.props.describe()
      }),
  Parenthetical:
    ({ expression }) =>
    (negated) =>
      messages.parenthetical({
        expression: expression.props.describe(),
        negated
      }),
  Not:
    ({ expression }) =>
    (negated) =>
      expression.props.describe(!negated),
  Term:
    ({ field, operator, value }) =>
    (negated) =>
      `${negated ? 'not ' : ''}${field ?? ''}${operator ?? ''}"${value ?? ''}"`
};

export const predicate = {
  And:
    ({ left, right }) =>
    (input) =>
      left.props.predicate(input) && right.props.predicate(input),
  Or:
    ({ left, right }) =>
    (input) =>
      left.props.predicate(input) || right.props.predicate(input),
  Parenthetical:
    ({ expression }) =>
    (input) =>
      expression.props.predicate(input),
  Not:
    ({ expression }) =>
    (input) =>
      !expression.props.predicate(input),
  Term:
    ({ field, operator, value }) =>
    (input) => {
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
};

export class Schema {
  constructor({ ignoreInvalid = false, props = { describe, predicate } } = {}) {
    this.parser = new Parser();
    this.ignoreInvalid = ignoreInvalid;
    this.props = props;
  }

  parse(query) {
    let { status, value: ast, index, expected } = this.parser.parse(query);
    let errors;
    const { ignoreInvalid, props } = this;

    if (status) {
      [ast, errors] = postprocess(ast, { ignoreInvalid, props });
      if (!this.ignoreInvalid) {
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

function postprocess(ast, options) {
  if (ast === undefined) {
    return undefined;
  }

  switch (ast.name) {
    case 'And':
    case 'Or': {
      const [left, leftErrors] = postprocess(ast.left, options);
      const [right, rightErrors] = postprocess(ast.right, options);
      const errors = [...leftErrors, ...rightErrors];

      if (left === undefined || right === undefined) {
        if (options.ignoreInvalid) {
          return [left ?? right, errors];
        }

        return [undefined, errors];
      }

      ast = { ...ast, left, right };

      const props = computeProps(ast, options.props);

      if (props.status) {
        return [{ ...ast, props: props.value }, errors];
      }

      return [undefined, [...errors, props.error]];
    }

    case 'Not':
    case 'Parenthetical': {
      const [expression, errors] = postprocess(ast.expression, options);

      if (expression === undefined) {
        return [undefined, errors];
      }

      ast = { ...ast, expression };

      const props = computeProps(ast, options.props);

      if (props.status) {
        return [{ ...ast, props: props.value }, errors];
      }

      return [undefined, [...errors, props.unwrapErr()]];
    }

    case 'Term': {
      const props = computeProps(ast, options.props);

      if (props.status) {
        return [{ ...ast, props: props.value }, []];
      }

      return [undefined, [props.error]];
    }
    // No default
  }
}

function computeProps(node, props) {
  const nodeProps = {};

  for (const [key, impls] of Object.entries(props)) {
    try {
      nodeProps[key] = impls[node.name](node);
    } catch (error) {
      if (PropError.isPropError(error)) {
        return { status: false, error: unpackPropError(error, node) };
      }

      throw error;
    }
  }

  return { status: true, value: nodeProps };
}

function unpackPropError(error, node) {
  const { message, data } = error;
  return { type: 'field', message, data, node };
}
