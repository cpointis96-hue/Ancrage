import { ValidationError } from './errors.mjs';

const SUM_MAXIMUM_TOLERANCE = 1e-12;

function matchesType(value, type) {
  if (Array.isArray(type)) return type.some(item => matchesType(value, item));
  return type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
    : type === 'array' ? Array.isArray(value)
      : type === 'string' ? typeof value === 'string'
        : type === 'number' ? typeof value === 'number' && Number.isFinite(value)
          : type === 'integer' ? Number.isInteger(value)
            : type === 'boolean' ? typeof value === 'boolean'
              : type === 'null' ? value === null : true;
}

function hasType(schema, type) { return schema?.type === type || Array.isArray(schema?.type) && schema.type.includes(type); }

function decodePointerToken(token) {
  if (/~(?:[^01]|$)/.test(token)) return null;
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

function resolveReference(root, reference) {
  if (reference === '#') return { schema: root };
  if (typeof reference !== 'string' || !reference.startsWith('#/')) return { error: 'référence externe non prise en charge' };
  let target = root;
  for (const token of reference.slice(2).split('/')) {
    const key = decodePointerToken(token);
    if (key === null || target === null || typeof target !== 'object' || !Object.prototype.hasOwnProperty.call(target, key)) return { error: 'référence locale introuvable' };
    target = target[key];
  }
  if (target === null || typeof target !== 'object' || Array.isArray(target)) return { error: 'référence locale invalide' };
  return { schema: target };
}

function findError(schema, value, path = '$', root = schema, referenceChain = []) {
  if (schema && typeof schema === 'object' && Object.prototype.hasOwnProperty.call(schema, '$ref')) {
    const reference = schema.$ref;
    const resolved = resolveReference(root, reference);
    if (resolved.error) return `${path} contient une ${resolved.error}`;
    if (referenceChain.includes(reference)) return `${path} contient une référence circulaire`;
    return findError(resolved.schema, value, path, root, [...referenceChain, reference]);
  }
  if (schema?.type && !matchesType(value, schema.type)) return `${path} doit être de type ${schema.type}`;
  if (schema?.enum && !schema.enum.some(item => Object.is(item, value))) return `${path} a une valeur interdite`;
  if (hasType(schema, 'string') && typeof value === 'string') {
    const length = [...value].length;
    if (schema.minLength !== undefined && length < schema.minLength) return `${path} doit contenir au moins ${schema.minLength} caractères`;
    if (schema.maxLength !== undefined && length > schema.maxLength) return `${path} doit contenir au plus ${schema.maxLength} caractères`;
    if (schema.pattern !== undefined && !(new RegExp(schema.pattern).test(value))) return `${path} ne respecte pas le format attendu`;
  }
  if ((hasType(schema, 'number') || hasType(schema, 'integer')) && typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) return `${path} doit être supérieur ou égal à ${schema.minimum}`;
    if (schema.maximum !== undefined && value > schema.maximum) return `${path} doit être inférieur ou égal à ${schema.maximum}`;
  }
  if (hasType(schema, 'object') && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required ?? []) if (!Object.prototype.hasOwnProperty.call(value, key)) return `${path}.${key} est requis`;
    if (schema.additionalProperties === false) for (const key of Object.keys(value)) if (!schema.properties?.[key]) return `${path}.${key} est interdit`;
    for (const [key, child] of Object.entries(schema.properties ?? {})) if (Object.prototype.hasOwnProperty.call(value, key)) {
      const error = findError(child, value[key], `${path}.${key}`, root, referenceChain); if (error) return error;
    }
    if (schema.sumMaximum) {
      const { properties, maximumProperty } = schema.sumMaximum;
      const maximum = value[maximumProperty];
      const sum = properties.reduce((total, property) => total + value[property], 0);
      if (Number.isFinite(maximum) && properties.every(property => Number.isFinite(value[property])) && sum - maximum > SUM_MAXIMUM_TOLERANCE) return `${path}.${properties.join(' + ')} dépasse ${path}.${maximumProperty}`;
    }
  }
  if (hasType(schema, 'array') && Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) return `${path} doit contenir au moins ${schema.minItems} éléments`;
    if (schema.maxItems !== undefined && value.length > schema.maxItems) return `${path} doit contenir au plus ${schema.maxItems} éléments`;
    for (const [index, item] of value.entries()) { const error = findError(schema.items, item, `${path}[${index}]`, root, referenceChain); if (error) return error; }
  }
  if (schema?.if && !findError(schema.if, value, path, root, referenceChain)) {
    const error = findError(schema.then, value, path, root, referenceChain); if (error) return error;
  } else if (schema?.else) {
    const error = findError(schema.else, value, path, root, referenceChain); if (error) return error;
  }
  return null;
}

export function validateJsonSchema(schema, value) {
  const error = findError(schema, value);
  if (error) throw new ValidationError(`Sortie incompatible avec le JSON Schema : ${error}`);
  return value;
}
