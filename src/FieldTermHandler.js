import { Status } from './termStatus.js';
import * as messages from './messages.js';

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
