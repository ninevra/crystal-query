import { Status } from './termStatus.js';
import { fieldGeneric } from './messages.js';

export class GenericTermHandler {
  get(name, operator, value) {
    return {
      status: Status.SUCCESS,
      describe: (negated) => fieldGeneric({ name, operator, value, negated }),
      filter: (input) => {
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
