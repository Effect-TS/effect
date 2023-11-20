---
title: Request.ts
nav_order: 88
parent: Modules
---

## Request overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [Class](#class)
  - [TaggedClass](#taggedclass)
  - [makeEntry](#makeentry)
  - [of](#of)
  - [tagged](#tagged)
- [guards](#guards)
  - [isEntry](#isentry)
- [models](#models)
  - [Cache (interface)](#cache-interface)
  - [Entry (interface)](#entry-interface)
  - [Entry (namespace)](#entry-namespace)
    - [Variance (interface)](#variance-interface)
  - [Listeners (interface)](#listeners-interface)
  - [Request (interface)](#request-interface)
  - [makeCache](#makecache)
- [refinements](#refinements)
  - [isRequest](#isrequest)
- [request completion](#request-completion)
  - [complete](#complete)
  - [completeEffect](#completeeffect)
  - [fail](#fail)
  - [interruptWhenPossible](#interruptwhenpossible)
  - [succeed](#succeed)
- [symbols](#symbols)
  - [EntryTypeId](#entrytypeid)
  - [EntryTypeId (type alias)](#entrytypeid-type-alias)
  - [RequestTypeId](#requesttypeid)
  - [RequestTypeId (type alias)](#requesttypeid-type-alias)
- [utils](#utils)
  - [Request (namespace)](#request-namespace)
    - [Constructor (interface)](#constructor-interface)
    - [Variance (interface)](#variance-interface-1)
    - [Error (type alias)](#error-type-alias)
    - [OptionalResult (type alias)](#optionalresult-type-alias)
    - [Result (type alias)](#result-type-alias)
    - [Success (type alias)](#success-type-alias)

---

# constructors

## Class

Provides a constructor for a Request Class.

**Signature**

```ts
export declare const Class: new <Error, Success, A extends Record<string, any>>(
  args: Types.Equals<Omit<A, keyof Request<unknown, unknown>>, {}> extends true
    ? void
    : { readonly [P in keyof A as P extends keyof Request<unknown, unknown> ? never : P]: A[P] }
) => Request<Error, Success> & Readonly<A>
```

**Example**

```ts
import * as Request from "effect/Request"

type Error = never
type Success = string

class MyRequest extends Request.Class<
  Error,
  Success,
  {
    readonly id: string
  }
> {}
```

Added in v2.0.0

## TaggedClass

Provides a Tagged constructor for a Request Class.

**Signature**

```ts
export declare const TaggedClass: <Tag extends string>(
  tag: Tag
) => new <Error, Success, A extends Record<string, any>>(
  args: Types.Equals<Omit<A, keyof Request<unknown, unknown>>, {}> extends true
    ? void
    : { readonly [P in keyof A as P extends "_tag" | keyof Request<unknown, unknown> ? never : P]: A[P] }
) => Request<Error, Success> & Readonly<A> & { readonly _tag: Tag }
```

**Example**

```ts
import * as Request from "effect/Request"

type Error = never
type Success = string

class MyRequest extends Request.TaggedClass("MyRequest")<
  Error,
  Success,
  {
    readonly name: string
  }
> {}
```

Added in v2.0.0

## makeEntry

**Signature**

```ts
export declare const makeEntry: <A extends Request<any, any>>(options: {
  readonly request: A
  readonly result: Deferred<Request.Error<A>, Request.Success<A>>
  readonly listeners: Listeners
  readonly ownerId: FiberId
  readonly state: { completed: boolean }
}) => Entry<A>
```

Added in v2.0.0

## of

Constructs a new `Request`.

**Signature**

```ts
export declare const of: <R extends Request<any, any>>() => Request.Constructor<R, never>
```

Added in v2.0.0

## tagged

Constructs a new `Request`.

**Signature**

```ts
export declare const tagged: <R extends Request<any, any> & { _tag: string }>(
  tag: R["_tag"]
) => Request.Constructor<R, "_tag">
```

Added in v2.0.0

# guards

## isEntry

**Signature**

```ts
export declare const isEntry: (u: unknown) => u is Entry<unknown>
```

Added in v2.0.0

# models

## Cache (interface)

**Signature**

```ts
export interface Cache
  extends _Cache.ConsumerCache<
    Request<any, any>,
    never,
    {
      listeners: Listeners
      handle: Deferred<unknown, unknown>
    }
  > {}
```

Added in v2.0.0

## Entry (interface)

A `Entry<A>` keeps track of a request of type `A` along with a
`Ref` containing the result of the request, existentially hiding the result
type. This is used internally by the library to support data sources that
return different result types for different requests while guaranteeing that
results will be of the type requested.

**Signature**

```ts
export interface Entry<out R> extends Entry.Variance<R> {
  readonly request: R
  readonly result: Deferred<
    [R] extends [Request<infer _E, infer _A>] ? _E : never,
    [R] extends [Request<infer _E, infer _A>] ? _A : never
  >
  readonly listeners: Listeners
  readonly ownerId: FiberId
  readonly state: {
    completed: boolean // TODO: mutable by design?
  }
}
```

Added in v2.0.0

## Entry (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<out R> {
  readonly [EntryTypeId]: {
    readonly _R: (_: never) => R
  }
}
```

Added in v2.0.0

## Listeners (interface)

**Signature**

```ts
export interface Listeners {
  readonly count: number
  readonly observers: Set<(count: number) => void>
  addObserver(f: (count: number) => void): void
  removeObserver(f: (count: number) => void): void
  increment(): void
  decrement(): void
}
```

Added in v2.0.0

## Request (interface)

A `Request<E, A>` is a request from a data source for a value of type `A`
that may fail with an `E`.

**Signature**

```ts
export interface Request<out E, out A> extends Request.Variance<E, A>, Data.Case {}
```

Added in v2.0.0

## makeCache

**Signature**

```ts
export declare const makeCache: (options: {
  readonly capacity: number
  readonly timeToLive: DurationInput
}) => Effect.Effect<never, never, Cache>
```

Added in v2.0.0

# refinements

## isRequest

Returns `true` if the specified value is a `Request`, `false` otherwise.

**Signature**

```ts
export declare const isRequest: (u: unknown) => u is Request<unknown, unknown>
```

Added in v2.0.0

# request completion

## complete

Complete a `Request` with the specified result.

**Signature**

```ts
export declare const complete: {
  <A extends Request<any, any>>(result: Request.Result<A>): (self: A) => Effect.Effect<never, never, void>
  <A extends Request<any, any>>(self: A, result: Request.Result<A>): Effect.Effect<never, never, void>
}
```

Added in v2.0.0

## completeEffect

Complete a `Request` with the specified effectful computation, failing the
request with the error from the effect workflow if it fails, and completing
the request with the value of the effect workflow if it succeeds.

**Signature**

```ts
export declare const completeEffect: {
  <A extends Request<any, any>, R>(
    effect: Effect.Effect<R, Request.Error<A>, Request.Success<A>>
  ): (self: A) => Effect.Effect<R, never, void>
  <A extends Request<any, any>, R>(
    self: A,
    effect: Effect.Effect<R, Request.Error<A>, Request.Success<A>>
  ): Effect.Effect<R, never, void>
}
```

Added in v2.0.0

## fail

Complete a `Request` with the specified error.

**Signature**

```ts
export declare const fail: {
  <A extends Request<any, any>>(error: Request.Error<A>): (self: A) => Effect.Effect<never, never, void>
  <A extends Request<any, any>>(self: A, error: Request.Error<A>): Effect.Effect<never, never, void>
}
```

Added in v2.0.0

## interruptWhenPossible

Interrupts the child effect when requests are no longer needed

**Signature**

```ts
export declare const interruptWhenPossible: {
  (all: Iterable<Request<any, any>>): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, void>
  <R, E, A>(self: Effect.Effect<R, E, A>, all: Iterable<Request<any, any>>): Effect.Effect<R, E, void>
}
```

Added in v2.0.0

## succeed

Complete a `Request` with the specified value.

**Signature**

```ts
export declare const succeed: {
  <A extends Request<any, any>>(value: Request.Success<A>): (self: A) => Effect.Effect<never, never, void>
  <A extends Request<any, any>>(self: A, value: Request.Success<A>): Effect.Effect<never, never, void>
}
```

Added in v2.0.0

# symbols

## EntryTypeId

**Signature**

```ts
export declare const EntryTypeId: typeof EntryTypeId
```

Added in v2.0.0

## EntryTypeId (type alias)

**Signature**

```ts
export type EntryTypeId = typeof EntryTypeId
```

Added in v2.0.0

## RequestTypeId

**Signature**

```ts
export declare const RequestTypeId: typeof RequestTypeId
```

Added in v2.0.0

## RequestTypeId (type alias)

**Signature**

```ts
export type RequestTypeId = typeof RequestTypeId
```

Added in v2.0.0

# utils

## Request (namespace)

Added in v2.0.0

### Constructor (interface)

**Signature**

```ts
export interface Constructor<R extends Request<any, any>, T extends keyof R = never> {
  (args: Omit<R, T | keyof (Data.Case & Request.Variance<Request.Error<R>, Request.Success<R>>)>): R
}
```

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<out E, out A> {
  readonly [RequestTypeId]: {
    readonly _E: (_: never) => E
    readonly _A: (_: never) => A
  }
}
```

Added in v2.0.0

### Error (type alias)

A utility type to extract the error type from a `Request`.

**Signature**

```ts
export type Error<T extends Request<any, any>> = [T] extends [Request<infer _E, infer _A>] ? _E : never
```

Added in v2.0.0

### OptionalResult (type alias)

A utility type to extract the optional result type from a `Request`.

**Signature**

```ts
export type OptionalResult<T extends Request<any, any>> = T extends Request<infer E, infer A>
  ? Exit.Exit<E, Option.Option<A>>
  : never
```

Added in v2.0.0

### Result (type alias)

A utility type to extract the result type from a `Request`.

**Signature**

```ts
export type Result<T extends Request<any, any>> = T extends Request<infer E, infer A> ? Exit.Exit<E, A> : never
```

Added in v2.0.0

### Success (type alias)

A utility type to extract the value type from a `Request`.

**Signature**

```ts
export type Success<T extends Request<any, any>> = [T] extends [Request<infer _E, infer _A>] ? _A : never
```

Added in v2.0.0
