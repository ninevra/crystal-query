import test from 'ava';

import { And, Or, Not, Group, Literal, Word, Text, Term } from './nodes.js';

test('construct And from children array', (t) => {
  const left = new Literal({ value: 'foo' });
  const node = new And({ children: [left, ' ', 'and', ' ', undefined] });
  t.is(node.left, left);
  t.is(node.right, undefined);
  t.is(node.and, 'and');
});

test('construct And from named parts', (t) => {
  const left = new Literal({ value: 'foo' });
  const node = new And({ left, right: undefined, and: 'and' });
  t.deepEqual(node.children, [left, undefined, 'and', undefined, undefined]);
});

test('construct Or from children', (t) => {
  const children = literals('left', ' ', 'or', ' ', 'right');
  const node = new Or({ children });
  t.deepEqual(node.left, literal('left'));
  t.deepEqual(node.right, literal('right'));
  t.deepEqual(node.or, literal('or'));
});

test('construct Or from named parts', (t) => {
  const node = new Or({
    left: literal('left'),
    or: literal('or'),
    right: literal('right')
  });
  t.deepEqual(node.children, [
    literal('left'),
    undefined,
    literal('or'),
    undefined,
    literal('right')
  ]);
});

test('construct Text from named parts', (t) => {
  const node = new Text({
    open: literal('"'),
    content: literal(' foo '),
    close: literal('"')
  });
  t.deepEqual(node.children, [literal('"'), literal(' foo '), literal('"')]);
});

const clone = test.macro({
  exec(t, node) {
    const clone = new node.constructor(node);
    t.deepEqual(clone, node);
    t.not(clone, node);
  },
  title: (providedTitle, node) =>
    `Clone ${node.constructor.name}${providedTitle ?? ''}`
});

function literal(value) {
  return new Literal({ value });
}

function literals(...values) {
  return values.map((value) => literal(value));
}

test(clone, new And({ children: literals('foo', ' ', 'and', ' ', 'bar') }));
test(clone, new Or({ children: literals('foo', ' ', 'or', ' ', 'bar') }));
test(clone, new Not({ children: literals('not', ' ', 'foo') }));
test(clone, new Group({ children: literals('(', ' ', 'foo', ' ', ')') }));
test(clone, new Term({ children: literals('foo', ' ', ':', ' ', 'bar') }));
test(clone, new Literal({ value: 'foo', raw: 'bar' }));
test(clone, new Word({ value: 'foo', raw: 'bar' }));
test(clone, new Text({ children: literals('"', ' foo ', '"') }));
