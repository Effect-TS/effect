---
title: ConfigProviderPathPatch.ts
nav_order: 14
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
  - [ConfigProviderPathPatch (type alias)](#pathpatch-type-alias)
  - [Unnested (interface)](#unnested-interface)

---

# constructors

## andThen

**Signature**

```ts
export declare const andThen: {
  (that: ConfigProviderPathPatch): (self: ConfigProviderPathPatch) => ConfigProviderPathPatch
  (self: ConfigProviderPathPatch, that: ConfigProviderPathPatch): ConfigProviderPathPatch
}
```

Added in v2.0.0

## empty

**Signature**

```ts
export declare const empty: ConfigProviderPathPatch
```

Added in v2.0.0

## mapName

**Signature**

```ts
export declare const mapName: {
  (f: (string: string) => string): (self: ConfigProviderPathPatch) => ConfigProviderPathPatch
  (self: ConfigProviderPathPatch, f: (string: string) => string): ConfigProviderPathPatch
}
```

Added in v2.0.0

## nested

**Signature**

```ts
export declare const nested: {
  (name: string): (self: ConfigProviderPathPatch) => ConfigProviderPathPatch
  (self: ConfigProviderPathPatch, name: string): ConfigProviderPathPatch
}
```

Added in v2.0.0

## unnested

**Signature**

```ts
export declare const unnested: {
  (name: string): (self: ConfigProviderPathPatch) => ConfigProviderPathPatch
  (self: ConfigProviderPathPatch, name: string): ConfigProviderPathPatch
}
```

Added in v2.0.0

# models

## AndThen (interface)

**Signature**

```ts
export interface AndThen {
  readonly _tag: "AndThen"
  readonly first: ConfigProviderPathPatch
  readonly second: ConfigProviderPathPatch
}
```

Added in v2.0.0

## Empty (interface)

**Signature**

```ts
export interface Empty {
  readonly _tag: "Empty"
}
```

Added in v2.0.0

## MapName (interface)

**Signature**

```ts
export interface MapName {
  readonly _tag: "MapName"
  readonly f: (string: string) => string
}
```

Added in v2.0.0

## Nested (interface)

**Signature**

```ts
export interface Nested {
  readonly _tag: "Nested"
  readonly name: string
}
```

Added in v2.0.0

## ConfigProviderPathPatch (type alias)

Represents a description of how to modify the path to a configuration
value.

**Signature**

```ts
export type ConfigProviderPathPatch = Empty | AndThen | MapName | Nested | Unnested
```

Added in v2.0.0

## Unnested (interface)

**Signature**

```ts
export interface Unnested {
  readonly _tag: "Unnested"
  readonly name: string
}
```

Added in v2.0.0
