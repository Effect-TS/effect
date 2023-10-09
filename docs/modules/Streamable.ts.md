---
title: Streamable.ts
nav_order: 108
parent: Modules
---

## Streamable overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [Class (class)](#class-class)
    - [pipe (method)](#pipe-method)
    - [toStream (method)](#tostream-method)
    - [[Stream.StreamTypeId] (property)](#streamstreamtypeid-property)

---

# constructors

## Class (class)

**Signature**

```ts
export declare class Class<R, E, A>
```

Added in v2.0.0

### pipe (method)

**Signature**

```ts
pipe()
```

Added in v2.0.0

### toStream (method)

**Signature**

```ts
abstract toStream(): Stream.Stream<R, E, A>
```

Added in v2.0.0

### [Stream.StreamTypeId] (property)

**Signature**

```ts
readonly [Stream.StreamTypeId]: { _R: (_: never) => never; _E: (_: never) => never; _A: (_: never) => never; }
```

Added in v2.0.0
