const test = require('ava');

test('require() should throw', (t) => {
  t.throws(() => require('query-filter'), {
    code: 'ERR_PACKAGE_PATH_NOT_EXPORTED'
  });
});
