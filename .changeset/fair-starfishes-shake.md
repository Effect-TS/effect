---
"@effect/schema": patch
---

## Simplifying Type Extraction from Schemas

When working with schemas, sometimes we want to extract certain types automatically. To make this easier, we've made some changes to the `Schema` interface. Now, you can easily access `Type` and `Encoded` directly from a schema without the need for `Schema.Schema.Type` and `Schema.Schema.Type`.

Previous Approach

```ts
import { Schema } from "@effect/schema"

const PersonSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.NumberFromString
})

type PersonType = Schema.Schema.Type<typeof PersonSchema>

type PersonEncoded = Schema.Schema.Encoded<typeof PersonSchema>
```

In the previous version, to obtain the type of `PersonSchema`, we had to use `Schema.Schema.Type` (and `Schema.Schema.Encoded`). While this method **still works**, it's a bit verbose.

Current Approach

```ts
import { Schema } from "@effect/schema"

const PersonSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.NumberFromString
})

type PersonType = typeof PersonSchema.Type

type PersonEncoded = typeof PersonSchema.Encoded
```

With this update, accessing the type of `PersonSchema` becomes much simpler. You can now directly use `typeof` to retrieve both the types (`Type` and `Encoded`), making the code more straightforward and cleaner.

## Introducing Default Constructors

When dealing with data, creating values that match a specific schema is crucial. To simplify this process, we've introduced **default constructors** for various types of schemas: `Struct`s, `Record`s, `filter`s, and `brand`s. Let's dive into each of them with some examples to understand better how they work.

Example (`Struct`)

```ts
import { Schema } from "@effect/schema"

const Struct = Schema.Struct({
  name: Schema.NonEmpty
})

Struct.make({ name: "a" }) // ok
Struct.make({ name: "" })
/*
throws
Error: { name: NonEmpty }
└─ ["name"]
   └─ NonEmpty
      └─ Predicate refinement failure
         └─ Expected NonEmpty (a non empty string), actual ""
*/
```

Example (`Record`)

```ts
import { Schema } from "@effect/schema"

const Record = Schema.Record(Schema.String, Schema.NonEmpty)

Record.make({ a: "a", b: "b" }) // ok
Record.make({ a: "a", b: "" })
/*
throws
Error: { [x: string]: NonEmpty }
└─ ["b"]
   └─ NonEmpty
      └─ Predicate refinement failure
         └─ Expected NonEmpty (a non empty string), actual ""
*/
```

Example (`filter`)

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

Example (`brand`)

```ts
import { Schema } from "@effect/schema"

const BrandedNumberSchema = Schema.Number.pipe(
  Schema.between(1, 10),
  Schema.brand("MyNumber")
)

// const n: number & Brand<"MyNumber">
const n = BrandedNumberSchema.make(5) // ok
BrandedNumberSchema.make(20)
/*
throws
Error: a number between 1 and 10
└─ Predicate refinement failure
  └─ Expected a number between 1 and 10, actual 20
*/
```

When utilizing our default constructors, it's important to grasp the type of value they generate. In the `BrandedNumberSchema` example, the return type of the constructor is `number & Brand<"MyNumber">`, indicating that the resulting value is a number with the added branding "MyNumber".

This differs from the filter example where the return type is simply `number`. The branding offers additional insights about the type, facilitating the identification and manipulation of your data.

### Introduction to Setting Default Values

When constructing objects, it's common to want to assign default values to certain fields to simplify the creation of new instances. Our new `withConstructorDefault` combinator allows you to effortlessly manage the optionality of a field in your default constructor.

Example Without Default

```ts
import { Schema } from "@effect/schema"

const PersonSchema = Schema.Struct({
  name: Schema.NonEmpty,
  age: Schema.Number
})

// Both name and age are required
PersonSchema.make({ name: "John", age: 30 })
```

Example With Default

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
console.log(PersonSchema.make({ name: "John" })) // Output: { age: 0, name: 'John' }
```

In the second example, notice how the `age` field is now optional and defaults to `0` when not provided.

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

console.log(PersonSchema.make({ name: "name1" })) // { age: 0, timestamp: 1714232909221, name: 'name1' }
console.log(PersonSchema.make({ name: "name2" })) // { age: 0, timestamp: 1714232909227, name: 'name2' }
```

Note how the `timestamp` field varies.

## Introducing Schemas as Classes

We've introduced a new method for defining schemas using classes. This approach provides opaque schema types, offering a clearer representation. Let's look at how you can define and use schemas as classes.

```ts
import { Schema } from "@effect/schema"

class Person extends Schema.Struct({
  name: Schema.String
}) {}

class Group extends Schema.Struct({
  person: Person
}) {}

// const MyUnion: S.Union<[typeof Person, typeof Group]>
export const MyUnion = Schema.Union(Person, Group)
```

Notice how the inferred type for `MyUnion` now refers only to the class types, removing the detailed structure, which can sometimes be overwhelming to comprehend. Compare this with the previous method of defining schemas (the old method **still works** if you prefer it!)

```ts
import { Schema } from "@effect/schema"

const Person = Schema.Struct({
  name: Schema.String
})

const Group = Schema.Struct({
  person: Person
})

/*
const MyUnion: Schema.Union<[Schema.Struct<{
    name: typeof Schema.String;
}>, Schema.Struct<{
    person: Schema.Struct<{
        name: typeof Schema.String;
    }>;
}>]>
*/
export const MyUnion = Schema.Union(Person, Group)
```

The new system opens up avenues for new patterns. For example, you can enrich your schema with custom values and functions.
Let's see an example with the previously defined `Group` schema. For instance, we can add a decoding function attached directly to the schema for convenience:

```ts
import { Schema } from "@effect/schema"

class Person extends Schema.Struct({
  name: Schema.String
}) {}

class Group extends Schema.Struct({
  person: Person
}) {
  static decodeUnknownSync(u: unknown) {
    return Schema.decodeUnknownSync(this)(u)
  }
}

console.log(Group.decodeUnknownSync({}))
/*
Error: { person: { name: string } }
└─ ["person"]
 └─ is missing
*/
```

## Refactoring of Custom Message System

We've refactored the system that handles user-defined custom messages to make it more intuitive.

Now, custom messages no longer have absolute precedence by default. Instead, it becomes an opt-in behavior by explicitly setting a new flag `override` with the value `true`. Let's see an example:

### Previous Approach

```ts
import { Schema } from "@effect/schema"

const MyString = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(2)
).annotations({
  // This message always takes precedence over all previous default messages
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

### Current Approach

```ts
import { Schema } from "@effect/schema"

const MyString = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(2)
).annotations({
  // This message is shown only if the last filter (`maxLength`) fails
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
  // By setting the `override` flag to `true`, this message will always be shown for any error
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

## Patches

- return `BrandSchema` from `fromBrand`
- add `SchemaClass` interface
- add `AnnotableClass` interface
- add `filter` API interface
- fix `AST.toString` to honor `readonly` modifiers

## Other Breaking Changes

- move `fast-check` from `peerDependencies` to `dependencies`
- remove `asBrandSchema` utility
- change `BrandSchema` interface

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
