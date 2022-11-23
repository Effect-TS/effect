/**
 * @since 2.0.0
 */

import * as Effect from "@effect/io/Effect"
import * as Logger from "@effect/io/Logger"

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
  Boolean,
  /**
   * @since 2.0.0
   */
  Chunk,
  /**
   * @since 2.0.0
   */
  Context,
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
  flow,
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
  Number,
  /**
   * @since 2.0.0
   */
  Option,
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
  Predicate,
  /**
   * @since 2.0.0
   */
  ReadonlyArray,
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
  unsafeCoerce
}
