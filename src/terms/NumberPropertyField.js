import * as messages from '../messages.js';

export class NumberPropertyField {
  constructor(name, plural, property) {
    this.name = name;
    this.plural = plural;
    this.property = property;
  }
  makeResponse(value, func) {
    const castValue = Number(value);
    if (Number.isNaN(castValue)) {
      return {
        status: false,
        error: messages.errorWrongType({ type: 'number', value })
      };
    } else {
      return { status: true, ...func(castValue) };
    }
  }
  makeMessageArg({ value, negated }) {
    return { name: this.name, plural: this.plural, value, negated };
  }
  ':'(value) {
    return this.makeResponse(value, (value) => ({
      describe: (negated) =>
        messages.fieldEquals(this.makeMessageArg({ value, negated })),
      predicate: (input) => input?.[this.property] === value
    }));
  }
  '>'(value) {
    return this.makeResponse(value, (value) => ({
      describe: (negated) =>
        messages.fieldGreaterThan(this.makeMessageArg({ value, negated })),
      predicate: (input) => input?.[this.property] > value
    }));
  }
  '>='(value) {
    return this.makeResponse(value, (value) => ({
      describe: (negated) =>
        messages.fieldGreaterOrEqual(this.makeMessageArg({ value, negated })),
      predicate: (input) => input?.[this.property] >= value
    }));
  }
  '<='(value) {
    return this.makeResponse(value, (value) => ({
      describe: (negated) =>
        messages.fieldLessOrEqual(this.makeMessageArg({ value, negated })),
      predicate: (input) => input?.[this.property] <= value
    }));
  }
  '<'(value) {
    return this.makeResponse(value, (value) => ({
      describe: (negated) =>
        messages.fieldLessThan(this.makeMessageArg({ value, negated })),
      predicate: (input) => input?.[this.property] < value
    }));
  }
}
NumberPropertyField.prototype['='] = NumberPropertyField.prototype[':'];
