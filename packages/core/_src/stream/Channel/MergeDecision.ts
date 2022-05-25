export const MergeDecisionSym = Symbol.for("@effect/core/stream/Channel/MergeDecision")
export type MergeDecisionSym = typeof MergeDecisionSym

export const _R = Symbol.for("@effect/core/stream/Channel/MergeDecision/R")
export type _R = typeof _R

export const _E0 = Symbol.for("@effect/core/stream/Channel/MergeDecision/E0")
export type _E0 = typeof _E0

export const _Z0 = Symbol.for("@effect/core/stream/Channel/MergeDecision/Z0")
export type _Z0 = typeof _Z0

export const _E = Symbol.for("@effect/core/stream/Channel/MergeDecision/E")
export type _E = typeof _E

export const _Z = Symbol.for("@effect/core/stream/Channel/MergeDecision/Z")
export type _Z = typeof _Z

/**
 * @tsplus type ets/Channel/MergeDecision
 */
export interface MergeDecision<R, E0, Z0, E, Z> {
  readonly [MergeDecisionSym]: typeof MergeDecisionSym

  readonly [_R]: (_: R) => void
  readonly [_E0]: (_: E0) => void
  readonly [_Z0]: (_: Z0) => void
  readonly [_E]: () => E
  readonly [_Z]: () => Z
}

/**
 * @tsplus type ets/Channel/MergeDecision/Ops
 */
export interface MergeDecisionOps {}
export const MergeDecision: MergeDecisionOps = {}

export abstract class MergeDecisionBase<R, E0, Z0, E, Z> implements MergeDecision<R, E0, Z0, E, Z> {
  readonly [MergeDecisionSym]: typeof MergeDecisionSym = MergeDecisionSym

  readonly [_R]!: (_: R) => void
  readonly [_E0]!: (_: E0) => void
  readonly [_Z0]!: (_: Z0) => void
  readonly [_E]!: () => E
  readonly [_Z]!: () => Z
}

/**
 * @tsplus unify ets/Channel/MergeDecision
 */
export function unifyMergeDecision<X extends MergeDecision<any, any, any, any, any>>(
  self: X
): MergeDecision<
  [X] extends [{ [k in typeof _R]: (_: infer R) => void }] ? R : never,
  [X] extends [{ [k in typeof _E0]: (_: infer E0) => void }] ? E0 : never,
  [X] extends [{ [k in typeof _Z0]: (_: infer Z0) => void }] ? Z0 : never,
  [X] extends [{ [k in typeof _E]: () => infer E }] ? E : never,
  [X] extends [{ [k in typeof _Z]: () => infer A }] ? A : never
> {
  return self
}

export class Done<R, E, Z> extends MergeDecisionBase<R, unknown, unknown, E, Z> {
  readonly _tag = "Done"

  constructor(readonly io: Effect<R, E, Z>) {
    super()
  }
}
export class Await<R, E0, Z0, E, Z> extends MergeDecisionBase<R, E0, Z0, E, Z> {
  readonly _tag = "Await"

  constructor(readonly f: (ex: Exit<E0, Z0>) => Effect<R, E, Z>) {
    super()
  }
}

/**
 * @tsplus static ets/Channel/MergeDecision/Ops done
 */
export function done<R, E, Z>(
  io: Effect<R, E, Z>
): MergeDecision<R, unknown, unknown, E, Z> {
  return new Done(io)
}

/**
 * @tsplus static ets/Channel/MergeDecision/Ops await
 */
export function _await<R, E0, Z0, E, Z>(
  f: (ex: Exit<E0, Z0>) => Effect<R, E, Z>
): MergeDecision<R, E0, Z0, E, Z> {
  return new Await(f)
}

/**
 * @tsplus static ets/Channel/MergeDecision/Ops awaitConst
 */
export function awaitConst<R, E, Z>(
  io: Effect<R, E, Z>
): MergeDecision<R, unknown, unknown, E, Z> {
  return new Await((_) => io)
}

/**
 * @tsplus macro remove
 */
export function concreteMergeDecision<R, E0, Z0, E, Z>(
  _: MergeDecision<R, E0, Z0, E, Z>
): asserts _ is Done<R, E, Z> | Await<R, E0, Z0, E, Z> {
  //
}
