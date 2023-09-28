---
title: Effectable.ts
nav_order: 29
parent: Modules
---

## Effectable overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [Effectable (class)](#effectable-class)
    - [commit (method)](#commit-method)
  - [Structural (class)](#structural-class)
    - [commit (method)](#commit-method-1)
- [models](#models)
  - [Commit (interface)](#commit-interface)
- [type ids](#type-ids)
  - [ChannelTypeId](#channeltypeid)
  - [EffectTypeId](#effecttypeid)
  - [SinkTypeId](#sinktypeid)
  - [StreamTypeId](#streamtypeid)

---

# constructors

## Effectable (class)

**Signature**

```ts
export declare class Effectable<R, E, A>
```

Added in v1.0.0

### commit (method)

**Signature**

```ts
abstract commit(): Effect.Effect<R, E, A>
```

Added in v1.0.0

## Structural (class)

**Signature**

```ts
export declare class Structural<R, E, A>
```

Added in v1.0.0

### commit (method)

**Signature**

```ts
abstract commit(): Effect.Effect<R, E, A>
```

Added in v1.0.0

# models

## Commit (interface)

**Signature**

```ts
export interface Commit {
  new <R, E, A>(): Effect.Effect<R, E, A>
}
```

Added in v1.0.0

# type ids

## ChannelTypeId

**Signature**

```ts
export declare const ChannelTypeId: typeof Channel.ChannelTypeId
```

Added in v1.0.0

## EffectTypeId

**Signature**

```ts
export declare const EffectTypeId: typeof Effect.EffectTypeId
```

Added in v1.0.0

## SinkTypeId

**Signature**

```ts
export declare const SinkTypeId: typeof Sink.SinkTypeId
```

Added in v1.0.0

## StreamTypeId

**Signature**

```ts
export declare const StreamTypeId: typeof Stream.StreamTypeId
```

Added in v1.0.0
