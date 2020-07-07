import test from 'ava';

test('import() should import all classes, messages', async (t) => {
  const mod = await import('query-filter');
  t.true(typeof mod.Parser === 'function');
  t.true(typeof mod.Schema === 'function');
  t.true(typeof mod.FieldTermHandler === 'function');
  t.true(typeof mod.GenericTermHandler === 'function');
  t.true(typeof mod.NumberPropertyField === 'function');
  t.true(typeof mod.StringPropertyField === 'function');
  t.truthy(mod.TermStatus);
  t.truthy(mod.TermStatus.SUCCESS);
  t.truthy(mod.messages);
  t.true(typeof mod.messages.fieldGeneric === 'function');
  t.falsy(mod.default);
});