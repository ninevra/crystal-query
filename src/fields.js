import * as messages from './messages.js';

export const Status = {
  SUCCESS: Symbol.for('query-filter.field-status.success'),
  ERROR: Symbol.for('query-filter.field-status.error')
};

export class GenericTermHandler {
  get(name, operator, value) {
    return {
      status: Status.SUCCESS,
      describe: (negated) =>
        messages.fieldGeneric({ name, operator, value, negated }),
      filter: (input) => {
        if (name !== '') input = input?.[name];
        switch (operator) {
          case '':
          case ':':
            return input?.includes?.(value) ?? false;
          case '>':
            return input > value;
          case '>=':
            return input >= value;
          case '=':
            return input == value;
          case '<=':
            return input <= value;
          case '<':
            return input < value;
          default:
            return false;
        }
      }
    };
  }
}

export class FieldTermHandler {
  constructor(
    fields,
    {
      errors: {
        missingField = messages.errorMissingField,
        missingOperator = messages.errorMissingOperator
      } = {}
    } = {}
  ) {
    this.fields = fields;
    this.errorDesciptors = { missingField, missingOperator };
  }
  get(name, operator, value) {
    if (!this.fields[name]) {
      return {
        status: Status.ERROR,
        error: this.errorDesciptors.missingField({ name })
      };
    } else if (!this.fields[name][operator]) {
      return {
        status: Status.ERROR,
        error: this.errorDesciptors.missingOperator({ name, operator })
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

export class StringField {
  constructor(name, plural, extractor, { caseSensitive = true } = {}) {
    this.name = name;
    this.plural = plural;
    if (typeof extractor === 'function') {
      this.extractor = extractor;
    } else {
      this.extractor = (value) => value?.[extractor];
    }
    this.caseSensitive = caseSensitive;
  }
  makeMessageArg({ value, negated }) {
    return {
      name: this.name,
      plural: this.plural,
      negated,
      value: `"${value}"`
    };
  }
  ':'(value) {
    value = this.caseSensitive ? value : value.toUpperCase();
    return {
      describe: (negated) =>
        messages.fieldContains(this.makeMessageArg({ value, negated })),
      filter: (object) => {
        let actual = this.extractor(object);
        if (!this.caseSensitive) actual = actual?.toUpperCase?.();
        return actual?.includes?.(value) ?? false;
      }
    };
  }
  '='(value) {
    value = this.caseSensitive ? value : value.toUpperCase();
    return {
      describe: (negated) =>
        messages.fieldEquals(this.makeMessageArg({ value, negated })),
      filter: (object) => {
        let actual = this.extractor(object);
        if (!this.caseSensitive) actual = actual?.toUpperCase?.();
        return actual === value;
      }
    };
  }
}

function assertCastNumber(value) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    throw new TypeError(messages.errorWrongType({ type: 'number', value }));
  } else {
    return number;
  }
}

export class NumberField {
  constructor(name, plural, extractor) {
    this.name = name;
    this.plural = plural;
    if (typeof extractor === 'function') {
      this.extractor = extractor;
    } else {
      this.extractor = (value) => value?.[extractor];
    }
  }
  makeMessageArg({ value, negated }) {
    return { name: this.name, plural: this.plural, value, negated };
  }
  ':'(value) {
    value = assertCastNumber(value);
    return {
      describe: (negated) =>
        messages.fieldEquals(this.makeMessageArg({ value, negated })),
      filter: (object) => this.extractor(object) === value
    };
  }
  '>'(value) {
    value = assertCastNumber(value);
    return {
      describe: (negated) =>
        messages.fieldGreaterThan(this.makeMessageArg({ value, negated })),
      filter: (object) => this.extractor(object) > value
    };
  }
  '>='(value) {
    value = assertCastNumber(value);
    return {
      describe: (negated) =>
        messages.fieldGreaterOrEqual(this.makeMessageArg({ value, negated })),
      filter: (object) => this.extractor(object) >= value
    };
  }
  '<='(value) {
    value = assertCastNumber(value);
    return {
      describe: (negated) =>
        messages.fieldLessOrEqual(this.makeMessageArg({ value, negated })),
      filter: (object) => this.extractor(object) <= value
    };
  }
  '<'(value) {
    value = assertCastNumber(value);
    return {
      describe: (negated) =>
        messages.fieldLessThan(this.makeMessageArg({ value, negated })),
      filter: (object) => this.extractor(object) < value
    };
  }
}
NumberField.prototype['='] = NumberField.prototype[':'];
