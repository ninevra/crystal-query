import * as messages from '../messages.js';

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
    const casedValue = this.caseSensitive ? value : value.toUpperCase();
    return {
      status: true,
      describe: (negated) =>
        messages.fieldContains(this.makeMessageArg({ value, negated })),
      predicate: (input) => {
        let actual = input?.[this.property];
        if (!this.caseSensitive) actual = actual?.toUpperCase?.();
        return actual?.includes?.(casedValue) ?? false;
      }
    };
  }

  '='(value) {
    const casedValue = this.caseSensitive ? value : value.toUpperCase();
    return {
      status: true,
      describe: (negated) =>
        messages.fieldEquals(this.makeMessageArg({ value, negated })),
      predicate: (input) => {
        let actual = input?.[this.property];
        if (!this.caseSensitive) actual = actual?.toUpperCase?.();
        return actual === casedValue;
      }
    };
  }
}
