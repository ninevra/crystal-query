import { StringPropertyField } from './StringPropertyField.js';
import test from 'ava';

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

test('StringPropertyField caseSensitive', (t) => {
  const sensitive = new StringPropertyField('some field', false, 'foo');
  t.false(sensitive['=']('bar').filter({ foo: 'BaR' }));
  t.false(sensitive[':']('bar').filter({ foo: 'BaRBaZ' }));
  const insensitive = new StringPropertyField('some field', false, 'foo', {
    caseSensitive: false
  });
  t.true(insensitive['=']('bar').filter({ foo: 'BaR' }));
  t.true(insensitive[':']('bar').filter({ foo: 'BaRBaZ' }));
});

test.todo('StringPropertyField pluralization');
test.todo('StringPropertyField negation');
