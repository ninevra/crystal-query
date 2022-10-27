import test from 'ava';
import { Parser } from './parser.js';

const macro = test.macro((t, inputs) => {
  for (const input of inputs) {
    t.snapshot(new Parser().parse(input), `"${input}"`);
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

test('expressions', macro, [
  'a:one or b:two and not c:three',
  '(a:one or (b:two)) and not c:three',
  'not not a:one and b:two'
]);

test('whitespace', macro, ['', '   ', '\t ', ' a:one', 'a:one ', ' a:one ']);
