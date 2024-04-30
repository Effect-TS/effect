---
"@effect/schema": patch
---

DX improvements for JSON Schema annotations

- Add optional `format` property to `JsonSchema7String`.
- Enhance IDE autocompletion for `JSONSchemaAnnotation`

The `format` property on the string JSONSchema instances, as part of the spec, allows semantic validation for a range of values like dates, email addresses, IP Addresses, hostnames, etc., which conforms to RFC or external specifications.


The extension of the (AST) definition for `JSONSchemaAnnotation` allows for better autocompletion support in IDEs.
Note that these modifications do not have a any impact on the typesystem.

TL;DR 👇:

```ts
const stringDate =
  <A extends string>(annotations?: S.Annotations.Filter<A>) =>
    <I, R>(self: S.Schema<A, I, R>) => {
      return self.pipe(
        S.filter(
          (maybeStringDate): maybeStringDate is A =>
            Number.isNaN(Date.parse(maybeStringDate))
              ? false
              : new Date(maybeStringDate).toISOString().slice(0, 10) === maybeStringDate,
          {
            description: 'a string that is a valid YYYY-MM-DD date',
            message: issue => `expected a sting date 'YYYY-MM-DD', got '${issue.actual}'`,
            jsonSchema: {
              // 🪄 now the IDE can autocomplete the jsonSchema... 🧚
              minLength: 10,
              maxLength: 10,
              // 🪄 it also knows about `format` property and its possible values `builtins & string` ... 🧚
              format: 'date',
              ...annotations?.jsonSchema
            },
            ...(annotations ? omit(annotations, 'jsonSchema') : {}),
          },
        ),
      )
    }

// as well as...
const Url = Schema.String.annotation({
  // [...]
  jsonSchema: {      // <- IDE autocompletion support
    format: 'uri',   // <- format values autocomplete
    maxLength: 2000,
    minLength: 1,
    //               ..etc
  },
})


```
