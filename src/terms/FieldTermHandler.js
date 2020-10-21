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

  get(name, operator, value) {
    if (name == null && this.defaultField == null) {
      return {
        status: false,
        error: this.errorDesciptors.noField({ name, operator, value })
      };
    }

    const field = name == null ? this.defaultField : this.fields[name];

    if (field == null) {
      return {
        status: false,
        error: this.errorDesciptors.unsupportedField({ name, operator, value })
      };
    }

    // TODO this is a crude way of selecting the default operation, but it works
    if (field[operator ?? 'default'] == null) {
      if (operator == null) {
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

    if (value == null && !field.allowAbsentValue) {
      return {
        status: false,
        error: this.errorDesciptors.noValue({ name, operator, value })
      };
    }

    return field[operator](value);
  }
}
