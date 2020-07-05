import { StringPropertyField } from './StringPropertyField.js';
import { NumberPropertyField } from './NumberPropertyField.js';
import { FieldTermHandler } from './FieldTermHandler.js';
import { TermStatus } from './TermStatus.js';

import test from 'ava';

test.beforeEach((t) => {
  t.context.string = new StringPropertyField('some field', false, 'foo');
  t.context.number = new NumberPropertyField('a number', false, 'prop');
  t.context.handler = new FieldTermHandler({
    string: t.context.string,
    number: t.context.number
  });
});

test('FieldTermHandler retrieves appropriate fields', (t) => {
  const handler = t.context.handler;
  t.is(handler.get('number', '=', '5').describe(), 'a number equals 5');
  t.is(handler.get('number', ':', '4').describe(), 'a number equals 4');
  t.is(
    handler.get('string', ':', 'foo').describe(),
    'some field contains "foo"'
  );
});

test('FieldTermHandler returns appropriate error on missing fields', (t) => {
  const handler = t.context.handler;
  t.like(handler.get('absent', '=', '5'), {
    status: TermStatus.ERROR,
    error: 'unknown field "absent"'
  });
});

test('FieldTermHandler returns appropriate error on missing operators', (t) => {
  t.like(t.context.handler.get('string', '>', 'blah'), {
    status: TermStatus.ERROR,
    error: 'can\'t use ">" on field "string"'
  });
});
