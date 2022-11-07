import test from 'ava';

import { And, Literal } from './nodes.js';

test('construct node from children array', (t) => {
  const left = new Literal({ value: 'foo' });
  const node = new And({ children: [left, ' ', 'and', ' ', undefined] });
  t.is(node.left, left);
  t.is(node.right, undefined);
  t.is(node.and, 'and');
});

test('construct node from named parts', (t) => {
  const left = new Literal({ value: 'foo' });
  const node = new And({ left, right: undefined, and: 'and' });
  t.is(node.left, left);
  t.is(node.right, undefined);
  t.is(node.and, 'and');
});

test('construct node from other node', (t) => {
  const left = new Literal({ value: 'foo' });
  const node = new And({ left, right: undefined, and: 'and' });
  t.deepEqual(new And(node), node);
});
