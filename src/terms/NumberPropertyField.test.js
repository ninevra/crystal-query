import test from 'ava';
import * as messages from '../messages.js';
import { NumberPropertyField } from './NumberPropertyField.js';

test.beforeEach((t) => {
  t.context.number = new NumberPropertyField('a number', false, 'prop');
});

test('NumberPropertyField supports ":"', (t) => {
  const field = t.context.number[':']('-4.5');
  t.is(field.describe(), 'a number equals -4.5');
  t.true(field.predicate({ prop: -4.5 }));
  t.false(field.predicate({ prop: 4.5 }));
  t.false(field.predicate({ foo: -4.5 }));
});

test('NumberPropertyField supports "="', (t) => {
  const field = t.context.number['=']('-4.5');
  t.is(field.describe(), 'a number equals -4.5');
  t.true(field.predicate({ prop: -4.5 }));
  t.false(field.predicate({ prop: 4.5 }));
  t.false(field.predicate({ foo: -4.5 }));
});

test('NumberPropertyField pluralization', (t) => {
  const field = new NumberPropertyField('some numbers', true, 'prop');
  t.is(field['<']('-4.5').describe(), 'some numbers are less than -4.5');
});

test('NumberPropertyField negation', (t) => {
  const field = new NumberPropertyField('some numbers', true, 'prop');
  t.is(field['<=']('0100').describe(true), 'some numbers are not at most 100');
});

test('NumberPropertyField rejects non-number queries', (t) => {
  const field = new NumberPropertyField('some numbers', true, 'prop');
  t.like(field['<']('foo'), {
    status: false,
    error: messages.errorWrongType({ type: 'number', value: 'foo' })
  });
});

test('NumberPropertyField rejects blank queries', (t) => {
  t.like(t.context.number[':'](''), {
    status: false,
    error: messages.errorWrongType({ type: 'number', value: '' })
  });
  t.like(t.context.number[':'](' '), {
    status: false,
    error: messages.errorWrongType({ type: 'number', value: ' ' })
  });
});

test('NumberPropertyField supports ">"', (t) => {
  const field = t.context.number['>'](-4.5);
  t.is(field.describe(), 'a number is greater than -4.5');
  t.true(field.predicate({ prop: -4 }));
  t.false(field.predicate({ prop: -4.5 }));
  t.false(field.predicate({ prop: -5 }));
  t.false(field.predicate({ foo: -4 }));
});

test('NumberPropertyField supports ">="', (t) => {
  const field = t.context.number['>='](-4.5);
  t.is(field.describe(), 'a number is at least -4.5');
  t.true(field.predicate({ prop: -4 }));
  t.true(field.predicate({ prop: -4.5 }));
  t.false(field.predicate({ prop: -5 }));
  t.false(field.predicate({ foo: -4 }));
});

test('NumberPropertyField supports "<="', (t) => {
  const field = t.context.number['<='](-4.5);
  t.is(field.describe(), 'a number is at most -4.5');
  t.false(field.predicate({ prop: -4 }));
  t.true(field.predicate({ prop: -4.5 }));
  t.true(field.predicate({ prop: -5 }));
  t.false(field.predicate({ foo: -5 }));
});

test('NumberPropertyField supports "<"', (t) => {
  const field = t.context.number['<'](-4.5);
  t.is(field.describe(), 'a number is less than -4.5');
  t.false(field.predicate({ prop: -4 }));
  t.false(field.predicate({ prop: -4.5 }));
  t.true(field.predicate({ prop: -5 }));
  t.false(field.predicate({ foo: -5 }));
});
