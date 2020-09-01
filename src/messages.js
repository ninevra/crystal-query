export function fieldGeneric({ name, operator, value, negated }) {
  return `${negated ? 'not ' : ''}${name}${operator}"${value}"`;
}

export function conjunction({ left, right }) {
  return `${left} and ${right}`;
}

export function disjunction({ left, right }) {
  return `${left} or ${right}`;
}

export function parenthetical({ expression, negated }) {
  return `${negated ? 'not ' : ''}(${expression})`;
}

export function fieldContains({ name, plural, value, negated }) {
  let verb;
  if (plural && negated) {
    verb = 'do not contain';
  } else if (plural && !negated) {
    verb = 'contain';
  } else if (!plural && negated) {
    verb = 'does not contain';
  } else if (!plural && !negated) {
    verb = 'contains';
  }

  return `${name} ${verb} ${value}`;
}

export function fieldEquals({ name, plural, value, negated }) {
  let verb;
  if (plural && negated) {
    verb = 'do not equal';
  } else if (plural && !negated) {
    verb = 'equal';
  } else if (!plural && negated) {
    verb = 'does not equal';
  } else if (!plural && !negated) {
    verb = 'equals';
  }

  return `${name} ${verb} ${value}`;
}

function fieldSimple({ name, plural, value, negated, relation }) {
  return `${name} ${plural ? 'are' : 'is'}${
    negated ? ' not' : ''
  } ${relation} ${value}`;
}

export function fieldGreaterThan(args) {
  return fieldSimple({ ...args, relation: 'greater than' });
}

export function fieldGreaterOrEqual(args) {
  return fieldSimple({ ...args, relation: 'at least' });
}

export function fieldLessOrEqual(args) {
  return fieldSimple({ ...args, relation: 'at most' });
}

export function fieldLessThan(args) {
  return fieldSimple({ ...args, relation: 'less than' });
}

export function errorMissingField({ name }) {
  return `unknown field "${name}"`;
}

export function errorMissingOperator({ name, operator }) {
  return `can't use "${operator}" on field "${name}"`;
}

export function errorWrongType({ type, value }) {
  return `expected a ${type}, not "${value}"`;
}
