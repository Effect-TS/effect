---
"@effect/schema": minor
---

## Extracting Inferred Types

When working with schemas, sometimes we want to extract certain types automatically. To make this easier, we've made some changes to the `Schema` interface. Now, you can directly access `Type`, `Encoded`, and `Context` from a schema without needing to use `Schema.Schema`.

Before

```ts
import { Schema } from "@effect/schema"

const PersonSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.NumberFromString
})

type PersonType = Schema.Schema.Type<typeof PersonSchema>

type PersonEncoded = Schema.Schema.Encoded<typeof PersonSchema>
```

In the previous version, to get the type of `PersonSchema`, we had to use `Schema.Schema.Type` (and `Schema.Schema.Encoded`). It was a bit verbose.

Now

```ts
import { Schema } from "@effect/schema"

const PersonSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.NumberFromString
})

type PersonType = typeof PersonSchema.Type

type PersonEncoded = typeof PersonSchema.Encoded
```

With this update, accessing the type of `PersonSchema` is more straightforward. You can directly use `typeof` to get the type, making it simpler and cleaner.

## Default Constructors

Creating values that match a schema is fundamental when working with data. To simplify this process, we've introduced default constructors for various types of schemas: type literals (such as structs and records), filters, and brands. Let's dive into each of them with some examples to understand better how they work.

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

When you use our default constructors, it's important to understand the type of value they produce. For the `BrandedNumberSchema` example, the return type of the constructor is `number & Brand<"MyNumber">`, which means the resulting value is a number with an added branding "MyNumber".

This is different from the filter example where the return type is just `number`. The branding provides additional information about the type, making it easier to identify and work with your data.

### Setting Default Values

When working with constructors, sometimes you want to set default values for certain fields. This can be especially useful when you're not sure if a field will always have a value. With our new `withDefault` combinator, you can easily control the optionality of a field in your default constructor.

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

In the second example, notice how the `age` field is now optional and defaults to 0 when not provided.

## Schemas as Classes

We've introduced a new way to define schemas using classes. This approach makes your schema types opaque. Let's look at how you can define and use schemas as classes.

```ts
import { Schema as S } from "@effect/schema"

class Person extends S.Struct({
  name: S.String
}) {}

class Group extends S.Struct({
  person: Person
}) {
  static decodeUnknownSync(u: unknown) {
    return S.decodeUnknownSync(this)(u)
  }
}

// const MyUnion: S.Union<[typeof Person, typeof Group]>
export const MyUnion = S.Union(Person, Group)

console.log(Group.decodeUnknownSync({}))
/*
Error: { person: { name: string } }
└─ ["person"]
 └─ is missing
*/
```

## Patches

- return `BrandSchema` from `fromBrand`

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
