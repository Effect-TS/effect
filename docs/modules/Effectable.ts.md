---
title: Effectable.ts
nav_order: 29
parent: Modules
---

## Effectable overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [Effectable (class)](#effectable-class)
    - [commit (method)](#commit-method)
  - [Structural (class)](#structural-class)
    - [commit (method)](#commit-method-1)
- [models](#models)
  - [CommitPrimitive (interface)](#commitprimitive-interface)
- [type ids](#type-ids)
  - [ChannelTypeId](#channeltypeid)
  - [ChannelTypeId (type alias)](#channeltypeid-type-alias)
  - [EffectTypeId](#effecttypeid)
  - [EffectTypeId (type alias)](#effecttypeid-type-alias)
  - [SinkTypeId](#sinktypeid)
  - [SinkTypeId (type alias)](#sinktypeid-type-alias)
  - [StreamTypeId](#streamtypeid)
  - [StreamTypeId (type alias)](#streamtypeid-type-alias)
- [utils](#utils)
  - [Base](#base)
  - [StructuralBase](#structuralbase)

---

# constructors

## Effectable (class)

**Signature**

```ts
export declare class Effectable<R, E, A>
```

Added in v2.0.0

### commit (method)

**Signature**

```ts
abstract commit(): Effect.Effect<R, E, A>
```

Added in v2.0.0

## Structural (class)

**Signature**

```ts
export declare class Structural<R, E, A>
```

Added in v2.0.0

### commit (method)

**Signature**

```ts
abstract commit(): Effect.Effect<R, E, A>
```

Added in v2.0.0

# models

## CommitPrimitive (interface)

**Signature**

```ts
export interface CommitPrimitive {
  new <R, E, A>(): Effect.Effect<R, E, A>
}
```

Added in v2.0.0

# type ids

## ChannelTypeId

**Signature**

```ts
export declare const ChannelTypeId: typeof Channel.ChannelTypeId
```

Added in v2.0.0

## ChannelTypeId (type alias)

**Signature**

```ts
export type ChannelTypeId = Channel.ChannelTypeId
```

Added in v2.0.0

## EffectTypeId

**Signature**

```ts
export declare const EffectTypeId: typeof Effect.EffectTypeId
```

Added in v2.0.0

## EffectTypeId (type alias)

**Signature**

```ts
export type EffectTypeId = Effect.EffectTypeId
```

Added in v2.0.0

## SinkTypeId

**Signature**

```ts
export declare const SinkTypeId: typeof Sink.SinkTypeId
```

Added in v2.0.0

## SinkTypeId (type alias)

**Signature**

```ts
export type SinkTypeId = Sink.SinkTypeId
```

Added in v2.0.0

## StreamTypeId

**Signature**

```ts
export declare const StreamTypeId: typeof Stream.StreamTypeId
```

Added in v2.0.0

## StreamTypeId (type alias)

**Signature**

```ts
export type StreamTypeId = Stream.StreamTypeId
```

Added in v2.0.0

# utils

## Base

**Signature**

```ts
export declare const Base: CommitPrimitive
```

Added in v2.0.0

## StructuralBase

**Signature**

```ts
export declare const StructuralBase: CommitPrimitive
```

Added in v2.0.0
