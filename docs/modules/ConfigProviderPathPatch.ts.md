---
title: ConfigProviderPathPatch.ts
nav_order: 19
parent: Modules
---

## ConfigProviderPathPatch overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [andThen](#andthen)
  - [empty](#empty)
  - [mapName](#mapname)
  - [nested](#nested)
  - [unnested](#unnested)
- [models](#models)
  - [AndThen (interface)](#andthen-interface)
  - [Empty (interface)](#empty-interface)
  - [MapName (interface)](#mapname-interface)
  - [Nested (interface)](#nested-interface)
  - [PathPatch (type alias)](#pathpatch-type-alias)
  - [Unnested (interface)](#unnested-interface)

---

# constructors

## andThen

**Signature**

```ts
export declare const andThen: {
  (that: PathPatch): (self: PathPatch) => PathPatch
  (self: PathPatch, that: PathPatch): PathPatch
}
```

Added in v2.0.0

## empty

**Signature**

```ts
export declare const empty: PathPatch
```

Added in v2.0.0

## mapName

**Signature**

```ts
export declare const mapName: {
  (f: (string: string) => string): (self: PathPatch) => PathPatch
  (self: PathPatch, f: (string: string) => string): PathPatch
}
```

Added in v2.0.0

## nested

**Signature**

```ts
export declare const nested: {
  (name: string): (self: PathPatch) => PathPatch
  (self: PathPatch, name: string): PathPatch
}
```

Added in v2.0.0

## unnested

**Signature**

```ts
export declare const unnested: {
  (name: string): (self: PathPatch) => PathPatch
  (self: PathPatch, name: string): PathPatch
}
```

Added in v2.0.0

# models

## AndThen (interface)

**Signature**

```ts
export interface AndThen {
  readonly _tag: 'AndThen'
  readonly first: PathPatch
  readonly second: PathPatch
}
```

Added in v2.0.0

## Empty (interface)

**Signature**

```ts
export interface Empty {
  readonly _tag: 'Empty'
}
```

Added in v2.0.0

## MapName (interface)

**Signature**

```ts
export interface MapName {
  readonly _tag: 'MapName'
  readonly f: (string: string) => string
}
```

Added in v2.0.0

## Nested (interface)

**Signature**

```ts
export interface Nested {
  readonly _tag: 'Nested'
  readonly name: string
}
```

Added in v2.0.0

## PathPatch (type alias)

Represents a description of how to modify the path to a configuration
value.

**Signature**

```ts
export type PathPatch = Empty | AndThen | MapName | Nested | Unnested
```

Added in v2.0.0

## Unnested (interface)

**Signature**

```ts
export interface Unnested {
  readonly _tag: 'Unnested'
  readonly name: string
}
```

Added in v2.0.0
