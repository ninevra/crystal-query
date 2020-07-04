import * as messages from './messages.js';

export const Status = {
  SUCCESS: Symbol.for('query-filter.field-status.success'),
  ERROR: Symbol.for('query-filter.field-status.error'),
};

export class GenericFieldHandler {
  get(name, operator, value) {
    return {
      status: Status.SUCCESS,
      describe: (negated) =>
        messages.fieldGeneric({ name, operator, value, negated }),
      filter: () => true,
    };
  }
}

export class FieldHandler {
  constructor(
    fields,
    {
      errors: {
        missingField = messages.errorMissingField,
        missingOperator = messages.errorMissingOperator,
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
        error: this.errorDesciptors.missingField({ name }),
      };
    } else if (!this.fields[name][operator]) {
      return {
        status: Status.ERROR,
        error: this.errorDesciptors.missingOperator({ name, operator }),
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
        messages.fieldContains({
          name: this.name,
          plural: this.plural,
          negated,
          value: `"${value}"`,
        }),
      filter: (object) => object?.[this.property]?.includes(value) ?? false,
    };
  }
  '='(value) {
    return {
      describe: (negated) =>
        messages.fieldEquals({
          name: this.name,
          plural: this.plural,
          negated,
          value: `"${value}"`,
        }),
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
      throw new TypeError(messages.errorWrongType({ type: 'number', value }));
    return {
      describe: (negated) =>
        messages.fieldEquals({
          name: this.name,
          plural: this.plural,
          value,
          negated,
        }),
      filter: (object) => object?.[this.property] === value,
    };
  }
}
NumberPropertyField.prototype['='] = NumberPropertyField.prototype[':'];
