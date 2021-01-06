import { fieldGeneric } from '../messages.js';

export class GenericTermHandler {
  get({ field: name, operator, value }) {
    return {
      status: true,
      allowAbsentValue: true,
      describe: (negated) =>
        fieldGeneric({
          name: name ?? '',
          operator: operator ?? '',
          value: value ?? '',
          negated
        }),
      predicate: (input) => {
        input = input?.[name];
        value = value ?? '';
        switch (operator) {
          case null:
          case undefined:
          case ':':
            return input?.includes?.(value) ?? false;
          case '>':
            return input > value;
          case '>=':
            return input >= value;
          case '=':
            return input == value; // eslint-disable-line eqeqeq
          case '<=':
            return input <= value;
          case '<':
            return input < value;
          default:
            return false;
        }
      }
    };
  }
}
