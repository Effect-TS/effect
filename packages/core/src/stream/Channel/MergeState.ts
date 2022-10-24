import type { Either } from "@fp-ts/data/Either"

/**
 * @tsplus type effect/core/stream/Channel/MergeState
 * @category model
 * @since 1.0.0
 */
export type MergeState<Env, Err, Err1, Err2, Elem, Done, Done1, Done2> =
  | BothRunning<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
  | LeftDone<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
  | RightDone<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>

/**
 * @category model
 * @since 1.0.0
 */
export class BothRunning<_Env, Err, Err1, _Err2, Elem, Done, Done1, _Done2> {
  readonly _tag = "BothRunning"

  constructor(
    readonly left: Fiber<Err, Either<Done, Elem>>,
    readonly right: Fiber<Err1, Either<Done1, Elem>>
  ) {}
}

/**
 * @category model
 * @since 1.0.0
 */
export class LeftDone<Env, _Err, Err1, Err2, _Elem, _Done, Done1, Done2> {
  readonly _tag = "LeftDone"

  constructor(readonly f: (exit: Exit<Err1, Done1>) => Effect<Env, Err2, Done2>) {}
}

/**
 * @category model
 * @since 1.0.0
 */
export class RightDone<Env, Err, _Err1, Err2, _Elem, Done, _Done1, Done2> {
  readonly _tag = "RightDone"

  constructor(readonly f: (ex: Exit<Err, Done>) => Effect<Env, Err2, Done2>) {}
}

/**
 * @tsplus type effect/core/stream/Channel/MergeState.Ops
 * @category model
 * @since 1.0.0
 */
export interface MergeStateOps {}
export const MergeState: MergeStateOps = {}

/**
 * @tsplus static effect/core/stream/Channel/MergeState.Ops BothRunning
 * @category constructors
 * @since 1.0.0
 */
export function bothRunning<_Env, Err, Err1, _Err2, Elem, Done, Done1, _Done2>(
  left: Fiber<Err, Either<Done, Elem>>,
  right: Fiber<Err1, Either<Done1, Elem>>
): MergeState<_Env, Err, Err1, _Err2, Elem, Done, Done1, _Done2> {
  return new BothRunning(left, right)
}

/**
 * @tsplus static effect/core/stream/Channel/MergeState.Ops LeftDone
 * @category constructors
 * @since 1.0.0
 */
export function leftDone<Env, _Err, Err1, Err2, _Elem, _Done, Done1, Done2>(
  f: (exit: Exit<Err1, Done1>) => Effect<Env, Err2, Done2>
): MergeState<Env, _Err, Err1, Err2, _Elem, _Done, Done1, Done2> {
  return new LeftDone(f)
}

/**
 * @tsplus static effect/core/stream/Channel/MergeState.Ops RightDone
 * @category constructors
 * @since 1.0.0
 */
export function rightDone<Env, Err, _Err1, Err2, _Elem, Done, _Done1, Done2>(
  f: (ex: Exit<Err, Done>) => Effect<Env, Err2, Done2>
): MergeState<Env, Err, _Err1, Err2, _Elem, Done, _Done1, Done2> {
  return new RightDone(f)
}
