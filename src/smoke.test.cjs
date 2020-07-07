const test = require('ava');

test('require() should throw', (t) => {
  t.throws(() => require('oracle-query'), {
    code: 'ERR_PACKAGE_PATH_NOT_EXPORTED'
  });
});
