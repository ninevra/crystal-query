import test from 'ava';
import { StringPropertyField } from './StringPropertyField.js';
import { NumberPropertyField } from './NumberPropertyField.js';
import { FieldTermHandler } from './FieldTermHandler.js';

test.beforeEach((t) => {
  t.context.string = new StringPropertyField('some field', false, 'foo');
  t.context.number = new NumberPropertyField('a number', false, 'prop');
  t.context.handler = new FieldTermHandler({
    string: t.context.string,
    number: t.context.number
  });
});

function term(field, operator, value) {
  return { field, operator, value };
}

test('FieldTermHandler retrieves appropriate fields', (t) => {
  const handler = t.context.handler;
  t.is(handler.get(term('number', '=', '5')).describe(), 'a number equals 5');
  t.is(handler.get(term('number', ':', '4')).describe(), 'a number equals 4');
  t.is(
    handler.get(term('string', ':', 'foo')).describe(),
    'some field contains "foo"'
  );
});

test('FieldTermHandler throws appropriate error on unsupported fields', (t) => {
  t.throws(() => t.context.handler.get(term('absent', '=', '5')), {
    message: 'unknown field "absent"'
  });
});

test('FieldTermHandler throws appropriate error on absent fields', (t) => {
  t.throws(() => t.context.handler.get(term(undefined, '=', '5')), {
    message: "term '=5' is missing a field name"
  });
});

test('FieldTermHandler throws appropriate error on unsupported operators', (t) => {
  t.throws(() => t.context.handler.get(term('string', '>', 'blah')), {
    message: 'can\'t use ">" on field "string"'
  });
});

test('FieldTermHandler throws appropriate error on absent values', (t) => {
  t.throws(() => t.context.handler.get(term('number', '=', undefined)), {
    message: "term 'number=' is missing a value"
  });
});

test('FieldTermHandler relays errors from fields', (t) => {
  t.throws(() => t.context.handler.get(term('number', '=', 'foo')), {
    message: 'expected a number, not "foo"'
  });
});

test('FieldTermHandler retrieves defaultField specified as field', (t) => {
  const handler = new FieldTermHandler(
    { string: t.context.string },
    { defaultField: t.context.number }
  );
  t.is(
    handler.get(term(undefined, '>', '2')).describe(),
    'a number is greater than 2'
  );
});

test('FieldTermHandler retrieves defaultField specified as name', (t) => {
  const handler = new FieldTermHandler(
    { string: t.context.string },
    { defaultField: 'string' }
  );
  t.is(
    handler.get(term(undefined, ':', 'foo')).describe(),
    'some field contains "foo"'
  );
});

test('FieldTermHandler reports unsupported default operation', (t) => {
  const handler = new FieldTermHandler(
    { string: t.context.string },
    { defaultField: 'string' }
  );
  t.throws(() => handler.get(term(undefined, undefined, 'foo')), {
    message: "term 'foo' is missing an operator"
  });
});
