import {
  StringField,
  NumberField,
  FieldTermHandler,
  Status
} from './fields.js';
import test from 'ava';

test.beforeEach((t) => {
  t.context.string = new StringField('some field', false, 'foo');
  t.context.number = new NumberField('a number', false, 'prop');
  t.context.handler = new FieldTermHandler({
    string: t.context.string,
    number: t.context.number
  });
});

test('StringField supports ":"', (t) => {
  const field = new StringField('some field', false, 'foo')[':']('bar');
  t.is(field.describe(false), 'some field contains "bar"');
  t.true(field.filter({ foo: 'bar' }));
  t.true(field.filter({ foo: 'foobarbaz' }));
  t.false(field.filter({ foo: 'baz' }));
  t.false(field.filter({ baz: 'bar' }));
});

test('StringField supports "="', (t) => {
  const field = new StringField('some field', false, 'foo')['=']('bar');
  t.is(field.describe(false), 'some field equals "bar"');
  t.true(field.filter({ foo: 'bar' }));
  t.false(field.filter({ foo: 'foobarbaz' }));
});

test('StringField caseSensitive', (t) => {
  const sensitive = new StringField('some field', false, 'foo');
  t.false(sensitive['=']('bar').filter({ foo: 'BaR' }));
  t.false(sensitive[':']('bar').filter({ foo: 'BaRBaZ' }));
  const insensitive = new StringField('some field', false, 'foo', {
    caseSensitive: false
  });
  t.true(insensitive['=']('bar').filter({ foo: 'BaR' }));
  t.true(insensitive[':']('bar').filter({ foo: 'BaRBaZ' }));
});

test('StringField supports arbitrary extractors', (t) => {
  const field = new StringField(
    'some field',
    false,
    (input) => input.bar + 'baz'
  );
  t.true(field['=']('foobaz').filter({ bar: 'foo' }));
  // TODO: test all operators...
});

test('NumberField supports arbitrary extractors', (t) => {
  const field = new NumberField(
    'a number',
    false,
    (input) => input.bar + 3
  );
  t.true(field['=']('6').filter({ bar: 3 }));
  // TODO: test all operators...
});

test.todo('StringField pluralization');
test.todo('StringField negation');

test('NumberField supports ":"', (t) => {
  const field = new NumberField('a number', false, 'prop')[':']('-4.5');
  t.is(field.describe(), 'a number equals -4.5');
  t.true(field.filter({ prop: -4.5 }));
  t.false(field.filter({ prop: 4.5 }));
  t.false(field.filter({ foo: -4.5 }));
});

test('NumberField supports "="', (t) => {
  const field = new NumberField('a number', false, 'prop')['=']('-4.5');
  t.is(field.describe(), 'a number equals -4.5');
  t.true(field.filter({ prop: -4.5 }));
  t.false(field.filter({ prop: 4.5 }));
  t.false(field.filter({ foo: -4.5 }));
});

test.todo('NumberField pluralization');
test.todo('NumberField negation');
test.todo('NumberField rejects non-number queries');

test('NumberField supports ">"', (t) => {
  const field = t.context.number['>'](-4.5);
  t.is(field.describe(), 'a number is greater than -4.5');
  t.true(field.filter({ prop: -4 }));
  t.false(field.filter({ prop: -4.5 }));
  t.false(field.filter({ prop: -5 }));
  t.false(field.filter({ foo: -4 }));
});

test('NumberField supports ">="', (t) => {
  const field = t.context.number['>='](-4.5);
  t.is(field.describe(), 'a number is at least -4.5');
  t.true(field.filter({ prop: -4 }));
  t.true(field.filter({ prop: -4.5 }));
  t.false(field.filter({ prop: -5 }));
  t.false(field.filter({ foo: -4 }));
});

test('NumberField supports "<="', (t) => {
  const field = t.context.number['<='](-4.5);
  t.is(field.describe(), 'a number is at most -4.5');
  t.false(field.filter({ prop: -4 }));
  t.true(field.filter({ prop: -4.5 }));
  t.true(field.filter({ prop: -5 }));
  t.false(field.filter({ foo: -5 }));
});

test('NumberField supports "<"', (t) => {
  const field = t.context.number['<'](-4.5);
  t.is(field.describe(), 'a number is less than -4.5');
  t.false(field.filter({ prop: -4 }));
  t.false(field.filter({ prop: -4.5 }));
  t.true(field.filter({ prop: -5 }));
  t.false(field.filter({ foo: -5 }));
});

test('FieldTermHandler retrieves appropriate fields', (t) => {
  const handler = t.context.handler;
  t.is(handler.get('number', '=', '5').describe(), 'a number equals 5');
  t.is(handler.get('number', ':', '4').describe(), 'a number equals 4');
  t.is(
    handler.get('string', ':', 'foo').describe(),
    'some field contains "foo"'
  );
});

test('FieldTermHandler returns appropriate error on missing fields', (t) => {
  const handler = t.context.handler;
  t.like(handler.get('absent', '=', '5'), {
    status: Status.ERROR,
    error: 'unknown field "absent"'
  });
});

test('FieldTermHandler returns appropriate error on missing operators', (t) => {
  t.like(t.context.handler.get('string', '>', 'blah'), {
    status: Status.ERROR,
    error: 'can\'t use ">" on field "string"'
  });
});
