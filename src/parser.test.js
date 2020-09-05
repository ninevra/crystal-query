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

test('language.quoted recognizes phrases with escaped backslashes', (t) => {
  const { quoted } = new Parser().language;
  t.like(quoted.parse(String.raw`"\\"`), { status: true, value: '\\' });
});

test('language.quoted unescapes other escape sequences', (t) => {
  const { quoted } = new Parser().language;
  t.like(quoted.parse(String.raw`"\a"`), { status: true, value: 'a' });
  t.like(quoted.parse(String.raw`"\b"`), { status: true, value: 'b' });
});

test('language.term recognizes terms', (t) => {
  const term = new Parser().language.term;
  t.deepEqual(term.parse('foo'), {
    status: true,
    value: {
      name: 'Term',
      field: '',
      operator: '',
      value: 'foo',
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 3, line: 1, column: 4 }
    }
  });
  t.deepEqual(term.parse('foo:bar'), {
    status: true,
    value: {
      name: 'Term',
      field: 'foo',
      operator: ':',
      value: 'bar',
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 7, line: 1, column: 8 }
    }
  });
  t.like(term.parse('>2'), {
    status: true,
    value: {
      name: 'Term',
      field: '',
      operator: '>',
      value: '2'
    }
  });
  t.like(term.parse('foo:"bar"'), {
    status: true,
    value: {
      name: 'Term',
      field: 'foo',
      operator: ':',
      value: 'bar'
    }
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
      child: {
        name: 'Term',
        field: '',
        operator: '',
        value: 'foo'
      }
    }
  });
  t.like(negation.parse('not not foo'), {
    status: true,
    value: {
      name: 'Not',
      child: {
        name: 'Not',
        child: {
          name: 'Term',
          field: '',
          operator: '',
          value: 'foo'
        }
      }
    }
  });
  t.like(negation.parse('not"foo"'), {
    status: true,
    value: {
      name: 'Not',
      child: { name: 'Term', field: '', operator: '', value: 'foo' }
    }
  });
});

test('language.negation recognizes "nota" as a term, not a negation', (t) => {
  const negation = new Parser().language.negation;
  t.like(negation.parse('nota'), {
    status: true,
    value: {
      name: 'Term',
      field: '',
      operator: '',
      value: 'nota'
    }
  });
});

test('language.conjunction recognizes terms, negations, and conjunctions', (t) => {
  const conjunction = new Parser().language.conjunction;
  t.like(conjunction.parse('foo:"bar"'), {
    status: true,
    value: {
      name: 'Term',
      field: 'foo',
      operator: ':',
      value: 'bar'
    }
  });
  t.like(conjunction.parse('not foo'), {
    status: true,
    value: {
      name: 'Not',
      child: { name: 'Term', field: '', operator: '', value: 'foo' }
    }
  });
  const result = conjunction.parse('not foo and not bar');
  t.like(result, {
    status: true,
    value: {
      name: 'And',
      left: {
        name: 'Not',
        child: { name: 'Term', field: '', operator: '', value: 'foo' }
      },
      right: {
        name: 'Not',
        child: { name: 'Term', field: '', operator: '', value: 'bar' }
      }
    }
  });
});

test('language.conjunction recognizes lists of terms', (t) => {
  const { conjunction } = new Parser().language;
  const result = conjunction.parse('a b');
  t.like(result, {
    status: true,
    value: {
      name: 'And',
      left: { name: 'Term', field: '', operator: '', value: 'a' },
      right: { name: 'Term', field: '', operator: '', value: 'b' }
    }
  });
});

test('language.conjunction lists have higher precedence than "or"', (t) => {
  const { disjunction } = new Parser().language;
  const result = disjunction.parse('a or b c');
  t.like(result, {
    status: true,
    value: {
      name: 'Or',
      left: { name: 'Term', field: '', operator: '', value: 'a' },
      right: {
        name: 'And',
        left: { name: 'Term', field: '', operator: '', value: 'b' },
        right: { name: 'Term', field: '', operator: '', value: 'c' }
      }
    }
  });
});

test('language.disjunction recognizes terms, disjunctions', (t) => {
  const disjunction = new Parser().language.disjunction;
  t.like(disjunction.parse('foo:"bar"'), {
    status: true,
    value: {
      name: 'Term',
      field: 'foo',
      operator: ':',
      value: 'bar'
    }
  });
  const result = disjunction.parse('a or b');
  t.like(result, {
    status: true,
    value: {
      name: 'Or',
      left: { name: 'Term', field: '', operator: '', value: 'a' },
      right: { name: 'Term', field: '', operator: '', value: 'b' }
    }
  });
});

test('language.disjunction places "and" at higher precedence than "or"', (t) => {
  const disjunction = new Parser().language.disjunction;
  const result = disjunction.parse('not a or b and c');
  t.like(result, {
    status: true,
    value: {
      name: 'Or',
      left: {
        name: 'Not',
        child: { name: 'Term', field: '', operator: '', value: 'a' }
      },
      right: { name: 'And' }
    }
  });
});

test('language.parenthetical recognizes parenthetical expressions', (t) => {
  const { parenthetical } = new Parser().language;
  const result = parenthetical.parse('(a b)');
  t.like(result, {
    status: true,
    value: { name: 'Parenthetical', expression: { name: 'And' } }
  });
});

test('language.parenthetical has higher precedence than "and"', (t) => {
  const { conjunction } = new Parser().language;
  const result = conjunction.parse('(a or b) and c');
  t.like(result, {
    status: true,
    value: {
      name: 'And',
      left: {
        name: 'Parenthetical',
        expression: { name: 'Or' }
      },
      right: {
        name: 'Term',
        field: '',
        operator: '',
        value: 'c'
      }
    }
  });
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
    value: { name: 'Not', child: { name: 'Parenthetical' } }
  });
});

test("strange/invalid terms don't cause fatal errors", (t) => {
  const { term, expression } = new Parser().language;
  t.like(term.parse('>'), {
    status: true,
    value: { name: 'Term', field: '', operator: '>', value: '' }
  });
  t.like(expression.parse('foo>>bar').value, {
    name: 'And',
    left: { name: 'Term', field: 'foo', operator: '>', value: '' },
    right: { name: 'Term', field: '', operator: '>', value: 'bar' }
  });
  t.like(expression.parse('foo: bar').value, {
    name: 'And',
    left: { name: 'Term', field: 'foo', operator: ':', value: '' },
    right: { name: 'Term', field: '', operator: '', value: 'bar' }
  });
  t.like(expression.parse('::bar').value, {
    name: 'And',
    left: { name: 'Term', field: '', operator: ':', value: '' },
    right: { name: 'Term', field: '', operator: ':', value: 'bar' }
  });
});

test("malformed conjunctions don't cause fatal errors", (t) => {
  const { conjunction } = new Parser().language;
  t.like(conjunction.parse('and').value, {
    name: 'And',
    left: { name: 'Term', field: '', operator: '', value: '' },
    right: { name: 'Term', field: '', operator: '', value: '' }
  });
  t.like(conjunction.parse('foo and ').value, {
    name: 'And',
    left: { name: 'Term', field: '', operator: '', value: 'foo' },
    right: { name: 'Term', field: '', operator: '', value: '' }
  });
  t.like(conjunction.parse('and bar').value, {
    name: 'And',
    left: { name: 'Term', field: '', operator: '', value: '' },
    right: { name: 'Term', field: '', operator: '', value: 'bar' }
  });
});

test("malformed disjunctions don't cause fatal errors", (t) => {
  const { disjunction } = new Parser().language;
  t.like(disjunction.parse('or').value, {
    name: 'Or',
    left: { name: 'Term', field: '', operator: '', value: '' },
    right: { name: 'Term', field: '', operator: '', value: '' }
  });
  t.like(disjunction.parse('foo or').value, {
    name: 'Or',
    left: { name: 'Term', field: '', operator: '', value: 'foo' },
    right: { name: 'Term', field: '', operator: '', value: '' }
  });
  t.like(disjunction.parse('or bar').value, {
    name: 'Or',
    left: { name: 'Term', field: '', operator: '', value: '' },
    right: { name: 'Term', field: '', operator: '', value: 'bar' }
  });
});

test("malformed negations don't cause fatal errors", (t) => {
  const { negation } = new Parser().language;
  t.like(negation.parse('not').value, {
    name: 'Not',
    child: { name: 'Term', field: '', operator: '', value: '' }
  });
});

test("surrounding whitespace doesn't break parsers", (t) => {
  const { expression } = new Parser().language;
  t.like(expression.parse(' foo '), { status: true });
  t.like(expression.parse(' not foo '), { status: true });
  t.like(expression.parse('( foo )'), { status: true });
  t.like(expression.parse(' ( foo ) '), { status: true });
});
