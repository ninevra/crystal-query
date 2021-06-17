import * as messages from '../messages.js';
import { PropError } from '../schema.js';

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

    this.defaultField =
      typeof defaultField === 'string'
        ? this.fields[defaultField]
        : defaultField;

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
      throw new PropError(
        this.errorDesciptors.noField({ name, operator, value })
      );
    }

    const field = name === undefined ? this.defaultField : this.fields[name];

    if (field === undefined) {
      throw new PropError(
        this.errorDesciptors.unsupportedField({ name, operator, value })
      );
    }

    // TODO this is a crude way of selecting the default operation, but it works
    if (field[operator ?? 'default'] === undefined) {
      if (operator === undefined) {
        throw new PropError(
          this.errorDesciptors.noOperator({ name, operator, value })
        );
      }

      throw new PropError(
        this.errorDesciptors.unsupportedOperator({
          name,
          operator,
          value
        })
      );
    }

    if (value === undefined && !field.allowAbsentValue) {
      throw new PropError(
        this.errorDesciptors.noValue({ name, operator, value })
      );
    }

    const { status, error, ...data } = field[operator](value);

    if (!status) {
      throw new PropError(error);
    }

    return data;
  }
}
