---
title: Data.ts
nav_order: 18
parent: Modules
---

## Data overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [Class](#class)
  - [Error](#error)
  - [Structural](#structural)
  - [TaggedClass](#taggedclass)
  - [TaggedError](#taggederror)
  - [array](#array)
  - [case](#case)
  - [struct](#struct)
  - [tagged](#tagged)
  - [taggedEnum](#taggedenum)
  - [tuple](#tuple)
  - [unsafeArray](#unsafearray)
  - [unsafeStruct](#unsafestruct)
- [models](#models)
  - [Case (interface)](#case-interface)
  - [Data (type alias)](#data-type-alias)
  - [TaggedEnum (type alias)](#taggedenum-type-alias)
  - [YieldableError (interface)](#yieldableerror-interface)
- [utils](#utils)
  - [Case (namespace)](#case-namespace)
    - [Constructor (interface)](#constructor-interface)
  - [TaggedEnum (namespace)](#taggedenum-namespace)
    - [WithGenerics (interface)](#withgenerics-interface)
    - [Args (type alias)](#args-type-alias)
    - [Kind (type alias)](#kind-type-alias)
    - [Value (type alias)](#value-type-alias)

---

# constructors

## Class

Provides a constructor for a Case Class.

**Signature**

```ts
export declare const Class: new <A extends Record<string, any>>(
  args: Types.Equals<Omit<A, keyof Equal.Equal>, {}> extends true
    ? void
    : { readonly [P in keyof A as P extends keyof Equal.Equal ? never : P]: A[P] }
) => Data<Readonly<A>>
```

**Example**

```ts
import * as Data from "effect/Data"
import * as Equal from "effect/Equal"

class Person extends Data.Class<{ readonly name: string }> {}

// Creating instances of Person
const mike1 = new Person({ name: "Mike" })
const mike2 = new Person({ name: "Mike" })
const john = new Person({ name: "John" })

// Checking equality
assert.deepStrictEqual(Equal.equals(mike1, mike2), true)
assert.deepStrictEqual(Equal.equals(mike1, john), false)
```

Added in v2.0.0

## Error

Provides a constructor for a Case Class.

**Signature**

```ts
export declare const Error: new <A extends Record<string, any>>(
  args: Types.Equals<Omit<A, keyof Equal.Equal>, {}> extends true
    ? void
    : { readonly [P in keyof A as P extends keyof Equal.Equal ? never : P]: A[P] }
) => YieldableError & Readonly<A>
```

Added in v2.0.0

## Structural

**Signature**

```ts
export declare const Structural: new <A>(
  args: Types.Equals<Omit<A, keyof Equal.Equal>, {}> extends true
    ? void
    : { readonly [P in keyof A as P extends keyof Equal.Equal ? never : P]: A[P] }
) => Case
```

Added in v2.0.0

## TaggedClass

Provides a Tagged constructor for a Case Class.

**Signature**

```ts
export declare const TaggedClass: <Tag extends string>(
  tag: Tag
) => new <A extends Record<string, any>>(
  args: Types.Equals<Omit<A, keyof Equal.Equal>, {}> extends true
    ? void
    : { readonly [P in keyof A as P extends "_tag" | keyof Equal.Equal ? never : P]: A[P] }
) => Data<Readonly<A> & { readonly _tag: Tag }>
```

**Example**

```ts
import * as Data from "effect/Data"
import * as Equal from "effect/Equal"

class Person extends Data.TaggedClass("Person")<{ readonly name: string }> {}

// Creating instances of Person
const mike1 = new Person({ name: "Mike" })
const mike2 = new Person({ name: "Mike" })
const john = new Person({ name: "John" })

// Checking equality
assert.deepStrictEqual(Equal.equals(mike1, mike2), true)
assert.deepStrictEqual(Equal.equals(mike1, john), false)

assert.deepStrictEqual(mike1._tag, "Person")
```

Added in v2.0.0

## TaggedError

**Signature**

```ts
export declare const TaggedError: <Tag extends string>(
  tag: Tag
) => new <A extends Record<string, any>>(
  args: Types.Equals<Omit<A, keyof Equal.Equal>, {}> extends true
    ? void
    : { readonly [P in keyof A as P extends "_tag" | keyof Equal.Equal ? never : P]: A[P] }
) => YieldableError & { readonly _tag: Tag } & Readonly<A>
```

Added in v2.0.0

## array

**Signature**

```ts
export declare const array: <As extends readonly any[]>(as: As) => Data<Readonly<As>>
```

**Example**

```ts
import * as Data from "effect/Data"
import * as Equal from "effect/Equal"

const alice = Data.struct({ name: "Alice", age: 30 })
const bob = Data.struct({ name: "Bob", age: 40 })

const persons = Data.array([alice, bob])

assert.deepStrictEqual(
  Equal.equals(persons, Data.array([Data.struct({ name: "Alice", age: 30 }), Data.struct({ name: "Bob", age: 40 })])),
  true
)
```

Added in v2.0.0

## case

Provides a constructor for the specified `Case`.

**Signature**

```ts
export declare const case: <A extends Case>() => Case.Constructor<A, never>
```

**Example**

```ts
import * as Data from "effect/Data"
import * as Equal from "effect/Equal"

// Extending Data.Case to implement Equal
interface Person extends Data.Case {
  readonly name: string
}

// Creating a constructor for the specified Case
const Person = Data.case<Person>()

// Creating instances of Person
const mike1 = Person({ name: "Mike" })
const mike2 = Person({ name: "Mike" })
const john = Person({ name: "John" })

// Checking equality
assert.deepStrictEqual(Equal.equals(mike1, mike2), true)
assert.deepStrictEqual(Equal.equals(mike1, john), false)
```

Added in v2.0.0

## struct

**Signature**

```ts
export declare const struct: <A extends Record<string, any>>(a: A) => Data<{ readonly [P in keyof A]: A[P] }>
```

**Example**

```ts
import * as Data from "effect/Data"
import * as Equal from "effect/Equal"

const alice = Data.struct({ name: "Alice", age: 30 })

const bob = Data.struct({ name: "Bob", age: 40 })

assert.deepStrictEqual(Equal.equals(alice, alice), true)
assert.deepStrictEqual(Equal.equals(alice, Data.struct({ name: "Alice", age: 30 })), true)

assert.deepStrictEqual(Equal.equals(alice, { name: "Alice", age: 30 }), false)
assert.deepStrictEqual(Equal.equals(alice, bob), false)
```

Added in v2.0.0

## tagged

Provides a tagged constructor for the specified `Case`.

**Signature**

```ts
export declare const tagged: <A extends Case & { readonly _tag: string }>(tag: A["_tag"]) => Case.Constructor<A, "_tag">
```

**Example**

```ts
import * as Data from "effect/Data"

interface Person extends Data.Case {
  readonly _tag: "Person" // the tag
  readonly name: string
}

const Person = Data.tagged<Person>("Person")

const mike = Person({ name: "Mike" })

assert.deepEqual(mike, { _tag: "Person", name: "Mike" })
```

Added in v2.0.0

## taggedEnum

Create a constructor for a tagged union of `Data` structs.

You can also pass a `TaggedEnum.WithGenerics` if you want to add generics to
the constructor.

**Signature**

```ts
export declare const taggedEnum: {
  <Z extends TaggedEnum.WithGenerics<1>>(): {
    readonly [Tag in Z["taggedEnum"]["_tag"]]: <A>(
      args: TaggedEnum.Args<
        TaggedEnum.Kind<Z, A, unknown, unknown, unknown>,
        Tag,
        Extract<TaggedEnum.Kind<Z, A, unknown, unknown, unknown>, { readonly _tag: Tag }>
      >
    ) => Extract<TaggedEnum.Kind<Z, A, unknown, unknown, unknown>, { readonly _tag: Tag }>
  }
  <Z extends TaggedEnum.WithGenerics<2>>(): {
    readonly [Tag in Z["taggedEnum"]["_tag"]]: <A, B>(
      args: TaggedEnum.Args<
        TaggedEnum.Kind<Z, A, B, unknown, unknown>,
        Tag,
        Extract<TaggedEnum.Kind<Z, A, B, unknown, unknown>, { readonly _tag: Tag }>
      >
    ) => Extract<TaggedEnum.Kind<Z, A, B, unknown, unknown>, { readonly _tag: Tag }>
  }
  <Z extends TaggedEnum.WithGenerics<3>>(): {
    readonly [Tag in Z["taggedEnum"]["_tag"]]: <A, B, C>(
      args: TaggedEnum.Args<
        TaggedEnum.Kind<Z, A, B, C, unknown>,
        Tag,
        Extract<TaggedEnum.Kind<Z, A, B, C, unknown>, { readonly _tag: Tag }>
      >
    ) => Extract<TaggedEnum.Kind<Z, A, B, C, unknown>, { readonly _tag: Tag }>
  }
  <Z extends TaggedEnum.WithGenerics<4>>(): {
    readonly [Tag in Z["taggedEnum"]["_tag"]]: <A, B, C, D>(
      args: TaggedEnum.Args<
        TaggedEnum.Kind<Z, A, B, C, D>,
        Tag,
        Extract<TaggedEnum.Kind<Z, A, B, C, D>, { readonly _tag: Tag }>
      >
    ) => Extract<TaggedEnum.Kind<Z, A, B, C, D>, { readonly _tag: Tag }>
  }
  <A extends { readonly _tag: string } & Equal.Equal>(): {
    readonly [Tag in A["_tag"]]: Case.Constructor<Extract<A, { readonly _tag: Tag }>, "_tag">
  }
}
```

**Example**

```ts
import * as Data from "effect/Data"

const { BadRequest, NotFound } = Data.taggedEnum<
  | Data.Data<{ readonly _tag: "BadRequest"; readonly status: 400; readonly message: string }>
  | Data.Data<{ readonly _tag: "NotFound"; readonly status: 404; readonly message: string }>
>()

const notFound = NotFound({ status: 404, message: "Not Found" })
```

**Example**

```ts
import * as Data from "effect/Data"

type MyResult<E, A> = Data.TaggedEnum<{
  Failure: { readonly error: E }
  Success: { readonly value: A }
}>
interface MyResultDefinition extends Data.TaggedEnum.WithGenerics<2> {
  readonly taggedEnum: MyResult<this["A"], this["B"]>
}
const { Failure, Success } = Data.taggedEnum<MyResultDefinition>()

const success = Success({ value: 1 })
```

Added in v2.0.0

## tuple

**Signature**

```ts
export declare const tuple: <As extends readonly any[]>(...as: As) => Data<Readonly<As>>
```

**Example**

```ts
import * as Data from "effect/Data"
import * as Equal from "effect/Equal"

const alice = Data.tuple("Alice", 30)

const bob = Data.tuple("Bob", 40)

assert.deepStrictEqual(Equal.equals(alice, alice), true)
assert.deepStrictEqual(Equal.equals(alice, Data.tuple("Alice", 30)), true)

assert.deepStrictEqual(Equal.equals(alice, ["Alice", 30]), false)
assert.deepStrictEqual(Equal.equals(alice, bob), false)
```

Added in v2.0.0

## unsafeArray

**Signature**

```ts
export declare const unsafeArray: <As extends readonly any[]>(as: As) => Data<Readonly<As>>
```

Added in v2.0.0

## unsafeStruct

**Signature**

```ts
export declare const unsafeStruct: <A extends Record<string, any>>(as: A) => Data<{ readonly [P in keyof A]: A[P] }>
```

Added in v2.0.0

# models

## Case (interface)

`Case` represents a datatype similar to a case class in Scala. Namely, a
datatype created using `Case` will, by default, provide an implementation
for a constructor, `Hash`, and `Equal`.

**Signature**

```ts
export interface Case extends Equal.Equal {}
```

Added in v2.0.0

## Data (type alias)

**Signature**

```ts
export type Data<A> = { readonly [P in keyof A]: A[P] } & Equal.Equal
```

Added in v2.0.0

## TaggedEnum (type alias)

Create a tagged enum data type, which is a union of `Data` structs.

```ts
import * as Data from "effect/Data"

type HttpError = Data.TaggedEnum<{
  BadRequest: { readonly status: 400; readonly message: string }
  NotFound: { readonly status: 404; readonly message: string }
}>

// Equivalent to:
type HttpErrorPlain =
  | Data.Data<{
      readonly _tag: "BadRequest"
      readonly status: 400
      readonly message: string
    }>
  | Data.Data<{
      readonly _tag: "NotFound"
      readonly status: 404
      readonly message: string
    }>
```

**Signature**

```ts
export type TaggedEnum<A extends Record<string, Record<string, any>> & UntaggedChildren<A>> = keyof A extends infer Tag
  ? Tag extends keyof A
    ? Data<Types.Simplify<{ readonly _tag: Tag } & { readonly [K in keyof A[Tag]]: A[Tag][K] }>>
    : never
  : never
```

Added in v2.0.0

## YieldableError (interface)

**Signature**

```ts
export interface YieldableError extends Case, Pipeable, Readonly<Error> {
  readonly [Effectable.EffectTypeId]: Effect.VarianceStruct<never, this, never>
  readonly [Effectable.StreamTypeId]: Effect.VarianceStruct<never, this, never>
  readonly [Effectable.SinkTypeId]: Sink.Sink.VarianceStruct<never, this, unknown, never, never>
  readonly [Effectable.ChannelTypeId]: Channel.Channel.VarianceStruct<
    never,
    unknown,
    unknown,
    unknown,
    this,
    never,
    never
  >
}
```

Added in v2.0.0

# utils

## Case (namespace)

Added in v2.0.0

### Constructor (interface)

**Signature**

```ts
export interface Constructor<A extends Case, Tag extends keyof A = never> {
  (
    args: Types.Equals<Omit<A, Tag | keyof Equal.Equal>, {}> extends true
      ? void
      : { readonly [P in keyof A as P extends Tag | keyof Equal.Equal ? never : P]: A[P] }
  ): A
}
```

Added in v2.0.0

## TaggedEnum (namespace)

Added in v2.0.0

### WithGenerics (interface)

**Signature**

```ts
export interface WithGenerics<Count extends number> {
  readonly taggedEnum: Data<{ readonly _tag: string }>
  readonly numberOfGenerics: Count

  readonly A: unknown
  readonly B: unknown
  readonly C: unknown
  readonly D: unknown
}
```

Added in v2.0.0

### Args (type alias)

**Signature**

```ts
export type Args<
  A extends { readonly _tag: string } & Equal.Equal,
  K extends A["_tag"],
  E = Extract<A, { readonly _tag: K }>
> = { readonly [K in keyof E as K extends "_tag" | keyof Case ? never : K]: E[K] } extends infer T
  ? {} extends T
    ? void
    : T
  : never
```

Added in v2.0.0

### Kind (type alias)

**Signature**

```ts
export type Kind<Z extends WithGenerics<number>, A = unknown, B = unknown, C = unknown, D = unknown> = (Z & {
  readonly A: A
  readonly B: B
  readonly C: C
  readonly D: D
})["taggedEnum"]
```

Added in v2.0.0

### Value (type alias)

**Signature**

```ts
export type Value<A extends { readonly _tag: string } & Equal.Equal, K extends A["_tag"]> = Extract<
  A,
  { readonly _tag: K }
>
```

Added in v2.0.0
