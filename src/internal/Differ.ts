import type { Chunk } from "../Chunk"
import type { Context } from "../Context"
import type * as D from "../Differ"
import type { Either } from "../Either"
import * as Equal from "../Equal"
import * as Dual from "../Function"
import { constant, identity } from "../Function"
import type { HashMap } from "../HashMap"
import type { HashSet } from "../HashSet"
import * as ChunkPatch from "../internal/Differ/ChunkPatch"
import * as ContextPatch from "../internal/Differ/ContextPatch"
import * as HashMapPatch from "../internal/Differ/HashMapPatch"
import * as HashSetPatch from "../internal/Differ/HashSetPatch"
import * as OrPatch from "../internal/Differ/OrPatch"

/** @internal */
export const DifferTypeId: D.TypeId = Symbol.for("effect/Differ") as D.TypeId

/** @internal */
export const DifferProto = {
  [DifferTypeId]: {
    _P: identity,
    _V: identity
  }
}

/** @internal */
export const make = <Value, Patch>(
  params: {
    readonly empty: Patch
    readonly diff: (oldValue: Value, newValue: Value) => Patch
    readonly combine: (first: Patch, second: Patch) => Patch
    readonly patch: (patch: Patch, oldValue: Value) => Value
  }
): D.Differ<Value, Patch> => {
  const differ = Object.create(DifferProto)
  differ.empty = params.empty
  differ.diff = params.diff
  differ.combine = params.combine
  differ.patch = params.patch
  return differ
}

/** @internal */
export const environment = <A>(): D.Differ<Context<A>, D.Differ.Context.Patch<A, A>> =>
  make({
    empty: ContextPatch.empty(),
    combine: (first, second) => ContextPatch.combine(second)(first),
    diff: (oldValue, newValue) => ContextPatch.diff(oldValue, newValue),
    patch: (patch, oldValue) => ContextPatch.patch(oldValue)(patch)
  })

/** @internal */
export const chunk = <Value, Patch>(
  differ: D.Differ<Value, Patch>
): D.Differ<Chunk<Value>, D.Differ.Chunk.Patch<Value, Patch>> =>
  make({
    empty: ChunkPatch.empty(),
    combine: (first, second) => ChunkPatch.combine(second)(first),
    diff: (oldValue, newValue) => ChunkPatch.diff({ oldValue, newValue, differ }),
    patch: (patch, oldValue) => ChunkPatch.patch(oldValue, differ)(patch)
  })

/** @internal */
export const hashMap = <Key, Value, Patch>(
  differ: D.Differ<Value, Patch>
): D.Differ<HashMap<Key, Value>, D.Differ.HashMap.Patch<Key, Value, Patch>> =>
  make({
    empty: HashMapPatch.empty(),
    combine: (first, second) => HashMapPatch.combine(second)(first),
    diff: (oldValue, newValue) => HashMapPatch.diff({ oldValue, newValue, differ }),
    patch: (patch, oldValue) => HashMapPatch.patch(oldValue, differ)(patch)
  })

/** @internal */
export const hashSet = <Value>(): D.Differ<HashSet<Value>, D.Differ.HashSet.Patch<Value>> =>
  make({
    empty: HashSetPatch.empty(),
    combine: (first, second) => HashSetPatch.combine(second)(first),
    diff: (oldValue, newValue) => HashSetPatch.diff(oldValue, newValue),
    patch: (patch, oldValue) => HashSetPatch.patch(oldValue)(patch)
  })

/** @internal */
export const orElseEither = Dual.dual<
  <Value2, Patch2>(that: D.Differ<Value2, Patch2>) => <Value, Patch>(
    self: D.Differ<Value, Patch>
  ) => D.Differ<Either<Value, Value2>, D.Differ.Or.Patch<Value, Value2, Patch, Patch2>>,
  <Value, Patch, Value2, Patch2>(
    self: D.Differ<Value, Patch>,
    that: D.Differ<Value2, Patch2>
  ) => D.Differ<Either<Value, Value2>, D.Differ.Or.Patch<Value, Value2, Patch, Patch2>>
>(2, (self, that) =>
  make({
    empty: OrPatch.empty(),
    combine: (first, second) => OrPatch.combine(first, second),
    diff: (oldValue, newValue) =>
      OrPatch.diff({
        oldValue,
        newValue,
        left: self,
        right: that
      }),
    patch: (patch, oldValue) =>
      OrPatch.patch(patch, {
        oldValue,
        left: self,
        right: that
      })
  }))

/** @internal */
export const transform = Dual.dual<
  <Value, Value2>(
    options: {
      readonly toNew: (value: Value) => Value2
      readonly toOld: (value: Value2) => Value
    }
  ) => <Patch>(self: D.Differ<Value, Patch>) => D.Differ<Value2, Patch>,
  <Value, Patch, Value2>(
    self: D.Differ<Value, Patch>,
    options: {
      readonly toNew: (value: Value) => Value2
      readonly toOld: (value: Value2) => Value
    }
  ) => D.Differ<Value2, Patch>
>(2, (self, { toNew, toOld }) =>
  make({
    empty: self.empty,
    combine: (first, second) => self.combine(first, second),
    diff: (oldValue, newValue) => self.diff(toOld(oldValue), toOld(newValue)),
    patch: (patch, oldValue) => toNew(self.patch(patch, toOld(oldValue)))
  }))

/** @internal */
export const update = <A>(): D.Differ<A, (a: A) => A> => updateWith((_, a) => a)

/** @internal */
export const updateWith = <A>(f: (x: A, y: A) => A): D.Differ<A, (a: A) => A> =>
  make({
    empty: identity,
    combine: (first, second) => {
      if (first === identity) {
        return second
      }
      if (second === identity) {
        return first
      }
      return (a) => second(first(a))
    },
    diff: (oldValue, newValue) => {
      if (Equal.equals(oldValue, newValue)) {
        return identity
      }
      return constant(newValue)
    },
    patch: (patch, oldValue) => f(oldValue, patch(oldValue))
  })

/** @internal */
export const zip = Dual.dual<
  <Value2, Patch2>(that: D.Differ<Value2, Patch2>) => <Value, Patch>(
    self: D.Differ<Value, Patch>
  ) => D.Differ<readonly [Value, Value2], readonly [Patch, Patch2]>,
  <Value, Patch, Value2, Patch2>(
    self: D.Differ<Value, Patch>,
    that: D.Differ<Value2, Patch2>
  ) => D.Differ<readonly [Value, Value2], readonly [Patch, Patch2]>
>(2, (self, that) =>
  make({
    empty: [self.empty, that.empty] as const,
    combine: (first, second) => [
      self.combine(first[0], second[0]),
      that.combine(first[1], second[1])
    ],
    diff: (oldValue, newValue) => [
      self.diff(oldValue[0], newValue[0]),
      that.diff(oldValue[1], newValue[1])
    ],
    patch: (patch, oldValue) => [
      self.patch(patch[0], oldValue[0]),
      that.patch(patch[1], oldValue[1])
    ]
  }))
