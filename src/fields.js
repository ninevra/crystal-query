export const Status = {
  SUCCESS: Symbol.for('query-filter.field-status.success'),
  ERROR: Symbol.for('query-filter.field-status.error'),
};

export class GenericFieldHandler {
  get(name, operator, value) {
    return {
      status: Status.SUCCESS,
      describe: (negated) =>
        `${negated ? 'not ' : ''}${name}${operator}${value}`,
      filter: () => true,
    };
  }
}

export class FieldHandler {
  constructor(
    fields,
    {
      errors: {
        missingField = (name) => `unknown field "${name}"`,
        missingOperator = (name, operator) =>
          `can't use "${operator}" on field "${name}"`,
      } = {},
    } = {}
  ) {
    this.fields = fields;
    this.errorDesciptors = { missingField, missingOperator };
  }
  get(name, operator, value) {
    if (!this.fields[name]) {
      return {
        status: Status.ERROR,
        error: this.errorDesciptors.missingField(name),
      };
    } else if (!this.fields[name][operator]) {
      return {
        status: Status.ERROR,
        error: this.errorDesciptors.missingOperator(name, operator),
      };
    } else {
      try {
        const field = this.fields[name][operator](value);
        return { status: Status.SUCCESS, ...field };
      } catch (e) {
        return { status: Status.ERROR, error: e.message };
      }
    }
  }
}

export class StringPropertyField {
  constructor(name, plural, property) {
    this.name = name;
    this.plural = plural;
    this.property = property;
  }
  ':'(value) {
    return {
      describe: (negated) =>
        `${this.name} ${
          negated
            ? this.plural
              ? 'do not contain'
              : 'does not contain'
            : this.plural
            ? 'contain'
            : 'contains'
        } "${value}"`,
      filter: (object) => object?.[this.property]?.includes(value) ?? false,
    };
  }
  '='(value) {
    return {
      describe: (negated) =>
        `${this.name} ${
          negated
            ? this.plural
              ? 'do not equal'
              : 'does not equal'
            : this.plural
            ? 'equal'
            : 'equals'
        } "${value}"`,
      filter: (object) => object?.[this.property] === value,
    };
  }
}

export class NumberPropertyField {
  constructor(name, plural, property) {
    this.name = name;
    this.plural = plural;
    this.property = property;
  }
  ':'(value) {
    value = Number(value);
    if (Number.isNaN(value))
      throw new TypeError(`expected a number, not "${value}"`);
    return {
      describe: (negated) =>
        `${this.name} ${
          negated
            ? this.plural
              ? 'do not equal'
              : 'does not equal'
            : this.plural
            ? 'equal'
            : 'equals'
        } ${value}`,
      filter: (object) => object?.[this.property] === value,
    };
  }
}
NumberPropertyField.prototype['='] = NumberPropertyField.prototype[':'];
