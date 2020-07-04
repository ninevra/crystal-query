import {
  StringPropertyField,
  NumberPropertyField,
  FieldHandler,
  Status,
} from './fields.js';
import test from 'ava';

test.beforeEach((t) => {
  t.context.string = new StringPropertyField('some field', false, 'foo');
  t.context.number = new NumberPropertyField('a number', false, 'prop');
  t.context.handler = new FieldHandler({
    string: t.context.string,
    number: t.context.number,
  });
});

test('StringPropertyField supports ":"', (t) => {
  const field = new StringPropertyField('some field', false, 'foo')[':']('bar');
  t.is(field.describe(false), 'some field contains "bar"');
  t.true(field.filter({ foo: 'bar' }));
  t.true(field.filter({ foo: 'foobarbaz' }));
  t.false(field.filter({ foo: 'baz' }));
  t.false(field.filter({ baz: 'bar' }));
});

test('StringPropertyField supports "="', (t) => {
  const field = new StringPropertyField('some field', false, 'foo')['=']('bar');
  t.is(field.describe(false), 'some field equals "bar"');
  t.true(field.filter({ foo: 'bar' }));
  t.false(field.filter({ foo: 'foobarbaz' }));
});

test.todo('StringPropertyField pluralization');
test.todo('StringPropertyField negation');

test('NumberPropertyField supports ":"', (t) => {
  const field = new NumberPropertyField('a number', false, 'prop')[':']('-4.5');
  t.is(field.describe(), 'a number equals -4.5');
  t.true(field.filter({ prop: -4.5 }));
  t.false(field.filter({ prop: 4.5 }));
  t.false(field.filter({ foo: -4.5 }));
});

test('NumberPropertyField supports "="', (t) => {
  const field = new NumberPropertyField('a number', false, 'prop')['=']('-4.5');
  t.is(field.describe(), 'a number equals -4.5');
  t.true(field.filter({ prop: -4.5 }));
  t.false(field.filter({ prop: 4.5 }));
  t.false(field.filter({ foo: -4.5 }));
});

test.todo('NumberPropertyField pluralization');
test.todo('NumberPropertyField negation');
test.todo('NumberPropertyField rejects non-number queries');

test('FieldHandler retrieves appropriate fields', (t) => {
  const handler = t.context.handler;
  t.is(handler.get('number', '=', '5').describe(), 'a number equals 5');
  t.is(handler.get('number', ':', '4').describe(), 'a number equals 4');
  t.is(
    handler.get('string', ':', 'foo').describe(),
    'some field contains "foo"'
  );
});

test('FieldHandler returns appropriate error on missing fields', (t) => {
  const handler = t.context.handler;
  t.like(handler.get('absent', '=', '5'), {
    status: Status.ERROR,
    error: 'unknown field "absent"',
  });
});

test('FieldHandler returns appropriate error on missing operators', (t) => {
  t.like(t.context.handler.get('string', '>', 'blah'), {
    status: Status.ERROR,
    error: 'can\'t use ">" on field "string"',
  });
});
