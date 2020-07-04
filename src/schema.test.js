import { Schema } from './schema.js';
import { Parser } from './grammar.js';
import test from 'ava';

test('describe() renders query descriptions', (t) => {
  const query = 'not (a or b:"c d") and e>3';
  const description = new Schema().describe(query);
  console.log(description);
  t.snapshot(description);
});

test('evaluate() returns a function', (t) => {
  const query = 'not (a or b:"c d") and e>3';
  const filter = new Schema().evaluate(query);
  t.is(typeof filter, 'function');
});