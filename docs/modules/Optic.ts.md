---
title: Optic.ts
nav_order: 9
parent: Modules
---

## Optic overview

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/optic/modules/index.ts.html
- Docs: https://fp-ts.github.io/optic/modules/experimental.ts.html
- Module: "@fp-ts/optic"
- Module: "@fp-ts/optic/experimental"
```

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [consChunk](#conschunk)
  - [consList](#conslist)
  - [consNonEmptyReadonlyArray](#consnonemptyreadonlyarray)
  - [getAtHashMap](#getathashmap)
  - [getAtSortedMap](#getatsortedmap)
  - [getIndexHashMap](#getindexhashmap)
  - [getIndexSortedMap](#getindexsortedmap)
  - [headChunk](#headchunk)
  - [headList](#headlist)
  - [indexChunk](#indexchunk)
  - [indexList](#indexlist)
  - [indexString](#indexstring)
  - [left](#left)
  - [none](#none)
  - [right](#right)
  - [tailChunk](#tailchunk)
  - [tailList](#taillist)
  - [toggle](#toggle)

---

# utils

## consChunk

**Signature**

```ts
export declare const consChunk: { <A>(): any; <A, B>(): any }
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/optic/modules/data/Chunk.ts.html#cons
- Module: "@fp-ts/optic/data/Chunk"
```

## consList

**Signature**

```ts
export declare const consList: { <A>(): any; <A, B>(): any }
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/optic/modules/data/List.ts.html#cons
- Module: "@fp-ts/optic/data/List"
```

## consNonEmptyReadonlyArray

**Signature**

```ts
export declare const consNonEmptyReadonlyArray: { <A>(): any; <A, B>(): any }
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/optic/modules/data/ReadonlyArray.ts.html#consNonEmpty
- Module: "@fp-ts/optic/data/ReadonlyArray"
```

## getAtHashMap

**Signature**

```ts
export declare const getAtHashMap: <K, A>() => any
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/optic/modules/data/HashMap.ts.html#getAt
- Module: "@fp-ts/optic/data/HashMap"
```

## getAtSortedMap

**Signature**

```ts
export declare const getAtSortedMap: <K, A>() => any
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/optic/modules/data/SortedMap.ts.html#getAt
- Module: "@fp-ts/optic/data/SortedMap"
```

## getIndexHashMap

**Signature**

```ts
export declare const getIndexHashMap: <K, A>() => any
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/optic/modules/data/HashMap.ts.html#getIndex
- Module: "@fp-ts/optic/data/HashMap"
```

## getIndexSortedMap

**Signature**

```ts
export declare const getIndexSortedMap: <K, A>() => any
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/optic/modules/data/SortedMap.ts.html#getIndex
- Module: "@fp-ts/optic/data/SortedMap"
```

## headChunk

**Signature**

```ts
export declare const headChunk: <A>() => any
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/optic/modules/data/Chunk.ts.html#head
- Module: "@fp-ts/optic/data/Chunk"
```

## headList

**Signature**

```ts
export declare const headList: <A>() => any
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/optic/modules/data/List.ts.html#head
- Module: "@fp-ts/optic/data/List"
```

## indexChunk

**Signature**

```ts
export declare const indexChunk: <A>(i: number) => any
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/optic/modules/data/Chunk.ts.html#index
- Module: "@fp-ts/optic/data/Chunk"
```

## indexList

**Signature**

```ts
export declare const indexList: <A>(i: number) => any
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/optic/modules/data/List.ts.html#index
- Module: "@fp-ts/optic/data/List"
```

## indexString

**Signature**

```ts
export declare const indexString: (n: number) => any
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/optic/modules/data/String.ts.html#index
- Module: "@fp-ts/optic/data/String"
```

## left

**Signature**

```ts
export declare const left: { <E, A>(): any; <E, A, B>(): any }
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/optic/modules/data/Either.ts.html#left
- Module: "@fp-ts/optic/data/Either"
```

## none

**Signature**

```ts
export declare const none: <A>() => any
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/optic/modules/data/Option.ts.html#none
- Module: "@fp-ts/optic/data/Option"
```

## right

**Signature**

```ts
export declare const right: { <E, A>(): any; <E, A, B>(): any }
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/optic/modules/data/Either.ts.html#right
- Module: "@fp-ts/optic/data/Either"
```

## tailChunk

**Signature**

```ts
export declare const tailChunk: <A>() => any
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/optic/modules/data/Chunk.ts.html#tail
- Module: "@fp-ts/optic/data/Chunk"
```

## tailList

**Signature**

```ts
export declare const tailList: <A>() => any
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/optic/modules/data/List.ts.html#tail
- Module: "@fp-ts/optic/data/List"
```

## toggle

**Signature**

```ts
export declare const toggle: <S>(optic: any) => (s: S) => S
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/optic/modules/data/Boolean.ts.html#toggle
- Module: "@fp-ts/optic/data/Boolean"
```
