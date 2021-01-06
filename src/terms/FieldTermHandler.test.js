import { StringPropertyField } from './StringPropertyField.js';
import { NumberPropertyField } from './NumberPropertyField.js';
import { FieldTermHandler } from './FieldTermHandler.js';

import test from 'ava';

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

test('FieldTermHandler returns appropriate error on unsupported fields', (t) => {
  const handler = t.context.handler;
  t.like(handler.get(term('absent', '=', '5')), {
    status: false,
    error: 'unknown field "absent"'
  });
});

test('FieldTermHandler returns appropriate error on absent fields', (t) => {
  const handler = t.context.handler;
  t.like(handler.get(term(undefined, '=', '5')), {
    status: false,
    error: "term '=5' is missing a field name"
  });
});

test('FieldTermHandler returns appropriate error on unsupported operators', (t) => {
  t.like(t.context.handler.get(term('string', '>', 'blah')), {
    status: false,
    error: 'can\'t use ">" on field "string"'
  });
});

test('FieldTermHandler returns appropriate error on absent values', (t) => {
  const handler = t.context.handler;
  t.like(handler.get(term('number', '=', undefined)), {
    status: false,
    error: "term 'number=' is missing a value"
  });
});

test('FieldTermHandler relays errors from fields', (t) => {
  t.like(t.context.handler.get(term('number', '=', 'foo')), {
    status: false,
    error: 'expected a number, not "foo"'
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
  t.like(handler.get(term(undefined, undefined, 'foo')), {
    status: false,
    error: "term 'foo' is missing an operator"
  });
});
