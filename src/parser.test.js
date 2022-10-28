import test from 'ava';
import parsimmon from 'parsimmon';
import { Parser } from './parser.js';

test('language.operator recognizes string operators', (t) => {
  const { operator } = new Parser().language;
  t.like(operator.parse('>='), { status: true, value: '>=' });
  t.like(operator.parse('='), { status: true, value: '=' });
});

test('language.word recognizes words', (t) => {
  const { word } = new Parser().language;
  const expected = { status: true, value: 'foo' };
  t.deepEqual(word.parse('foo'), expected);
});

test('language.word recognizes words when followed by terminators', (t) => {
  const { word } = new Parser().language;
  const wordThenEnd = word.skip(parsimmon.all);
  const expected = { status: true, value: 'foo' };
  t.deepEqual(wordThenEnd.parse('foo='), expected);
  t.deepEqual(wordThenEnd.parse('foo"bar"'), expected);
  t.deepEqual(wordThenEnd.parse('foo(bar)'), expected);
  t.deepEqual(wordThenEnd.parse('foo>='), expected);
});

test('language.word does not recognize non-words', (t) => {
  const word = new Parser().language.word;
  t.like(word.parse('>'), { status: false });
  t.like(word.parse('"foo"'), { status: false });
  t.like(word.parse(''), { status: false });
  t.false(word.parse('foo=').status);
});

test('language.string recognizes string phrases', (t) => {
  const string = new Parser().language.string;
  t.like(string.parse('"foo bar"'), { status: true, value: 'foo bar' });
});

test('language.string recognizes phrases with escaped quotes', (t) => {
  const string = new Parser().language.string;
  t.like(string.parse(String.raw`"\""`), { status: true, value: '"' });
});

test('language.string recognizes phrases with escaped backslashes', (t) => {
  const { string } = new Parser().language;
  t.like(string.parse(String.raw`"\\"`), { status: true, value: '\\' });
});

test('language.string unescapes other escape sequences', (t) => {
  const { string } = new Parser().language;
  t.like(string.parse(String.raw`"\a"`), { status: true, value: 'a' });
  t.like(string.parse(String.raw`"\b"`), { status: true, value: 'b' });
});

test('language.term recognizes terms', (t) => {
  const term = new Parser().language.term;

  for (const input of ['foo', 'foo:bar', '>2', 'foo:"bar"']) {
    t.snapshot(term.parse(input), `\`${input}\` as \`term\``);
  }
});

test('language.term does not recognize keywords as lone values or field names', (t) => {
  const { term } = new Parser().language;
  t.like(term.parse('not'), { status: false });
  t.like(term.parse('not:foo'), { status: false });
});

test('language.negation recognizes negations', (t) => {
  const negation = new Parser().language.negation;

  for (const input of ['not foo', 'not not foo', 'not"foo"']) {
    t.snapshot(negation.parse(input), `\`${input}\` as \`negation\``);
  }
});

test('language.negation recognizes "nota" as a term, not a negation', (t) => {
  const negation = new Parser().language.negation;
  t.like(negation.parse('nota'), {
    status: true,
    value: {
      name: 'Term',
      field: undefined,
      operator: undefined,
      value: 'nota'
    }
  });
});

test('language.conjunction recognizes terms, negations, and conjunctions', (t) => {
  const { conjunction } = new Parser().language;

  for (const input of ['foo:"bar"', 'not foo', 'not foo and not bar']) {
    t.snapshot(conjunction.parse(input), `\`${input}\` as \`conjunction\``);
  }
});

test('language.conjunction recognizes lists of terms', (t) => {
  const { conjunction } = new Parser().language;
  t.snapshot(conjunction.parse('a b'), `'a b' as conjunction`);
});

test('language.conjunction lists have higher precedence than "or"', (t) => {
  const { disjunction } = new Parser().language;
  t.snapshot(disjunction.parse('a or b c'), `'a or b c' as disjunction`);
});

test('language.disjunction recognizes terms, disjunctions', (t) => {
  const { disjunction } = new Parser().language;

  for (const input of ['foo:"bar"', 'a or b']) {
    t.snapshot(disjunction.parse(input), `'${input}' as disjunction`);
  }
});

test('language.disjunction places "and" at higher precedence than "or"', (t) => {
  const disjunction = new Parser().language.disjunction;
  t.snapshot(
    disjunction.parse('not a or b and c'),
    `'not a or b and c' as disjunction`
  );
});

test('language.parenthetical recognizes parenthetical expressions', (t) => {
  const { parenthetical } = new Parser().language;
  t.snapshot(parenthetical.parse('(a b)'), `'(a b)' as parenthetical`);
});

test('language.parenthetical has higher precedence than "and"', (t) => {
  const { conjunction } = new Parser().language;
  t.snapshot(
    conjunction.parse('(a or b) and c'),
    `'(a or b) and c' as conjunction`
  );
});

test('empty expressions and queries', (t) => {
  const { expression, query } = new Parser().language;
  t.like(expression.parse(''), { status: false });
  t.snapshot(query.parse(''));
  t.snapshot(expression.parse('()'));
  t.snapshot(expression.parse('not ()'));
});

test("strange/invalid terms don't cause fatal errors", (t) => {
  const { term, expression } = new Parser().language;

  t.snapshot(term.parse('>'), `'>' as term`);

  for (const input of ['foo>>bar', 'foo: bar', '::bar']) {
    t.snapshot(expression.parse(input), `'${input}' as expression`);
  }
});

test("malformed conjunctions don't cause fatal errors", (t) => {
  const { conjunction } = new Parser().language;

  for (const input of ['and', 'foo and ', 'and bar']) {
    t.snapshot(conjunction.parse(input), `'${input}' as conjunction`);
  }
});

test("malformed disjunctions don't cause fatal errors", (t) => {
  const { disjunction } = new Parser().language;

  for (const input of ['or', 'foo or', 'or bar']) {
    t.snapshot(disjunction.parse(input), `'${input}' as disjunction`);
  }
});

test("malformed negations don't cause fatal errors", (t) => {
  const { negation } = new Parser().language;
  t.snapshot(negation.parse('not'), `'not' as negation`);
});

test("surrounding whitespace doesn't break parsers", (t) => {
  const { query } = new Parser().language;
  t.like(query.parse(' foo '), { status: true });
  t.like(query.parse(' not foo '), { status: true });
  t.like(query.parse('( foo )'), { status: true });
  t.like(query.parse(' ( foo ) '), { status: true });
});
