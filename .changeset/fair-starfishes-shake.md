---
"@effect/schema": patch
---

## Simplifying Type Extraction

When we work with schemas, it's common to need to extract their types automatically.
To make this easier, we've made some changes to the `Schema` interface.
Now, you can easily access `Type` and `Encoded` directly from a schema without the need for `Schema.Schema.Type` and `Schema.Schema.Encoded`.

```ts
import { Schema } from "@effect/schema"

const PersonSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.NumberFromString
})

// same as type PersonType = Schema.Schema.Type<typeof PersonSchema>
type PersonType = typeof PersonSchema.Type

// same as Schema.Schema.Encoded<typeof PersonSchema>
type PersonEncoded = typeof PersonSchema.Encoded
```

## Default Constructors

When dealing with data, creating values that match a specific schema is crucial.
To simplify this process, we've introduced **default constructors** for various types of schemas: `Struct`s, `filter`s, and `brand`s.

> [!NOTE]
> Default constructors associated with a schema `Schema<A, I, R>` are specifically related to the `A` type, not the `I` type.

Let's dive into each of them with some examples to understand better how they work.

**Example** (`Struct`)

```ts
import { Schema } from "@effect/schema"

const MyStruct = Schema.Struct({
  name: Schema.NonEmpty
})

MyStruct.make({ name: "a" }) // ok
MyStruct.make({ name: "" })
/*
throws
Error: { name: NonEmpty }
└─ ["name"]
   └─ NonEmpty
      └─ Predicate refinement failure
         └─ Expected NonEmpty (a non empty string), actual ""
*/
```

**Example** (`filter`)

```ts
import { Schema } from "@effect/schema"

const MyNumber = Schema.Number.pipe(Schema.between(1, 10))

// const n: number
const n = MyNumber.make(5) // ok
MyNumber.make(20)
/*
throws
Error: a number between 1 and 10
└─ Predicate refinement failure
  └─ Expected a number between 1 and 10, actual 20
*/
```

**Example** (`brand`)

```ts
import { Schema } from "@effect/schema"

const MyBrand = Schema.Number.pipe(
  Schema.between(1, 10),
  Schema.brand("MyNumber")
)

// const n: number & Brand<"MyNumber">
const n = MyBrand.make(5) // ok
MyBrand.make(20)
/*
throws
Error: a number between 1 and 10
└─ Predicate refinement failure
  └─ Expected a number between 1 and 10, actual 20
*/
```

When utilizing our default constructors, it's important to grasp the type of value they generate. In the `MyBrand` example, the return type of the constructor is `number & Brand<"MyNumber">`, indicating that the resulting value is a `number` with the added branding "MyNumber".

This differs from the filter example where the return type is simply `number`. The branding offers additional insights about the type, facilitating the identification and manipulation of your data.

Note that default constructors are "unsafe" in the sense that if the input does not conform to the schema, the constructor **throws an error** containing a description of what is wrong. This is because the goal of default constructors is to provide a quick way to create compliant values (for example, for writing tests or configurations, or in any situation where it is assumed that the input passed to the constructors is valid and the opposite situation is exceptional).

To have a "safe" constructor, you can use `Schema.validateEither`:

```ts
import { Schema } from "@effect/schema"

const MyNumber = Schema.Number.pipe(Schema.between(1, 10))

const ctor = Schema.validateEither(MyNumber)

console.log(ctor(5))
/*
{ _id: 'Either', _tag: 'Right', right: 5 }
*/

console.log(ctor(20))
/*
{
  _id: 'Either',
  _tag: 'Left',
  left: {
    _id: 'ParseError',
    message: 'a number between 1 and 10\n' +
      '└─ Predicate refinement failure\n' +
      '   └─ Expected a number between 1 and 10, actual 20'
  }
}
*/
```

### Default Constructor Values

When constructing objects, it's common to want to assign default values to certain fields to simplify the creation of new instances.
Our new `Schema.withConstructorDefault` combinator allows you to effortlessly manage the optionality of a field **in your default constructor**.

**Example**

```ts
import { Schema } from "@effect/schema"

const PersonSchema = Schema.Struct({
  name: Schema.NonEmpty,
  age: Schema.Number.pipe(
    Schema.propertySignature,
    Schema.withConstructorDefault(() => 0)
  )
})

// The age field is optional and defaults to 0
console.log(PersonSchema.make({ name: "John" }))
// => { age: 0, name: 'John' }
```

Defaults are **lazily evaluated**, meaning that a new instance of the default is generated every time the constructor is called:

```ts
import { Schema } from "@effect/schema"

const PersonSchema = Schema.Struct({
  name: Schema.NonEmpty,
  age: Schema.Number.pipe(
    Schema.propertySignature,
    Schema.withConstructorDefault(() => 0)
  ),
  timestamp: Schema.Number.pipe(
    Schema.propertySignature,
    Schema.withConstructorDefault(() => new Date().getTime())
  )
})

console.log(PersonSchema.make({ name: "name1" }))
// => { age: 0, timestamp: 1714232909221, name: 'name1' }
console.log(PersonSchema.make({ name: "name2" }))
// => { age: 0, timestamp: 1714232909227, name: 'name2' }
```

Note how the `timestamp` field varies.

Defaults can also be applied using the `Class` API:

```ts
import { Schema } from "@effect/schema"

class Person extends Schema.Class<Person>("Person")({
  name: Schema.NonEmpty,
  age: Schema.Number.pipe(
    Schema.propertySignature,
    Schema.withConstructorDefault(() => 0)
  ),
  timestamp: Schema.Number.pipe(
    Schema.propertySignature,
    Schema.withConstructorDefault(() => new Date().getTime())
  )
}) {}

console.log(new Person({ name: "name1" }))
// => Person { age: 0, timestamp: 1714400867208, name: 'name1' }
console.log(new Person({ name: "name2" }))
// => Person { age: 0, timestamp: 1714400867215, name: 'name2' }
```

Default values are also "portable", meaning that if you reuse the same property signature in another schema, the default is carried over:

```ts
import { Schema } from "@effect/schema"

const PersonSchema = Schema.Struct({
  name: Schema.NonEmpty,
  age: Schema.Number.pipe(
    Schema.propertySignature,
    Schema.withConstructorDefault(() => 0)
  ),
  timestamp: Schema.Number.pipe(
    Schema.propertySignature,
    Schema.withConstructorDefault(() => new Date().getTime())
  )
})

const AnotherSchema = Schema.Struct({
  foo: Schema.String,
  age: PersonSchema.fields.age
})

console.log(AnotherSchema.make({ foo: "bar" })) // => { foo: 'bar', age: 0 }
```

Defaults can also be applied using the `Class` API:

```ts
import { Schema } from "@effect/schema"

class Person extends Schema.Class<Person>("Person")({
  name: Schema.NonEmpty,
  age: Schema.Number.pipe(
    Schema.propertySignature,
    Schema.withConstructorDefault(() => 0)
  ),
  timestamp: Schema.Number.pipe(
    Schema.propertySignature,
    Schema.withConstructorDefault(() => new Date().getTime())
  )
}) {}

console.log(new Person({ name: "name1" })) // Person { age: 0, timestamp: 1714400867208, name: 'name1' }
console.log(new Person({ name: "name2" })) // Person { age: 0, timestamp: 1714400867215, name: 'name2' }
```

## Default Decoding Values

Our new `Schema.withDecodingDefault` combinator makes it easy to handle the optionality of a field during the **decoding process**.

```ts
import { Schema } from "@effect/schema"

const MySchema = Schema.Struct({
  a: Schema.optional(Schema.String).pipe(Schema.withDecodingDefault(() => ""))
})

console.log(Schema.decodeUnknownSync(MySchema)({}))
// => { a: '' }
console.log(Schema.decodeUnknownSync(MySchema)({ a: undefined }))
// => { a: '' }
console.log(Schema.decodeUnknownSync(MySchema)({ a: "a" }))
// => { a: 'a' }
```

If you want to set default values both for the decoding phase and for the default constructor, you can use `Schema.withDefaults`:

```ts
import { Schema } from "@effect/schema"

const MySchema = Schema.Struct({
  a: Schema.optional(Schema.String).pipe(
    Schema.withDefaults({
      decoding: () => "",
      constructor: () => "-"
    })
  )
})

console.log(Schema.decodeUnknownSync(MySchema)({}))
// => { a: '' }
console.log(Schema.decodeUnknownSync(MySchema)({ a: undefined }))
// => { a: '' }
console.log(Schema.decodeUnknownSync(MySchema)({ a: "a" }))
// => { a: 'a' }

console.log(MySchema.make({})) // => { a: '-' }
console.log(MySchema.make({ a: "a" })) // => { a: 'a' }
```

## Refactoring of Custom Message System

We've refactored the system that handles user-defined custom messages to make it more intuitive.

Now, custom messages no longer have absolute precedence by default. Instead, it becomes an opt-in behavior by explicitly setting a new flag `override` with the value `true`. Let's see an example:

**Previous Approach**

```ts
import { Schema } from "@effect/schema"

const MyString = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(2)
).annotations({
  // This message always takes precedence
  // So, for any error, the same message will always be shown
  message: () => "my custom message"
})

const decode = Schema.decodeUnknownEither(MyString)

console.log(decode(null)) // "my custom message"
console.log(decode("")) // "my custom message"
console.log(decode("abc")) // "my custom message"
```

As you can see, no matter where the decoding error is raised, the same error message will always be presented because in the previous version, the custom message by default overrides those generated by previous filters.

Now, let's see how the same schema works with the new system.

**Current Approach**

```ts
import { Schema } from "@effect/schema"

const MyString = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(2)
).annotations({
  // This message is shown only if the maxLength filter fails
  message: () => "my custom message"
})

const decode = Schema.decodeUnknownEither(MyString)

console.log(decode(null)) // "Expected a string, actual null"
console.log(decode("")) // `Expected a string at least 1 character(s) long, actual ""`
console.log(decode("abc")) // "my custom message"
```

To restore the old behavior (for example, to address the scenario where a user wants to define a single cumulative custom message describing the properties that a valid value must have and does not want to see default messages), you need to set the `override` flag to `true`:

```ts
import { Schema } from "@effect/schema"

const MyString = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(2)
).annotations({
  // By setting the `override` flag to `true`
  // this message will always be shown for any error
  message: () => ({ message: "my custom message", override: true })
})

const decode = Schema.decodeUnknownEither(MyString)

console.log(decode(null)) // "my custom message"
console.log(decode("")) // "my custom message"
console.log(decode("abc")) // "my custom message"
```

The new system is particularly useful when the schema on which custom messages are defined is more complex than a scalar value (like `string` or `number`), for example, if it's a struct containing a field that is an array of structs. Let's see an example that illustrates how convenient it is to rely on default messages when the decoding error occurs in a nested structure:

```ts
import { Schema } from "@effect/schema"
import { pipe } from "effect"

const schema = Schema.Struct({
  outcomes: pipe(
    Schema.Array(
      Schema.Struct({
        id: Schema.String,
        text: pipe(
          Schema.String,
          Schema.message(() => "error_invalid_outcome_type"),
          Schema.minLength(1, { message: () => "error_required_field" }),
          Schema.maxLength(50, { message: () => "error_max_length_field" })
        )
      })
    ),
    Schema.minItems(1, { message: () => "error_min_length_field" })
  )
})

Schema.decodeUnknownSync(schema, { errors: "all" })({
  outcomes: []
})
/*
throws
Error: { outcomes: an array of at least 1 items }
└─ ["outcomes"]
   └─ error_min_length_field
*/

Schema.decodeUnknownSync(schema, { errors: "all" })({
  outcomes: [
    { id: "1", text: "" },
    { id: "2", text: "this one is valid" },
    { id: "3", text: "1234567890".repeat(6) }
  ]
})
/*
throws
Error: { outcomes: an array of at least 1 items }
└─ ["outcomes"]
   └─ an array of at least 1 items
      └─ From side refinement failure
         └─ ReadonlyArray<{ id: string; text: a string at most 50 character(s) long }>
            ├─ [0]
            │  └─ { id: string; text: a string at most 50 character(s) long }
            │     └─ ["text"]
            │        └─ error_required_field
            └─ [2]
               └─ { id: string; text: a string at most 50 character(s) long }
                  └─ ["text"]
                     └─ error_max_length_field
*/
```

In the previous version, we would have received the message "error_min_length_field" for any decoding error, which is evidently suboptimal and has now been corrected.

## Filter API Interface

We've introduced a new API interface to the `filter` API. This allows you to access the refined schema using the exposed `from` field:

```ts
import { Schema } from "@effect/schema"

const MyFilter = Schema.Struct({
  a: Schema.String
}).pipe(Schema.filter(() => /* some filter... */ true))

// const aField: typeof Schema.String
const aField = MyFilter.from.fields.a
```

The signature of the `filter` function has been simplified and streamlined to be more ergonomic when setting a default message. In the new signature of `filter`, the type of the predicate passed as an argument is as follows:

```ts
predicate: (a: A, options: ParseOptions, self: AST.Refinement) =>
  undefined | boolean | string | ParseResult.ParseIssue
```

with the following semantics:

- `true` means the filter is successful.
- `false` or `undefined` means the filter fails and no default message is set.
- `string` means the filter fails and the returned string is used as the default message.
- `ParseIssue` means the filter fails and the returned ParseIssue is used as an error.

Let's see an example of how it worked before and how it works now.

**Before**

```ts
import { Schema, ParseResult } from "@effect/schema"
import { Option } from "effect"

const Positive = Schema.Number.pipe(
  Schema.filter((n, _, ast) =>
    n > 0
      ? Option.none()
      : Option.some(new ParseResult.Type(ast, n, "must be positive"))
  )
)

Schema.decodeUnknownSync(Positive)(-1)
/*
throws
Error: <refinement schema>
└─ Predicate refinement failure
   └─ must be positive
*/
```

**Now**

```ts
import { Schema } from "@effect/schema"

const Positive = Schema.Number.pipe(
  Schema.filter((n) => (n > 0 ? undefined : "must be positive"))
)

Schema.decodeUnknownSync(Positive)(-1)
/*
throws
Error: { number | filter }
└─ Predicate refinement failure
   └─ must be positive
*/
```

## JSON Schema Compiler Refactoring

The JSON Schema compiler has been refactored to be more user-friendly. Now, the `make` API attempts to produce the optimal JSON Schema for the input part of the decoding phase. This means that starting from the most nested schema, it traverses the chain, including each refinement, and stops at the first transformation found.

Let's see an example:

```ts
import { JSONSchema, Schema } from "@effect/schema"

const schema = Schema.Struct({
  foo: Schema.String.pipe(Schema.minLength(2)),
  bar: Schema.optional(Schema.NumberFromString, {
    default: () => 0
  })
})

console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
```

Now, let's compare the JSON Schemas produced in both the previous and new versions.

**Before**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["bar", "foo"],
  "properties": {
    "bar": {
      "type": "number",
      "description": "a number",
      "title": "number"
    },
    "foo": {
      "type": "string",
      "description": "a string at least 2 character(s) long",
      "title": "string",
      "minLength": 2
    }
  },
  "additionalProperties": false,
  "title": "Struct (Type side)"
}
```

As you can see, the JSON Schema produced has:

- a required `foo` field, correctly modeled with a constraint (`"minLength": 2`)
- a **required numeric `bar` field**

This happens because in the previous version, the `JSONSchema.make` API by default produces a JSON Schema for the `Type` part of the schema. That is:

```ts
type Type = Schema.Schema.Type<typeof schema>
/*
type Type = {
    readonly foo: string;
    readonly bar: number;
}
*/
```

However, typically, we are interested in generating a JSON Schema for the input part of the decoding process, i.e., in this case for:

```ts
type Encoded = Schema.Schema.Encoded<typeof schema>
/*
type Encoded = {
    readonly foo: string;
    readonly bar?: string | undefined;
}
*/
```

At first glance, a possible solution might be to generate the JSON Schema of `Schema.encodedSchema(schema)`:

```ts
console.log(
  JSON.stringify(JSONSchema.make(Schema.encodedSchema(schema)), null, 2)
)
```

But here's what the result would be:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["foo"],
  "properties": {
    "foo": {
      "type": "string",
      "description": "a string",
      "title": "string"
    },
    "bar": {
      "type": "string",
      "description": "a string",
      "title": "string"
    }
  },
  "additionalProperties": false
}
```

As you can see, we lost the `"minLength": 2` constraint, which is the useful part of precisely defining our schemas using refinements.

**After**

Now, let's see what `JSONSchema.make` API produces by default for the same schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["foo"],
  "properties": {
    "foo": {
      "type": "string",
      "description": "a string at least 2 character(s) long",
      "title": "string",
      "minLength": 2
    },
    "bar": {
      "type": "string",
      "description": "a string",
      "title": "string"
    }
  },
  "additionalProperties": false,
  "title": "Struct (Encoded side)"
}
```

As you can verify, the refinement has been preserved.

## Improve `extend` to support refinements and `suspend`ed schemas

Now `extend` supports extending refinements, so you can do something like this:

```ts
import { Schema } from "@effect/schema"

const RefinedStruct = Schema.Struct({
  a: Schema.Number,
  b: Schema.Number
}).pipe(
  Schema.filter((value) => {
    if (value.a !== value.b) {
      return "`a` must be equal to `b`"
    }
  })
)

const AnotherStruct = Schema.Struct({
  c: Schema.String,
  d: Schema.String
})

// in the previous version you would receive an error:
// Extend: cannot extend `<refinement schema>` with `{ c: string; d: string }` (path [])
const Extended = Schema.extend(RefinedStruct, AnotherStruct)

console.log(String(Extended))

console.log(Schema.decodeUnknownSync(Extended)({ a: 1, b: 1, c: "c", d: "d" }))
// => { a: 1, b: 1, c: 'c', d: 'd' }
console.log(Schema.decodeUnknownSync(Extended)({ a: 1, b: 2, c: "c", d: "d" }))
/*
throws
Error: { { readonly a: number; readonly b: number; readonly c: string; readonly d: string } | filter }
└─ Predicate refinement failure
   └─ `a` must be equal to `b`
*/
```

We've also added support for `Schema.suspend`. Here's an example:

```ts
import { Arbitrary, FastCheck, Schema } from "@effect/schema"

// Define a recursive list type
type List =
  | {
      readonly type: "nil"
    }
  | {
      readonly type: "cons"
      readonly tail: {
        readonly value: number
      } & List // extend
    }

// Define a schema for the list type
const List: Schema.Schema<List> = Schema.Union(
  Schema.Struct({ type: Schema.Literal("nil") }),
  Schema.Struct({
    type: Schema.Literal("cons"),
    tail: Schema.extend(
      Schema.Struct({ value: Schema.Number }),
      Schema.suspend(() => List) // extend
    )
  })
)

console.log(JSON.stringify(FastCheck.sample(Arbitrary.make(List), 5), null, 2))
/*
[
  {
    "type": "cons",
    "tail": {
      "type": "cons",
      "value": 4.8301839079380824e+36,
      "tail": {
        "type": "cons",
        "value": 1.5771055128598197e-29,
        "tail": {
          "type": "nil",
          "value": -15237.7763671875
        }
      }
    }
  },
  {
    "type": "cons",
    "tail": {
      "type": "nil",
      "value": 5.808463088527973e-18
    }
  },
  {
    "type": "nil"
  },
  {
    "type": "nil"
  },
  {
    "type": "cons",
    "tail": {
      "type": "cons",
      "value": -0.7920627593994141,
      "tail": {
        "type": "nil",
        "value": 63.837738037109375
      }
    }
  }
]
*/
```

## Patches

AST

- fix `AST.toString` to honor `readonly` modifiers
- improve `AST.toString` for refinements

Schema

- return `BrandSchema` from `fromBrand`
- add `SchemaClass` interface
- add `AnnotableClass` interface
- `extend`: add support for refinements, closes #2642
- add `pattern` json schema annotation to `Trimmed`
- add `parseNumber` number transformation
- add `TaggedClass` api interface (exposing a `_tag` field)
- add `TaggedErrorClass` api interface (exposing a `_tag` field)
- add `TaggedRequestClass` api interface (exposing a `_tag` field)
- add `DateFromNumber` schema
- add `Schema.Schema.AsSchema` type-level helper to facilitate working with generic schemas.

## Other Breaking Changes

- move `fast-check` from `peerDependencies` to `dependencies`

AST

- add `path` argument to `Compiler` API

  ```diff
  -export type Compiler<A> = (ast: AST) => A
  +export type Compiler<A> = (ast: AST, path: ReadonlyArray<PropertyKey>) => A
  ```

- remove `hash` function, you can replace it with the following code:

  ```ts
  import { Hash } from "effect"
  import { AST } from "@effect/schema"

  export const hash = (ast: AST.AST): number =>
    Hash.string(JSON.stringify(ast, null, 2))
  ```

JSONSchema

- extend all interfaces with `JsonSchemaAnnotations`

  ```ts
  export interface JsonSchemaAnnotations {
    title?: string
    description?: string
    default?: unknown
    examples?: Array<unknown>
  }
  ```

Schema

- replace numerous API interfaces with class-based schema definitions
- rename `$Array` API interface to `Array$`
- rename `$Record` API interface to `Record$`
- rename `$ReadonlyMap` API interface to `ReadonlyMap$`
- rename `$Map` API interface to `Map$`
- rename `$ReadonlySet` API interface to `ReadonlySet$`
- rename `$Set` API interface to `Set$`
- remove `asBrandSchema` utility
- change `BrandSchema` interface
- remove `hash` function

  from

  ```ts
  export interface BrandSchema<A extends brand_.Brand<any>, I>
    extends Annotable<BrandSchema<A, I>, A, I>,
      Brand.Constructor<A> {}
  ```

  to

  ```ts
  export interface BrandSchema<A extends Brand<any>, I, R>
    extends AnnotableClass<BrandSchema<A, I, R>, A, I, R> {
    make(a: Brand.Unbranded<A>): A
  }
  ```

  Previously, you could directly use the `Brand.Constructor`, but now you need to use its `make` constructor:

  Before

  ```ts
  import { Schema } from "@effect/schema"

  const UserId = Schema.Number.pipe(Schema.brand("UserId"))

  console.log(UserId(1)) // 1
  ```

  Now

  ```ts
  import { Schema } from "@effect/schema"

  const UserId = Schema.Number.pipe(Schema.brand("UserId"))

  console.log(UserId.make(1)) // 1
  ```
