import { fieldGeneric } from '../messages.js';

export class GenericTermHandler {
  get(name, operator, value) {
    return {
      status: true,
      describe: (negated) => fieldGeneric({ name, operator, value, negated }),
      predicate: (input) => {
        if (name !== '') input = input?.[name];
        switch (operator) {
          case '':
          case ':':
            return input?.includes?.(value) ?? false;
          case '>':
            return input > value;
          case '>=':
            return input >= value;
          case '=':
            return input == value;
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
