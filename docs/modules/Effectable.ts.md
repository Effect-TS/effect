---
title: Effectable.ts
nav_order: 24
parent: Modules
---

## Effectable overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [Class (class)](#class-class)
    - [commit (method)](#commit-method)
  - [StructuralClass (class)](#structuralclass-class)
    - [commit (method)](#commit-method-1)
- [models](#models)
  - [CommitPrimitive (interface)](#commitprimitive-interface)
- [prototypes](#prototypes)
  - [CommitPrototype](#commitprototype)
  - [EffectPrototype](#effectprototype)
  - [StructuralCommitPrototype](#structuralcommitprototype)
- [type ids](#type-ids)
  - [ChannelTypeId](#channeltypeid)
  - [ChannelTypeId (type alias)](#channeltypeid-type-alias)
  - [EffectTypeId](#effecttypeid)
  - [EffectTypeId (type alias)](#effecttypeid-type-alias)
  - [SinkTypeId](#sinktypeid)
  - [SinkTypeId (type alias)](#sinktypeid-type-alias)
  - [StreamTypeId](#streamtypeid)
  - [StreamTypeId (type alias)](#streamtypeid-type-alias)

---

# constructors

## Class (class)

**Signature**

```ts
export declare class Class<R, E, A>
```

Added in v2.0.0

### commit (method)

**Signature**

```ts
abstract commit(): Effect<R, E, A>
```

Added in v2.0.0

## StructuralClass (class)

**Signature**

```ts
export declare class StructuralClass<R, E, A>
```

Added in v2.0.0

### commit (method)

**Signature**

```ts
abstract commit(): Effect<R, E, A>
```

Added in v2.0.0

# models

## CommitPrimitive (interface)

**Signature**

```ts
export interface CommitPrimitive {
  new <R, E, A>(): Effect<R, E, A>
}
```

Added in v2.0.0

# prototypes

## CommitPrototype

**Signature**

```ts
export declare const CommitPrototype: Effect<never, never, never>
```

Added in v2.0.0

## EffectPrototype

**Signature**

```ts
export declare const EffectPrototype: Effect<never, never, never>
```

Added in v2.0.0

## StructuralCommitPrototype

**Signature**

```ts
export declare const StructuralCommitPrototype: Effect<never, never, never>
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
