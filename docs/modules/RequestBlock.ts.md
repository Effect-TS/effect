---
title: RequestBlock.ts
nav_order: 89
parent: Modules
---

## RequestBlock overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [empty](#empty)
  - [mapRequestResolvers](#maprequestresolvers)
  - [parallel](#parallel)
  - [reduce](#reduce)
  - [sequential](#sequential)
  - [single](#single)
- [models](#models)
  - [Empty (interface)](#empty-interface)
  - [Par (interface)](#par-interface)
  - [RequestBlock (type alias)](#requestblock-type-alias)
  - [RequestBlock (namespace)](#requestblock-namespace)
    - [Reducer (interface)](#reducer-interface)
  - [Seq (interface)](#seq-interface)
  - [Single (interface)](#single-interface)

---

# constructors

## empty

**Signature**

```ts
export declare const empty: RequestBlock
```

Added in v2.0.0

## mapRequestResolvers

**Signature**

```ts
export declare const mapRequestResolvers: <A>(
  self: RequestBlock,
  f: (dataSource: RequestResolver.RequestResolver<A, never>) => RequestResolver.RequestResolver<A, never>
) => RequestBlock
```

Added in v2.0.0

## parallel

**Signature**

```ts
export declare const parallel: (self: RequestBlock, that: RequestBlock) => RequestBlock
```

Added in v2.0.0

## reduce

**Signature**

```ts
export declare const reduce: <Z>(self: RequestBlock, reducer: RequestBlock.Reducer<Z>) => Z
```

Added in v2.0.0

## sequential

**Signature**

```ts
export declare const sequential: (self: RequestBlock, that: RequestBlock) => RequestBlock
```

Added in v2.0.0

## single

**Signature**

```ts
export declare const single: <A>(
  dataSource: RequestResolver.RequestResolver<A, never>,
  blockedRequest: Request.Entry<A>
) => RequestBlock
```

Added in v2.0.0

# models

## Empty (interface)

**Signature**

```ts
export interface Empty {
  readonly _tag: "Empty"
}
```

Added in v2.0.0

## Par (interface)

**Signature**

```ts
export interface Par {
  readonly _tag: "Par"
  readonly left: RequestBlock
  readonly right: RequestBlock
}
```

Added in v2.0.0

## RequestBlock (type alias)

`RequestBlock` captures a collection of blocked requests as a data
structure. By doing this the library is able to preserve information about
which requests must be performed sequentially and which can be performed in
parallel, allowing for maximum possible batching and pipelining while
preserving ordering guarantees.

**Signature**

```ts
export type RequestBlock = Empty | Par | Seq | Single
```

Added in v2.0.0

## RequestBlock (namespace)

Added in v2.0.0

### Reducer (interface)

**Signature**

```ts
export interface Reducer<in out Z> {
  emptyCase(): Z
  parCase(left: Z, right: Z): Z
  singleCase(dataSource: RequestResolver.RequestResolver<unknown, never>, blockedRequest: Request.Entry<unknown>): Z
  seqCase(left: Z, right: Z): Z
}
```

Added in v2.0.0

## Seq (interface)

**Signature**

```ts
export interface Seq {
  readonly _tag: "Seq"
  readonly left: RequestBlock
  readonly right: RequestBlock
}
```

Added in v2.0.0

## Single (interface)

**Signature**

```ts
export interface Single {
  readonly _tag: "Single"
  readonly dataSource: RequestResolver.RequestResolver<unknown, never>
  readonly blockedRequest: Request.Entry<unknown>
}
```

Added in v2.0.0
