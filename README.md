# crystal-query

A simple query language.

`crystal-query` has not reached version `1.0.0`; the interface and functionality may change at any time, and the documentation is incomplete.

## Language

`crystal-query` parses queries composed of lists of _terms_ and logical operators (`not`, `and`, and `or`). A query conceptually defineds a predicate function over a set of objects.

### Terms

A term consists of a _field name_, an _operator_, and a _value_.

A field name can be any word except the keywords `not`, `and`, and `or`.

The operators are `:`, `>`, `>=`, `=`, `<=`, and `<`.

A value can be any word except a keyword, or any string in double quotes (`"a string"`). Within a string, `\` escapes the following character (`"a double quote: \" and a backslash: \\"`).

Components of a term can be omitted.

Some valid fields: `foo:bar`, `foo:"bar"`, `foo>3`, `="bar"`, `foo`, `3`, `"foo bar"`.

### Expressions

Terms can be modified and combined with `not`, `and`, and `or`. Expressions can be grouped with `()`.

```
foo>3 and not (foo<10 or bar:baz)
```

Terms can also be listed, which is equivalent to combining them with `and`.

`"lorem" "ipsum"` => `"lorem" and "ipsum"`.

## API
