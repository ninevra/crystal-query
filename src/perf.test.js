import test from 'ava';
import jsStringEscape from 'js-string-escape';
import { Parser } from './parser.js';
import { astFromCst, queryFromCst } from './transforms.js';

const macro = test.macro({
  exec(t, input) {
    const name = `"${jsStringEscape(input)}"`;
    const result = new Parser().parse(input);
    t.snapshot(result, name);
    if (result.status) {
      t.snapshot(astFromCst(result.value), `AST: ${name}`);
      t.is(queryFromCst(result.value).trim(), input.trim());
    }
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

test(macro, '(((((((())))))))');
test(macro, '((((((((foo)))))))):(((((((bar)))))))');
