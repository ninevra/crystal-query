import { Schema } from './schema.js';
import { Parser } from './parser.js';
import { StringPropertyField } from './terms/StringPropertyField.js';
import { NumberPropertyField } from './terms/NumberPropertyField.js';
import { FieldTermHandler } from './terms/FieldTermHandler.js';
import * as messages from './messages.js';
import test from 'ava';

test('parse().describe() renders query descriptions', (t) => {
  const query = 'not (a or b:"c d") and e>3';
  const description = new Schema().parse(query).describe();
  t.snapshot(description);
});

test('parse().predicate is a function', (t) => {
  const query = 'not (a or b:"c d") and e>3';
  const predicate = new Schema().parse(query).predicate;
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
  const schema = new Schema({
    termHandler: new FieldTermHandler({
      foo: new StringPropertyField('foo', false, 'foo'),
      bar: new NumberPropertyField('bar', false, 'bar')
    })
  });
  const result = schema.parse('foo>bar <2 bar:baz baz:foo');
  t.like(result, {
    status: false
  });
  t.is(result.errors.length, 4);
  t.like(result.errors[0], {
    type: 'field',
    message: messages.errorUnsupportedOperator({ name: 'foo', operator: '>' }),
    start: { offset: 0, line: 1, column: 1 },
    end: { offset: 7, line: 1, column: 8 }
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

test('parse() returns all applicable of ast, operations, errors', (t) => {
  const schema = new Schema();
  let query = 'not (a or b:"c d") and e>3';
  let result = schema.parse(query);
  t.like(result, {
    status: true,
    ast: new Parser().parse(query).value,
    errors: []
  });
  t.snapshot(result.describe());
  t.true(result.predicate({ e: 4, b: Number.NaN }));
  t.false(result.predicate(['a']));

  query = 'not (a or b:"c d) and e>3';
  result = schema.parse(query);
  assertSyntaxError(t, result, 'unclosed quotation');
  t.is(result.ast, undefined);
  t.is(result.describe, undefined);
  t.is(result.predicate, undefined);
});
