export async function resolve(specifier, context, nextResolve) {
  let spec = specifier;
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.(ts|js|mjs|cjs|json)$/.test(specifier)) spec = specifier + '.ts';
  const result = await nextResolve(spec, context);
  if (result.url.endsWith('.json')) return {...result, importAttributes: {...result.importAttributes, type: 'json'}};
  return result;
}
