import { Status } from './termStatus.js';
import * as messages from './messages.js';

export class StringPropertyField {
  constructor(name, plural, property, { caseSensitive = true } = {}) {
    this.name = name;
    this.plural = plural;
    this.property = property;
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
        let actual = object?.[this.property];
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
        let actual = object?.[this.property];
        if (!this.caseSensitive) actual = actual?.toUpperCase?.();
        return actual === value;
      }
    };
  }
}
