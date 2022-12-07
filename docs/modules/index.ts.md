---
title: index.ts
nav_order: 6
parent: Modules
---

## index overview

Added in v2.0.0

The Effect Ecosystem Package

To be used as a prelude when developing apps, it includes
a selected portion of ecosystem packages that have been identified
as the most common needed in most of the apps regardless
of the runtime (Node, Browser, Deno, Bun, etc).

The user is expected to further install and use additional libraries
such as "@effect/node" to integrate with specific runtimes and / or
frameworks such as "@effect/express".

Includes modules from:

- "@fp-ts/core"
- "@fp-ts/data"
- "@fp-ts/schema" (tbd)
- "@fp-ts/optic"
- "@effect/io"
- "@effect/stm" (tbd)
- "@effect/stream" (tbd)

Note: don't use this package when developing libraries, prefer targeting
individual dependencies.

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Alternative](#alternative)
  - [Applicative](#applicative)
  - [Bicovariant](#bicovariant)
  - [Boolean](#boolean)
  - [Bounded](#bounded)
  - [Cached](#cached)
  - [Cause](#cause)
  - [Chainable](#chainable)
  - [Chunk](#chunk)
  - [Clock](#clock)
  - [Codec](#codec)
  - [Compactable](#compactable)
  - [Context](#context)
  - [Contravariant](#contravariant)
  - [Coproduct](#coproduct)
  - [Covariant](#covariant)
  - [CovariantWithIndex](#covariantwithindex)
  - [DefaultServices](#defaultservices)
  - [Deferred](#deferred)
  - [Differ](#differ)
  - [Duration](#duration)
  - [Effect](#effect)
  - [Either](#either)
  - [Equal](#equal)
  - [ExecutionStrategy](#executionstrategy)
  - [Exit](#exit)
  - [Fiber](#fiber)
  - [FiberRef](#fiberref)
  - [FiberRefs](#fiberrefs)
  - [Filterable](#filterable)
  - [FilterableWithIndex](#filterablewithindex)
  - [FlatMap](#flatmap)
  - [Foldable](#foldable)
  - [Function](#function)
  - [Gen](#gen)
  - [HKT](#hkt)
  - [HashMap](#hashmap)
  - [HashSet](#hashset)
  - [Hub](#hub)
  - [Identity](#identity)
  - [ImmutableQueue](#immutablequeue)
  - [Invariant](#invariant)
  - [Json](#json)
  - [Layer](#layer)
  - [List](#list)
  - [Logger](#logger)
  - [Metric](#metric)
  - [Monad](#monad)
  - [Monoid](#monoid)
  - [MutableHashMap](#mutablehashmap)
  - [MutableHashSet](#mutablehashset)
  - [MutableList](#mutablelist)
  - [MutableListBuilder](#mutablelistbuilder)
  - [MutableQueue](#mutablequeue)
  - [MutableRef](#mutableref)
  - [NonEmptyTraversable](#nonemptytraversable)
  - [Number](#number)
  - [Of](#of)
  - [Optic](#optic)
  - [Option](#option)
  - [Order](#order)
  - [Ordering](#ordering)
  - [PCGRandom](#pcgrandom)
  - [Pointed](#pointed)
  - [Predicate](#predicate)
  - [Product](#product)
  - [Queue](#queue)
  - [Random](#random)
  - [ReadonlyArray](#readonlyarray)
  - [RedBlackTree](#redblacktree)
  - [Ref](#ref)
  - [Reloadable](#reloadable)
  - [Runtime](#runtime)
  - [Schedule](#schedule)
  - [Scope](#scope)
  - [SemiAlternative](#semialternative)
  - [SemiApplicative](#semiapplicative)
  - [SemiCoproduct](#semicoproduct)
  - [SemiProduct](#semiproduct)
  - [Semigroup](#semigroup)
  - [Seq](#seq)
  - [SortedMap](#sortedmap)
  - [SortedSet](#sortedset)
  - [String](#string)
  - [Supervisor](#supervisor)
  - [Tracer](#tracer)
  - [Traversable](#traversable)
  - [TraversableFilterable](#traversablefilterable)
  - [absurd](#absurd)
  - [flow](#flow)
  - [hole](#hole)
  - [identity](#identity)
  - [pipe](#pipe)
  - [unsafeCoerce](#unsafecoerce)

---

# utils

## Alternative

**Signature**

```ts
export declare const Alternative: typeof Alternative
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/Alternative.ts.html
- Module: "@fp-ts/core/typeclass/Alternative"
```

## Applicative

**Signature**

```ts
export declare const Applicative: typeof Applicative
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/Applicative.ts.html
- Module: "@fp-ts/core/typeclass/Applicative"
```

## Bicovariant

**Signature**

```ts
export declare const Bicovariant: typeof Bicovariant
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/Bicovariant.ts.html
- Module: "@fp-ts/core/typeclass/Bicovariant"
```

## Boolean

**Signature**

```ts
export declare const Boolean: typeof Boolean
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/Boolean.ts.html
- Module: "@fp-ts/data/Boolean"
```

## Bounded

**Signature**

```ts
export declare const Bounded: typeof Bounded
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/Bounded.ts.html
- Module: "@fp-ts/core/typeclass/Bounded"
```

## Cached

**Signature**

```ts
export declare const Cached: typeof Cached
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Cached.ts.html
- Module: "@effect/io/Cached"
```

## Cause

**Signature**

```ts
export declare const Cause: typeof Cause
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Cause.ts.html
- Module: "@effect/io/Cause"
```

## Chainable

**Signature**

```ts
export declare const Chainable: typeof Chainable
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/Chainable.ts.html
- Module: "@fp-ts/core/typeclass/Chainable"
```

## Chunk

**Signature**

```ts
export declare const Chunk: typeof Chunk
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/Chunk.ts.html
- Module: "@fp-ts/data/Chunk"
```

## Clock

**Signature**

```ts
export declare const Clock: typeof Clock
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Clock.ts.html
- Module: "@effect/io/Clock"
```

## Codec

**Signature**

```ts
export declare const Codec: typeof Codec
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/schema/modules/Codec.ts.html
- Module: "@fp-ts/schema/Codec"
```

## Compactable

**Signature**

```ts
export declare const Compactable: typeof Compactable
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/Compactable.ts.html
- Module: "@fp-ts/core/typeclass/Compactable"
```

## Context

**Signature**

```ts
export declare const Context: typeof Context
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/Context.ts.html
- Module: "@fp-ts/data/Context"
```

## Contravariant

**Signature**

```ts
export declare const Contravariant: typeof Contravariant
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/Contravatiant.ts.html
- Module: "@fp-ts/core/typeclass/Contravariant"
```

## Coproduct

**Signature**

```ts
export declare const Coproduct: typeof Coproduct
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/Coproduct.ts.html
- Module: "@fp-ts/core/typeclass/Coproduct"
```

## Covariant

**Signature**

```ts
export declare const Covariant: typeof Covariant
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/Covariant.ts.html
- Module: "@fp-ts/core/typeclass/Covariant"
```

## CovariantWithIndex

**Signature**

```ts
export declare const CovariantWithIndex: typeof CovariantWithIndex
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/typeclass/ContravatiantWithIndex.ts.html
- Module: "@fp-ts/data/typeclass/ContravariantWithIndex"
```

## DefaultServices

**Signature**

```ts
export declare const DefaultServices: typeof DefaultServices
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/DefaultServices.ts.html
- Module: "@effect/io/DefaultServices"
```

## Deferred

**Signature**

```ts
export declare const Deferred: typeof Deferred
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Deferred.ts.html
- Module: "@effect/io/Deferred"
```

## Differ

**Signature**

```ts
export declare const Differ: typeof Differ
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/Differ.ts.html
- Module: "@fp-ts/data/Differ"
```

## Duration

**Signature**

```ts
export declare const Duration: typeof Duration
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/Duration.ts.html
- Module: "@fp-ts/data/Duration"
```

## Effect

**Signature**

```ts
export declare const Effect: typeof Effect
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Effect.ts.html
- Module: "@effect/io/Effect"
```

## Either

**Signature**

```ts
export declare const Either: typeof Either
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/Either.ts.html
- Module: "@fp-ts/data/Either"
```

## Equal

**Signature**

```ts
export declare const Equal: typeof Equal
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/Equal.ts.html
- Module: "@fp-ts/data/Equal"
```

## ExecutionStrategy

**Signature**

```ts
export declare const ExecutionStrategy: typeof ExecutionStrategy
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/ExecutionStrategy.ts.html
- Module: "@effect/io/ExecutionStrategy"
```

## Exit

**Signature**

```ts
export declare const Exit: typeof Exit
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Exit.ts.html
- Module: "@effect/io/Exit"
```

## Fiber

**Signature**

```ts
export declare const Fiber: typeof Fiber
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Fiber.ts.html
- Module: "@effect/io/Fiber"
```

## FiberRef

**Signature**

```ts
export declare const FiberRef: typeof FiberRef
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/FiberRef.ts.html
- Module: "@effect/io/FiberRef"
```

## FiberRefs

**Signature**

```ts
export declare const FiberRefs: typeof FiberRefs
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/FiberRefs.ts.html
- Module: "@effect/io/FiberRefs"
```

## Filterable

**Signature**

```ts
export declare const Filterable: typeof Filterable
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/Filterable.ts.html
- Module: "@fp-ts/core/typeclass/Filterable"
```

## FilterableWithIndex

**Signature**

```ts
export declare const FilterableWithIndex: typeof FilterableWithIndex
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/typeclass/FilterableWithIndex.ts.html
- Module: "@fp-ts/data/typeclass/FilterableWithIndex"
```

## FlatMap

**Signature**

```ts
export declare const FlatMap: typeof FlatMap
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/FlatMap.ts.html
- Module: "@fp-ts/core/typeclass/FlatMap"
```

## Foldable

**Signature**

```ts
export declare const Foldable: typeof Foldable
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/Foldable.ts.html
- Module: "@fp-ts/core/typeclass/Foldable"
```

## Function

**Signature**

```ts
export declare const Function: typeof Function
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/Function.ts.html
- Module: "@fp-ts/data/Function"
```

## Gen

**Signature**

```ts
export declare const Gen: typeof Gen
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/typeclass/Gen.ts.html
- Module: "@fp-ts/data/typeclass/Gen"
```

## HKT

**Signature**

```ts
export declare const HKT: typeof HKT
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/HKT.ts.html
- Module: "@fp-ts/core/HKT"
```

## HashMap

**Signature**

```ts
export declare const HashMap: typeof HashMap
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/HashMap.ts.html
- Module: "@fp-ts/data/HashMap"
```

## HashSet

**Signature**

```ts
export declare const HashSet: typeof HashSet
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/HashSet.ts.html
- Module: "@fp-ts/data/HashSet"
```

## Hub

**Signature**

```ts
export declare const Hub: typeof Hub
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Hub.ts.html
- Module: "@effect/io/Hub"
```

## Identity

**Signature**

```ts
export declare const Identity: typeof Identity
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/Identity.ts.html
- Module: "@fp-ts/data/Identity"
```

## ImmutableQueue

**Signature**

```ts
export declare const ImmutableQueue: typeof ImmutableQueue
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/Queue.ts.html
- Module: "@fp-ts/data/Queue"
```

## Invariant

**Signature**

```ts
export declare const Invariant: typeof Invariant
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/Invariant.ts.html
- Module: "@fp-ts/core/typeclass/Invariant"
```

## Json

**Signature**

```ts
export declare const Json: typeof Json
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/Json.ts.html
- Module: "@fp-ts/data/Json"
```

## Layer

**Signature**

```ts
export declare const Layer: typeof Layer
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Layer.ts.html
- Module: "@effect/io/Layer"
```

## List

**Signature**

```ts
export declare const List: typeof List
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/List.ts.html
- Module: "@fp-ts/data/List"
```

## Logger

**Signature**

```ts
export declare const Logger: typeof Logger
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Logger.ts.html
- Module: "@effect/io/Logger"
```

## Metric

**Signature**

```ts
export declare const Metric: typeof Metric
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Metric.ts.html
- Module: "@effect/io/Metric"
```

## Monad

**Signature**

```ts
export declare const Monad: typeof Monad
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/Monad.ts.html
- Module: "@fp-ts/core/typeclass/Monad"
```

## Monoid

**Signature**

```ts
export declare const Monoid: typeof Monoid
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/Monoid.ts.html
- Module: "@fp-ts/core/typeclass/Monoid"
```

## MutableHashMap

**Signature**

```ts
export declare const MutableHashMap: typeof MutableHashMap
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/mutable/MutableHashMap.ts.html
- Module: "@fp-ts/data/mutable/MutableHashMap"
```

## MutableHashSet

**Signature**

```ts
export declare const MutableHashSet: typeof MutableHashSet
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/mutable/MutableHashSet.ts.html
- Module: "@fp-ts/data/mutable/MutableHashSet"
```

## MutableList

**Signature**

```ts
export declare const MutableList: typeof MutableList
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/mutable/MutableList.ts.html
- Module: "@fp-ts/data/mutable/MutableList"
```

## MutableListBuilder

**Signature**

```ts
export declare const MutableListBuilder: typeof MutableListBuilder
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/mutable/MutableListBuilder.ts.html
- Module: "@fp-ts/data/mutable/MutableListBuilder"
```

## MutableQueue

**Signature**

```ts
export declare const MutableQueue: typeof MutableQueue
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/mutable/MutableQueue.ts.html
- Module: "@fp-ts/data/mutable/MutableQueue"
```

## MutableRef

**Signature**

```ts
export declare const MutableRef: typeof MutableRef
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/mutable/MutableRef.ts.html
- Module: "@fp-ts/data/mutable/MutableRef"
```

## NonEmptyTraversable

**Signature**

```ts
export declare const NonEmptyTraversable: typeof NonEmptyTraversable
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/NonEmptyTraversable.ts.html
- Module: "@fp-ts/core/typeclass/NonEmptyTraversable"
```

## Number

**Signature**

```ts
export declare const Number: typeof Number
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/Number.ts.html
- Module: "@fp-ts/data/Number"
```

## Of

**Signature**

```ts
export declare const Of: typeof Of
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/Of.ts.html
- Module: "@fp-ts/core/typeclass/Of"
```

## Optic

**Signature**

```ts
export declare const Optic: typeof Optic
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/optic/modules/index.ts.html
- Module: "@fp-ts/optic"
```

## Option

**Signature**

```ts
export declare const Option: typeof Option
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/Option.ts.html
- Module: "@fp-ts/data/Option"
```

## Order

**Signature**

```ts
export declare const Order: typeof Order
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/Order.ts.html
- Module: "@fp-ts/core/typeclass/Order"
```

## Ordering

**Signature**

```ts
export declare const Ordering: typeof Ordering
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/Ordering.ts.html
- Module: "@fp-ts/data/Ordering"
```

## PCGRandom

**Signature**

```ts
export declare const PCGRandom: typeof PCGRandom
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/Random.ts.html
- Module: "@fp-ts/data/Random"
```

## Pointed

**Signature**

```ts
export declare const Pointed: typeof Pointed
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/Pointed.ts.html
- Module: "@fp-ts/core/typeclass/Pointed"
```

## Predicate

**Signature**

```ts
export declare const Predicate: typeof Predicate
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/Predicate.ts.html
- Module: "@fp-ts/data/Predicate"
```

## Product

**Signature**

```ts
export declare const Product: typeof Product
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/Product.ts.html
- Module: "@fp-ts/core/typeclass/Product"
```

## Queue

**Signature**

```ts
export declare const Queue: typeof Queue
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Queue.ts.html
- Module: "@effect/io/Queue"
```

## Random

**Signature**

```ts
export declare const Random: typeof Random
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Random.ts.html
- Module: "@effect/io/Random"
```

## ReadonlyArray

**Signature**

```ts
export declare const ReadonlyArray: typeof ReadonlyArray
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/ReadonlyArray.ts.html
- Module: "@fp-ts/data/ReadonlyArray"
```

## RedBlackTree

**Signature**

```ts
export declare const RedBlackTree: typeof RedBlackTree
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/RedBlackTree.ts.html
- Module: "@fp-ts/data/RedBlackTree"
```

## Ref

**Signature**

```ts
export declare const Ref: typeof Ref
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Ref.ts.html
- Module: "@effect/io/Ref"
```

## Reloadable

**Signature**

```ts
export declare const Reloadable: typeof Reloadable
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Reloadable.ts.html
- Module: "@effect/io/Reloadable"
```

## Runtime

**Signature**

```ts
export declare const Runtime: typeof Runtime
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Runtime.ts.html
- Module: "@effect/io/Runtime"
```

## Schedule

**Signature**

```ts
export declare const Schedule: typeof Schedule
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Schedule.ts.html
- Module: "@effect/io/Schedule"
```

## Scope

**Signature**

```ts
export declare const Scope: typeof Scope
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Scope.ts.html
- Module: "@effect/io/Scope"
```

## SemiAlternative

**Signature**

```ts
export declare const SemiAlternative: typeof SemiAlternative
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/SemiAlternative.ts.html
- Module: "@fp-ts/core/typeclass/SemiAlternative"
```

## SemiApplicative

**Signature**

```ts
export declare const SemiApplicative: typeof SemiApplicative
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/SemiApplicative.ts.html
- Module: "@fp-ts/core/typeclass/SemiApplicative"
```

## SemiCoproduct

**Signature**

```ts
export declare const SemiCoproduct: typeof SemiCoproduct
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/SemiCoproduct.ts.html
- Module: "@fp-ts/core/typeclass/SemiCoproduct"
```

## SemiProduct

**Signature**

```ts
export declare const SemiProduct: typeof SemiProduct
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/SemiProduct.ts.html
- Module: "@fp-ts/core/typeclass/SemiProduct"
```

## Semigroup

**Signature**

```ts
export declare const Semigroup: typeof Semigroup
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/Semigroup.ts.html
- Module: "@fp-ts/core/typeclass/Semigroup"
```

## Seq

**Signature**

```ts
export declare const Seq: typeof Seq
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/typeclass/Seq.ts.html
- Module: "@fp-ts/data/typeclass/Seq"
```

## SortedMap

**Signature**

```ts
export declare const SortedMap: typeof SortedMap
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/SortedMap.ts.html
- Module: "@fp-ts/data/SortedMap"
```

## SortedSet

**Signature**

```ts
export declare const SortedSet: typeof SortedSet
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/SortedSet.ts.html
- Module: "@fp-ts/data/SortedSet"
```

## String

**Signature**

```ts
export declare const String: typeof String
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/String.ts.html
- Module: "@fp-ts/data/String"
```

## Supervisor

**Signature**

```ts
export declare const Supervisor: typeof Supervisor
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Supervisor.ts.html
- Module: "@effect/io/Supervisor"
```

## Tracer

**Signature**

```ts
export declare const Tracer: typeof Tracer
```

Added in v2.0.0

```md
- Docs: https://effect-ts.github.io/io/modules/Tracer.ts.html
- Module: "@effect/io/Tracer"
```

## Traversable

**Signature**

```ts
export declare const Traversable: typeof Traversable
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/Traversable.ts.html
- Module: "@fp-ts/core/typeclass/Traversable"
```

## TraversableFilterable

**Signature**

```ts
export declare const TraversableFilterable: typeof TraversableFilterable
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/core/modules/typeclass/TraversableFilterable.ts.html
- Module: "@fp-ts/core/typeclass/TraversableFilterable"
```

## absurd

**Signature**

```ts
export declare const absurd: <A>(_: never) => A
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/Function.ts.html#absurd
- Module: "@fp-ts/data/Function"
```

## flow

**Signature**

```ts
export declare const flow: typeof Function.flow
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/Function.ts.html
- Module: "@fp-ts/data/Function"
```

## hole

**Signature**

```ts
export declare const hole: <T>() => T
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/Function.ts.html#hole
- Module: "@fp-ts/data/Function"
```

## identity

**Signature**

```ts
export declare const identity: <A>(a: A) => A
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/Function.ts.html#identity
- Module: "@fp-ts/data/Function"
```

## pipe

**Signature**

```ts
export declare const pipe: typeof Function.pipe
```

Added in v2.0.0

```md
- Docs: https://fp-ts.github.io/data/modules/Function.ts.html#pipe
- Module: "@fp-ts/data/Function"
```

## unsafeCoerce

**Signature**

```ts
export declare const unsafeCoerce: <A, B>(a: A) => B
```

Added in v2.0.0
