export const HashSetPatchSym = Symbol.for("@effect/core/io/Differ.HashSetPatch")
export type HashSetPatchSym = typeof HashSetPatchSym

export const HashSetPatchValueSym = Symbol.for("@effect/core/io/Differ.HashSetPatch.Value")
export type HashSetPatchValueSym = typeof HashSetPatchValueSym

/**
 * A patch which describes updates to a set of values.
 *
 * @tsplus type effect/core/io/Differ.HashSetPatch
 */
export interface HashSetPatch<Value> {
  readonly [HashSetPatchSym]: HashSetPatchSym
  readonly [HashSetPatchValueSym]: () => Value
}

/**
 * @tsplus type effect/core/io/Differ.HashSetPatch.Ops
 */
export interface HashSetPatchOps {
  readonly $: HashSetPatchAspects
}
/**
 * @tsplus static effect/core/io/Differ.Ops HashSetPatch
 */
export const HashSetPatch: HashSetPatchOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/Differ.HashSetPatch.Aspects
 */
export interface HashSetPatchAspects {}

/**
 * @tsplus unify effect/core/io/Differ.HashSetPatch
 */
export function unifyHashSetPatch<X extends HashSetPatch<any>>(self: X): HashSetPatch<
  [X] extends [{ [HashSetPatchValueSym]: () => infer Value }] ? Value : never
> {
  return self
}

export abstract class BaseHashSetPatch<Value> implements HashSetPatch<Value> {
  readonly [HashSetPatchSym]: HashSetPatchSym = HashSetPatchSym
  readonly [HashSetPatchValueSym]!: () => Value
}

export class AddHashSetPatch<Value> extends BaseHashSetPatch<Value> {
  readonly _tag = "Add"
  constructor(readonly value: Value) {
    super()
  }
}

export class AndThenHashSetPatch<Value> extends BaseHashSetPatch<Value> {
  readonly _tag = "AndThen"
  constructor(readonly first: HashSetPatch<Value>, readonly second: HashSetPatch<Value>) {
    super()
  }
}

export class EmptyHashSetPatch<Value> extends BaseHashSetPatch<Value> {
  readonly _tag = "Empty"
}

export class RemoveHashSetPatch<Value> extends BaseHashSetPatch<Value> {
  readonly _tag = "Remove"
  constructor(readonly value: Value) {
    super()
  }
}

export type HashSetPatchInstruction =
  | AddHashSetPatch<any>
  | AndThenHashSetPatch<any>
  | EmptyHashSetPatch<any>
  | RemoveHashSetPatch<any>

/**
 * @tsplus macro identity
 */
export function hashSetPatchInstruction<Value>(self: HashSetPatch<Value>): HashSetPatchInstruction {
  // @ts-expect-error
  return self
}
