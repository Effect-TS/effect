---
title: UpstreamPullRequest.ts
nav_order: 143
parent: Modules
---

## UpstreamPullRequest overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [NoUpstream](#noupstream)
  - [Pulled](#pulled)
- [folding](#folding)
  - [match](#match)
- [models](#models)
  - [NoUpstream (interface)](#noupstream-interface)
  - [Pulled (interface)](#pulled-interface)
  - [UpstreamPullRequest (type alias)](#upstreampullrequest-type-alias)
- [refinements](#refinements)
  - [isNoUpstream](#isnoupstream)
  - [isPulled](#ispulled)
  - [isUpstreamPullRequest](#isupstreampullrequest)
- [symbols](#symbols)
  - [UpstreamPullRequestTypeId](#upstreampullrequesttypeid)
  - [UpstreamPullRequestTypeId (type alias)](#upstreampullrequesttypeid-type-alias)
- [utils](#utils)
  - [UpstreamPullRequest (namespace)](#upstreampullrequest-namespace)
    - [Variance (interface)](#variance-interface)

---

# constructors

## NoUpstream

**Signature**

```ts
export declare const NoUpstream: (activeDownstreamCount: number) => UpstreamPullRequest<never>
```

Added in v2.0.0

## Pulled

**Signature**

```ts
export declare const Pulled: <A>(value: A) => UpstreamPullRequest<A>
```

Added in v2.0.0

# folding

## match

Folds an `UpstreamPullRequest<A>` into a value of type `Z`.

**Signature**

```ts
export declare const match: {
  <A, Z>(options: {
    readonly onPulled: (value: A) => Z
    readonly onNoUpstream: (activeDownstreamCount: number) => Z
  }): (self: UpstreamPullRequest<A>) => Z
  <A, Z>(
    self: UpstreamPullRequest<A>,
    options: { readonly onPulled: (value: A) => Z; readonly onNoUpstream: (activeDownstreamCount: number) => Z }
  ): Z
}
```

Added in v2.0.0

# models

## NoUpstream (interface)

**Signature**

```ts
export interface NoUpstream extends UpstreamPullRequest.Variance<never> {
  readonly _tag: "NoUpstream"
  readonly activeDownstreamCount: number
}
```

Added in v2.0.0

## Pulled (interface)

**Signature**

```ts
export interface Pulled<out A> extends UpstreamPullRequest.Variance<A> {
  readonly _tag: "Pulled"
  readonly value: A
}
```

Added in v2.0.0

## UpstreamPullRequest (type alias)

**Signature**

```ts
export type UpstreamPullRequest<A> = Pulled<A> | NoUpstream
```

Added in v2.0.0

# refinements

## isNoUpstream

Returns `true` if the specified `UpstreamPullRequest` is a `NoUpstream`,
`false` otherwise.

**Signature**

```ts
export declare const isNoUpstream: <A>(self: UpstreamPullRequest<A>) => self is NoUpstream
```

Added in v2.0.0

## isPulled

Returns `true` if the specified `UpstreamPullRequest` is a `Pulled`, `false`
otherwise.

**Signature**

```ts
export declare const isPulled: <A>(self: UpstreamPullRequest<A>) => self is Pulled<A>
```

Added in v2.0.0

## isUpstreamPullRequest

Returns `true` if the specified value is an `UpstreamPullRequest`, `false`
otherwise.

**Signature**

```ts
export declare const isUpstreamPullRequest: (u: unknown) => u is UpstreamPullRequest<unknown>
```

Added in v2.0.0

# symbols

## UpstreamPullRequestTypeId

**Signature**

```ts
export declare const UpstreamPullRequestTypeId: typeof UpstreamPullRequestTypeId
```

Added in v2.0.0

## UpstreamPullRequestTypeId (type alias)

**Signature**

```ts
export type UpstreamPullRequestTypeId = typeof UpstreamPullRequestTypeId
```

Added in v2.0.0

# utils

## UpstreamPullRequest (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<out A> {
  readonly [UpstreamPullRequestTypeId]: {
    readonly _A: (_: never) => A
  }
}
```

Added in v2.0.0
