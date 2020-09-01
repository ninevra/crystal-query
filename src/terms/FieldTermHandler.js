import * as messages from '../messages.js';

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
        status: false,
        error: this.errorDesciptors.missingField({ name })
      };
    }

    if (!this.fields[name][operator]) {
      return {
        status: false,
        error: this.errorDesciptors.missingOperator({ name, operator })
      };
    }

    return this.fields[name][operator](value);
  }
}
