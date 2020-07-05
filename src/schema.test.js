import { Schema } from './schema.js';
import { Parser } from './parser.js';
import { StringPropertyField } from './terms/StringPropertyField.js';
import { NumberPropertyField } from './terms/NumberPropertyField.js';
import { FieldTermHandler } from './terms/FieldTermHandler.js';
import * as messages from './messages.js';
import test from 'ava';

test('describe() renders query descriptions', (t) => {
  const query = 'not (a or b:"c d") and e>3';
  const description = new Schema().describe(query);
  t.snapshot(description);
});

test('evaluate() returns a function', (t) => {
  const query = 'not (a or b:"c d") and e>3';
  const predicate = new Schema().evaluate(query);
  t.is(typeof predicate, 'function');
});

test('parse() returns parsed ast on success', (t) => {
  const query = 'not (a or b:"c d") and e>3';
  t.like(new Schema().parse(query), {
    status: true,
    errors: [],
    ast: { name: 'And' }
  });
});

function assertSyntaxError(t, result) {
  t.like(result, { status: false });
  t.is(result.errors.length, 1);
  t.regex(result.errors[0], /syntax error: expected \[.*\]/);
}

test('parse() returns syntax error on unclosed parenthesis', (t) => {
  let result = new Schema().parse('not (a b c');
  assertSyntaxError(t, result);
  assertSyntaxError(t, new Schema().parse('not a) b c'));
});

test('parse() returns syntax error on unclosed quotes', (t) => {
  assertSyntaxError(t, new Schema().parse('a:"b c'));
  assertSyntaxError(t, new Schema().parse('foo "'));
});

test('parse() returns syntax error on invalid fields', (t) => {
  // TODO: '"foo":bar' parses currently, as <foo and :bar>. This is a confusing
  // side effect of allowing nameless field queries; consider removing them
  let others = ['"foo":bar'];
  let fields = ['>', 'a<>b', 'foo= bar', 'and:foo'];
  fields.map((field) => assertSyntaxError(t, new Schema().parse(field)));
});

test('parse() returns field error on unsupported fields or operators', (t) => {
  const schema = new Schema({
    termHandler: new FieldTermHandler({
      foo: new StringPropertyField('foo', false, 'foo'),
      bar: new NumberPropertyField('bar', false, 'bar')
    })
  });
  t.like(schema.parse('foo>bar <2 bar:baz baz:foo'), {
    status: false,
    errors: [
      messages.errorMissingOperator({ name: 'foo', operator: '>' }),
      messages.errorMissingField({ name: '' }),
      messages.errorWrongType({ type: 'number', value: 'baz' }),
      messages.errorMissingField({ name: 'baz' })
    ]
  });
});

test('query() returns all applicable of ast, description, evaluator, errors', (t) => {
  const schema = new Schema();
  let query = 'not (a or b:"c d") and e>3';
  let result = schema.query(query);
  t.like(result, {
    status: true,
    ast: new Parser().parse(query).value,
    description: 'not ("a" or b:"c d") and e>"3"',
    errors: []
  });
  t.true(result.predicate({ e: 4, b: NaN }));
  t.false(result.predicate(['a']));

  query = 'not (a or b:"c d) and e>3';
  result = schema.query(query);
  assertSyntaxError(t, result);
  t.is(result.ast, undefined);
  t.is(result.description, undefined);
  t.is(result.predicate, undefined);
});
