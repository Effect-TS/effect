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
  readonly _tag = "PipeTo"
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
  readonly _tag = "Read"
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

export class SucceedNow<OutDone> extends ChannelBase<
  unknown,
  unknown,
  unknown,
  unknown,
  never,
  never,
  OutDone
> {
  readonly _tag = "SucceedNow"
  constructor(readonly terminal: OutDone) {
    super()
  }
}

// -----------------------------------------------------------------------------
// Fail
// -----------------------------------------------------------------------------

export class Fail<OutErr> extends ChannelBase<
  unknown,
  unknown,
  unknown,
  unknown,
  OutErr,
  never,
  never
> {
  readonly _tag = "Fail"
  constructor(readonly error: Lazy<Cause<OutErr>>) {
    super()
  }
}

// -----------------------------------------------------------------------------
// FromEffect
// -----------------------------------------------------------------------------

export class FromEffect<Env, OutErr, OutDone> extends ChannelBase<
  Env,
  unknown,
  unknown,
  unknown,
  OutErr,
  never,
  OutDone
> {
  readonly _tag = "FromEffect"
  constructor(readonly effect: Lazy<Effect<Env, OutErr, OutDone>>) {
    super()
  }
}

// -----------------------------------------------------------------------------
// Emit
// -----------------------------------------------------------------------------

export class Emit<OutElem, OutDone> extends ChannelBase<
  unknown,
  unknown,
  unknown,
  unknown,
  never,
  OutElem,
  OutDone
> {
  readonly _tag = "Emit"
  constructor(readonly out: Lazy<OutElem>) {
    super()
  }
}

// -----------------------------------------------------------------------------
// Succeed
// -----------------------------------------------------------------------------

export class Succeed<OutDone> extends ChannelBase<
  unknown,
  unknown,
  unknown,
  unknown,
  never,
  never,
  OutDone
> {
  readonly _tag = "Succeed"
  constructor(readonly effect: Lazy<OutDone>) {
    super()
  }
}

// -----------------------------------------------------------------------------
// Suspend
// -----------------------------------------------------------------------------

export class Suspend<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
> extends ChannelBase<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  readonly _tag = "Suspend"
  constructor(
    readonly effect: Lazy<Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>>
  ) {
    super()
  }
}

// -----------------------------------------------------------------------------
// Ensuring
// -----------------------------------------------------------------------------

export class Ensuring<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
> extends ChannelBase<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  readonly _tag = "Ensuring"
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
  readonly _tag = "ConcatAll"
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
// Fold
// -----------------------------------------------------------------------------

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
  readonly _tag = "Fold"
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

export class Bridge<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
> extends ChannelBase<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  readonly _tag = "Bridge"
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

export class BracketOut<R, E, Z, OutDone> extends ChannelBase<
  R,
  unknown,
  unknown,
  unknown,
  E,
  Z,
  OutDone
> {
  readonly _tag = "BracketOut"
  constructor(
    readonly acquire: Lazy<Effect<R, E, Z>>,
    readonly finalizer: (z: Z, exit: Exit<unknown, unknown>) => RIO<R, unknown>
  ) {
    super()
  }
}

// -----------------------------------------------------------------------------
// Provide
// -----------------------------------------------------------------------------

export class Provide<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
> extends ChannelBase<unknown, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  readonly _tag = "Provide"
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
  readonly [_Env]!: (_: Env) => void;
  readonly [_InErr]!: (_: InErr) => void;
  readonly [_InElem]!: (_: InElem) => void;
  readonly [_InDone]!: (_: InDone) => void;
  readonly [_OutErr]!: (_: OutErr) => OutErr;
  readonly [_OutDone]!: (_: OutDone) => OutDone;
  readonly [_OutErr2]!: () => OutErr2;
  readonly [_OutElem]!: () => OutElem;
  readonly [_OutDone2]!: () => OutDone2
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
  readonly _tag = "ContinuationK"

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
  readonly _tag = "ContinuationFinalizer"

  constructor(readonly finalizer: (exit: Exit<OutErr, OutDone>) => RIO<Env, unknown>) {
    super()
  }
}
