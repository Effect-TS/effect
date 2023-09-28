---
title: Error.ts
nav_order: 34
parent: Modules
---

## Error overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [Structural (class)](#structural-class)
    - [commit (method)](#commit-method)
    - [pipe (method)](#pipe-method)
    - [toJSON (method)](#tojson-method)
    - [toString (method)](#tostring-method)
    - [[Inspectable.NodeInspectSymbol] (method)](#inspectablenodeinspectsymbol-method)
    - [\_op (property)](#_op-property)
  - [Tagged](#tagged)

---

# constructors

## Structural (class)

**Signature**

```ts
export declare class Structural<A>
```

Added in v1.0.0

### commit (method)

**Signature**

```ts
commit(): Effect.Effect<never, this, never>
```

Added in v1.0.0

### pipe (method)

**Signature**

```ts
pipe()
```

Added in v1.0.0

### toJSON (method)

**Signature**

```ts
toJSON()
```

Added in v1.0.0

### toString (method)

**Signature**

```ts
toString()
```

Added in v1.0.0

### [Inspectable.NodeInspectSymbol] (method)

**Signature**

```ts
;[Inspectable.NodeInspectSymbol]()
```

Added in v1.0.0

### \_op (property)

**Signature**

```ts
_op: 'Commit'
```

Added in v1.0.0

## Tagged

**Signature**

```ts
export declare const Tagged: <Tag extends string>(
  tag: Tag
) => new <A extends Record<string, any>>(
  args: Types.Equals<Omit<A, keyof Equal.Equal>, {}> extends true ? void : Omit<A, keyof Equal.Equal>
) => Structural<{ readonly _tag: Tag } & A>
```

Added in v1.0.0
