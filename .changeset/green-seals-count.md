---
"@effect/schema": patch
---

TODO: ^---- change `patch` to `minor`

## Refactoring of the `ParseIssue` Model

The `ParseIssue` model in the `@effect/schema/ParseResult` module has undergone a comprehensive redesign and simplification that enhances its expressiveness without compromising functionality. This section explores the motivation and details of this refactoring.

### Enhanced `Schema.filter` API

The `Schema.filter` API has been improved to support more complex filtering that can involve multiple properties of a struct. This is especially useful for validations that compare two fields, such as ensuring that a `password` field matches a `confirm_password` field, a common requirement in form validations.

**Previous Limitations:**

Previously, while it was possible to implement a filter that compared two fields, there was no straightforward way to attach validation messages to a specific field. This posed challenges, especially in form validations where precise error reporting is crucial.

**Example of Previous Implementation:**

```ts
import { ArrayFormatter, Schema } from "@effect/schema"
import { Either } from "effect"

const Password = Schema.Trim.pipe(Schema.minLength(1))

const MyForm = Schema.Struct({
  password: Password,
  confirm_password: Password
}).pipe(
  Schema.filter((input) => {
    if (input.password !== input.confirm_password) {
      return "Passwords do not match"
    }
  })
)

console.log(
  "%o",
  Schema.decodeUnknownEither(MyForm)({
    password: "abc",
    confirm_password: "d"
  }).pipe(Either.mapLeft((error) => ArrayFormatter.formatErrorSync(error)))
)
/*
{
  _id: 'Either',
  _tag: 'Left',
  left: [
    {
      _tag: 'Type',
      path: [],
      message: 'Passwords do not match'
    }
  ]
}
*/
```

In this scenario, while the filter functionally works, the lack of a specific error path means errors are not as descriptive or helpful as they could be.

### Specifying Error Paths

With the new improvements, it's now possible to specify an error path along with the message, which enhances error specificity and is particularly beneficial for integration with tools like `react-hook-form`.

**Updated Implementation Example:**

```ts
import { ArrayFormatter, Schema } from "@effect/schema"
import { Either } from "effect"

const Password = Schema.Trim.pipe(Schema.minLength(1))

const MyForm = Schema.Struct({
  password: Password,
  confirm_password: Password
}).pipe(
  Schema.filter((input) => {
    if (input.password !== input.confirm_password) {
      return {
        path: ["confirm_password"],
        issue: "Passwords do not match"
      }
    }
  })
)

console.log(
  "%o",
  Schema.decodeUnknownEither(MyForm)({
    password: "abc",
    confirm_password: "d"
  }).pipe(Either.mapLeft((error) => ArrayFormatter.formatErrorSync(error)))
)
/*
{
  _id: 'Either',
  _tag: 'Left',
  left: [
    {
      _tag: 'Type',
      path: [ 'confirm_password' ],
      message: 'Passwords do not match'
    }
  ]
}
*/
```

This modification allows the error to be directly associated with the `confirm_password` field, improving clarity for the end-user.

### Multiple Error Reporting

The refactored API also supports reporting multiple issues at once, which is useful in forms where several validation checks might fail simultaneously.

**Example of Multiple Issues Reporting:**

```ts
import { ArrayFormatter, Schema } from "@effect/schema"
import { Either } from "effect"

const Password = Schema.Trim.pipe(Schema.minLength(1))
const OptionalString = Schema.optional(Schema.String)

const MyForm = Schema.Struct({
  password: Password,
  confirm_password: Password,
  name: OptionalString,
  surname: OptionalString
}).pipe(
  Schema.filter((input) => {
    const issues: Array<Schema.FilterIssue> = []
    // passwords must match
    if (input.password !== input.confirm_password) {
      issues.push({
        path: ["confirm_password"],
        issue: "Passwords do not match"
      })
    }
    // either name or surname must be present
    if (!input.name && !input.surname) {
      issues.push({
        path: ["surname"],
        issue: "Surname must be present if name is not present"
      })
    }
    return issues
  })
)

console.log(
  "%o",
  Schema.decodeUnknownEither(MyForm)({
    password: "abc",
    confirm_password: "d"
  }).pipe(Either.mapLeft((error) => ArrayFormatter.formatErrorSync(error)))
)
/*
{
  _id: 'Either',
  _tag: 'Left',
  left: [
    {
      _tag: 'Type',
      path: [ 'confirm_password' ],
      message: 'Passwords do not match'
    },
    {
      _tag: 'Type',
      path: [ 'surname' ],
      message: 'Surname must be present if name is not present'
    }
  ]
}
*/
```

## Enhancing Tuples with Element Annotations

Annotations are used to add metadata to tuple elements, which can describe the purpose or requirements of each element more clearly. This can be particularly useful when generating documentation or JSON schemas from your schemas.

```ts
import { JSONSchema, Schema } from "@effect/schema"

// Defining a tuple with annotations for each coordinate in a point
const Point = Schema.Tuple(
  Schema.element(Schema.Number).annotations({
    title: "X",
    description: "X coordinate"
  }),
  Schema.optionalElement(Schema.Number).annotations({
    title: "Y",
    description: "optional Y coordinate"
  })
)

// Generating a JSON Schema from the tuple
console.log(JSONSchema.make(Point))
/*
Output:
{
  '$schema': 'http://json-schema.org/draft-07/schema#',
  type: 'array',
  minItems: 1,
  items: [
    { type: 'number', description: 'X coordinate', title: 'X' },
    {
      type: 'number',
      description: 'optional Y coordinate',
      title: 'Y'
    }
  ],
  additionalItems: false
}
*/
```

## Missing messages

You can provide custom messages for missing fields or elements using the new `missingMessage` annotation.

Example (missing field)

```ts
import { Schema } from "@effect/schema"

const Person = Schema.Struct({
  name: Schema.propertySignature(Schema.String).annotations({
    missingMessage: () => "Name is required"
  })
})

Schema.decodeUnknownSync(Person)({})
/*
Output:
Error: { readonly name: string }
└─ ["name"]
   └─ Name is required
*/
```

Example (missing element)

```ts
import { Schema } from "@effect/schema"

const Point = Schema.Tuple(
  Schema.element(Schema.Number).annotations({
    missingMessage: () => "X coordinate is required"
  }),
  Schema.element(Schema.Number).annotations({
    missingMessage: () => "Y coordinate is required"
  })
)

Schema.decodeUnknownSync(Point)([], { errors: "all" })
/*
Output:
Error: readonly [number, number]
├─ [0]
│  └─ X coordinate is required
└─ [1]
   └─ Y coordinate is required
*/
```

## Streamlining Annotations

The individual APIs that were previously used to add annotations to schemas have been removed. This change was made because these individual annotation APIs did not provide significant value and were burdensome to maintain. Instead, you can now use the `annotations` method directly or the `Schema.annotations` API for a `pipe`-able approach.

Before

```ts
import { Schema } from "@effect/schema"

// Example of adding an identifier using a dedicated API
const schema = Schema.String.pipe(Schema.identifier("myIdentitifer"))
```

Now

```ts
import { Schema } from "@effect/schema"

// Directly using the annotations method
const schema = Schema.String.annotations({ identifier: "myIdentitifer" })
// or
const schema2 = Schema.String.pipe(
  // Using the annotations function in a pipe-able format
  Schema.annotations({ identifier: "myIdentitifer" })
)
```

## Standardize Error Handling for `*Either`, `*Sync` and `asserts` APIs

Now the `*Sync` and `asserts` APIs throw a `ParseError` while before they was throwing a simple `Error` with a `cause` containing a `ParseIssue`

```ts
import { ParseResult, Schema } from "@effect/schema"

try {
  Schema.decodeUnknownSync(Schema.String)(null)
} catch (e) {
  console.log(ParseResult.isParseError(e)) // true
}

const asserts: (u: unknown) => asserts u is string = Schema.asserts(
  Schema.String
)
try {
  asserts(null)
} catch (e) {
  console.log(ParseResult.isParseError(e)) // true
}
```

## Changes List

AST

- add `MissingMessageAnnotation` annotations
- add `Type`
- remove `verbose` option from `toString()` methods

**Breaking**

- rename `Element` to `OptionalType` and add an `annotations` field
- change `TupleType` definition: from `rest: ReadonlyArray<AST>` to `rest: ReadonlyArray<Type>`
- remove `TemplateLiteral.make`

Schema

- add `missingMessage` annotation to `PropertySignature`
- add `FilterIssue` helper interface

**Breaking**

- remove `TupleType.Element` type
- replace `OptionalElement` API interface with `Element` API interface
- remove `PropertySignature.GetToken`
- remove duplicated annotation APIs
  - `message`
  - `identifier`
  - `title`
  - `description`
  - `examples`
  - `default`
  - `documentation`
  - `jsonSchema`
  - `equivalence`
  - `concurrency`
  - `concurrency`
  - `parseIssueTitle`
- remove `Secret` and `SecretFromSelf`

ParseResult

- add `isParseError` type guard

**Breaking**

- `ParseIssue` refactoring
  - make `Missing` and `Unexpected` parse issues
  - replace `Declaration` with `And`
  - remove `Union` in favour of `And`
  - remove `TypeLiteral` in favour of `And`
  - remove `TupleType` in favour of `And`
  - remove `Member` class
  - merge `Key` and `Index` into `Pointer`
  - `Type`
    - change `message` field from `Option<string>` to `string | undefined`
  - `Refinement`
    - rename `error` field to `issue`
  - `Transformation`
    - rename `error` field to `issue`
  - `Missing`
    - add `ast: AST.Type` field
    - add `message` field
    - add `actual` field
  - `Unexpected`
    - replace `ast` field with a `message` field
    - add `actual` field
- `ParseError`
  - rename `error` property to `issue`
- remove `missing` export
- Standardize Error Handling for `*Either`, `*Sync` and `asserts` APIs, closes #2968
