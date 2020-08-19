---
title: Prelude/Combined/index.ts
nav_order: 19
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Applicative (type alias)](#applicative-type-alias)
  - [IdentityBoth (type alias)](#identityboth-type-alias)
  - [IdentityEither (type alias)](#identityeither-type-alias)
  - [IdentityFlatten (type alias)](#identityflatten-type-alias)
  - [Monad (type alias)](#monad-type-alias)

---

# utils

## Applicative (type alias)

**Signature**

```ts
export type Applicative<F extends URIS, C = Auto> = IdentityBoth<F, C> & Covariant<F, C>
```

Added in v1.0.0

## IdentityBoth (type alias)

**Signature**

```ts
export type IdentityBoth<F extends URIS, C = Auto> = AssociativeBoth<F, C> & Any<F, C>
```

Added in v1.0.0

## IdentityEither (type alias)

**Signature**

```ts
export type IdentityEither<F extends URIS, C = Auto> = AssociativeEither<F, C> & None<F, C>
```

Added in v1.0.0

## IdentityFlatten (type alias)

**Signature**

```ts
export type IdentityFlatten<F extends URIS, C = Auto> = AssociativeFlatten<F, C> & Any<F, C>
```

Added in v1.0.0

## Monad (type alias)

**Signature**

```ts
export type Monad<F extends URIS, C = Auto> = IdentityFlatten<F, C> & Covariant<F, C>
```

Added in v1.0.0
