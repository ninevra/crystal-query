import { Schema, describe, predicate } from './schema.js';
import { Parser } from './parser.js';
import { StringPropertyField } from './terms/StringPropertyField.js';
import { NumberPropertyField } from './terms/NumberPropertyField.js';
import { FieldTermHandler } from './terms/FieldTermHandler.js';
import * as messages from './messages.js';
import test from 'ava';

test('parse().props.describe() renders query descriptions', (t) => {
  const query = 'not (a or b:"c d") and e>3';
  const description = new Schema().parse(query).props.describe();
  t.snapshot(description);
});

test('parse().props.predicate is a function', (t) => {
  const query = 'not (a or b:"c d") and e>3';
  const predicate = new Schema().parse(query).props.predicate;
  t.is(typeof predicate, 'function');
});

test('parse() returns parsed ast on success', (t) => {
  const query = 'not (a or b:"c d") and e>3';
  t.like(new Schema().parse(query), {
    status: true,
    errors: [],
    ast: { name: 'And' }
  });
});

function assertSyntaxError(t, result, subtype = 'unknown') {
  t.like(result, { status: false });
  t.is(result.errors.length, 1);
  t.like(result.errors[0], { type: 'syntax', subtype });
  t.true(result.errors[0].expected.length > 0);
  t.truthy(result.errors[0].index);
}

test('parse() returns syntax error on unclosed parenthesis', (t) => {
  const schema = new Schema();
  assertSyntaxError(t, schema.parse('not (a b c'), 'unclosed parenthetical');
  assertSyntaxError(t, schema.parse('not a) b c'), 'unopened parenthetical');
});

test('parse() returns syntax error on unclosed quotes', (t) => {
  assertSyntaxError(t, new Schema().parse('a:"b c'), 'unclosed quotation');
  assertSyntaxError(t, new Schema().parse('foo "'), 'unclosed quotation');
});

test('parse() returns field error on unsupported fields or operators', (t) => {
  const terms = new FieldTermHandler({
    foo: new StringPropertyField('foo', false, 'foo'),
    bar: new NumberPropertyField('bar', false, 'bar')
  });
  const schema = new Schema({
    props: {
      describe: {
        ...describe,
        Term: (node) => terms.get(node).describe
      },
      predicate: {
        ...predicate,
        Term: (node) => terms.get(node).predicate
      }
    }
  });

  const result = schema.parse('foo>bar <2 bar:baz baz:foo');
  t.like(result, {
    status: false
  });
  t.is(result.errors.length, 4);
  t.like(result.errors[0], {
    type: 'field',
    message: messages.errorUnsupportedOperator({ name: 'foo', operator: '>' }),
    node: {
      name: 'Term',
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 7, line: 1, column: 8 }
    }
  });
  t.like(result.errors[1], {
    type: 'field',
    message: messages.errorNoField({
      name: undefined,
      operator: '<',
      value: '2'
    })
  });
  t.like(result.errors[2], {
    type: 'field',
    message: messages.errorWrongType({ type: 'number', value: 'baz' })
  });
  t.like(result.errors[3], {
    type: 'field',
    message: messages.errorUnsupportedField({ name: 'baz' })
  });
});

function dagToTree(dag) {
  if (dag?.constructor?.name === 'Object') {
    return Object.fromEntries(
      Object.entries(dag).map(([key, value]) => [key, dagToTree(value)])
    );
  }

  return dag;
}

test('parse() returns all applicable of ast, operations, errors', (t) => {
  const schema = new Schema();
  let query = 'not (a or b:"c d") and e>3';
  let result = schema.parse(query);
  t.like(result, {
    status: true,
    ast: dagToTree(new Parser().parse(query).value),
    errors: []
  });
  t.snapshot(result.props.describe());
  t.true(result.props.predicate({ e: 4, b: Number.NaN }));
  t.false(result.props.predicate(['a']));

  query = 'not (a or b:"c d) and e>3';
  result = schema.parse(query);
  assertSyntaxError(t, result, 'unclosed quotation');
  t.is(result.ast, undefined);
  t.is(result.describe, undefined);
  t.is(result.predicate, undefined);
});

test('Schema() attaches custom operations to ASTs', (t) => {
  const schema = new Schema({
    props: {
      count: {
        And: ({ left, right }) => () =>
          left.props.count() + right.props.count() + 1,
        Or: ({ left, right }) => () =>
          left.props.count() + right.props.count() + 1,
        Not: ({ expression }) => () => expression.props.count() + 1,
        Parenthetical: ({ expression }) => () => expression.props.count() + 1,
        Term: () => () => 1
      }
    }
  });

  t.snapshot(schema.parse('not (a or b:"c d") and e>3').props.count());
});

test('Custom operations can carry through arguments', (t) => {
  t.plan(3);

  const input = [1, 'foo', Symbol('bar')];

  const schema = new Schema({
    props: {
      passthrough: {
        And: ({ left, right }) => (...args) => {
          left.props.passthrough(...args);
          right.props.passthrough(...args);
        },
        Or: ({ left, right }) => (...args) => {
          left.props.passthrough(...args);
          right.props.passthrough(...args);
        },
        Not: ({ expression }) => (...args) =>
          expression.props.passthrough(...args),
        Parenthetical: ({ expression }) => (...args) =>
          expression.props.passthrough(...args),
        Term: () => (...args) => t.deepEqual(args, input)
      }
    }
  });

  schema.parse('not (a or b:"c d") and e>3').props.passthrough(...input);
});

test('child nodes get their props before their parents', (t) => {
  t.plan(6);

  const schema = new Schema({
    props: {
      check: {
        And: ({ left, right }) => {
          t.true(left.props.check());
          t.true(right.props.check());
          return () => true;
        },
        Or: ({ left, right }) => {
          t.true(left.props.check());
          t.true(right.props.check());
          return () => true;
        },
        Not: ({ expression }) => {
          t.true(expression.props.check());
          return () => true;
        },
        Parenthetical: ({ expression }) => {
          t.true(expression.props.check());
          return () => true;
        },
        Term: () => () => true
      }
    }
  });

  schema.parse('not (a or b:"c d") and e>3');
});

test('ignoreInvalid prunes invalid terms and nodes with invalid children', (t) => {
  const terms = new FieldTermHandler({
    foo: new StringPropertyField('foo', false, 'foo'),
    bar: new NumberPropertyField('bar', false, 'bar')
  });

  const schema = new Schema({
    props: {
      describe: {
        ...describe,
        Term: (node) => terms.get(node).describe
      },
      predicate: {
        ...predicate,
        Term: (node) => terms.get(node).predicate
      }
    },
    ignoreInvalid: true
  });

  t.like(schema.parse('foo'), { status: true, ast: undefined });
  t.like(schema.parse('(foo)'), { status: true, ast: undefined });
  t.like(schema.parse('not foo'), { status: true, ast: undefined });
  t.like(schema.parse('foo and bar'), { status: true, ast: undefined });
  t.like(schema.parse('foo or bar'), { status: true, ast: undefined });

  t.snapshot(schema.parse('foo:hello and bar=quux not foo>bar'));
});
