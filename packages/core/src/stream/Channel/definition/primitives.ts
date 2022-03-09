import type { Lazy } from "../../../data/Function"
import type { Cause } from "../../../io/Cause"
import type { Effect, RIO } from "../../../io/Effect"
import type { Exit } from "../../../io/Exit"
import type { ChildExecutorDecision } from "../ChildExecutorDecision"
import type { AsyncInputProducer } from "../SingleProducerAsyncInput"
import type { UpstreamPullRequest } from "../UpstreamPullRequest"
import type { UpstreamPullStrategy } from "../UpstreamPullStrategy"
import type { Channel } from "./base"
import { ChannelBase } from "./base"
import {
  _Env,
  _InDone,
  _InElem,
  _InErr,
  _OutDone,
  _OutDone2,
  _OutElem,
  _OutErr,
  _OutErr2
} from "./symbols"

// -----------------------------------------------------------------------------
// PipeTo
// -----------------------------------------------------------------------------

export const PipeToTypeId = Symbol.for("@effect-ts/core/stream/Channel/PipeTo")
export type PipeToTypeId = typeof PipeToTypeId

export class PipeTo<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr2,
  OutElem2,
  OutDone2,
  OutErr,
  OutElem,
  OutDone
> extends ChannelBase<Env, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2> {
  readonly _typeId: PipeToTypeId = PipeToTypeId
  constructor(
    readonly left: Lazy<Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>>,
    readonly right: Lazy<
      Channel<Env, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>
    >
  ) {
    super()
  }
}

// -----------------------------------------------------------------------------
// Read
// -----------------------------------------------------------------------------

export const ReadTypeId = Symbol.for("@effect-ts/core/stream/Channel/Read")
export type ReadTypeId = typeof ReadTypeId

export class Read<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr2,
  OutElem,
  OutDone2,
  OutErr,
  OutDone
> extends ChannelBase<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2> {
  readonly _typeId: ReadTypeId = ReadTypeId
  constructor(
    readonly more: (
      i: InElem
    ) => Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2>,
    readonly done: ContinuationK<
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
  ) {
    super()
  }
}

// -----------------------------------------------------------------------------
// SucceedNow
// -----------------------------------------------------------------------------

export const SucceedNowTypeId = Symbol.for("@effect-ts/core/stream/Channel/SucceedNow")
export type SucceedNowTypeId = typeof SucceedNowTypeId

export class SucceedNow<OutDone> extends ChannelBase<
  unknown,
  unknown,
  unknown,
  unknown,
  never,
  never,
  OutDone
> {
  readonly _typeId: SucceedNowTypeId = SucceedNowTypeId
  constructor(readonly terminal: OutDone) {
    super()
  }
}

// -----------------------------------------------------------------------------
// Fail
// -----------------------------------------------------------------------------

export const FailTypeId = Symbol.for("@effect-ts/core/stream/Channel/Fail")
export type FailTypeId = typeof FailTypeId

export class Fail<OutErr> extends ChannelBase<
  unknown,
  unknown,
  unknown,
  unknown,
  OutErr,
  never,
  never
> {
  readonly _typeId: FailTypeId = FailTypeId
  constructor(readonly error: Lazy<Cause<OutErr>>) {
    super()
  }
}

// -----------------------------------------------------------------------------
// FromEffect
// -----------------------------------------------------------------------------

export const FromEffectTypeId = Symbol.for("@effect-ts/core/stream/Channel/FromEffect")
export type FromEffectTypeId = typeof FromEffectTypeId

export class FromEffect<Env, OutErr, OutDone> extends ChannelBase<
  Env,
  unknown,
  unknown,
  unknown,
  OutErr,
  never,
  OutDone
> {
  readonly _typeId: FromEffectTypeId = FromEffectTypeId
  constructor(readonly effect: Lazy<Effect<Env, OutErr, OutDone>>) {
    super()
  }
}

// -----------------------------------------------------------------------------
// Emit
// -----------------------------------------------------------------------------

export const EmitTypeId = Symbol.for("@effect-ts/core/stream/Channel/Emit")
export type EmitTypeId = typeof EmitTypeId

export class Emit<OutElem, OutDone> extends ChannelBase<
  unknown,
  unknown,
  unknown,
  unknown,
  never,
  OutElem,
  OutDone
> {
  readonly _typeId: EmitTypeId = EmitTypeId
  constructor(readonly out: Lazy<OutElem>) {
    super()
  }
}

// -----------------------------------------------------------------------------
// Succeed
// -----------------------------------------------------------------------------

export const SucceedTypeId = Symbol.for("@effect-ts/core/stream/Channel/Succeed")
export type SucceedTypeId = typeof SucceedTypeId

export class Succeed<OutDone> extends ChannelBase<
  unknown,
  unknown,
  unknown,
  unknown,
  never,
  never,
  OutDone
> {
  readonly _typeId: SucceedTypeId = SucceedTypeId
  constructor(readonly effect: Lazy<OutDone>) {
    super()
  }
}

// -----------------------------------------------------------------------------
// Suspend
// -----------------------------------------------------------------------------

export const SuspendTypeId = Symbol.for("@effect-ts/core/stream/Channel/Suspend")
export type SuspendTypeId = typeof SuspendTypeId

export class Suspend<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
> extends ChannelBase<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  readonly _typeId: SuspendTypeId = SuspendTypeId
  constructor(
    readonly effect: Lazy<Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>>
  ) {
    super()
  }
}

// -----------------------------------------------------------------------------
// Ensuring
// -----------------------------------------------------------------------------

export const EnsuringTypeId = Symbol.for("@effect-ts/core/stream/Channel/Ensuring")
export type EnsuringTypeId = typeof EnsuringTypeId

export class Ensuring<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
> extends ChannelBase<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  readonly _typeId: EnsuringTypeId = EnsuringTypeId
  constructor(
    readonly channel: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    readonly finalizer: (exit: Exit<OutErr, OutDone>) => Effect<Env, never, unknown>
  ) {
    super()
  }
}

// -----------------------------------------------------------------------------
// ConcatAll
// -----------------------------------------------------------------------------

export const ConcatAllTypeId = Symbol.for("@effect-ts/core/stream/Channel/ConcatAll")
export type ConcatAllTypeId = typeof ConcatAllTypeId

export class ConcatAll<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem2,
  OutDone3,
  OutElem,
  OutDone,
  OutDone2
> extends ChannelBase<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone3> {
  readonly _typeId: ConcatAllTypeId = ConcatAllTypeId
  constructor(
    readonly combineInners: (x: OutDone, y: OutDone) => OutDone,
    readonly combineAll: (x: OutDone, y: OutDone2) => OutDone3,
    readonly onPull: (
      pr: UpstreamPullRequest<OutElem>
    ) => UpstreamPullStrategy<OutElem2>,
    readonly onEmit: (o: OutElem2) => ChildExecutorDecision,
    readonly value: Lazy<
      Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>
    >,
    readonly k: (
      o: OutElem
    ) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone>
  ) {
    super()
  }
}

// -----------------------------------------------------------------------------
// ConcatAll
// -----------------------------------------------------------------------------

export const FoldTypeId = Symbol.for("@effect-ts/core/stream/Channel/Fold")
export type FoldTypeId = typeof FoldTypeId

export class Fold<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr2,
  OutElem,
  OutDone2,
  OutErr,
  OutDone
> extends ChannelBase<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2> {
  readonly _typeId: FoldTypeId = FoldTypeId
  constructor(
    readonly value: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    readonly k: ContinuationK<
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
  ) {
    super()
  }
}

// -----------------------------------------------------------------------------
// Bridge
// -----------------------------------------------------------------------------

export const BridgeTypeId = Symbol.for("@effect-ts/core/stream/Channel/Bridge")
export type BridgeTypeId = typeof BridgeTypeId

export class Bridge<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
> extends ChannelBase<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  readonly _typeId: BridgeTypeId = BridgeTypeId
  constructor(
    readonly input: AsyncInputProducer<InErr, InElem, InDone>,
    readonly channel: Channel<Env, unknown, unknown, unknown, OutErr, OutElem, OutDone>
  ) {
    super()
  }
}

// -----------------------------------------------------------------------------
// BracketOut
// -----------------------------------------------------------------------------

export const BracketOutTypeId = Symbol.for("@effect-ts/core/stream/Channel/BracketOut")
export type BracketOutTypeId = typeof BracketOutTypeId

export class BracketOut<R, E, Z, OutDone> extends ChannelBase<
  R,
  unknown,
  unknown,
  unknown,
  E,
  Z,
  OutDone
> {
  readonly _typeId: BracketOutTypeId = BracketOutTypeId
  constructor(
    readonly acquire: Lazy<Effect<R, E, Z>>,
    readonly finalizer: (z: Z, exit: Exit<unknown, unknown>) => RIO<R, unknown>
  ) {
    super()
  }
}

// -----------------------------------------------------------------------------
// BracketOut
// -----------------------------------------------------------------------------

export const ProvideTypeId = Symbol.for("@effect-ts/core/stream/Channel/Provide")
export type ProvideTypeId = typeof ProvideTypeId

export class Provide<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
> extends ChannelBase<unknown, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  readonly _typeId: ProvideTypeId = ProvideTypeId
  constructor(
    readonly env: Lazy<Env>,
    readonly channel: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) {
    super()
  }
}

/**
 * @tsplus macro remove
 */
export function concrete<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  _: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): asserts _ is
  | PipeTo<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, any, any, any>
  | Read<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, any, any>
  | SucceedNow<OutDone>
  | Fail<OutErr>
  | FromEffect<Env, OutErr, OutDone>
  | Emit<OutElem, OutDone>
  | Succeed<OutDone>
  | Suspend<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  | Ensuring<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  | ConcatAll<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, any, any, any>
  | Fold<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, any, any>
  | Bridge<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  | BracketOut<Env, OutErr, OutElem, OutDone>
  | Provide<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  //
}

// -----------------------------------------------------------------------------
// Continuation
// -----------------------------------------------------------------------------

export abstract class Continuation<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr2,
  OutElem,
  OutDone,
  OutDone2
> {
  readonly [_Env]: (_: Env) => void;
  readonly [_InErr]: (_: InErr) => void;
  readonly [_InElem]: (_: InElem) => void;
  readonly [_InDone]: (_: InDone) => void;
  readonly [_OutErr]: (_: OutErr) => OutErr;
  readonly [_OutDone]: (_: OutDone) => OutDone;
  readonly [_OutErr2]: () => OutErr2;
  readonly [_OutElem]: () => OutElem;
  readonly [_OutDone2]: () => OutDone2
}

/**
 * @tsplus macro remove
 */
export function concreteContinuation<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr2,
  OutElem,
  OutDone,
  OutDone2
>(
  _: Continuation<
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
): asserts _ is
  | ContinuationK<
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
  | ContinuationFinalizer<Env, OutErr, OutDone> {
  //
}

export const ContinuationKTypeId = Symbol.for(
  "@effect-ts/core/stream/Channel/ContinuationK"
)
export type ContinuationKTypeId = typeof ContinuationKTypeId

export class ContinuationK<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr2,
  OutElem,
  OutDone,
  OutDone2
> extends Continuation<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr2,
  OutElem,
  OutDone,
  OutDone2
> {
  readonly _typeId: ContinuationKTypeId = ContinuationKTypeId

  constructor(
    readonly onSuccess: (
      o: OutDone
    ) => Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2>,
    readonly onHalt: (
      c: Cause<OutErr>
    ) => Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2>
  ) {
    super()
  }

  onExit(
    exit: Exit<OutErr, OutDone>
  ): Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2> {
    switch (exit._tag) {
      case "Failure": {
        return this.onHalt(exit.cause)
      }
      case "Success": {
        return this.onSuccess(exit.value)
      }
    }
  }
}

export const ContinuationFinalizerTypeId = Symbol.for(
  "@effect-ts/core/stream/Channel/ContinuationFinalizer"
)
export type ContinuationFinalizerTypeId = typeof ContinuationFinalizerTypeId

export class ContinuationFinalizer<Env, OutErr, OutDone> extends Continuation<
  Env,
  unknown,
  unknown,
  unknown,
  OutErr,
  never,
  never,
  OutDone,
  never
> {
  readonly _typeId: ContinuationFinalizerTypeId = ContinuationFinalizerTypeId

  constructor(readonly finalizer: (exit: Exit<OutErr, OutDone>) => RIO<Env, unknown>) {
    super()
  }
}
