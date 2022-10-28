import test from 'ava';
import jsStringEscape from 'js-string-escape';
import { Parser } from './parser.js';

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

test(macro, 'value');
test(macro, '"value"');
test(macro, '42');
test(macro, 'field:');
test(macro, 'field:value');
test(macro, ':value');
test(macro, ':');
test(macro, 'a:b:c');
test(macro, 'a:b:c:');
test(macro, 'a: b: c:');

test(macro, 'field:and');
test(macro, 'field:"and"');
test(macro, 'and:value');
test(macro, 'and"value"');
test(macro, 'field:not');
test(macro, 'field:"not"');
test(macro, 'not:value');
test(macro, 'not"value"');

test(macro, '(a:one b:two)');
test(macro, '()');
test(macro, '(');
test(macro, ')');
test(macro, '(a:one');
test(macro, 'a:one)');
test(macro, '(and)');
test(macro, '(or)');
test(macro, '(not)');

test(macro, 'a:one or b:two and not c:three');
test(macro, '(a:one or (b:two)) and not c:three');
test(macro, 'not not a:one and b:two');

test(macro, '');
test('spaces', macro, '   ');
test('tab character', macro, '\t ');
test(macro, ' a:one');
test(macro, 'a:one ');
test(macro, ' a:one ');

test(macro, '"foo:bar"');
test(macro, '""');
test(macro, '" "');
test(macro, '"(a:one and two) or not three"');
test(macro, '"""');
test(macro, '""""');
test(macro, 'a:"""""');
test(macro, String.raw`"\""`);
test(macro, "''");
test(macro, `'""'`);
test(macro, String.raw`"\\""`);
