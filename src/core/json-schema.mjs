import { ValidationError } from './errors.mjs';

function matchesType(value, type) {
  return type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
    : type === 'array' ? Array.isArray(value)
      : type === 'string' ? typeof value === 'string'
        : type === 'number' ? typeof value === 'number' && Number.isFinite(value)
          : type === 'integer' ? Number.isInteger(value)
            : type === 'boolean' ? typeof value === 'boolean'
              : type === 'null' ? value === null : true;
}

function findError(schema, value, path = '$') {
  if (schema?.type && !matchesType(value, schema.type)) return `${path} doit être de type ${schema.type}`;
  if (schema?.enum && !schema.enum.some(item => Object.is(item, value))) return `${path} a une valeur interdite`;
  if (schema?.type === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) return `${path} doit contenir au moins ${schema.minLength} caractères`;
    if (schema.maxLength !== undefined && value.length > schema.maxLength) return `${path} doit contenir au plus ${schema.maxLength} caractères`;
    if (schema.pattern !== undefined && !(new RegExp(schema.pattern).test(value))) return `${path} ne respecte pas le format attendu`;
  }
  if (schema?.type === 'number' || schema?.type === 'integer') {
    if (schema.minimum !== undefined && value < schema.minimum) return `${path} doit être supérieur ou égal à ${schema.minimum}`;
    if (schema.maximum !== undefined && value > schema.maximum) return `${path} doit être inférieur ou égal à ${schema.maximum}`;
  }
  if (schema?.type === 'object') {
    for (const key of schema.required ?? []) if (!Object.prototype.hasOwnProperty.call(value, key)) return `${path}.${key} est requis`;
    if (schema.additionalProperties === false) for (const key of Object.keys(value)) if (!schema.properties?.[key]) return `${path}.${key} est interdit`;
    for (const [key, child] of Object.entries(schema.properties ?? {})) if (Object.prototype.hasOwnProperty.call(value, key)) {
      const error = findError(child, value[key], `${path}.${key}`); if (error) return error;
    }
  }
  if (schema?.type === 'array') {
    if (schema.minItems !== undefined && value.length < schema.minItems) return `${path} doit contenir au moins ${schema.minItems} éléments`;
    if (schema.maxItems !== undefined && value.length > schema.maxItems) return `${path} doit contenir au plus ${schema.maxItems} éléments`;
    for (const [index, item] of value.entries()) { const error = findError(schema.items, item, `${path}[${index}]`); if (error) return error; }
  }
  return null;
}

export function validateJsonSchema(schema, value) {
  const error = findError(schema, value);
  if (error) throw new ValidationError(`Sortie incompatible avec le JSON Schema : ${error}`);
  return value;
}
