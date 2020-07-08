const test = require('ava');

test('require() should throw', (t) => {
  t.throws(() => require('crystal-query'), {
    code: 'ERR_PACKAGE_PATH_NOT_EXPORTED'
  });
});
