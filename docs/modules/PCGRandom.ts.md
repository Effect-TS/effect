---
title: PCGRandom.ts
nav_order: 69
parent: Modules
---

## PCGRandom overview

Copyright 2014 Thom Chiovoloni, released under the MIT license.

A random number generator based on the basic implementation of the PCG algorithm,
as described here: http://www.pcg-random.org/

Adapted for TypeScript from Thom's original code at https://github.com/thomcc/pcg-random

forked from https://github.com/frptools

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [model](#model)
  - [OptionalNumber (type alias)](#optionalnumber-type-alias)
  - [PCGRandom (class)](#pcgrandom-class)
    - [getState (method)](#getstate-method)
    - [setState (method)](#setstate-method)
    - [integer (method)](#integer-method)
    - [number (method)](#number-method)
  - [PCGRandomState (type alias)](#pcgrandomstate-type-alias)

---

# model

## OptionalNumber (type alias)

**Signature**

```ts
export type OptionalNumber = number | null | undefined
```

Added in v1.0.0

## PCGRandom (class)

PCG is a family of simple fast space-efficient statistically good algorithms
for random number generation. Unlike many general-purpose RNGs, they are also
hard to predict.

**Signature**

```ts
export declare class PCGRandom {
  constructor(seedHi?: OptionalNumber, seedLo?: OptionalNumber, incHi?: OptionalNumber, incLo?: OptionalNumber)
}
```

Added in v1.0.0

### getState (method)

Returns a copy of the internal state of this random number generator as a
JavaScript Array.

**Signature**

```ts
getState(): PCGRandomState
```

Added in v1.0.0

### setState (method)

Restore state previously retrieved using `getState()`.

**Signature**

```ts
setState(state: PCGRandomState)
```

Added in v1.0.0

### integer (method)

Get a uniformly distributed 32 bit integer between [0, max).

**Signature**

```ts
integer(max: number)
```

Added in v1.0.0

### number (method)

Get a uniformly distributed IEEE-754 double between 0.0 and 1.0, with
53 bits of precision (every bit of the mantissa is randomized).

**Signature**

```ts
number()
```

Added in v1.0.0

## PCGRandomState (type alias)

**Signature**

```ts
export type PCGRandomState = [number, number, number, number]
```

Added in v1.0.0
