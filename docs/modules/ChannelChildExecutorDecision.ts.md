---
title: ChannelChildExecutorDecision.ts
nav_order: 8
parent: Modules
---

## ChannelChildExecutorDecision overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [Close](#close)
  - [Continue](#continue)
  - [Yield](#yield)
- [folding](#folding)
  - [match](#match)
- [models](#models)
  - [ChildExecutorDecision (type alias)](#childexecutordecision-type-alias)
  - [Close (interface)](#close-interface)
  - [Continue (interface)](#continue-interface)
  - [Yield (interface)](#yield-interface)
- [refinements](#refinements)
  - [isChildExecutorDecision](#ischildexecutordecision)
  - [isClose](#isclose)
  - [isContinue](#iscontinue)
  - [isYield](#isyield)
- [symbols](#symbols)
  - [ChildExecutorDecisionTypeId](#childexecutordecisiontypeid)
  - [ChildExecutorDecisionTypeId (type alias)](#childexecutordecisiontypeid-type-alias)
- [utils](#utils)
  - [ChildExecutorDecision (namespace)](#childexecutordecision-namespace)
    - [Proto (interface)](#proto-interface)

---

# constructors

## Close

**Signature**

```ts
export declare const Close: (value: unknown) => ChildExecutorDecision
```

Added in v2.0.0

## Continue

**Signature**

```ts
export declare const Continue: (_: void) => ChildExecutorDecision
```

Added in v2.0.0

## Yield

**Signature**

```ts
export declare const Yield: (_: void) => ChildExecutorDecision
```

Added in v2.0.0

# folding

## match

Folds over a `ChildExecutorDecision` to produce a value of type `A`.

**Signature**

```ts
export declare const match: {
  <A>(options: { readonly onContinue: () => A; readonly onClose: (value: unknown) => A; readonly onYield: () => A }): (
    self: ChildExecutorDecision
  ) => A
  <A>(
    self: ChildExecutorDecision,
    options: { readonly onContinue: () => A; readonly onClose: (value: unknown) => A; readonly onYield: () => A }
  ): A
}
```

Added in v2.0.0

# models

## ChildExecutorDecision (type alias)

**Signature**

```ts
export type ChildExecutorDecision = Continue | Close | Yield
```

Added in v2.0.0

## Close (interface)

Close the current substream with a given value and pass execution to the
next substream

**Signature**

```ts
export interface Close extends ChildExecutorDecision.Proto {
  readonly _tag: 'Close'
  readonly value: unknown
}
```

Added in v2.0.0

## Continue (interface)

Continue executing the current substream

**Signature**

```ts
export interface Continue extends ChildExecutorDecision.Proto {
  readonly _tag: 'Continue'
}
```

Added in v2.0.0

## Yield (interface)

Pass execution to the next substream. This either pulls a new element
from upstream, or yields to an already created active substream.

**Signature**

```ts
export interface Yield extends ChildExecutorDecision.Proto {
  readonly _tag: 'Yield'
}
```

Added in v2.0.0

# refinements

## isChildExecutorDecision

Returns `true` if the specified value is a `ChildExecutorDecision`, `false`
otherwise.

**Signature**

```ts
export declare const isChildExecutorDecision: (u: unknown) => u is ChildExecutorDecision
```

Added in v2.0.0

## isClose

Returns `true` if the specified `ChildExecutorDecision` is a `Close`, `false`
otherwise.

**Signature**

```ts
export declare const isClose: (self: ChildExecutorDecision) => self is Close
```

Added in v2.0.0

## isContinue

Returns `true` if the specified `ChildExecutorDecision` is a `Continue`,
`false` otherwise.

**Signature**

```ts
export declare const isContinue: (self: ChildExecutorDecision) => self is Continue
```

Added in v2.0.0

## isYield

Returns `true` if the specified `ChildExecutorDecision` is a `Yield`, `false`
otherwise.

**Signature**

```ts
export declare const isYield: (self: ChildExecutorDecision) => self is Yield
```

Added in v2.0.0

# symbols

## ChildExecutorDecisionTypeId

**Signature**

```ts
export declare const ChildExecutorDecisionTypeId: typeof ChildExecutorDecisionTypeId
```

Added in v2.0.0

## ChildExecutorDecisionTypeId (type alias)

**Signature**

```ts
export type ChildExecutorDecisionTypeId = typeof ChildExecutorDecisionTypeId
```

Added in v2.0.0

# utils

## ChildExecutorDecision (namespace)

Added in v2.0.0

### Proto (interface)

**Signature**

```ts
export interface Proto {
  readonly [ChildExecutorDecisionTypeId]: ChildExecutorDecisionTypeId
}
```

Added in v2.0.0
