import test from 'ava';
import { StringArrayPropertyField } from './StringArrayPropertyField.js';

test('supports ":"', (t) => {
  const field = new StringArrayPropertyField('some strings', true, 'foo');
  t.is(field[':']('bar').describe(), 'some strings contain "bar"');
  t.true(field[':']('bar').predicate({ foo: ['bar', 'baz'] }));
  t.false(field[':']('bar').predicate({ foo: ['baz'] }));
});
