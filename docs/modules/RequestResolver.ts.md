---
title: RequestResolver.ts
nav_order: 89
parent: Modules
---

## RequestResolver overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [combinators](#combinators)
  - [around](#around)
  - [batchN](#batchn)
  - [eitherWith](#eitherwith)
  - [locally](#locally)
  - [race](#race)
- [constructors](#constructors)
  - [fromEffect](#fromeffect)
  - [fromEffectTagged](#fromeffecttagged)
  - [fromFunction](#fromfunction)
  - [fromFunctionBatched](#fromfunctionbatched)
  - [make](#make)
  - [makeBatched](#makebatched)
  - [makeWithEntry](#makewithentry)
  - [never](#never)
- [context](#context)
  - [mapInputContext](#mapinputcontext)
  - [provideContext](#providecontext)
- [models](#models)
  - [RequestResolver (interface)](#requestresolver-interface)
- [refinements](#refinements)
  - [isRequestResolver](#isrequestresolver)
- [symbols](#symbols)
  - [RequestResolverTypeId](#requestresolvertypeid)
  - [RequestResolverTypeId (type alias)](#requestresolvertypeid-type-alias)
- [utils](#utils)
  - [RequestResolver (namespace)](#requestresolver-namespace)
    - [Variance (interface)](#variance-interface)
  - [contextFromEffect](#contextfromeffect)
  - [contextFromServices](#contextfromservices)

---

# combinators

## around

A data source aspect that executes requests between two effects, `before`
and `after`, where the result of `before` can be used by `after`.

**Signature**

```ts
export declare const around: {
  <R2, A2, R3, _>(
    before: Effect.Effect<R2, never, A2>,
    after: (a: A2) => Effect.Effect<R3, never, _>
  ): <R, A>(self: RequestResolver<A, R>) => RequestResolver<A, R2 | R3 | R>
  <R, A, R2, A2, R3, _>(
    self: RequestResolver<A, R>,
    before: Effect.Effect<R2, never, A2>,
    after: (a: A2) => Effect.Effect<R3, never, _>
  ): RequestResolver<A, R | R2 | R3>
}
```

Added in v2.0.0

## batchN

Returns a data source that executes at most `n` requests in parallel.

**Signature**

```ts
export declare const batchN: {
  (n: number): <R, A>(self: RequestResolver<A, R>) => RequestResolver<A, R>
  <R, A>(self: RequestResolver<A, R>, n: number): RequestResolver<A, R>
}
```

Added in v2.0.0

## eitherWith

Returns a new data source that executes requests of type `C` using the
specified function to transform `C` requests into requests that either this
data source or that data source can execute.

**Signature**

```ts
export declare const eitherWith: {
  <A extends Request.Request<any, any>, R2, B extends Request.Request<any, any>, C extends Request.Request<any, any>>(
    that: RequestResolver<B, R2>,
    f: (_: Request.Entry<C>) => Either.Either<Request.Entry<A>, Request.Entry<B>>
  ): <R>(self: RequestResolver<A, R>) => RequestResolver<C, R2 | R>
  <
    R,
    A extends Request.Request<any, any>,
    R2,
    B extends Request.Request<any, any>,
    C extends Request.Request<any, any>
  >(
    self: RequestResolver<A, R>,
    that: RequestResolver<B, R2>,
    f: (_: Request.Entry<C>) => Either.Either<Request.Entry<A>, Request.Entry<B>>
  ): RequestResolver<C, R | R2>
}
```

Added in v2.0.0

## locally

Returns a new data source with a localized FiberRef

**Signature**

```ts
export declare const locally: {
  <A>(
    self: FiberRef<A>,
    value: A
  ): <R, B extends Request.Request<any, any>>(use: RequestResolver<B, R>) => RequestResolver<B, R>
  <R, B extends Request.Request<any, any>, A>(
    use: RequestResolver<B, R>,
    self: FiberRef<A>,
    value: A
  ): RequestResolver<B, R>
}
```

Added in v2.0.0

## race

Returns a new data source that executes requests by sending them to this
data source and that data source, returning the results from the first data
source to complete and safely interrupting the loser.

**Signature**

```ts
export declare const race: {
  <R2, A2 extends Request.Request<any, any>>(
    that: RequestResolver<A2, R2>
  ): <R, A extends Request.Request<any, any>>(self: RequestResolver<A, R>) => RequestResolver<A2 | A, R2 | R>
  <R, A extends Request.Request<any, any>, R2, A2 extends Request.Request<any, any>>(
    self: RequestResolver<A, R>,
    that: RequestResolver<A2, R2>
  ): RequestResolver<A | A2, R | R2>
}
```

Added in v2.0.0

# constructors

## fromEffect

Constructs a data source from an effectual function.

**Signature**

```ts
export declare const fromEffect: <R, A extends Request.Request<any, any>>(
  f: (a: A) => Effect.Effect<R, Request.Request.Error<A>, Request.Request.Success<A>>
) => RequestResolver<A, R>
```

Added in v2.0.0

## fromEffectTagged

Constructs a data source from a list of tags paired to functions, that takes
a list of requests and returns a list of results of the same size. Each item
in the result list must correspond to the item at the same index in the
request list.

**Signature**

```ts
export declare const fromEffectTagged: <A extends Request.Request<any, any> & { readonly _tag: string }>() => <
  Fns extends {
    readonly [Tag in A["_tag"]]: [Extract<A, { readonly _tag: Tag }>] extends [infer Req]
      ? Req extends Request.Request<infer ReqE, infer ReqA>
        ? (requests: Req[]) => Effect.Effect<any, ReqE, Iterable<ReqA>>
        : never
      : never
  }
>(
  fns: Fns
) => RequestResolver<A, ReturnType<Fns[keyof Fns]> extends Effect.Effect<infer R, infer _E, infer _A> ? R : never>
```

Added in v2.0.0

## fromFunction

Constructs a data source from a pure function.

**Signature**

```ts
export declare const fromFunction: <A extends Request.Request<never, any>>(
  f: (request: A) => Request.Request.Success<A>
) => RequestResolver<A, never>
```

Added in v2.0.0

## fromFunctionBatched

Constructs a data source from a pure function that takes a list of requests
and returns a list of results of the same size. Each item in the result
list must correspond to the item at the same index in the request list.

**Signature**

```ts
export declare const fromFunctionBatched: <A extends Request.Request<never, any>>(
  f: (chunk: A[]) => Iterable<Request.Request.Success<A>>
) => RequestResolver<A, never>
```

Added in v2.0.0

## make

Constructs a data source with the specified identifier and method to run
requests.

**Signature**

```ts
export declare const make: <R, A>(runAll: (requests: A[][]) => Effect.Effect<R, never, void>) => RequestResolver<A, R>
```

Added in v2.0.0

## makeBatched

Constructs a data source from a function taking a collection of requests
and returning a `RequestCompletionMap`.

**Signature**

```ts
export declare const makeBatched: <R, A extends Request.Request<any, any>>(
  run: (requests: A[]) => Effect.Effect<R, never, void>
) => RequestResolver<A, R>
```

Added in v2.0.0

## makeWithEntry

Constructs a data source with the specified identifier and method to run
requests.

**Signature**

```ts
export declare const makeWithEntry: <R, A>(
  runAll: (requests: Request.Entry<A>[][]) => Effect.Effect<R, never, void>
) => RequestResolver<A, R>
```

Added in v2.0.0

## never

A data source that never executes requests.

**Signature**

```ts
export declare const never: RequestResolver<never, never>
```

Added in v2.0.0

# context

## mapInputContext

Provides this data source with part of its required context.

**Signature**

```ts
export declare const mapInputContext: {
  <R0, R>(
    f: (context: Context.Context<R0>) => Context.Context<R>
  ): <A extends Request.Request<any, any>>(self: RequestResolver<A, R>) => RequestResolver<A, R0>
  <R, A extends Request.Request<any, any>, R0>(
    self: RequestResolver<A, R>,
    f: (context: Context.Context<R0>) => Context.Context<R>
  ): RequestResolver<A, R0>
}
```

Added in v2.0.0

## provideContext

Provides this data source with its required context.

**Signature**

```ts
export declare const provideContext: {
  <R>(
    context: Context.Context<R>
  ): <A extends Request.Request<any, any>>(self: RequestResolver<A, R>) => RequestResolver<A, never>
  <R, A extends Request.Request<any, any>>(
    self: RequestResolver<A, R>,
    context: Context.Context<R>
  ): RequestResolver<A, never>
}
```

Added in v2.0.0

# models

## RequestResolver (interface)

A `RequestResolver<A, R>` requires an environment `R` and is capable of executing
requests of type `A`.

Data sources must implement the method `runAll` which takes a collection of
requests and returns an effect with a `RequestCompletionMap` containing a
mapping from requests to results. The type of the collection of requests is
a `Chunk<Chunk<A>>`. The outer `Chunk` represents batches of requests that
must be performed sequentially. The inner `Chunk` represents a batch of
requests that can be performed in parallel. This allows data sources to
introspect on all the requests being executed and optimize the query.

Data sources will typically be parameterized on a subtype of `Request<A>`,
though that is not strictly necessarily as long as the data source can map
the request type to a `Request<A>`. Data sources can then pattern match on
the collection of requests to determine the information requested, execute
the query, and place the results into the `RequestCompletionMap` using
`RequestCompletionMap.empty` and `RequestCompletionMap.insert`. Data
sources must provide results for all requests received. Failure to do so
will cause a query to die with a `QueryFailure` when run.

**Signature**

```ts
export interface RequestResolver<A, R = never> extends Equal.Equal, Pipeable {
  /**
   * Execute a collection of requests. The outer `Chunk` represents batches
   * of requests that must be performed sequentially. The inner `Chunk`
   * represents a batch of requests that can be performed in parallel.
   */
  runAll(requests: Array<Array<Request.Entry<A>>>): Effect.Effect<R, never, void>

  /**
   * Identify the data source using the specific identifier
   */
  identified(...identifiers: Array<unknown>): RequestResolver<A, R>
}
```

Added in v2.0.0

# refinements

## isRequestResolver

Returns `true` if the specified value is a `RequestResolver`, `false` otherwise.

**Signature**

```ts
export declare const isRequestResolver: (u: unknown) => u is RequestResolver<unknown, unknown>
```

Added in v2.0.0

# symbols

## RequestResolverTypeId

**Signature**

```ts
export declare const RequestResolverTypeId: typeof RequestResolverTypeId
```

Added in v2.0.0

## RequestResolverTypeId (type alias)

**Signature**

```ts
export type RequestResolverTypeId = typeof RequestResolverTypeId
```

Added in v2.0.0

# utils

## RequestResolver (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<R, A> {
  readonly [RequestResolverTypeId]: {
    readonly _R: (_: never) => R
    readonly _A: (_: never) => A
  }
}
```

Added in v2.0.0

## contextFromEffect

**Signature**

```ts
export declare const contextFromEffect: <R, A extends Request.Request<any, any>>(
  self: RequestResolver<A, R>
) => Effect.Effect<R, never, RequestResolver<A, never>>
```

Added in v2.0.0

## contextFromServices

**Signature**

```ts
export declare const contextFromServices: <Services extends Context.Tag<any, any>[]>(
  ...services: Services
) => <R, A extends Request.Request<any, any>>(
  self: RequestResolver<A, R>
) => Effect.Effect<
  { [k in keyof Services]: Effect.Effect.Context<Services[k]> }[number],
  never,
  RequestResolver<A, Exclude<R, { [k in keyof Services]: Effect.Effect.Context<Services[k]> }[number]>>
>
```

Added in v2.0.0
