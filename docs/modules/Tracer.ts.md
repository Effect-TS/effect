---
title: Tracer.ts
nav_order: 133
parent: Modules
---

## Tracer overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
  - [tracerWith](#tracerwith)
- [models](#models)
  - [AttributeValue (type alias)](#attributevalue-type-alias)
  - [ExternalSpan (interface)](#externalspan-interface)
  - [ParentSpan (type alias)](#parentspan-type-alias)
  - [Span (interface)](#span-interface)
  - [SpanLink (interface)](#spanlink-interface)
  - [SpanStatus (type alias)](#spanstatus-type-alias)
- [tags](#tags)
  - [Tracer](#tracer)
- [utils](#utils)
  - [Tracer (interface)](#tracer-interface)
  - [TracerTypeId](#tracertypeid)
  - [TracerTypeId (type alias)](#tracertypeid-type-alias)

---

# constructors

## make

**Signature**

```ts
export declare const make: (options: Omit<Tracer, typeof TracerTypeId>) => Tracer
```

Added in v1.0.0

## tracerWith

**Signature**

```ts
export declare const tracerWith: <R, E, A>(f: (tracer: Tracer) => Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
```

Added in v1.0.0

# models

## AttributeValue (type alias)

**Signature**

```ts
export type AttributeValue = string | boolean | number
```

Added in v1.0.0

## ExternalSpan (interface)

**Signature**

```ts
export interface ExternalSpan {
  readonly _tag: 'ExternalSpan'
  readonly spanId: string
  readonly traceId: string
  readonly context: Context.Context<never>
}
```

Added in v1.0.0

## ParentSpan (type alias)

**Signature**

```ts
export type ParentSpan = Span | ExternalSpan
```

Added in v1.0.0

## Span (interface)

**Signature**

```ts
export interface Span {
  readonly _tag: 'Span'
  readonly name: string
  readonly spanId: string
  readonly traceId: string
  readonly parent: Option.Option<ParentSpan>
  readonly context: Context.Context<never>
  readonly status: SpanStatus
  readonly attributes: ReadonlyMap<string, AttributeValue>
  readonly links: ReadonlyArray<SpanLink>
  readonly end: (endTime: bigint, exit: Exit.Exit<unknown, unknown>) => void
  readonly attribute: (key: string, value: AttributeValue) => void
  readonly event: (name: string, startTime: bigint, attributes?: Record<string, AttributeValue>) => void
}
```

Added in v1.0.0

## SpanLink (interface)

**Signature**

```ts
export interface SpanLink {
  readonly _tag: 'SpanLink'
  readonly span: ParentSpan
  readonly attributes: Readonly<Record<string, AttributeValue>>
}
```

Added in v1.0.0

## SpanStatus (type alias)

**Signature**

```ts
export type SpanStatus =
  | {
      _tag: 'Started'
      startTime: bigint
    }
  | {
      _tag: 'Ended'
      startTime: bigint
      endTime: bigint
      exit: Exit.Exit<unknown, unknown>
    }
```

Added in v1.0.0

# tags

## Tracer

**Signature**

```ts
export declare const Tracer: Context.Tag<Tracer, Tracer>
```

Added in v1.0.0

# utils

## Tracer (interface)

**Signature**

```ts
export interface Tracer {
  readonly [TracerTypeId]: TracerTypeId
  readonly span: (
    name: string,
    parent: Option.Option<ParentSpan>,
    context: Context.Context<never>,
    links: ReadonlyArray<SpanLink>,
    startTime: bigint
  ) => Span
  readonly context: <X>(f: () => X, fiber: Fiber.RuntimeFiber<any, any>) => X
}
```

Added in v1.0.0

## TracerTypeId

**Signature**

```ts
export declare const TracerTypeId: typeof TracerTypeId
```

Added in v1.0.0

## TracerTypeId (type alias)

**Signature**

```ts
export type TracerTypeId = typeof TracerTypeId
```

Added in v1.0.0
