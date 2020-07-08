import { TermStatus } from './TermStatus.js';
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
        status: TermStatus.ERROR,
        error: this.errorDesciptors.missingField({ name })
      };
    } else if (!this.fields[name][operator]) {
      return {
        status: TermStatus.ERROR,
        error: this.errorDesciptors.missingOperator({ name, operator })
      };
    } else {
      const { status, describe, predicate, error } = this.fields[name][
        operator
      ](value);
      if (status) {
        return { status: TermStatus.SUCCESS, describe, predicate };
      } else {
        return { status: TermStatus.ERROR, error };
      }
    }
  }
}
