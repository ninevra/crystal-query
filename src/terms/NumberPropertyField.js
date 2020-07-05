import { TermStatus } from './TermStatus.js';
import * as messages from '../messages.js';

function assertCastNumber(value) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    throw new TypeError(messages.errorWrongType({ type: 'number', value }));
  } else {
    return number;
  }
}

export class NumberPropertyField {
  constructor(name, plural, property) {
    this.name = name;
    this.plural = plural;
    this.property = property;
  }
  makeMessageArg({ value, negated }) {
    return { name: this.name, plural: this.plural, value, negated };
  }
  ':'(value) {
    value = assertCastNumber(value);
    return {
      describe: (negated) =>
        messages.fieldEquals(this.makeMessageArg({ value, negated })),
      predicate: (input) => input?.[this.property] === value
    };
  }
  '>'(value) {
    value = assertCastNumber(value);
    return {
      describe: (negated) =>
        messages.fieldGreaterThan(this.makeMessageArg({ value, negated })),
      predicate: (input) => input?.[this.property] > value
    };
  }
  '>='(value) {
    value = assertCastNumber(value);
    return {
      describe: (negated) =>
        messages.fieldGreaterOrEqual(this.makeMessageArg({ value, negated })),
      predicate: (input) => input?.[this.property] >= value
    };
  }
  '<='(value) {
    value = assertCastNumber(value);
    return {
      describe: (negated) =>
        messages.fieldLessOrEqual(this.makeMessageArg({ value, negated })),
      predicate: (input) => input?.[this.property] <= value
    };
  }
  '<'(value) {
    value = assertCastNumber(value);
    return {
      describe: (negated) =>
        messages.fieldLessThan(this.makeMessageArg({ value, negated })),
      predicate: (input) => input?.[this.property] < value
    };
  }
}
NumberPropertyField.prototype['='] = NumberPropertyField.prototype[':'];
