# oracle-query

A simple query language with configurable semantics.

`oracle-query` has not reached version `1.0.0`; the interface and functionality may change at any time, and the documentation is incomplete.

```javascript
import { Schema } from 'oracle-query';

const { description, predicate } = new Schema().query(
  'foo>3 bar:"lorem ipsum"'
);

console.log(description);
// 'foo is greater than 3 and bar contains "lorem ipsum"'

if (predicate({ foo: 4, bar: 'lorem ipsum dolor sic amet' })) {
  console.log('found a match!');
}
```

## Language

`oracle-query` parses queries composed of lists of _terms_ and logical operators (`not`, `and`, and `or`). A query defines a predicate function that returns true iff the input satisfies the terms of the query (as modified by logical operators). This predicate function can then be used to search a list of values using e.g. [`Array.prototype.filter()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter).

### Terms

A term consists of a _field name_, an _operator_, and a _value_.

A field name can be any word except the keywords `not`, `and`, and `or`.

The list of operators is customizable; the default operators are `:`, `>`, `>=`, `=`, `<=`, and `<`.

A value can be any word except a keyword, or any string in double quotes (`"a string"`). Within a string, a literal `"` can be escaped with a backslash (`"\""`).

The field name, or the field name and the operator both, can be omitted.

Some valid fields: `foo:bar`, `foo:"bar"`, `foo>3`, `="bar"`, `foo`, `3`, `"foo bar"`.

### Expressions

Terms can be modified and combined with `not`, `and`, and `or`. Expressions can be grouped with `()`.

```
foo>3 and not (foo<10 or bar:baz)
```

Terms can also be listed, which is equivalent to combining them with `and`.

`"lorem" "ipsum"` => `"lorem" and "ipsum"`.

## API

### class Schema

A `Schema` represents a semantic interpretation of the language. It defines what operators exist and how terms are transformed into predicates.

#### new Schema(options)

Accepts:

```JavaScript
{
  operators,
  termHandler,
  descriptors: {
    conjunction,
    disjunction,
    parenthetical
  }
}
```

#### Schema.prototype.query(string)

Returns:

```JavaScript
{
  status,
  description,
  evaluate,
  errors: [],
  ast
}
```

#### Less-useful methods

##### Schema.prototype.parse()

##### Schema.prototype.describeNode()

##### Schema.prototype.evaluateNode()

##### Schema.prototype.validateNode()

### interface TermHandler

A `TermHandler` describes the semantics of terms in the query. Two implementations of `TermHandler` are provided: the default, `GenericTermHandler`, and a configurable one, `FieldTermHandler`.

#### TermHandler.get(name: string, operator: string, value: string)

Returns an object `{describe, predicate}`.

`describe` is a function `(negated: boolean) => Description`. `Description` can be any type, so long as it is used consistently by the `descriptors` of the containing `Schema`; by default, `Description` is `string`.

`predicate` is a function `(input: any) => boolean`. `predicate(value)` should return `true` if `input` matches the term and `false` otherwise.

### class GenericTermHandler

`GenericTermHandler` is meant to provide reasonable starting behavior when setting up `oracle-query`. Most applications will want to configure and use a `FieldTermHandler` instead.

A `GenericTermHandler` maps non-empty field names to properties of the input value. It accepts all possible fields, but understands only the default operators, and mostly gives them their default behavior in javascript; so, for example, the term `foo>=3` is translated to `(input) => input?.foo >= '3'`. The operator `=` is translated to `==`. The operator `:` is translated to `includes()`, e.g. `foo:3` to `(input) => input?.includes?.('3')`. Operators outside of the default list produce fields that always evaluate to false.

### class FieldTermHandler

### new FieldTermHandler(fields, options)

### FieldTermHandler.prototype.get(name: string, operator: string, value: string)
