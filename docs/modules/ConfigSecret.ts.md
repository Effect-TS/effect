---
title: ConfigSecret.ts
nav_order: 12
parent: Modules
---

## ConfigSecret overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [fromChunk](#fromchunk)
  - [fromString](#fromstring)
  - [make](#make)
- [getters](#getters)
  - [value](#value)
- [models](#models)
  - [ConfigSecret (interface)](#configsecret-interface)
- [refinements](#refinements)
  - [isConfigSecret](#isconfigsecret)
- [symbols](#symbols)
  - [ConfigSecretTypeId](#configsecrettypeid)
  - [ConfigSecretTypeId (type alias)](#configsecrettypeid-type-alias)
- [unsafe](#unsafe)
  - [unsafeWipe](#unsafewipe)
- [utils](#utils)
  - [ConfigSecret (namespace)](#configsecret-namespace)
    - [Proto (interface)](#proto-interface)

---

# constructors

## fromChunk

**Signature**

```ts
export declare const fromChunk: (chunk: Chunk.Chunk<string>) => ConfigSecret
```

Added in v1.0.0

## fromString

**Signature**

```ts
export declare const fromString: (text: string) => ConfigSecret
```

Added in v1.0.0

## make

**Signature**

```ts
export declare const make: (bytes: Array<number>) => ConfigSecret
```

Added in v1.0.0

# getters

## value

**Signature**

```ts
export declare const value: (self: ConfigSecret) => string
```

Added in v1.0.0

# models

## ConfigSecret (interface)

**Signature**

```ts
export interface ConfigSecret extends ConfigSecret.Proto, Equal.Equal {
  /** @internal */
  readonly raw: Array<number>
}
```

Added in v1.0.0

# refinements

## isConfigSecret

**Signature**

```ts
export declare const isConfigSecret: (u: unknown) => u is ConfigSecret
```

Added in v1.0.0

# symbols

## ConfigSecretTypeId

**Signature**

```ts
export declare const ConfigSecretTypeId: typeof ConfigSecretTypeId
```

Added in v1.0.0

## ConfigSecretTypeId (type alias)

**Signature**

```ts
export type ConfigSecretTypeId = typeof ConfigSecretTypeId
```

Added in v1.0.0

# unsafe

## unsafeWipe

**Signature**

```ts
export declare const unsafeWipe: (self: ConfigSecret) => void
```

Added in v1.0.0

# utils

## ConfigSecret (namespace)

Added in v1.0.0

### Proto (interface)

**Signature**

```ts
export interface Proto {
  readonly [ConfigSecretTypeId]: ConfigSecretTypeId
}
```

Added in v1.0.0
