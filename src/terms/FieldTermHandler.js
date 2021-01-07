import * as messages from '../messages.js';

export class FieldTermHandler {
  constructor(
    fields,
    {
      defaultField,
      errors: {
        noField = messages.errorNoField,
        unsupportedField = messages.errorUnsupportedField,
        noOperator = messages.errorNoOperator,
        unsupportedOperator = messages.errorUnsupportedOperator,
        noValue = messages.errorNoValue
      } = {}
    } = {}
  ) {
    this.fields = fields;

    if (typeof defaultField === 'string') {
      this.defaultField = this.fields[defaultField];
    } else {
      this.defaultField = defaultField;
    }

    this.errorDesciptors = {
      noField,
      unsupportedField,
      noOperator,
      unsupportedOperator,
      noValue
    };
  }

  get({ field: name, operator, value }) {
    if (name === undefined && this.defaultField === undefined) {
      return {
        status: false,
        error: this.errorDesciptors.noField({ name, operator, value })
      };
    }

    const field = name === undefined ? this.defaultField : this.fields[name];

    if (field === undefined) {
      return {
        status: false,
        error: this.errorDesciptors.unsupportedField({ name, operator, value })
      };
    }

    // TODO this is a crude way of selecting the default operation, but it works
    if (field[operator ?? 'default'] === undefined) {
      if (operator === undefined) {
        return {
          status: false,
          error: this.errorDesciptors.noOperator({ name, operator, value })
        };
      }

      return {
        status: false,
        error: this.errorDesciptors.unsupportedOperator({
          name,
          operator,
          value
        })
      };
    }

    if (value === undefined && !field.allowAbsentValue) {
      return {
        status: false,
        error: this.errorDesciptors.noValue({ name, operator, value })
      };
    }

    return field[operator](value);
  }
}
