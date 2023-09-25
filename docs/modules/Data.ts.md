---
title: Data.ts
nav_order: 16
parent: Modules
---

## Data overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [Class](#class)
  - [Structural (class)](#structural-class)
    - [[Hash.symbol] (method)](#hashsymbol-method)
    - [[Equal.symbol] (method)](#equalsymbol-method)
  - [TaggedClass](#taggedclass)
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
  args: Types.Equals<Omit<A, keyof Equal.Equal>, {}> extends true ? void : Omit<A, keyof Equal.Equal>
) => Data<A>
```

Added in v1.0.0

## Structural (class)

**Signature**

```ts
export declare class Structural<A> {
  constructor(args: Omit<A, keyof Equal.Equal>)
}
```

Added in v1.0.0

### [Hash.symbol] (method)

**Signature**

```ts
[Hash.symbol](this: Equal.Equal)
```

Added in v1.0.0

### [Equal.symbol] (method)

**Signature**

```ts
[Equal.symbol](this: Equal.Equal, that: Equal.Equal)
```

Added in v1.0.0

## TaggedClass

Provides a Tagged constructor for a Case Class.

**Signature**

```ts
export declare const TaggedClass: <Key extends string>(
  tag: Key
) => new <A extends Record<string, any>>(
  args: Types.Equals<Omit<A, keyof Equal.Equal>, {}> extends true ? void : Omit<A, keyof Equal.Equal>
) => Data<A & { _tag: Key }>
```

Added in v1.0.0

## array

**Signature**

```ts
export declare const array: <As extends readonly any[]>(as: As) => Data<As>
```

Added in v1.0.0

## case

Provides a constructor for the specified `Case`.

**Signature**

```ts
export declare const case: <A extends Case>() => Case.Constructor<A, never>
```

Added in v1.0.0

## struct

**Signature**

```ts
export declare const struct: <As extends Readonly<Record<string, any>>>(as: As) => Data<As>
```

Added in v1.0.0

## tagged

Provides a tagged constructor for the specified `Case`.

**Signature**

```ts
export declare const tagged: <A extends Case & { _tag: string }>(tag: A['_tag']) => Case.Constructor<A, '_tag'>
```

Added in v1.0.0

## taggedEnum

Create a constructor for a tagged union of `Data` structs.

You can also pass a `TaggedEnum.WithGenerics` if you want to add generics to
the constructor.

**Signature**

```ts
export declare const taggedEnum: {
  <Z extends TaggedEnum.WithGenerics<1>>(): <K extends Z['taggedEnum']['_tag']>(
    tag: K
  ) => <A>(
    args: TaggedEnum.Args<TaggedEnum.Kind<Z, A, unknown, unknown, unknown>, K>
  ) => Extract<TaggedEnum.Kind<Z, A, unknown, unknown, unknown>, { readonly _tag: K }>
  <Z extends TaggedEnum.WithGenerics<2>>(): <K extends Z['taggedEnum']['_tag']>(
    tag: K
  ) => <A, B>(
    args: TaggedEnum.Args<TaggedEnum.Kind<Z, A, B, unknown, unknown>, K>
  ) => Extract<TaggedEnum.Kind<Z, A, B, unknown, unknown>, { readonly _tag: K }>
  <Z extends TaggedEnum.WithGenerics<3>>(): <K extends Z['taggedEnum']['_tag']>(
    tag: K
  ) => <A, B, C>(
    args: TaggedEnum.Args<TaggedEnum.Kind<Z, A, B, C, unknown>, K>
  ) => Extract<TaggedEnum.Kind<Z, A, B, C, unknown>, { readonly _tag: K }>
  <Z extends TaggedEnum.WithGenerics<4>>(): <K extends Z['taggedEnum']['_tag']>(
    tag: K
  ) => <A, B, C, D>(
    args: TaggedEnum.Args<TaggedEnum.Kind<Z, A, B, C, D>, K>
  ) => Extract<TaggedEnum.Kind<Z, A, B, C, D>, { readonly _tag: K }>
  <A extends Data<{ readonly _tag: string }>>(): <K extends A['_tag']>(
    tag: K
  ) => Case.Constructor<Extract<A, { readonly _tag: K }>, '_tag'>
}
```

**Example**

```ts
import * as Data from 'effect/Data'

const HttpError = Data.taggedEnum<
  | Data.Data<{ _tag: 'BadRequest'; status: 400; message: string }>
  | Data.Data<{ _tag: 'NotFound'; status: 404; message: string }>
>()

const notFound = HttpError('NotFound')({ status: 404, message: 'Not Found' })
```

**Example**

```ts
import * as Data from 'effect/Data'

type MyResult<E, A> = Data.TaggedEnum<{
  Failure: { error: E }
  Success: { value: A }
}>
interface MyResultDefinition extends Data.TaggedEnum.WithGenerics<2> {
  readonly taggedEnum: MyResult<this['A'], this['B']>
}
const MyResult = Data.taggedEnum<MyResultDefinition>()

const success = MyResult('Success')({ value: 1 })
```

Added in v1.0.0

## tuple

**Signature**

```ts
export declare const tuple: <As extends readonly any[]>(...as: As) => Data<As>
```

Added in v1.0.0

## unsafeArray

**Signature**

```ts
export declare const unsafeArray: <As extends readonly any[]>(as: As) => Data<As>
```

Added in v1.0.0

## unsafeStruct

**Signature**

```ts
export declare const unsafeStruct: <As extends Readonly<Record<string, any>>>(as: As) => Data<As>
```

Added in v1.0.0

# models

## Case (interface)

`Case` represents a datatype similar to a case class in Scala. Namely, a
datatype created using `Case` will, by default, provide an implementation
for a constructor, `Hash`, and `Equal`.

**Signature**

```ts
export interface Case extends Equal.Equal {}
```

Added in v1.0.0

## Data (type alias)

**Signature**

```ts
export type Data<A extends Readonly<Record<string, any>> | ReadonlyArray<any>> = Readonly<A> & Equal.Equal
```

Added in v1.0.0

## TaggedEnum (type alias)

Create a tagged enum data type, which is a union of `Data` structs.

```ts
import * as Data from 'effect/Data'

type HttpError = Data.TaggedEnum<{
  BadRequest: { status: 400; message: string }
  NotFound: { status: 404; message: string }
}>

// Equivalent to:
type HttpErrorPlain =
  | Data.Data<{
      readonly _tag: 'BadRequest'
      readonly status: 400
      readonly message: string
    }>
  | Data.Data<{
      readonly _tag: 'NotFound'
      readonly status: 404
      readonly message: string
    }>
```

**Signature**

```ts
export type TaggedEnum<A extends Record<string, Record<string, any>>> = {
  readonly [Tag in keyof A]: Data<Readonly<Types.Simplify<A[Tag] & { _tag: Tag }>>>
}[keyof A]
```

Added in v1.0.0

# utils

## Case (namespace)

Added in v1.0.0

### Constructor (interface)

**Signature**

```ts
export interface Constructor<A extends Case, T extends keyof A = never> {
  (args: Omit<A, T | keyof Equal.Equal> extends Record<PropertyKey, never> ? void : Omit<A, T | keyof Equal.Equal>): A
}
```

Added in v1.0.0

## TaggedEnum (namespace)

Added in v1.0.0

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

Added in v1.0.0

### Args (type alias)

**Signature**

```ts
export type Args<A extends Data<{ readonly _tag: string }>, K extends A['_tag']> = Omit<
  Extract<A, { readonly _tag: K }>,
  '_tag' | keyof Case
> extends infer T
  ? {} extends T
    ? void
    : T
  : never
```

Added in v1.0.0

### Kind (type alias)

**Signature**

```ts
export type Kind<Z extends WithGenerics<number>, A = unknown, B = unknown, C = unknown, D = unknown> = (Z & {
  readonly A: A
  readonly B: B
  readonly C: C
  readonly D: D
})['taggedEnum']
```

Added in v1.0.0

### Value (type alias)

**Signature**

```ts
export type Value<A extends Data<{ readonly _tag: string }>, K extends A['_tag']> = Extract<A, { readonly _tag: K }>
```

Added in v1.0.0
