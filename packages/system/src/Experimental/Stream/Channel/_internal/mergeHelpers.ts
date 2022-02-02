// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import type * as E from "../../../../Either/index.js"
import type * as Ex from "../../../../Exit/index.js"
import type * as F from "../../../../Fiber/index.js"

export const BothRunningTypeId = Symbol()
export class BothRunning<_Env, Err, Err1, _Err2, Elem, Done, Done1, _Done2> {
  readonly _typeId: typeof BothRunningTypeId = BothRunningTypeId

  constructor(
    readonly left: F.Fiber<Err, E.Either<Done, Elem>>,
    readonly right: F.Fiber<Err1, E.Either<Done1, Elem>>
  ) {}
}

export const LeftDoneTypeId = Symbol()
export class LeftDone<Env, _Err, Err1, Err2, _Elem, _Done, Done1, Done2> {
  readonly _typeId: typeof LeftDoneTypeId = LeftDoneTypeId

  constructor(readonly f: (ex: Ex.Exit<Err1, Done1>) => T.Effect<Env, Err2, Done2>) {}
}

export const RightDoneTypeId = Symbol()
export class RightDone<Env, Err, _Err1, Err2, _Elem, Done, _Done1, Done2> {
  readonly _typeId: typeof RightDoneTypeId = RightDoneTypeId

  constructor(readonly f: (ex: Ex.Exit<Err, Done>) => T.Effect<Env, Err2, Done2>) {}
}

export type MergeState<Env, Err, Err1, Err2, Elem, Done, Done1, Done2> =
  | BothRunning<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
  | LeftDone<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
  | RightDone<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>

export const _R = "_R" as const
export const _E0 = "_E0" as const
export const _Z0 = "_Z0" as const
export const _E = "_E" as const
export const _Z = "_Z" as const

export const MergeDecisionTypeId = Symbol()
export abstract class MergeDecision<R, E0, Z0, E, Z> {
  readonly _mergeDecisionTypeId: typeof MergeDecisionTypeId = MergeDecisionTypeId;

  readonly [_R]: (_: R) => void;
  readonly [_E0]: (_: E0) => void;
  readonly [_Z0]: (_: Z0) => void;
  readonly [_E]: () => E;
  readonly [_Z]: () => Z
}

export function concrete<R, E0, Z0, E, Z>(
  decision: MergeDecision<R, E0, Z0, E, Z>
): asserts decision is Done<R, E, Z> | Await<R, E0, Z0, E, Z> {
  //
}

export const DoneTypeId = Symbol()
export class Done<R, E, Z> extends MergeDecision<R, unknown, unknown, E, Z> {
  readonly _typeId: typeof DoneTypeId = DoneTypeId

  constructor(readonly io: T.Effect<R, E, Z>) {
    super()
  }
}
export const AwaitTypeId = Symbol()
export class Await<R, E0, Z0, E, Z> extends MergeDecision<R, E0, Z0, E, Z> {
  readonly _typeId: typeof AwaitTypeId = AwaitTypeId

  constructor(readonly f: (ex: Ex.Exit<E0, Z0>) => T.Effect<R, E, Z>) {
    super()
  }
}

export function done<R, E, Z>(
  io: T.Effect<R, E, Z>
): MergeDecision<R, unknown, unknown, E, Z> {
  return new Done(io)
}

export function await_<R, E0, Z0, E, Z>(
  f: (ex: Ex.Exit<E0, Z0>) => T.Effect<R, E, Z>
): MergeDecision<R, E0, Z0, E, Z> {
  return new Await(f)
}

export function awaitConst<R, E, Z>(
  io: T.Effect<R, E, Z>
): MergeDecision<R, unknown, unknown, E, Z> {
  return new Await((_) => io)
}
