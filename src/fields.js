export const Status = {
  SUCCESS: Symbol.for('query-filter.field-status.success'),
  ERROR: Symbol.for('query-filter.field-status.error'),
};

export class GenericFieldHandler {
  get(name, operator, value) {
    return {
      status: Status.SUCCESS,
      describe: (negated) =>
        `${negated ? 'not ' : ''}${name}${operator}${value}`,
      filter: () => true,
    };
  }
}
