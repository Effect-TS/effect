---
title: Classic/Identity/index.ts
nav_order: 7
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Identity (interface)](#identity-interface)
  - [IdentityURI](#identityuri)
  - [IdentityURI (type alias)](#identityuri-type-alias)
  - [deriveIdentity](#deriveidentity)
  - [makeIdentity](#makeidentity)

---

# utils

## Identity (interface)

Equivalent to a Monoid

**Signature**

```ts
export interface Identity<A> extends Associative<A> {
  readonly identity: A
}
```

Added in v1.0.0

## IdentityURI

**Signature**

```ts
export declare const IdentityURI: 'Identity'
```

Added in v1.0.0

## IdentityURI (type alias)

**Signature**

```ts
export type IdentityURI = typeof IdentityURI
```

Added in v1.0.0

## deriveIdentity

**Signature**

```ts
export declare function deriveIdentity<F extends URIS, A>(D: Derive<F, IdentityURI>, I: Identity<A>)
```

Added in v1.0.0

## makeIdentity

**Signature**

```ts
export declare function makeIdentity<A>(identity: A, op: (y: A) => (x: A) => A): Identity<A>
```

Added in v1.0.0
