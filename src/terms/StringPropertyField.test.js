import { StringPropertyField } from './StringPropertyField.js';
import test from 'ava';

test('StringPropertyField supports ":"', (t) => {
  const field = new StringPropertyField('some field', false, 'foo')[':']('bar');
  t.is(field.describe(false), 'some field contains "bar"');
  t.true(field.predicate({ foo: 'bar' }));
  t.true(field.predicate({ foo: 'foobarbaz' }));
  t.false(field.predicate({ foo: 'baz' }));
  t.false(field.predicate({ baz: 'bar' }));
});

test('StringPropertyField supports "="', (t) => {
  const field = new StringPropertyField('some field', false, 'foo')['=']('bar');
  t.is(field.describe(false), 'some field equals "bar"');
  t.true(field.predicate({ foo: 'bar' }));
  t.false(field.predicate({ foo: 'foobarbaz' }));
});

test('StringPropertyField caseSensitive', (t) => {
  const sensitive = new StringPropertyField('some field', false, 'foo');
  t.false(sensitive['=']('bar').predicate({ foo: 'BaR' }));
  t.false(sensitive[':']('bar').predicate({ foo: 'BaRBaZ' }));
  const insensitive = new StringPropertyField('some field', false, 'foo', {
    caseSensitive: false
  });
  t.true(insensitive['=']('bar').predicate({ foo: 'BaR' }));
  t.true(insensitive[':']('bar').predicate({ foo: 'BaRBaZ' }));
});

test.todo('StringPropertyField pluralization');
test.todo('StringPropertyField negation');
