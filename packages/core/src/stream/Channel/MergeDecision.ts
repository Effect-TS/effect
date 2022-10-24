/**
 * @category symbol
 * @since 1.0.0
 */
export const MergeDecisionSym = Symbol.for("@effect/core/stream/Channel/MergeDecision")

/**
 * @category symbol
 * @since 1.0.0
 */
export type MergeDecisionSym = typeof MergeDecisionSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const _R = Symbol.for("@effect/core/stream/Channel/MergeDecision/R")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _R = typeof _R

/**
 * @category symbol
 * @since 1.0.0
 */
export const _E0 = Symbol.for("@effect/core/stream/Channel/MergeDecision/E0")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _E0 = typeof _E0

/**
 * @category symbol
 * @since 1.0.0
 */
export const _Z0 = Symbol.for("@effect/core/stream/Channel/MergeDecision/Z0")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _Z0 = typeof _Z0

/**
 * @category symbol
 * @since 1.0.0
 */
export const _E = Symbol.for("@effect/core/stream/Channel/MergeDecision/E")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _E = typeof _E

/**
 * @category symbol
 * @since 1.0.0
 */
export const _Z = Symbol.for("@effect/core/stream/Channel/MergeDecision/Z")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _Z = typeof _Z

/**
 * @tsplus type effect/core/stream/Channel/MergeDecision
 * @category symbol
 * @since 1.0.0
 */
export interface MergeDecision<R, E0, Z0, E, Z> {
  readonly [MergeDecisionSym]: typeof MergeDecisionSym

  readonly [_R]: () => R
  readonly [_E0]: (_: E0) => void
  readonly [_Z0]: (_: Z0) => void
  readonly [_E]: () => E
  readonly [_Z]: () => Z
}

/**
 * @tsplus type effect/core/stream/Channel/MergeDecision.Ops
 * @category symbol
 * @since 1.0.0
 */
export interface MergeDecisionOps {}
export const MergeDecision: MergeDecisionOps = {}

/** @internal */
export abstract class MergeDecisionBase<R, E0, Z0, E, Z> implements MergeDecision<R, E0, Z0, E, Z> {
  readonly [MergeDecisionSym]: typeof MergeDecisionSym = MergeDecisionSym

  readonly [_R]!: () => R
  readonly [_E0]!: (_: E0) => void
  readonly [_Z0]!: (_: Z0) => void
  readonly [_E]!: () => E
  readonly [_Z]!: () => Z
}

/**
 * @tsplus unify effect/core/stream/Channel/MergeDecision
 */
export function unifyMergeDecision<X extends MergeDecision<any, any, any, any, any>>(
  self: X
): MergeDecision<
  [X] extends [{ [k in typeof _R]: () => infer R }] ? R : never,
  [X] extends [{ [k in typeof _E0]: (_: infer E0) => void }] ? E0 : never,
  [X] extends [{ [k in typeof _Z0]: (_: infer Z0) => void }] ? Z0 : never,
  [X] extends [{ [k in typeof _E]: () => infer E }] ? E : never,
  [X] extends [{ [k in typeof _Z]: () => infer A }] ? A : never
> {
  return self
}

/**
 * @category model
 * @since 1.0.0
 */
export class Done<R, E, Z> extends MergeDecisionBase<R, unknown, unknown, E, Z> {
  readonly _tag = "Done"

  constructor(readonly io: Effect<R, E, Z>) {
    super()
  }
}

/**
 * @category model
 * @since 1.0.0
 */
export class Await<R, E0, Z0, E, Z> extends MergeDecisionBase<R, E0, Z0, E, Z> {
  readonly _tag = "Await"

  constructor(readonly f: (ex: Exit<E0, Z0>) => Effect<R, E, Z>) {
    super()
  }
}

/**
 * @tsplus static effect/core/stream/Channel/MergeDecision.Ops done
 * @category constructors
 * @since 1.0.0
 */
export function done<R, E, Z>(
  io: Effect<R, E, Z>
): MergeDecision<R, unknown, unknown, E, Z> {
  return new Done(io)
}

/**
 * @tsplus static effect/core/stream/Channel/MergeDecision.Ops await
 * @category constructors
 * @since 1.0.0
 */
export function _await<R, E0, Z0, E, Z>(
  f: (ex: Exit<E0, Z0>) => Effect<R, E, Z>
): MergeDecision<R, E0, Z0, E, Z> {
  return new Await(f)
}

/**
 * @tsplus static effect/core/stream/Channel/MergeDecision.Ops awaitConst
 * @category constructors
 * @since 1.0.0
 */
export function awaitConst<R, E, Z>(
  io: Effect<R, E, Z>
): MergeDecision<R, unknown, unknown, E, Z> {
  return new Await((_) => io)
}

/**
 * @tsplus macro remove
 * @internal
 */
export function concreteMergeDecision<R, E0, Z0, E, Z>(
  _: MergeDecision<R, E0, Z0, E, Z>
): asserts _ is Done<R, E, Z> | Await<R, E0, Z0, E, Z> {
  //
}
