---
"@effect/schema": patch
---

Enhanced Parsing with `TemplateLiteralParser`, closes #3307

In this update we've introduced a sophisticated API for more refined string parsing: `TemplateLiteralParser`. This enhancement stems from recognizing limitations in the `Schema.TemplateLiteral` and `Schema.pattern` functionalities, which effectively validate string formats without extracting structured data.

**Overview of Existing Limitations**

The `Schema.TemplateLiteral` function, while useful as a simple validator, only verifies that an input conforms to a specific string pattern by converting template literal definitions into regular expressions. Similarly, `Schema.pattern` employs regular expressions directly for the same purpose. Post-validation, both methods require additional manual parsing to convert the validated string into a usable data format.

**Introducing TemplateLiteralParser**

To address these limitations and eliminate the need for manual post-validation parsing, the new `TemplateLiteralParser` API has been developed. It not only validates the input format but also automatically parses it into a more structured and type-safe output, specifically into a **tuple** format.

This new approach enhances developer productivity by reducing boilerplate code and simplifying the process of working with complex string inputs.

**Example**

```ts
import { Schema } from "@effect/schema"

// const schema: Schema.Schema<readonly [number, "a", string], `${string}a${string}`, never>
const schema = Schema.TemplateLiteralParser(
  Schema.NumberFromString,
  "a",
  Schema.NonEmptyString
)

console.log(Schema.decodeEither(schema)("100afoo"))
// { _id: 'Either', _tag: 'Right', right: [ 100, 'a', 'foo' ] }

console.log(Schema.encode(schema)([100, "a", "foo"]))
// { _id: 'Either', _tag: 'Right', right: '100afoo' }
```
