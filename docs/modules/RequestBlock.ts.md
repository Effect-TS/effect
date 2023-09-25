---
title: RequestBlock.ts
nav_order: 79
parent: Modules
---

## RequestBlock overview

Added in v1.0.0

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
- [utils](#utils)
  - [locally](#locally)
  - [mapInputContext](#mapinputcontext)

---

# constructors

## empty

**Signature**

```ts
export declare const empty: RequestBlock<never>
```

Added in v1.0.0

## mapRequestResolvers

**Signature**

```ts
export declare const mapRequestResolvers: <R, A, R2>(
  self: RequestBlock<R>,
  f: (dataSource: RequestResolver.RequestResolver<A, R>) => RequestResolver.RequestResolver<A, R2>
) => RequestBlock<R | R2>
```

Added in v1.0.0

## parallel

**Signature**

```ts
export declare const parallel: <R, R2>(self: RequestBlock<R>, that: RequestBlock<R2>) => RequestBlock<R | R2>
```

Added in v1.0.0

## reduce

**Signature**

```ts
export declare const reduce: <R, Z>(self: RequestBlock<R>, reducer: RequestBlock.Reducer<R, Z>) => Z
```

Added in v1.0.0

## sequential

**Signature**

```ts
export declare const sequential: <R, R2>(self: RequestBlock<R>, that: RequestBlock<R2>) => RequestBlock<R | R2>
```

Added in v1.0.0

## single

**Signature**

```ts
export declare const single: <R, A>(
  dataSource: RequestResolver.RequestResolver<A, R>,
  blockedRequest: Request.Entry<A>
) => RequestBlock<R>
```

Added in v1.0.0

# models

## Empty (interface)

**Signature**

```ts
export interface Empty {
  readonly _tag: 'Empty'
}
```

Added in v1.0.0

## Par (interface)

**Signature**

```ts
export interface Par<R> {
  readonly _tag: 'Par'
  readonly left: RequestBlock<R>
  readonly right: RequestBlock<R>
}
```

Added in v1.0.0

## RequestBlock (type alias)

`RequestBlock` captures a collection of blocked requests as a data
structure. By doing this the library is able to preserve information about
which requests must be performed sequentially and which can be performed in
parallel, allowing for maximum possible batching and pipelining while
preserving ordering guarantees.

**Signature**

```ts
export type RequestBlock<R> = Empty | Par<R> | Seq<R> | Single<R>
```

Added in v1.0.0

## RequestBlock (namespace)

Added in v1.0.0

### Reducer (interface)

**Signature**

```ts
export interface Reducer<R, Z> {
  readonly emptyCase: () => Z
  readonly parCase: (left: Z, right: Z) => Z
  readonly singleCase: (
    dataSource: RequestResolver.RequestResolver<unknown, R>,
    blockedRequest: Request.Entry<unknown>
  ) => Z
  readonly seqCase: (left: Z, right: Z) => Z
}
```

Added in v1.0.0

## Seq (interface)

**Signature**

```ts
export interface Seq<R> {
  readonly _tag: 'Seq'
  readonly left: RequestBlock<R>
  readonly right: RequestBlock<R>
}
```

Added in v1.0.0

## Single (interface)

**Signature**

```ts
export interface Single<R> {
  readonly _tag: 'Single'
  readonly dataSource: RequestResolver.RequestResolver<unknown, R>
  readonly blockedRequest: Request.Entry<unknown>
}
```

Added in v1.0.0

# utils

## locally

Provides each data source with a fiber ref value.

**Signature**

```ts
export declare const locally: <R, A>(self: RequestBlock<R>, ref: FiberRef<A>, value: A) => RequestBlock<R>
```

Added in v1.0.0

## mapInputContext

Provides each data source with part of its required environment.

**Signature**

```ts
export declare const mapInputContext: <R0, R>(
  self: RequestBlock<R>,
  f: (context: Context.Context<R0>) => Context.Context<R>
) => RequestBlock<R0>
```

Added in v1.0.0
