export function fieldGeneric({ name, operator, value, negated }) {
  return `${negated ? 'not ' : ''}${name}${operator}${value}`;
}

export function conjunction({ left, right }) {
  return `${left} and ${right}`;
}

export function disjunction({ left, right }) {
  return `${left} or ${right}`;
}

export function parenthetical({ expression }) {
  return `(${expression})`;
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

export function errorMissingField({ name }) {
  return `unknown field "${name}"`;
}

export function errorMissingOperator({ name, operator }) {
  return `can't use "${operator}" on field "${name}"`;
}

export function errorWrongType({ type, value }) {
  return `expected a ${type}, not "${value}"`;
}
