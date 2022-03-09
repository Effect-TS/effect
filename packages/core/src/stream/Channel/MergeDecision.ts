import type { Effect } from "../../io/Effect"
import type { Exit } from "../../io/Exit"

export const MergeDecisionTypeId = Symbol.for(
  "@effect-ts/core/stream/Channel/MergeDecision"
)
export type MergeDecisionTypeId = typeof MergeDecisionTypeId

export const _R = Symbol.for("@effect-ts/core/stream/Channel/MergeDecision/_R")
export type _R = typeof _R

export const _E0 = Symbol.for("@effect-ts/core/stream/Channel/MergeDecision/_E0")
export type _E0 = typeof _E0

export const _Z0 = Symbol.for("@effect-ts/core/stream/Channel/MergeDecision/_Z0")
export type _Z0 = typeof _Z0

export const _E = Symbol.for("@effect-ts/core/stream/Channel/MergeDecision/_E")
export type _E = typeof _E

export const _Z = Symbol.for("@effect-ts/core/stream/Channel/MergeDecision/_Z")
export type _Z = typeof _Z

/**
 * @tsplus type ets/Channel/MergeDecision
 */
export interface MergeDecision<R, E0, Z0, E, Z> {
  readonly _mergeDecisionTypeId: typeof MergeDecisionTypeId

  readonly [_R]: (_: R) => void
  readonly [_E0]: (_: E0) => void
  readonly [_Z0]: (_: Z0) => void
  readonly [_E]: () => E
  readonly [_Z]: () => Z
}

/**
 * @tsplus type ets/Channel/MergeDecisionOps
 */
export interface MergeDecisionOps {}
export const MergeDecision: MergeDecisionOps = {}

export abstract class MergeDecisionBase<R, E0, Z0, E, Z>
  implements MergeDecision<R, E0, Z0, E, Z>
{
  readonly _mergeDecisionTypeId: typeof MergeDecisionTypeId = MergeDecisionTypeId;

  readonly [_R]: (_: R) => void;
  readonly [_E0]: (_: E0) => void;
  readonly [_Z0]: (_: Z0) => void;
  readonly [_E]: () => E;
  readonly [_Z]: () => Z
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
 * @tsplus static ets/Channel/MergeDecisionOps Done
 */
export function done<R, E, Z>(
  io: Effect<R, E, Z>
): MergeDecision<R, unknown, unknown, E, Z> {
  return new Done(io)
}

/**
 * @tsplus static ets/Channel/MergeDecisionOps Await
 */
export function _await<R, E0, Z0, E, Z>(
  f: (ex: Exit<E0, Z0>) => Effect<R, E, Z>
): MergeDecision<R, E0, Z0, E, Z> {
  return new Await(f)
}

/**
 * @tsplus static ets/Channel/MergeDecisionOps AwaitCont
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
