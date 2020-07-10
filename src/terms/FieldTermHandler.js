import * as messages from '../messages.js';

export class FieldTermHandler {
  constructor(
    fields,
    {
      errors: {
        missingField = messages.errorMissingField,
        missingOperator = messages.errorMissingOperator,
        missingValue = messages.errorMissingValue
      } = {}
    } = {}
  ) {
    this.fields = fields;
    this.errorDesciptors = { missingField, missingOperator, missingValue };
  }
  get(name, operator, value) {
    if (value === '') {
      return {
        status: false,
        error: this.errorDesciptors.missingValue({ name, operator })
      };
    } else if (!this.fields[name]) {
      return {
        status: false,
        error: this.errorDesciptors.missingField({ name })
      };
    } else if (!this.fields[name][operator]) {
      return {
        status: false,
        error: this.errorDesciptors.missingOperator({ name, operator })
      };
    } else {
      return this.fields[name][operator](value);
    }
  }
}
