import * as messages from '../messages.js';

export class StringArrayPropertyField {
  constructor(name, plural, property, { caseSensitive = true } = {}) {
    this.name = name;
    this.plural = plural;
    this.property = property;
    this.caseSensitive = caseSensitive;
  }
  ':'(value) {
    const casedValue = this.caseSensitive ? value : value.toUpperCase();
    return {
      describe: (negated) =>
        messages.fieldContains({
          name: this.name,
          plural: this.plural,
          negated,
          value: `"${value}"`
        }),
      predicate: (input) =>
        input[this.property].some((item) => {
          const casedItem = this.caseSensitive ? item : item?.toUpperCase?.();
          return casedItem?.includes?.(casedValue);
        })
    };
  }
}
