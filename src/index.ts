/**
 * @since 2.0.0
 */

import * as Effect from "@effect/io/Effect"
import * as Logger from "@effect/io/Logger"

import * as HKT from "@fp-ts/core/HKT"
import * as Alternative from "@fp-ts/core/typeclass/Alternative"
import * as Applicative from "@fp-ts/core/typeclass/Applicative"
import * as Bicovariant from "@fp-ts/core/typeclass/Bicovariant"
import * as Bounded from "@fp-ts/core/typeclass/Bounded"
import * as Chainable from "@fp-ts/core/typeclass/Chainable"
import * as Compactable from "@fp-ts/core/typeclass/Compactable"
import * as Contravariant from "@fp-ts/core/typeclass/Contravariant"
import * as Coproduct from "@fp-ts/core/typeclass/Coproduct"
import * as Covariant from "@fp-ts/core/typeclass/Covariant"
import * as Filterable from "@fp-ts/core/typeclass/Filterable"
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
import * as TraversableFilterable from "@fp-ts/core/typeclass/TraversableFilterable"
import * as Boolean from "@fp-ts/data/Boolean"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Context from "@fp-ts/data/Context"
import * as Differ from "@fp-ts/data/Differ"
import * as Duration from "@fp-ts/data/Duration"
import * as Either from "@fp-ts/data/Either"
import * as Equal from "@fp-ts/data/Equal"
import * as Function from "@fp-ts/data/Function"
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
import * as ReadonlyArray from "@fp-ts/data/ReadonlyArray"
import * as SortedMap from "@fp-ts/data/SortedMap"
import * as SortedSet from "@fp-ts/data/SortedSet"
import * as String from "@fp-ts/data/String"

import { absurd, flow, hole, identity, pipe, unsafeCoerce } from "@fp-ts/data/Function"

export {
  /**
   * @since 2.0.0
   */
  absurd,
  /**
   * @since 2.0.0
   */
  Alternative,
  /**
   * @since 2.0.0
   */
  Applicative,
  /**
   * @since 2.0.0
   */
  Bicovariant,
  /**
   * @since 2.0.0
   */
  Boolean,
  /**
   * @since 2.0.0
   */
  Bounded,
  /**
   * @since 2.0.0
   */
  Chainable,
  /**
   * @since 2.0.0
   */
  Chunk,
  /**
   * @since 2.0.0
   */
  Compactable,
  /**
   * @since 2.0.0
   */
  Context,
  /**
   * @since 2.0.0
   */
  Contravariant,
  /**
   * @since 2.0.0
   */
  Coproduct,
  /**
   * @since 2.0.0
   */
  Covariant,
  /**
   * @since 2.0.0
   */
  Differ,
  /**
   * @since 2.0.0
   */
  Duration,
  /**
   * @since 2.0.0
   */
  Effect,
  /**
   * @since 2.0.0
   */
  Either,
  /**
   * @since 2.0.0
   */
  Equal,
  /**
   * @since 2.0.0
   */
  Filterable,
  /**
   * @since 2.0.0
   */
  FlatMap,
  /**
   * @since 2.0.0
   */
  flow,
  /**
   * @since 2.0.0
   */
  Foldable,
  /**
   * @since 2.0.0
   */
  Function,
  /**
   * @since 2.0.0
   */
  HashMap,
  /**
   * @since 2.0.0
   */
  HashSet,
  /**
   * @since 2.0.0
   */
  HKT,
  /**
   * @since 2.0.0
   */
  hole,
  /**
   * @since 2.0.0
   */
  Identity,
  /**
   * @since 2.0.0
   */
  identity,
  /**
   * @since 2.0.0
   */
  ImmutableQueue,
  /**
   * @since 2.0.0
   */
  Invariant,
  /**
   * @since 2.0.0
   */
  Json,
  /**
   * @since 2.0.0
   */
  List,
  /**
   * @since 2.0.0
   */
  Logger,
  /**
   * @since 2.0.0
   */
  Monad,
  /**
   * @since 2.0.0
   */
  Monoid,
  /**
   * @since 2.0.0
   */
  MutableHashMap,
  /**
   * @since 2.0.0
   */
  MutableHashSet,
  /**
   * @since 2.0.0
   */
  MutableList,
  /**
   * @since 2.0.0
   */
  MutableListBuilder,
  /**
   * @since 2.0.0
   */
  MutableQueue,
  /**
   * @since 2.0.0
   */
  MutableRef,
  /**
   * @since 2.0.0
   */
  NonEmptyTraversable,
  /**
   * @since 2.0.0
   */
  Number,
  /**
   * @since 2.0.0
   */
  Of,
  /**
   * @since 2.0.0
   */
  Option,
  /**
   * @since 2.0.0
   */
  Order,
  /**
   * @since 2.0.0
   */
  Ordering,
  /**
   * @since 2.0.0
   */
  pipe,
  /**
   * @since 2.0.0
   */
  Pointed,
  /**
   * @since 2.0.0
   */
  Predicate,
  /**
   * @since 2.0.0
   */
  Product,
  /**
   * @since 2.0.0
   */
  ReadonlyArray,
  /**
   * @since 2.0.0
   */
  SemiAlternative,
  /**
   * @since 2.0.0
   */
  SemiApplicative,
  /**
   * @since 2.0.0
   */
  SemiCoproduct,
  /**
   * @since 2.0.0
   */
  Semigroup,
  /**
   * @since 2.0.0
   */
  SemiProduct,
  /**
   * @since 2.0.0
   */
  SortedMap,
  /**
   * @since 2.0.0
   */
  SortedSet,
  /**
   * @since 2.0.0
   */
  String,
  /**
   * @since 2.0.0
   */
  Traversable,
  /**
   * @since 2.0.0
   */
  TraversableFilterable,
  /**
   * @since 2.0.0
   */
  unsafeCoerce
}
