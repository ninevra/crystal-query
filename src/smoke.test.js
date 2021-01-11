import test from 'ava';

test('import() should import all classes, messages', async (t) => {
  const mod = await import('crystal-query');
  t.true(typeof mod.Parser === 'function');
  t.true(typeof mod.Schema === 'function');
  t.true(typeof mod.PropError === 'function');
  t.true(typeof mod.FieldTermHandler === 'function');
  t.true(typeof mod.NumberPropertyField === 'function');
  t.true(typeof mod.StringPropertyField === 'function');
  t.true(typeof mod.StringArrayPropertyField === 'function');
  t.truthy(mod.messages);
  t.true(typeof mod.messages.fieldGeneric === 'function');
  t.falsy(mod.default);
});
