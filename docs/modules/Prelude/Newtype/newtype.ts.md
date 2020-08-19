---
title: Prelude/Newtype/newtype.ts
nav_order: 35
parent: Modules
---

## newtype overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [AnyNewtype (type alias)](#anynewtype-type-alias)
  - [Constructor (interface)](#constructor-interface)
  - [ConstructorK (interface)](#constructork-interface)
  - [Generic (type alias)](#generic-type-alias)
  - [GenericConstructor (interface)](#genericconstructor-interface)
  - [Newtype (interface)](#newtype-interface)
  - [TypeOf (type alias)](#typeof-type-alias)
  - [genericDef](#genericdef)
  - [newtype](#newtype)
  - [typeDef](#typedef)

---

# utils

## AnyNewtype (type alias)

**Signature**

```ts
export type AnyNewtype = Newtype<any, any>
```

Added in v1.0.0

## Constructor (interface)

**Signature**

```ts
export interface Constructor<T, URI> {
  URI: URI
  wrap: (_: T) => Newtype<URI, T>
  unwrap: (_: Newtype<URI, T>) => T
}
```

Added in v1.0.0

## ConstructorK (interface)

**Signature**

```ts
export interface ConstructorK<T, URI, K extends Newtype<URI, T>> {
  wrap: (_: T) => K
  unwrap: (_: K) => T
}
```

Added in v1.0.0

## Generic (type alias)

**Signature**

```ts
export type Generic<T, K extends GenericConstructor<any>> = [K] extends [GenericConstructor<infer URI>]
  ? Newtype<URI, T>
  : never
```

Added in v1.0.0

## GenericConstructor (interface)

**Signature**

```ts
export interface GenericConstructor<URI> {
  URI: URI
  wrap: <T>(_: T) => Newtype<URI, T>
  unwrap: <T>(_: Newtype<URI, T>) => T
  of: <T>() => Constructor<T, URI>
}
```

Added in v1.0.0

## Newtype (interface)

**Signature**

```ts
export interface Newtype<URI, A> {
  readonly _URI: URI
  readonly _A: A
}
```

Added in v1.0.0

## TypeOf (type alias)

**Signature**

```ts
export type TypeOf<T extends Constructor<any, any>> = [T] extends [Constructor<infer K, infer URI>]
  ? Newtype<URI, K>
  : never
```

Added in v1.0.0

## genericDef

**Signature**

```ts
export declare function genericDef<URI extends string>(URI: URI): GenericConstructor<URI>
```

Added in v1.0.0

## newtype

**Signature**

```ts
export declare const newtype: <K extends Newtype<any, any>>() => (
  _: Constructor<K['_A'], K['_URI']>
) => ConstructorK<K['_A'], K['_URI'], K>
```

Added in v1.0.0

## typeDef

**Signature**

```ts
export declare function typeDef<T>(): <URI extends string>(URI: URI) => Constructor<T, URI>
```

Added in v1.0.0
