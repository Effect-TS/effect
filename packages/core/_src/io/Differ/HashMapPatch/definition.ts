export const HashMapPatchSym = Symbol.for("@effect/core/io/Differ.HashMapPatch")
export type HashMapPatchSym = typeof HashMapPatchSym

export const HashMapPatchKeySym = Symbol.for("@effect/core/io/Differ.HashMapPatch.Key")
export type HashMapPatchKeySym = typeof HashMapPatchKeySym

export const HashMapPatchValueSym = Symbol.for("@effect/core/io/Differ.HashMapPatch.Value")
export type HashMapPatchValueSym = typeof HashMapPatchValueSym

export const HashMapPatchPatchSym = Symbol.for("@effect/core/io/Differ.HashMapPatch.Patch")
export type HashMapPatchPatchSym = typeof HashMapPatchPatchSym

/**
 * A patch which describes updates to a map of keys and values.
 *
 * @tsplus type effect/core/io/Differ.HashMapPatch
 */
export interface HashMapPatch<Key, Value, Patch> {
  readonly [HashMapPatchSym]: HashMapPatchSym
  readonly [HashMapPatchKeySym]: () => Key
  readonly [HashMapPatchValueSym]: () => Value
  readonly [HashMapPatchPatchSym]: () => Patch
}

/**
 * @tsplus type effect/core/io/Differ.HashMapPatch.Ops
 */
export interface HashMapPatchOps {
  readonly $: HashMapPatchAspects
}
/**
 * @tsplus static effect/core/io/Differ.Ops HashMapPatch
 */
export const HashMapPatch: HashMapPatchOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/Differ.HashMapPatch.Aspects
 */
export interface HashMapPatchAspects {}

/**
 * @tsplus unify effect/core/io/Differ.HashMapPatch
 */
export function unifyHashMapPatch<X extends HashMapPatch<any, any, any>>(self: X): HashMapPatch<
  [X] extends [{ [HashMapPatchKeySym]: () => infer Key }] ? Key : never,
  [X] extends [{ [HashMapPatchValueSym]: () => infer Value }] ? Value : never,
  [X] extends [{ [HashMapPatchPatchSym]: () => infer Patch }] ? Patch : never
> {
  return self
}

export abstract class BaseHashMapPatch<Key, Value, Patch>
  implements HashMapPatch<Key, Value, Patch>
{
  readonly [HashMapPatchSym]: HashMapPatchSym = HashMapPatchSym
  readonly [HashMapPatchKeySym]!: () => Key
  readonly [HashMapPatchValueSym]!: () => Value
  readonly [HashMapPatchPatchSym]!: () => Patch
}

export class AddHashMapPatch<Key, Value, Patch> extends BaseHashMapPatch<Key, Value, Patch> {
  readonly _tag = "Add"
  constructor(readonly key: Key, readonly value: Value) {
    super()
  }
}

export class RemoveHashMapPatch<Key, Value, Patch> extends BaseHashMapPatch<Key, Value, Patch> {
  readonly _tag = "Remove"
  constructor(readonly key: Key) {
    super()
  }
}

export class UpdateHashMapPatch<Key, Value, Patch> extends BaseHashMapPatch<Key, Value, Patch> {
  readonly _tag = "Update"
  constructor(readonly key: Key, readonly patch: Patch) {
    super()
  }
}

export class EmptyHashMapPatch<Key, Value, Patch> extends BaseHashMapPatch<Key, Value, Patch> {
  readonly _tag = "Empty"
}

export class AndThenHashMapPatch<Key, Value, Patch> extends BaseHashMapPatch<Key, Value, Patch> {
  readonly _tag = "AndThen"
  constructor(
    readonly first: HashMapPatch<Key, Value, Patch>,
    readonly second: HashMapPatch<Key, Value, Patch>
  ) {
    super()
  }
}

export type HashMapPatchInstruction =
  | AddHashMapPatch<any, any, any>
  | RemoveHashMapPatch<any, any, any>
  | UpdateHashMapPatch<any, any, any>
  | EmptyHashMapPatch<any, any, any>
  | AndThenHashMapPatch<any, any, any>

/**
 * @tsplus macro identity
 */
export function hashMapPatchInstruction<Key, Value, Patch>(
  self: HashMapPatch<Key, Value, Patch>
): HashMapPatchInstruction {
  // @ts-expect-error
  return self
}
