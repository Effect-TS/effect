import type * as Cause from "../../Cause"
import type * as Channel from "../../Channel"
import type * as Effect from "../../Effect"
import * as Exit from "../../Exit"
import * as OpCodes from "../opCodes/continuation"

/** @internal */
export const ContinuationTypeId = Symbol.for("effect/ChannelContinuation")

/** @internal */
export type ContinuationTypeId = typeof ContinuationTypeId

/** @internal */
export interface Continuation<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2>
  extends Continuation.Variance<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2>
{}

/** @internal */
export declare namespace Continuation {
  /** @internal */
  export interface Variance<Env, InErr, InElem, InDone, OutErr, OutErr2, OutElem, OutDone, OutDone2> {
    readonly [ContinuationTypeId]: {
      readonly _Env: (_: never) => Env
      readonly _InErr: (_: InErr) => void
      readonly _InElem: (_: InElem) => void
      readonly _InDone: (_: InDone) => void
      readonly _OutErr: (_: never) => OutErr
      readonly _OutDone: (_: never) => OutDone
      readonly _OutErr2: (_: never) => OutErr2
      readonly _OutElem: (_: never) => OutElem
      readonly _OutDone2: (_: never) => OutDone2
    }
  }
}

/** @internal */
export type Primitive = ErasedContinuationK | ErasedContinuationFinalizer

/** @internal */
export type ErasedContinuationK = ContinuationK<
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>

/** @internal */
export type ErasedContinuationFinalizer = ContinuationFinalizer<unknown, unknown, unknown>

/** @internal */
export interface ContinuationK<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr2,
  OutElem,
  OutDone,
  OutDone2
> extends
  Continuation<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    OutErr2,
    OutElem,
    OutDone,
    OutDone2
  >
{
  readonly _tag: OpCodes.OP_CONTINUATION_K
  readonly onSuccess: (
    o: OutDone
  ) => Channel.Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2>
  readonly onHalt: (
    c: Cause.Cause<OutErr>
  ) => Channel.Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2>
  readonly onExit: (
    exit: Exit.Exit<OutErr, OutDone>
  ) => Channel.Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2>
}

/** @internal */
export interface ContinuationFinalizer<Env, OutErr, OutDone> extends
  Continuation<
    Env,
    unknown,
    unknown,
    unknown,
    OutErr,
    never,
    never,
    OutDone,
    never
  >
{
  readonly _tag: OpCodes.OP_CONTINUATION_FINALIZER
  readonly finalizer: (exit: Exit.Exit<OutErr, OutDone>) => Effect.Effect<Env, never, unknown>
}

/** @internal */
const continuationVariance = {
  _Env: (_: never) => _,
  _InErr: (_: unknown) => _,
  _InElem: (_: unknown) => _,
  _InDone: (_: unknown) => _,
  _OutErr: (_: never) => _,
  _OutDone: (_: never) => _,
  _OutErr2: (_: never) => _,
  _OutElem: (_: never) => _,
  _OutDone2: (_: never) => _
}

/** @internal */
export class ContinuationKImpl<
  Env,
  Env2,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr2,
  OutElem,
  OutDone,
  OutDone2
> implements
  ContinuationK<
    Env | Env2,
    InErr,
    InElem,
    InDone,
    OutErr,
    OutErr2,
    OutElem,
    OutDone,
    OutDone2
  >
{
  readonly _tag = OpCodes.OP_CONTINUATION_K
  readonly [ContinuationTypeId] = continuationVariance
  constructor(
    readonly onSuccess: (
      o: OutDone
    ) => Channel.Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2>,
    readonly onHalt: (
      c: Cause.Cause<OutErr>
    ) => Channel.Channel<Env2, InErr, InElem, InDone, OutErr2, OutElem, OutDone2>
  ) {
  }
  onExit(
    exit: Exit.Exit<OutErr, OutDone>
  ): Channel.Channel<Env | Env2, InErr, InElem, InDone, OutErr2, OutElem, OutDone2> {
    return Exit.isFailure(exit) ? this.onHalt(exit.cause) : this.onSuccess(exit.value)
  }
}

/** @internal */
export class ContinuationFinalizerImpl<Env, OutErr, OutDone> implements ContinuationFinalizer<Env, OutErr, OutDone> {
  readonly _tag = OpCodes.OP_CONTINUATION_FINALIZER
  readonly [ContinuationTypeId] = continuationVariance
  constructor(readonly finalizer: (exit: Exit.Exit<OutErr, OutDone>) => Effect.Effect<Env, never, unknown>) {
  }
}
