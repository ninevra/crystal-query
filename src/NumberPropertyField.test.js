import { NumberPropertyField } from './NumberPropertyField.js';
import test from 'ava';

test.beforeEach((t) => {
  t.context.number = new NumberPropertyField('a number', false, 'prop');
});

test('NumberPropertyField supports ":"', (t) => {
  const field = t.context.number[':']('-4.5');
  t.is(field.describe(), 'a number equals -4.5');
  t.true(field.filter({ prop: -4.5 }));
  t.false(field.filter({ prop: 4.5 }));
  t.false(field.filter({ foo: -4.5 }));
});

test('NumberPropertyField supports "="', (t) => {
  const field = t.context.number['=']('-4.5');
  t.is(field.describe(), 'a number equals -4.5');
  t.true(field.filter({ prop: -4.5 }));
  t.false(field.filter({ prop: 4.5 }));
  t.false(field.filter({ foo: -4.5 }));
});

test.todo('NumberPropertyField pluralization');
test.todo('NumberPropertyField negation');
test.todo('NumberPropertyField rejects non-number queries');

test('NumberPropertyField supports ">"', (t) => {
  const field = t.context.number['>'](-4.5);
  t.is(field.describe(), 'a number is greater than -4.5');
  t.true(field.filter({ prop: -4 }));
  t.false(field.filter({ prop: -4.5 }));
  t.false(field.filter({ prop: -5 }));
  t.false(field.filter({ foo: -4 }));
});

test('NumberPropertyField supports ">="', (t) => {
  const field = t.context.number['>='](-4.5);
  t.is(field.describe(), 'a number is at least -4.5');
  t.true(field.filter({ prop: -4 }));
  t.true(field.filter({ prop: -4.5 }));
  t.false(field.filter({ prop: -5 }));
  t.false(field.filter({ foo: -4 }));
});

test('NumberPropertyField supports "<="', (t) => {
  const field = t.context.number['<='](-4.5);
  t.is(field.describe(), 'a number is at most -4.5');
  t.false(field.filter({ prop: -4 }));
  t.true(field.filter({ prop: -4.5 }));
  t.true(field.filter({ prop: -5 }));
  t.false(field.filter({ foo: -5 }));
});

test('NumberPropertyField supports "<"', (t) => {
  const field = t.context.number['<'](-4.5);
  t.is(field.describe(), 'a number is less than -4.5');
  t.false(field.filter({ prop: -4 }));
  t.false(field.filter({ prop: -4.5 }));
  t.true(field.filter({ prop: -5 }));
  t.false(field.filter({ foo: -5 }));
});
