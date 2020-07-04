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

test('language.quoted recognizes quoted phrases', (t) => {
  const quoted = new Parser().language.quoted;
  t.like(quoted.parse('"foo bar"'), { status: true, value: 'foo bar' });
});

test('language.quoted recognizes phrases with escaped quotes', (t) => {
  const quoted = new Parser().language.quoted;
  t.like(quoted.parse(String.raw`"\""`), { status: true, value: '"' });
});

test('language.term recognizes terms', (t) => {
  const term = new Parser().language.term;
  t.deepEqual(term.parse('foo'), {
    status: true,
    value: {
      name: 'Term',
      value: ['', '', 'foo'],
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 3, line: 1, column: 4 },
    },
  });
  t.deepEqual(term.parse('foo:bar'), {
    status: true,
    value: {
      name: 'Term',
      value: ['foo', ':', 'bar'],
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 7, line: 1, column: 8 },
    },
  });
  t.like(term.parse('>2'), {
    status: true,
    value: {
      name: 'Term',
      value: ['', '>', '2'],
    },
  });
  t.like(term.parse('foo:"bar"'), {
    status: true,
    value: { name: 'Term', value: ['foo', ':', 'bar'] },
  });
});

test('language.term does not recognize keywords as lone values or field names', (t) => {
  const { term } = new Parser().language;
  t.like(term.parse('not'), { status: false });
  t.like(term.parse('not:foo'), { status: false });
});

test('language.negation recognizes negations', (t) => {
  const negation = new Parser().language.negation;
  t.like(negation.parse('not foo'), {
    status: true,
    value: {
      name: 'Not',
      value: {
        name: 'Term',
        value: ['', '', 'foo'],
      },
    },
  });
  t.like(negation.parse('not not foo'), {
    status: true,
    value: {
      name: 'Not',
      value: {
        name: 'Not',
        value: {
          name: 'Term',
          value: ['', '', 'foo'],
        },
      },
    },
  });
  t.like(negation.parse('not"foo"'), {
    status: true,
    value: { name: 'Not', value: { name: 'Term', value: ['', '', 'foo'] } },
  });
});

test('language.negation recognizes "nota" as a term, not a negation', (t) => {
  const negation = new Parser().language.negation;
  t.like(negation.parse('nota'), {
    status: true,
    value: {
      name: 'Term',
      value: ['', '', 'nota'],
    },
  });
});

test('language.conjunction recognizes terms, negations, and conjunctions', (t) => {
  const conjunction = new Parser().language.conjunction;
  t.like(conjunction.parse('foo:"bar"'), {
    status: true,
    value: {
      name: 'Term',
      value: ['foo', ':', 'bar'],
    },
  });
  t.like(conjunction.parse('not foo'), {
    status: true,
    value: { name: 'Not', value: { name: 'Term', value: ['', '', 'foo'] } },
  });
  let result = conjunction.parse('not foo and not bar');
  t.like(result, { status: true, value: { name: 'And' } });
  t.like(result.value.value[0], {
    name: 'Not',
    value: { name: 'Term', value: ['', '', 'foo'] },
  });
  t.like(result.value.value[1], {
    name: 'Not',
    value: { name: 'Term', value: ['', '', 'bar'] },
  });
});

test('language.disjunction recognizes terms, disjunctions', (t) => {
  const disjunction = new Parser().language.disjunction;
  t.like(disjunction.parse('foo:"bar"'), {
    status: true,
    value: {
      name: 'Term',
      value: ['foo', ':', 'bar'],
    },
  });
  let result = disjunction.parse('a or b');
  t.like(result, { status: true, value: { name: 'Or' } });
  t.like(result.value.value[0], { name: 'Term', value: ['', '', 'a'] });
  t.like(result.value.value[1], { name: 'Term', value: ['', '', 'b'] });
});

test('language.disjunction places "and" at higher precedence than "or"', (t) => {
  const disjunction = new Parser().language.disjunction;
  let result = disjunction.parse('not a or b and c');
  t.like(result, { status: true, value: { name: 'Or' } });
  t.like(result.value.value[0], {
    name: 'Not',
    value: { name: 'Term', value: ['', '', 'a'] },
  });
  t.like(result.value.value[1], { name: 'And' });
});

test('language.list recognizes lists of terms', (t) => {
  const list = new Parser().language.list;
  let result = list.parse('a b');
  t.like(result, { status: true, value: { name: 'And' } });
  t.like(result.value.value[0], { name: 'Term', value: ['', '', 'a'] });
  t.like(result.value.value[1], { name: 'Term', value: ['', '', 'b'] });
});

test('language.list has lower precedence than "or"', (t) => {
  const list = new Parser().language.list;
  let result = list.parse('a or b c');
  t.like(result, { status: true, value: { name: 'And' } });
  t.like(result.value.value[0], { name: 'Or' });
  t.like(result.value.value[0].value[0], {
    name: 'Term',
    value: ['', '', 'a'],
  });
  t.like(result.value.value[0].value[1], {
    name: 'Term',
    value: ['', '', 'b'],
  });
  t.like(result.value.value[1], { name: 'Term', value: ['', '', 'c'] });
});

test('language.parenthetical recognizes parenthetical expressions', (t) => {
  const { parenthetical } = new Parser().language;
  let result = parenthetical.parse('(a b)');
  t.like(result, {
    status: true,
    value: { name: 'Parenthetical', value: { name: 'And' } },
  });
});

test('language.parenthetical has higher precedence than "and"', (t) => {
  const { conjunction } = new Parser().language;
  let result = conjunction.parse('(a or b) and c');
  t.like(result, { status: true, value: { name: 'And' } });
  t.like(result.value.value[0], {
    name: 'Parenthetical',
    value: { name: 'Or' },
  });
  t.like(result.value.value[1], { name: 'Term', value: ['', '', 'c'] });
});

test('empty expressions', (t) => {
  // TODO: decide how to handle empty terms; IgnoredTerm, Term <'', '', ''> or
  // something else?
  const { expression } = new Parser().language;
  let result = expression.parse('');
  t.like(result, { status: true });
  result = expression.parse('()');
  t.like(result, { status: true, value: { name: 'Parenthetical' } });
  result = expression.parse('not ()');
  t.like(result, {
    status: true,
    value: { name: 'Not', value: { name: 'Parenthetical' } },
  });
});