---
title: Classic/Array/index.ts
nav_order: 1
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Any](#any)
  - [Applicative](#applicative)
  - [Array](#array)
  - [ArrayURI](#arrayuri)
  - [ArrayURI (type alias)](#arrayuri-type-alias)
  - [AssociativeBoth](#associativeboth)
  - [AssociativeFlatten](#associativeflatten)
  - [Covariant](#covariant)
  - [Monad](#monad)
  - [Spanned](#spanned)
  - [Traversable](#traversable)
  - [ap](#ap)
  - [ap\_](#ap_)
  - [chain](#chain)
  - [chain\_](#chain_)
  - [chop](#chop)
  - [chop\_](#chop_)
  - [chunksOf](#chunksof)
  - [chunksOf\_](#chunksof_)
  - [compact](#compact)
  - [comprehension](#comprehension)
  - [concat](#concat)
  - [concat\_](#concat_)
  - [cons](#cons)
  - [cons\_](#cons_)
  - [deleteAt](#deleteat)
  - [deleteAt\_](#deleteat_)
  - [dropLeft](#dropleft)
  - [dropLeftWhile](#dropleftwhile)
  - [dropLeftWhile\_](#dropleftwhile_)
  - [dropLeft\_](#dropleft_)
  - [dropRight](#dropright)
  - [dropRight\_](#dropright_)
  - [duplicate](#duplicate)
  - [empty](#empty)
  - [extend](#extend)
  - [extend\_](#extend_)
  - [filter](#filter)
  - [filterMap](#filtermap)
  - [filterMapWithIndex](#filtermapwithindex)
  - [filterMapWithIndex\_](#filtermapwithindex_)
  - [filterMap\_](#filtermap_)
  - [filterWithIndex](#filterwithindex)
  - [filterWithIndex\_](#filterwithindex_)
  - [filter\_](#filter_)
  - [findFirst](#findfirst)
  - [findFirstMap](#findfirstmap)
  - [findFirstMap\_](#findfirstmap_)
  - [findFirst\_](#findfirst_)
  - [findIndex](#findindex)
  - [findIndex\_](#findindex_)
  - [findLast](#findlast)
  - [findLastIndex](#findlastindex)
  - [findLastIndex\_](#findlastindex_)
  - [findLastMap](#findlastmap)
  - [findLastMap\_](#findlastmap_)
  - [findLast\_](#findlast_)
  - [flatten](#flatten)
  - [foldLeft](#foldleft)
  - [foldLeft\_](#foldleft_)
  - [foldRight](#foldright)
  - [foldRight\_](#foldright_)
  - [foreachF](#foreachf)
  - [fromMutable](#frommutable)
  - [head](#head)
  - [init](#init)
  - [insertAt](#insertat)
  - [insertAt\_](#insertat_)
  - [isEmpty](#isempty)
  - [isNonEmpty](#isnonempty)
  - [isOutOfBound](#isoutofbound)
  - [last](#last)
  - [lefts](#lefts)
  - [lookup](#lookup)
  - [lookup\_](#lookup_)
  - [makeBy](#makeby)
  - [makeBy\_](#makeby_)
  - [map](#map)
  - [mapWithIndex](#mapwithindex)
  - [mapWithIndex\_](#mapwithindex_)
  - [map\_](#map_)
  - [modifyAt](#modifyat)
  - [modifyAt\_](#modifyat_)
  - [range](#range)
  - [reduce](#reduce)
  - [reduceRight](#reduceright)
  - [reduceRightWithIndex](#reducerightwithindex)
  - [reduceRightWithIndex\_](#reducerightwithindex_)
  - [reduceRight\_](#reduceright_)
  - [reduceWithIndex](#reducewithindex)
  - [reduceWithIndex\_](#reducewithindex_)
  - [reduce\_](#reduce_)
  - [replicate](#replicate)
  - [replicate\_](#replicate_)
  - [reverse](#reverse)
  - [rights](#rights)
  - [rotate](#rotate)
  - [rotate\_](#rotate_)
  - [scanLeft](#scanleft)
  - [scanLeft\_](#scanleft_)
  - [scanRight](#scanright)
  - [scanRight\_](#scanright_)
  - [separate](#separate)
  - [single](#single)
  - [snoc](#snoc)
  - [snoc\_](#snoc_)
  - [spanIndex\_](#spanindex_)
  - [spanLeft](#spanleft)
  - [spanLeft\_](#spanleft_)
  - [splitAt](#splitat)
  - [splitAt\_](#splitat_)
  - [tail](#tail)
  - [takeLeft](#takeleft)
  - [takeLeftWhile](#takeleftwhile)
  - [takeLeftWhile\_](#takeleftwhile_)
  - [takeLeft\_](#takeleft_)
  - [takeRight](#takeright)
  - [takeRight\_](#takeright_)
  - [tap](#tap)
  - [tap\_](#tap_)
  - [toMutable](#tomutable)
  - [unfold](#unfold)
  - [unfold\_](#unfold_)
  - [unsafeDeleteAt](#unsafedeleteat)
  - [unsafeDeleteAt\_](#unsafedeleteat_)
  - [unsafeInsertAt](#unsafeinsertat)
  - [unsafeInsertAt\_](#unsafeinsertat_)
  - [unsafeUpdateAt](#unsafeupdateat)
  - [unsafeUpdateAt\_](#unsafeupdateat_)
  - [unzip](#unzip)
  - [updateAt](#updateat)
  - [updateAt\_](#updateat_)
  - [zip](#zip)
  - [zipWith](#zipwith)
  - [zipWith\_](#zipwith_)
  - [zip\_](#zip_)

---

# utils

## Any

**Signature**

```ts
export declare const Any: P.Any<'ArrayURI', P.Auto>
```

Added in v1.0.0

## Applicative

**Signature**

```ts
export declare const Applicative: P.Applicative<'ArrayURI', P.Auto>
```

Added in v1.0.0

## Array

**Signature**

```ts
export declare const Array: any
```

Added in v1.0.0

## ArrayURI

**Signature**

```ts
export declare const ArrayURI: 'ArrayURI'
```

Added in v1.0.0

## ArrayURI (type alias)

**Signature**

```ts
export type ArrayURI = typeof ArrayURI
```

Added in v1.0.0

## AssociativeBoth

**Signature**

```ts
export declare const AssociativeBoth: P.AssociativeBoth<'ArrayURI', P.Auto>
```

Added in v1.0.0

## AssociativeFlatten

**Signature**

```ts
export declare const AssociativeFlatten: P.AssociativeFlatten<'ArrayURI', P.Auto>
```

Added in v1.0.0

## Covariant

**Signature**

```ts
export declare const Covariant: P.Covariant<'ArrayURI', P.Auto>
```

Added in v1.0.0

## Monad

**Signature**

```ts
export declare const Monad: P.Monad<'ArrayURI', P.Auto>
```

Added in v1.0.0

## Spanned

**Signature**

```ts
export declare const Spanned: any
```

Added in v1.0.0

## Traversable

**Signature**

```ts
export declare const Traversable: P.Traversable<'ArrayURI', P.Auto>
```

Added in v1.0.0

## ap

**Signature**

```ts
export declare const ap: any
```

Added in v1.0.0

## ap\_

**Signature**

```ts
export declare const ap_: any
```

Added in v1.0.0

## chain

**Signature**

```ts
export declare const chain: any
```

Added in v1.0.0

## chain\_

**Signature**

```ts
export declare const chain_: any
```

Added in v1.0.0

## chop

**Signature**

```ts
export declare const chop: any
```

Added in v1.0.0

## chop\_

**Signature**

```ts
export declare const chop_: any
```

Added in v1.0.0

## chunksOf

**Signature**

```ts
export declare const chunksOf: any
```

Added in v1.0.0

## chunksOf\_

**Signature**

```ts
export declare const chunksOf_: any
```

Added in v1.0.0

## compact

**Signature**

```ts
export declare const compact: any
```

Added in v1.0.0

## comprehension

**Signature**

```ts
export declare const comprehension: any
```

Added in v1.0.0

## concat

**Signature**

```ts
export declare const concat: any
```

Added in v1.0.0

## concat\_

**Signature**

```ts
export declare const concat_: any
```

Added in v1.0.0

## cons

**Signature**

```ts
export declare const cons: any
```

Added in v1.0.0

## cons\_

**Signature**

```ts
export declare const cons_: any
```

Added in v1.0.0

## deleteAt

**Signature**

```ts
export declare const deleteAt: any
```

Added in v1.0.0

## deleteAt\_

**Signature**

```ts
export declare const deleteAt_: any
```

Added in v1.0.0

## dropLeft

**Signature**

```ts
export declare const dropLeft: any
```

Added in v1.0.0

## dropLeftWhile

**Signature**

```ts
export declare const dropLeftWhile: any
```

Added in v1.0.0

## dropLeftWhile\_

**Signature**

```ts
export declare const dropLeftWhile_: any
```

Added in v1.0.0

## dropLeft\_

**Signature**

```ts
export declare const dropLeft_: any
```

Added in v1.0.0

## dropRight

**Signature**

```ts
export declare const dropRight: any
```

Added in v1.0.0

## dropRight\_

**Signature**

```ts
export declare const dropRight_: any
```

Added in v1.0.0

## duplicate

**Signature**

```ts
export declare const duplicate: any
```

Added in v1.0.0

## empty

**Signature**

```ts
export declare const empty: any
```

Added in v1.0.0

## extend

**Signature**

```ts
export declare const extend: any
```

Added in v1.0.0

## extend\_

**Signature**

```ts
export declare const extend_: any
```

Added in v1.0.0

## filter

**Signature**

```ts
export declare const filter: any
```

Added in v1.0.0

## filterMap

**Signature**

```ts
export declare const filterMap: any
```

Added in v1.0.0

## filterMapWithIndex

**Signature**

```ts
export declare const filterMapWithIndex: any
```

Added in v1.0.0

## filterMapWithIndex\_

**Signature**

```ts
export declare const filterMapWithIndex_: any
```

Added in v1.0.0

## filterMap\_

**Signature**

```ts
export declare const filterMap_: any
```

Added in v1.0.0

## filterWithIndex

**Signature**

```ts
export declare const filterWithIndex: any
```

Added in v1.0.0

## filterWithIndex\_

**Signature**

```ts
export declare const filterWithIndex_: any
```

Added in v1.0.0

## filter\_

**Signature**

```ts
export declare const filter_: any
```

Added in v1.0.0

## findFirst

**Signature**

```ts
export declare const findFirst: any
```

Added in v1.0.0

## findFirstMap

**Signature**

```ts
export declare const findFirstMap: any
```

Added in v1.0.0

## findFirstMap\_

**Signature**

```ts
export declare const findFirstMap_: any
```

Added in v1.0.0

## findFirst\_

**Signature**

```ts
export declare const findFirst_: any
```

Added in v1.0.0

## findIndex

**Signature**

```ts
export declare const findIndex: any
```

Added in v1.0.0

## findIndex\_

**Signature**

```ts
export declare const findIndex_: any
```

Added in v1.0.0

## findLast

**Signature**

```ts
export declare const findLast: any
```

Added in v1.0.0

## findLastIndex

**Signature**

```ts
export declare const findLastIndex: any
```

Added in v1.0.0

## findLastIndex\_

**Signature**

```ts
export declare const findLastIndex_: any
```

Added in v1.0.0

## findLastMap

**Signature**

```ts
export declare const findLastMap: any
```

Added in v1.0.0

## findLastMap\_

**Signature**

```ts
export declare const findLastMap_: any
```

Added in v1.0.0

## findLast\_

**Signature**

```ts
export declare const findLast_: any
```

Added in v1.0.0

## flatten

**Signature**

```ts
export declare const flatten: any
```

Added in v1.0.0

## foldLeft

**Signature**

```ts
export declare const foldLeft: any
```

Added in v1.0.0

## foldLeft\_

**Signature**

```ts
export declare const foldLeft_: any
```

Added in v1.0.0

## foldRight

**Signature**

```ts
export declare const foldRight: any
```

Added in v1.0.0

## foldRight\_

**Signature**

```ts
export declare const foldRight_: any
```

Added in v1.0.0

## foreachF

**Signature**

```ts
export declare const foreachF: P.Foreach<'ArrayURI', P.Auto>
```

Added in v1.0.0

## fromMutable

**Signature**

```ts
export declare const fromMutable: any
```

Added in v1.0.0

## head

**Signature**

```ts
export declare const head: any
```

Added in v1.0.0

## init

**Signature**

```ts
export declare const init: any
```

Added in v1.0.0

## insertAt

**Signature**

```ts
export declare const insertAt: any
```

Added in v1.0.0

## insertAt\_

**Signature**

```ts
export declare const insertAt_: any
```

Added in v1.0.0

## isEmpty

**Signature**

```ts
export declare const isEmpty: any
```

Added in v1.0.0

## isNonEmpty

**Signature**

```ts
export declare const isNonEmpty: any
```

Added in v1.0.0

## isOutOfBound

**Signature**

```ts
export declare const isOutOfBound: any
```

Added in v1.0.0

## last

**Signature**

```ts
export declare const last: any
```

Added in v1.0.0

## lefts

**Signature**

```ts
export declare const lefts: any
```

Added in v1.0.0

## lookup

**Signature**

```ts
export declare const lookup: any
```

Added in v1.0.0

## lookup\_

**Signature**

```ts
export declare const lookup_: any
```

Added in v1.0.0

## makeBy

**Signature**

```ts
export declare const makeBy: any
```

Added in v1.0.0

## makeBy\_

**Signature**

```ts
export declare const makeBy_: any
```

Added in v1.0.0

## map

**Signature**

```ts
export declare const map: any
```

Added in v1.0.0

## mapWithIndex

**Signature**

```ts
export declare const mapWithIndex: any
```

Added in v1.0.0

## mapWithIndex\_

**Signature**

```ts
export declare const mapWithIndex_: any
```

Added in v1.0.0

## map\_

**Signature**

```ts
export declare const map_: any
```

Added in v1.0.0

## modifyAt

**Signature**

```ts
export declare const modifyAt: any
```

Added in v1.0.0

## modifyAt\_

**Signature**

```ts
export declare const modifyAt_: any
```

Added in v1.0.0

## range

**Signature**

```ts
export declare const range: any
```

Added in v1.0.0

## reduce

**Signature**

```ts
export declare const reduce: any
```

Added in v1.0.0

## reduceRight

**Signature**

```ts
export declare const reduceRight: any
```

Added in v1.0.0

## reduceRightWithIndex

**Signature**

```ts
export declare const reduceRightWithIndex: any
```

Added in v1.0.0

## reduceRightWithIndex\_

**Signature**

```ts
export declare const reduceRightWithIndex_: any
```

Added in v1.0.0

## reduceRight\_

**Signature**

```ts
export declare const reduceRight_: any
```

Added in v1.0.0

## reduceWithIndex

**Signature**

```ts
export declare const reduceWithIndex: any
```

Added in v1.0.0

## reduceWithIndex\_

**Signature**

```ts
export declare const reduceWithIndex_: any
```

Added in v1.0.0

## reduce\_

**Signature**

```ts
export declare const reduce_: any
```

Added in v1.0.0

## replicate

**Signature**

```ts
export declare const replicate: any
```

Added in v1.0.0

## replicate\_

**Signature**

```ts
export declare const replicate_: any
```

Added in v1.0.0

## reverse

**Signature**

```ts
export declare const reverse: any
```

Added in v1.0.0

## rights

**Signature**

```ts
export declare const rights: any
```

Added in v1.0.0

## rotate

**Signature**

```ts
export declare const rotate: any
```

Added in v1.0.0

## rotate\_

**Signature**

```ts
export declare const rotate_: any
```

Added in v1.0.0

## scanLeft

**Signature**

```ts
export declare const scanLeft: any
```

Added in v1.0.0

## scanLeft\_

**Signature**

```ts
export declare const scanLeft_: any
```

Added in v1.0.0

## scanRight

**Signature**

```ts
export declare const scanRight: any
```

Added in v1.0.0

## scanRight\_

**Signature**

```ts
export declare const scanRight_: any
```

Added in v1.0.0

## separate

**Signature**

```ts
export declare const separate: any
```

Added in v1.0.0

## single

**Signature**

```ts
export declare const single: any
```

Added in v1.0.0

## snoc

**Signature**

```ts
export declare const snoc: any
```

Added in v1.0.0

## snoc\_

**Signature**

```ts
export declare const snoc_: any
```

Added in v1.0.0

## spanIndex\_

**Signature**

```ts
export declare const spanIndex_: any
```

Added in v1.0.0

## spanLeft

**Signature**

```ts
export declare const spanLeft: any
```

Added in v1.0.0

## spanLeft\_

**Signature**

```ts
export declare const spanLeft_: any
```

Added in v1.0.0

## splitAt

**Signature**

```ts
export declare const splitAt: any
```

Added in v1.0.0

## splitAt\_

**Signature**

```ts
export declare const splitAt_: any
```

Added in v1.0.0

## tail

**Signature**

```ts
export declare const tail: any
```

Added in v1.0.0

## takeLeft

**Signature**

```ts
export declare const takeLeft: any
```

Added in v1.0.0

## takeLeftWhile

**Signature**

```ts
export declare const takeLeftWhile: any
```

Added in v1.0.0

## takeLeftWhile\_

**Signature**

```ts
export declare const takeLeftWhile_: any
```

Added in v1.0.0

## takeLeft\_

**Signature**

```ts
export declare const takeLeft_: any
```

Added in v1.0.0

## takeRight

**Signature**

```ts
export declare const takeRight: any
```

Added in v1.0.0

## takeRight\_

**Signature**

```ts
export declare const takeRight_: any
```

Added in v1.0.0

## tap

**Signature**

```ts
export declare const tap: any
```

Added in v1.0.0

## tap\_

**Signature**

```ts
export declare const tap_: any
```

Added in v1.0.0

## toMutable

**Signature**

```ts
export declare const toMutable: any
```

Added in v1.0.0

## unfold

**Signature**

```ts
export declare const unfold: any
```

Added in v1.0.0

## unfold\_

**Signature**

```ts
export declare const unfold_: any
```

Added in v1.0.0

## unsafeDeleteAt

**Signature**

```ts
export declare const unsafeDeleteAt: any
```

Added in v1.0.0

## unsafeDeleteAt\_

**Signature**

```ts
export declare const unsafeDeleteAt_: any
```

Added in v1.0.0

## unsafeInsertAt

**Signature**

```ts
export declare const unsafeInsertAt: any
```

Added in v1.0.0

## unsafeInsertAt\_

**Signature**

```ts
export declare const unsafeInsertAt_: any
```

Added in v1.0.0

## unsafeUpdateAt

**Signature**

```ts
export declare const unsafeUpdateAt: any
```

Added in v1.0.0

## unsafeUpdateAt\_

**Signature**

```ts
export declare const unsafeUpdateAt_: any
```

Added in v1.0.0

## unzip

**Signature**

```ts
export declare const unzip: any
```

Added in v1.0.0

## updateAt

**Signature**

```ts
export declare const updateAt: any
```

Added in v1.0.0

## updateAt\_

**Signature**

```ts
export declare const updateAt_: any
```

Added in v1.0.0

## zip

**Signature**

```ts
export declare const zip: any
```

Added in v1.0.0

## zipWith

**Signature**

```ts
export declare const zipWith: any
```

Added in v1.0.0

## zipWith\_

**Signature**

```ts
export declare const zipWith_: any
```

Added in v1.0.0

## zip\_

**Signature**

```ts
export declare const zip_: any
```

Added in v1.0.0
