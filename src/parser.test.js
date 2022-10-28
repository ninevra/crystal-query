import test from 'ava';
import parsimmon from 'parsimmon';
import jsStringEscape from 'js-string-escape';
import { Parser } from './parser.js';

const nonterminalMacro = test.macro({
  exec(t, nonterminal, input) {
    t.snapshot(
      new Parser().language[nonterminal].parse(input),
      `${nonterminal}: "${jsStringEscape(input)}"`
    );
  },
  title(providedTitle, nonterminal, input) {
    const title = `${nonterminal}: "${jsStringEscape(input)}"`;

    if (providedTitle === undefined) {
      return title;
    }

    return `${providedTitle}: ${title}`;
  }
});

const initialNTMacro = test.macro({
  exec(t, nonterminal, input) {
    t.snapshot(
      new Parser().language[nonterminal].skip(parsimmon.all).parse(input),
      `${nonterminal}: "${jsStringEscape(input)}"`
    );
  },
  title(providedTitle, nonterminal, input) {
    const title = `initial ${nonterminal}: "${jsStringEscape(input)}"`;

    if (providedTitle === undefined) {
      return title;
    }

    return `${providedTitle}: ${title}`;
  }
});

const macro = test.macro({
  exec(t, input) {
    t.snapshot(new Parser().parse(input), `"${jsStringEscape(input)}"`);
  },
  title(providedTitle, input) {
    if (providedTitle === undefined) {
      providedTitle = '';
    } else {
      providedTitle += ': ';
    }

    return `${providedTitle}"${jsStringEscape(input)}"`;
  }
});

test(nonterminalMacro, 'operator', '>=');
test(nonterminalMacro, 'operator', '=');
test(nonterminalMacro, 'word', 'foo');

test(initialNTMacro, 'word', 'foo=');
test(initialNTMacro, 'word', 'foo"bar"');
test(initialNTMacro, 'word', 'foo(bar)');
test(initialNTMacro, 'word', 'foo>=');

test(nonterminalMacro, 'word', '>');
test(nonterminalMacro, 'word', '"foo"');
test(nonterminalMacro, 'word', '');
test(nonterminalMacro, 'word', 'foo=');

test(nonterminalMacro, 'string', '"foo bar"');
test(nonterminalMacro, 'string', String.raw`"\""`);
test(nonterminalMacro, 'string', String.raw`"\\"`);
test(nonterminalMacro, 'string', String.raw`"\a"`);
test(nonterminalMacro, 'string', String.raw`"\b"`);

test(nonterminalMacro, 'term', 'foo');
test(nonterminalMacro, 'term', 'foo:bar');
test(nonterminalMacro, 'term', '>2');
test(nonterminalMacro, 'term', 'foo:"bar"');
test(nonterminalMacro, 'term', 'not');
test(nonterminalMacro, 'term', 'not:foo');

test(nonterminalMacro, 'negation', 'not foo');
test(nonterminalMacro, 'negation', 'not not foo');
test(nonterminalMacro, 'negation', 'not"foo"');
test(nonterminalMacro, 'negation', 'nota');

test(nonterminalMacro, 'conjunction', 'foo:"bar"');
test(nonterminalMacro, 'conjunction', 'not foo');
test(nonterminalMacro, 'conjunction', 'not foo and not bar');

test(nonterminalMacro, 'conjunction', 'a b');

test(nonterminalMacro, 'disjunction', 'a or b c');

test(nonterminalMacro, 'disjunction', 'foo:"bar"');
test(nonterminalMacro, 'disjunction', 'a or b');
test(nonterminalMacro, 'disjunction', 'not a or b and c');

test(nonterminalMacro, 'parenthetical', '(a b)');
test(nonterminalMacro, 'parenthetical', '(a or b) and c');

test(macro, '>');

test(macro, 'foo>>bar');
test(macro, 'foo: bar');
test(macro, '::bar');

test(macro, 'and');
test(macro, 'foo and ');
test(macro, 'and bar');

test(macro, 'or');
test(macro, 'foo or');
test(macro, 'or bar');

test(macro, 'not');

test(macro, ' foo ');
test(macro, ' not foo ');
test(macro, '( foo )');
test(macro, ' ( foo ) ');
