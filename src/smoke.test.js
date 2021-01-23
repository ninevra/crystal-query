import test from 'ava';

test('import() should import all classes, messages', async (t) => {
  t.snapshot(await import('crystal-query'));
});
