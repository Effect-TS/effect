/**
 * @since 2.0.0
 *
 * The Effect Ecosystem Package
 *
 * To be used as a prelude when developing apps, it includes
 * a selected portion of ecosystem packages that have been identified
 * as the most common needed in most of the apps regardless
 * of the runtime (Node, Browser, Deno, Bun, etc).
 *
 * The user is expected to further install and use additional libraries
 * such as "@effect/node" to integrate with specific runtimes and / or
 * frameworks such as "@effect/express".
 *
 * Includes modules from:
 *
 * - "@fp-ts/core"
 * - "@fp-ts/data"
 * - "@fp-ts/schema" (tbd)
 * - "@fp-ts/optic"
 * - "@effect/io"
 * - "@effect/stm" (tbd)
 * - "@effect/stream" (tbd)
 *
 * Note: don't use this package when developing libraries, prefer targeting
 * individual dependencies.
 */

import * as Cached from "@effect/io/Cached"
import * as Cause from "@effect/io/Cause"
import * as Clock from "@effect/io/Clock"
import * as DefaultServices from "@effect/io/DefaultServices"
import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import * as ExecutionStrategy from "@effect/io/ExecutionStrategy"
import * as Exit from "@effect/io/Exit"
import * as FiberRef from "@effect/io/FiberRef"
import * as Hub from "@effect/io/Hub"
import * as Layer from "@effect/io/Layer"
import * as Queue from "@effect/io/Queue"
import * as Random from "@effect/io/Random"
import * as Reloadable from "@effect/io/Reloadable"
import * as Runtime from "@effect/io/Runtime"
import * as Scope from "@effect/io/Scope"
import * as Supervisor from "@effect/io/Supervisor"
import * as Tracer from "@effect/io/Tracer"
import * as HKT from "@fp-ts/core/HKT"
import * as Alternative from "@fp-ts/core/typeclass/Alternative"
import * as Applicative from "@fp-ts/core/typeclass/Applicative"
import * as Bicovariant from "@fp-ts/core/typeclass/Bicovariant"
import * as Bounded from "@fp-ts/core/typeclass/Bounded"
import * as Chainable from "@fp-ts/core/typeclass/Chainable"
import * as Contravariant from "@fp-ts/core/typeclass/Contravariant"
import * as Coproduct from "@fp-ts/core/typeclass/Coproduct"
import * as Covariant from "@fp-ts/core/typeclass/Covariant"
import * as FlatMap from "@fp-ts/core/typeclass/FlatMap"
import * as Foldable from "@fp-ts/core/typeclass/Foldable"
import * as Invariant from "@fp-ts/core/typeclass/Invariant"
import * as Monad from "@fp-ts/core/typeclass/Monad"
import * as Monoid from "@fp-ts/core/typeclass/Monoid"
import * as NonEmptyTraversable from "@fp-ts/core/typeclass/NonEmptyTraversable"
import * as Of from "@fp-ts/core/typeclass/Of"
import * as Order from "@fp-ts/core/typeclass/Order"
import * as Pointed from "@fp-ts/core/typeclass/Pointed"
import * as Product from "@fp-ts/core/typeclass/Product"
import * as SemiAlternative from "@fp-ts/core/typeclass/SemiAlternative"
import * as SemiApplicative from "@fp-ts/core/typeclass/SemiApplicative"
import * as SemiCoproduct from "@fp-ts/core/typeclass/SemiCoproduct"
import * as Semigroup from "@fp-ts/core/typeclass/Semigroup"
import * as SemiProduct from "@fp-ts/core/typeclass/SemiProduct"
import * as Traversable from "@fp-ts/core/typeclass/Traversable"
import * as Boolean from "@fp-ts/data/Boolean"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Context from "@fp-ts/data/Context"
import * as Duration from "@fp-ts/data/Duration"
import * as Either from "@fp-ts/data/Either"
import * as Equal from "@fp-ts/data/Equal"
import * as Function from "@fp-ts/data/Function"
import { absurd, flow, hole, identity, pipe, unsafeCoerce } from "@fp-ts/data/Function"
import * as HashMap from "@fp-ts/data/HashMap"
import * as HashSet from "@fp-ts/data/HashSet"
import * as Identity from "@fp-ts/data/Identity"
import * as Json from "@fp-ts/data/Json"
import * as List from "@fp-ts/data/List"
import * as MutableHashMap from "@fp-ts/data/mutable/MutableHashMap"
import * as MutableHashSet from "@fp-ts/data/mutable/MutableHashSet"
import * as MutableList from "@fp-ts/data/mutable/MutableList"
import * as MutableListBuilder from "@fp-ts/data/mutable/MutableListBuilder"
import * as MutableQueue from "@fp-ts/data/mutable/MutableQueue"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
import * as Number from "@fp-ts/data/Number"
import * as Option from "@fp-ts/data/Option"
import * as Ordering from "@fp-ts/data/Ordering"
import * as Predicate from "@fp-ts/data/Predicate"
import * as ImmutableQueue from "@fp-ts/data/Queue"
import * as PCGRandom from "@fp-ts/data/Random"
import * as ReadonlyArray from "@fp-ts/data/ReadonlyArray"
import * as RedBlackTree from "@fp-ts/data/RedBlackTree"
import * as SortedMap from "@fp-ts/data/SortedMap"
import * as SortedSet from "@fp-ts/data/SortedSet"
import * as String from "@fp-ts/data/String"
import * as Compactable from "@fp-ts/data/typeclass/Compactable"
import * as CovariantWithIndex from "@fp-ts/data/typeclass/CovariantWithIndex"
import * as Filterable from "@fp-ts/data/typeclass/Filterable"
import * as FilterableWithIndex from "@fp-ts/data/typeclass/FilterableWithIndex"
import * as Gen from "@fp-ts/data/typeclass/Gen"
import * as Seq from "@fp-ts/data/typeclass/Seq"
import * as TraversableFilterable from "@fp-ts/data/typeclass/TraversableFilterable"
import * as Codec from "effect/Codec"
import * as Differ from "effect/Differ"
import * as Fiber from "effect/Fiber"
import * as FiberRefs from "effect/FiberRefs"
import * as Logger from "effect/Logger"
import * as Metric from "effect/Metric"
import * as Optic from "effect/Optic"
import * as Ref from "effect/Ref"
import * as Schedule from "effect/Schedule"

export {
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Function.ts.html#absurd
   * - Module: "@fp-ts/data/Function"
   * ```
   */
  absurd,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Alternative.ts.html
   * - Module: "@fp-ts/core/typeclass/Alternative"
   * ```
   */
  Alternative,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Applicative.ts.html
   * - Module: "@fp-ts/core/typeclass/Applicative"
   * ```
   */
  Applicative,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Bicovariant.ts.html
   * - Module: "@fp-ts/core/typeclass/Bicovariant"
   * ```
   */
  Bicovariant,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Boolean.ts.html
   * - Module: "@fp-ts/data/Boolean"
   * ```
   */
  Boolean,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Bounded.ts.html
   * - Module: "@fp-ts/core/typeclass/Bounded"
   * ```
   */
  Bounded,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Cached.ts.html
   * - Module: "@effect/io/Cached"
   * ```
   */
  Cached,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Cause.ts.html
   * - Module: "@effect/io/Cause"
   * ```
   */
  Cause,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Chainable.ts.html
   * - Module: "@fp-ts/core/typeclass/Chainable"
   * ```
   */
  Chainable,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Chunk.ts.html
   * - Module: "@fp-ts/data/Chunk"
   * ```
   */
  Chunk,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Clock.ts.html
   * - Module: "@effect/io/Clock"
   * ```
   */
  Clock,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/schema/modules/Codec.ts.html
   * - Module: "@fp-ts/schema/Codec"
   * ```
   */
  Codec,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Compactable.ts.html
   * - Module: "@fp-ts/core/typeclass/Compactable"
   * ```
   */
  Compactable,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Context.ts.html
   * - Module: "@fp-ts/data/Context"
   * ```
   */
  Context,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Contravatiant.ts.html
   * - Module: "@fp-ts/core/typeclass/Contravariant"
   * ```
   */
  Contravariant,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Coproduct.ts.html
   * - Module: "@fp-ts/core/typeclass/Coproduct"
   * ```
   */
  Coproduct,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Covariant.ts.html
   * - Module: "@fp-ts/core/typeclass/Covariant"
   * ```
   */
  Covariant,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/typeclass/ContravatiantWithIndex.ts.html
   * - Module: "@fp-ts/data/typeclass/ContravariantWithIndex"
   * ```
   */
  CovariantWithIndex,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/DefaultServices.ts.html
   * - Module: "@effect/io/DefaultServices"
   * ```
   */
  DefaultServices,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Deferred.ts.html
   * - Module: "@effect/io/Deferred"
   * ```
   */
  Deferred,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Differ.ts.html
   * - Module: "@fp-ts/data/Differ"
   * ```
   */
  Differ,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Duration.ts.html
   * - Module: "@fp-ts/data/Duration"
   * ```
   */
  Duration,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Effect.ts.html
   * - Module: "@effect/io/Effect"
   * ```
   */
  Effect,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Either.ts.html
   * - Module: "@fp-ts/data/Either"
   * ```
   */
  Either,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Equal.ts.html
   * - Module: "@fp-ts/data/Equal"
   * ```
   */
  Equal,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/ExecutionStrategy.ts.html
   * - Module: "@effect/io/ExecutionStrategy"
   * ```
   */
  ExecutionStrategy,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Exit.ts.html
   * - Module: "@effect/io/Exit"
   * ```
   */
  Exit,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Fiber.ts.html
   * - Module: "@effect/io/Fiber"
   * ```
   */
  Fiber,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/FiberRef.ts.html
   * - Module: "@effect/io/FiberRef"
   * ```
   */
  FiberRef,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/FiberRefs.ts.html
   * - Module: "@effect/io/FiberRefs"
   * ```
   */
  FiberRefs,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Filterable.ts.html
   * - Module: "@fp-ts/core/typeclass/Filterable"
   * ```
   */
  Filterable,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/typeclass/FilterableWithIndex.ts.html
   * - Module: "@fp-ts/data/typeclass/FilterableWithIndex"
   * ```
   */
  FilterableWithIndex,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/FlatMap.ts.html
   * - Module: "@fp-ts/core/typeclass/FlatMap"
   * ```
   */
  FlatMap,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Function.ts.html
   * - Module: "@fp-ts/data/Function"
   * ```
   */
  flow,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Foldable.ts.html
   * - Module: "@fp-ts/core/typeclass/Foldable"
   * ```
   */
  Foldable,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Function.ts.html
   * - Module: "@fp-ts/data/Function"
   * ```
   */
  Function,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/typeclass/Gen.ts.html
   * - Module: "@fp-ts/data/typeclass/Gen"
   * ```
   */
  Gen,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/HashMap.ts.html
   * - Module: "@fp-ts/data/HashMap"
   * ```
   */
  HashMap,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/HashSet.ts.html
   * - Module: "@fp-ts/data/HashSet"
   * ```
   */
  HashSet,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/HKT.ts.html
   * - Module: "@fp-ts/core/HKT"
   * ```
   */
  HKT,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Function.ts.html#hole
   * - Module: "@fp-ts/data/Function"
   * ```
   */
  hole,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Hub.ts.html
   * - Module: "@effect/io/Hub"
   * ```
   */
  Hub,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Identity.ts.html
   * - Module: "@fp-ts/data/Identity"
   * ```
   */
  Identity,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Function.ts.html#identity
   * - Module: "@fp-ts/data/Function"
   * ```
   */
  identity,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Queue.ts.html
   * - Module: "@fp-ts/data/Queue"
   * ```
   */
  ImmutableQueue,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Invariant.ts.html
   * - Module: "@fp-ts/core/typeclass/Invariant"
   * ```
   */
  Invariant,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Json.ts.html
   * - Module: "@fp-ts/data/Json"
   * ```
   */
  Json,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Layer.ts.html
   * - Module: "@effect/io/Layer"
   * ```
   */
  Layer,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/List.ts.html
   * - Module: "@fp-ts/data/List"
   * ```
   */
  List,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Logger.ts.html
   * - Module: "@effect/io/Logger"
   * ```
   */
  Logger,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Metric.ts.html
   * - Module: "@effect/io/Metric"
   * ```
   */
  Metric,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Monad.ts.html
   * - Module: "@fp-ts/core/typeclass/Monad"
   * ```
   */
  Monad,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Monoid.ts.html
   * - Module: "@fp-ts/core/typeclass/Monoid"
   * ```
   */
  Monoid,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/mutable/MutableHashMap.ts.html
   * - Module: "@fp-ts/data/mutable/MutableHashMap"
   * ```
   */
  MutableHashMap,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/mutable/MutableHashSet.ts.html
   * - Module: "@fp-ts/data/mutable/MutableHashSet"
   * ```
   */
  MutableHashSet,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/mutable/MutableList.ts.html
   * - Module: "@fp-ts/data/mutable/MutableList"
   * ```
   */
  MutableList,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/mutable/MutableListBuilder.ts.html
   * - Module: "@fp-ts/data/mutable/MutableListBuilder"
   * ```
   */
  MutableListBuilder,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/mutable/MutableQueue.ts.html
   * - Module: "@fp-ts/data/mutable/MutableQueue"
   * ```
   */
  MutableQueue,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/mutable/MutableRef.ts.html
   * - Module: "@fp-ts/data/mutable/MutableRef"
   * ```
   */
  MutableRef,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/NonEmptyTraversable.ts.html
   * - Module: "@fp-ts/core/typeclass/NonEmptyTraversable"
   * ```
   */
  NonEmptyTraversable,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Number.ts.html
   * - Module: "@fp-ts/data/Number"
   * ```
   */
  Number,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Of.ts.html
   * - Module: "@fp-ts/core/typeclass/Of"
   * ```
   */
  Of,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/index.ts.html
   * - Module: "@fp-ts/optic"
   * ```
   */
  Optic,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Option.ts.html
   * - Module: "@fp-ts/data/Option"
   * ```
   */
  Option,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Order.ts.html
   * - Module: "@fp-ts/core/typeclass/Order"
   * ```
   */
  Order,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Ordering.ts.html
   * - Module: "@fp-ts/data/Ordering"
   * ```
   */
  Ordering,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Random.ts.html
   * - Module: "@fp-ts/data/Random"
   * ```
   */
  PCGRandom,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Function.ts.html#pipe
   * - Module: "@fp-ts/data/Function"
   * ```
   */
  pipe,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Pointed.ts.html
   * - Module: "@fp-ts/core/typeclass/Pointed"
   * ```
   */
  Pointed,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Predicate.ts.html
   * - Module: "@fp-ts/data/Predicate"
   * ```
   */
  Predicate,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Product.ts.html
   * - Module: "@fp-ts/core/typeclass/Product"
   * ```
   */
  Product,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Queue.ts.html
   * - Module: "@effect/io/Queue"
   * ```
   */
  Queue,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Random.ts.html
   * - Module: "@effect/io/Random"
   * ```
   */
  Random,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/ReadonlyArray.ts.html
   * - Module: "@fp-ts/data/ReadonlyArray"
   * ```
   */
  ReadonlyArray,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/RedBlackTree.ts.html
   * - Module: "@fp-ts/data/RedBlackTree"
   * ```
   */
  RedBlackTree,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Ref.ts.html
   * - Module: "@effect/io/Ref"
   * ```
   */
  Ref,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Reloadable.ts.html
   * - Module: "@effect/io/Reloadable"
   * ```
   */
  Reloadable,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Runtime.ts.html
   * - Module: "@effect/io/Runtime"
   * ```
   */
  Runtime,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Schedule.ts.html
   * - Module: "@effect/io/Schedule"
   * ```
   */
  Schedule,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Scope.ts.html
   * - Module: "@effect/io/Scope"
   * ```
   */
  Scope,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/SemiAlternative.ts.html
   * - Module: "@fp-ts/core/typeclass/SemiAlternative"
   * ```
   */
  SemiAlternative,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/SemiApplicative.ts.html
   * - Module: "@fp-ts/core/typeclass/SemiApplicative"
   * ```
   */
  SemiApplicative,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/SemiCoproduct.ts.html
   * - Module: "@fp-ts/core/typeclass/SemiCoproduct"
   * ```
   */
  SemiCoproduct,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Semigroup.ts.html
   * - Module: "@fp-ts/core/typeclass/Semigroup"
   * ```
   */
  Semigroup,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/SemiProduct.ts.html
   * - Module: "@fp-ts/core/typeclass/SemiProduct"
   * ```
   */
  SemiProduct,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/typeclass/Seq.ts.html
   * - Module: "@fp-ts/data/typeclass/Seq"
   * ```
   */
  Seq,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/SortedMap.ts.html
   * - Module: "@fp-ts/data/SortedMap"
   * ```
   */
  SortedMap,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/SortedSet.ts.html
   * - Module: "@fp-ts/data/SortedSet"
   * ```
   */
  SortedSet,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/String.ts.html
   * - Module: "@fp-ts/data/String"
   * ```
   */
  String,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Supervisor.ts.html
   * - Module: "@effect/io/Supervisor"
   * ```
   */
  Supervisor,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://effect-ts.github.io/io/modules/Tracer.ts.html
   * - Module: "@effect/io/Tracer"
   * ```
   */
  Tracer,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Traversable.ts.html
   * - Module: "@fp-ts/core/typeclass/Traversable"
   * ```
   */
  Traversable,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/TraversableFilterable.ts.html
   * - Module: "@fp-ts/core/typeclass/TraversableFilterable"
   * ```
   */
  TraversableFilterable,
  /**
   * @since 2.0.0
   */
  unsafeCoerce
}
