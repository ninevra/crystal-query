import test from 'ava';
import { Parser } from './parser.js';

const macro = test.macro((t, inputs) => {
  for (const input of inputs) {
    /* eslint-disable ava/assertion-arguments */
    t.snapshot(new Parser().parse(input), input);
    /* eslint-enable ava/assertion-arguments */
  }
});

test('fields', macro, [
  'value',
  '"value"',
  '42',
  'field:',
  'field:value',
  ':value',
  ':',
  'a:b:c',
  'a:b:c:',
  'a: b: c:'
]);

test('fields and keywords', macro, [
  'field:and',
  'field:"and"',
  'and:value',
  'and"value"',
  'field:not',
  'field:"not"',
  'not:value',
  'not"value"'
]);

test('parens', macro, [
  '(a:one b:two)',
  '()',
  '(',
  ')',
  '(a:one',
  'a:one)',
  '(and)',
  '(or)',
  '(not)'
]);
