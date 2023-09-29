---
title: Error.ts
nav_order: 34
parent: Modules
---

## Error overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [Class](#class)
  - [Tagged](#tagged)
- [models](#models)
  - [YieldableError (interface)](#yieldableerror-interface)

---

# constructors

## Class

Provides a constructor for a Case Class.

**Signature**

```ts
export declare const Class: new <A extends Record<string, any>>(
  args: Types.Equals<Omit<A, keyof Equal.Equal>, {}> extends true ? void : Omit<A, keyof Equal.Equal>
) => YieldableError & A
```

Added in v2.0.0

## Tagged

**Signature**

```ts
export declare const Tagged: <Tag extends string>(
  tag: Tag
) => new <A extends Record<string, any>>(
  args: Types.Equals<Omit<A, keyof Equal.Equal>, {}> extends true ? void : Omit<A, keyof Equal.Equal>
) => YieldableError & { readonly _tag: Tag } & A
```

Added in v2.0.0

# models

## YieldableError (interface)

**Signature**

```ts
export interface YieldableError extends Data.Case, Pipeable, Inspectable.Inspectable {
  readonly [Effectable.EffectTypeId]: Effect.Effect.VarianceStruct<never, this, never>
  readonly [Effectable.StreamTypeId]: Effect.Effect.VarianceStruct<never, this, never>
  readonly [Effectable.SinkTypeId]: Sink.Sink.VarianceStruct<never, this, unknown, never, never>
  readonly [Effectable.ChannelTypeId]: Channel.Channel.VarianceStruct<
    never,
    unknown,
    unknown,
    unknown,
    this,
    never,
    never
  >
}
```

Added in v2.0.0
