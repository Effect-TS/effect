/**
 * @since 2.0.0
 */
import type { Chunk } from "../Chunk.js"
import type { Context } from "../Context.js"
import type { Differ } from "../Differ.js"
import type { Either } from "../Either.js"
import * as Dual from "../Function.js"
import type { HashMap } from "../HashMap.js"
import type { HashSet } from "../HashSet.js"
import * as internal from "../internal/differ.js"
import * as ChunkPatch from "../internal/differ/chunkPatch.js"
import * as ContextPatch from "../internal/differ/contextPatch.js"
import * as HashMapPatch from "../internal/differ/hashMapPatch.js"
import * as HashSetPatch from "../internal/differ/hashSetPatch.js"
import * as OrPatch from "../internal/differ/orPatch.js"

/**
 * @since 2.0.0
 * @category symbol
 */
export const TypeId: unique symbol = internal.DifferTypeId as TypeId

/**
 * @since 2.0.0
 * @category symbol
 */
export type TypeId = typeof TypeId

/**
 * @since 2.0.0
 * @category symbol
 */
export const ChunkPatchTypeId: unique symbol = ChunkPatch.ChunkPatchTypeId as Differ.Chunk.TypeId
/**
 * @since 2.0.0
 * @category symbol
 */
export const ContextPatchTypeId: unique symbol = ContextPatch.ContextPatchTypeId as Differ.Context.TypeId
/**
 * @since 2.0.0
 * @category symbol
 */
export const HashMapPatchTypeId: unique symbol = HashMapPatch.HashMapPatchTypeId as Differ.HashMap.TypeId
/**
 * @since 2.0.0
 * @category symbol
 */
export const HashSetPatchTypeId: unique symbol = HashSetPatch.HashSetPatchTypeId as Differ.HashSet.TypeId
/**
 * @since 2.0.0
 * @category symbol
 */
export const OrPatchTypeId: unique symbol = OrPatch.OrPatchTypeId as Differ.Or.TypeId

/**
 * An empty patch that describes no changes.
 *
 * @since 2.0.0
 * @category patch
 */
export const empty: <Value, Patch>(self: Differ<Value, Patch>) => Patch = (
  self
) => self.empty

/**
 * @since 2.0.0
 * @category patch
 */
export const diff: {
  <Value>(oldValue: Value, newValue: Value): <Patch>(
    self: Differ<Value, Patch>
  ) => Patch
  <Value, Patch>(
    self: Differ<Value, Patch>,
    oldValue: Value,
    newValue: Value
  ): Patch
} = Dual.dual(
  3,
  <Value, Patch>(
    self: Differ<Value, Patch>,
    oldValue: Value,
    newValue: Value
  ): Patch => self.diff(oldValue, newValue)
)

/**
 * Combines two patches to produce a new patch that describes the updates of
 * the first patch and then the updates of the second patch. The combine
 * operation should be associative. In addition, if the combine operation is
 * commutative then joining multiple fibers concurrently will result in
 * deterministic `FiberRef` values.
 *
 * @since 2.0.0
 * @category patch
 */
export const combine: {
  <Patch>(first: Patch, second: Patch): <Value>(
    self: Differ<Value, Patch>
  ) => Patch
  <Value, Patch>(
    self: Differ<Value, Patch>,
    first: Patch,
    second: Patch
  ): Patch
} = Dual.dual(
  3,
  <Value, Patch>(
    self: Differ<Value, Patch>,
    first: Patch,
    second: Patch
  ): Patch => self.combine(first, second)
)

/**
 * Applies a patch to an old value to produce a new value that is equal to the
 * old value with the updates described by the patch.
 *
 * @since 2.0.0
 * @category patch
 */
export const patch: {
  <Patch, Value>(patch: Patch, oldValue: Value): (
    self: Differ<Value, Patch>
  ) => Value
  <Patch, Value>(
    self: Differ<Value, Patch>,
    patch: Patch,
    oldValue: Value
  ): Value
} = Dual.dual(
  3,
  <Patch, Value>(
    self: Differ<Value, Patch>,
    patch: Patch,
    oldValue: Value
  ): Value => self.patch(patch, oldValue)
)

/**
 * Constructs a new `Differ`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <Value, Patch>(params: {
  readonly empty: Patch
  readonly diff: (oldValue: Value, newValue: Value) => Patch
  readonly combine: (first: Patch, second: Patch) => Patch
  readonly patch: (patch: Patch, oldValue: Value) => Value
}) => Differ<Value, Patch> = internal.make

/**
 * Constructs a differ that knows how to diff `Env` values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const environment: <A>() => Differ<
  Context<A>,
  Differ.Context.Patch<A, A>
> = internal.environment

/**
 * Constructs a differ that knows how to diff a `Chunk` of values given a
 * differ that knows how to diff the values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const chunk: <Value, Patch>(
  differ: Differ<Value, Patch>
) => Differ<Chunk<Value>, Differ.Chunk.Patch<Value, Patch>> = internal.chunk

/**
 * Constructs a differ that knows how to diff a `HashMap` of keys and values given
 * a differ that knows how to diff the values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const hashMap: <Key, Value, Patch>(
  differ: Differ<Value, Patch>
) => Differ<HashMap<Key, Value>, Differ.HashMap.Patch<Key, Value, Patch>> = internal.hashMap

/**
 * Constructs a differ that knows how to diff a `HashSet` of values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const hashSet: <Value>() => Differ<
  HashSet<Value>,
  Differ.HashSet.Patch<Value>
> = internal.hashSet

/**
 * Combines this differ and the specified differ to produce a differ that
 * knows how to diff the sum of their values.
 *
 * @since 2.0.0
 */
export const orElseEither: {
  <Value2, Patch2>(that: Differ<Value2, Patch2>): <Value, Patch>(
    self: Differ<Value, Patch>
  ) => Differ<
    Either<Value, Value2>,
    Differ.Or.Patch<Value, Value2, Patch, Patch2>
  >
  <Value, Patch, Value2, Patch2>(
    self: Differ<Value, Patch>,
    that: Differ<Value2, Patch2>
  ): Differ<
    Either<Value, Value2>,
    Differ.Or.Patch<Value, Value2, Patch, Patch2>
  >
} = internal.orElseEither

/**
 * Transforms the type of values that this differ knows how to differ using
 * the specified functions that map the new and old value types to each other.
 *
 * @since 2.0.0
 */
export const transform: {
  <Value, Value2>(options: {
    readonly toNew: (value: Value) => Value2
    readonly toOld: (value: Value2) => Value
  }): <Patch>(self: Differ<Value, Patch>) => Differ<Value2, Patch>
  <Value, Patch, Value2>(
    self: Differ<Value, Patch>,
    options: {
      readonly toNew: (value: Value) => Value2
      readonly toOld: (value: Value2) => Value
    }
  ): Differ<Value2, Patch>
} = internal.transform

/**
 * Constructs a differ that just diffs two values by returning a function that
 * sets the value to the new value. This differ does not support combining
 * multiple updates to the value compositionally and should only be used when
 * there is no compositional way to update them.
 *
 * @since 2.0.0
 */
export const update: <A>() => Differ<A, (a: A) => A> = internal.update

/**
 * A variant of `update` that allows specifying the function that will be used
 * to combine old values with new values.
 *
 * @since 2.0.0
 */
export const updateWith: <A>(f: (x: A, y: A) => A) => Differ<A, (a: A) => A> = internal.updateWith

/**
 * Combines this differ and the specified differ to produce a new differ that
 * knows how to diff the product of their values.
 *
 * @since 2.0.0
 */
export const zip: {
  <Value2, Patch2>(that: Differ<Value2, Patch2>): <Value, Patch>(
    self: Differ<Value, Patch>
  ) => Differ<
    readonly [Value, Value2], // readonly because invariant
    readonly [Patch, Patch2] // readonly because invariant
  >
  <Value, Patch, Value2, Patch2>(
    self: Differ<Value, Patch>,
    that: Differ<Value2, Patch2>
  ): Differ<
    readonly [Value, Value2], // readonly because invariant
    readonly [Patch, Patch2] // readonly because invariant
  >
} = internal.zip
