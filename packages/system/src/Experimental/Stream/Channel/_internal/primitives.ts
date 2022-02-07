// ets_tracing: off

import "../../../../Operator/index.js"

import type * as Cause from "../../../../Cause/index.js"
import type * as T from "../../../../Effect/index.js"
import type * as Exit from "../../../../Exit/index.js"
import type { AsyncInputProducer } from "./producer.js"
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
} from "./symbols.js"

/**
 * A `Channel` is a nexus of I/O operations, which supports both reading and writing.
 * A channel may read values of type `InElem` and write values of type `OutElem`.
 * When the channel finishes, it yields a value of type `OutDone`. A channel may fail with
 * a value of type `OutErr`.
 *
 * Channels are the foundation of Streams: both streams and sinks are built on channels.
 * Most users shouldn't have to use channels directly, as streams and sinks are much more convenient
 * and cover all common use cases. However, when adding new stream and sink operators, or doing
 * something highly specialized, it may be useful to use channels directly.
 *
 * Channels compose in a variety of ways:
 *
 *  - Piping. One channel can be piped to another channel, assuming the input type of the second
 *    is the same as the output type of the first.
 *  - Sequencing. The terminal value of one channel can be used to create another channel, and
 *    both the first channel and the function that makes the second channel can be composed into a
 *    channel.
 *  - Concating. The output of one channel can be used to create other channels, which are all
 *    concatenated together. The first channel and the function that makes the other channels can
 *    be composed into a channel.
 */
export abstract class Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  readonly [_Env]!: (_: Env) => void;
  readonly [_InErr]!: (_: InErr) => void;
  readonly [_InElem]!: (_: InElem) => void;
  readonly [_InDone]!: (_: InDone) => void;
  readonly [_OutErr]!: () => OutErr;
  readonly [_OutElem]!: () => OutElem;
  readonly [_OutDone]!: () => OutDone;

  readonly [">>>"] = <Env2, OutErr2, OutElem2, OutDone2>(
    that: Channel<Env2, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>
  ): Channel<Env & Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2> =>
    new PipeTo<
      Env & Env2,
      InErr,
      InElem,
      InDone,
      OutErr2,
      OutElem2,
      OutDone2,
      OutErr,
      OutElem,
      OutDone
    >(
      () => this,
      () => that
    )
}

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
 * @ets_optimize remove
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

export const ContinuationKTypeId = Symbol()
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
      c: Cause.Cause<OutErr>
    ) => Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2>
  ) {
    super()
  }

  onExit(exit: Exit.Exit<OutErr, OutDone>) {
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

export const ContinuationFinalizerTypeId = Symbol()
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

  constructor(
    readonly finalizer: (e: Exit.Exit<OutErr, OutDone>) => T.RIO<Env, unknown>
  ) {
    super()
  }
}

/**
 * @ets_optimize remove
 */
export function concrete<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  _: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): asserts _ is
  | PipeTo<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, any, any, any>
  | Read<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, any, any>
  | Done<OutDone>
  | Halt<OutErr>
  | Effect<Env, OutErr, OutDone>
  | Emit<OutElem, OutDone>
  | ConcatAll<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, any, any, any>
  | Bridge<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  | Fold<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, any, any>
  | Provide<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  | BracketOut<Env, OutErr, OutElem, OutDone>
  | Ensuring<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  | EffectTotal<OutDone>
  | EffectSuspendTotal<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  //
}

export const PipeToTypeId: unique symbol = Symbol()
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
> extends Channel<Env, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2> {
  readonly _typeId: PipeToTypeId = PipeToTypeId
  constructor(
    readonly left: () => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    readonly right: () => Channel<
      Env,
      OutErr,
      OutElem,
      OutDone,
      OutErr2,
      OutElem2,
      OutDone2
    >
  ) {
    super()
  }
}

export const ReadTypeId: unique symbol = Symbol()
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
> extends Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2> {
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

export const DoneTypeId: unique symbol = Symbol()
export type DoneTypeId = typeof DoneTypeId

export class Done<OutDone> extends Channel<
  unknown,
  unknown,
  unknown,
  unknown,
  never,
  never,
  OutDone
> {
  readonly _typeId: DoneTypeId = DoneTypeId
  constructor(readonly terminal: () => OutDone) {
    super()
  }
}

export const HaltTypeId: unique symbol = Symbol()
export type HaltTypeId = typeof HaltTypeId

export class Halt<OutErr> extends Channel<
  unknown,
  unknown,
  unknown,
  unknown,
  OutErr,
  never,
  never
> {
  readonly _typeId: HaltTypeId = HaltTypeId
  constructor(readonly error: () => Cause.Cause<OutErr>) {
    super()
  }
}

export const EffectTypeId: unique symbol = Symbol()
export type EffectTypeId = typeof EffectTypeId

export class Effect<Env, OutErr, OutDone> extends Channel<
  Env,
  unknown,
  unknown,
  unknown,
  OutErr,
  never,
  OutDone
> {
  readonly _typeId: EffectTypeId = EffectTypeId
  constructor(readonly effect: T.Effect<Env, OutErr, OutDone>) {
    super()
  }
}

export const EmitTypeId: unique symbol = Symbol()
export type EmitTypeId = typeof EmitTypeId

export class Emit<OutElem, OutDone> extends Channel<
  unknown,
  unknown,
  unknown,
  unknown,
  never,
  OutElem,
  OutDone
> {
  readonly _typeId: EmitTypeId = EmitTypeId
  constructor(readonly out: () => OutElem) {
    super()
  }
}

export const EnsuringTypeId: unique symbol = Symbol()
export type EnsuringTypeId = typeof EnsuringTypeId

export class Ensuring<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
> extends Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  readonly _typeId: EnsuringTypeId = EnsuringTypeId
  constructor(
    readonly channel: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    readonly finalizer: (e: Exit.Exit<OutErr, OutDone>) => T.Effect<Env, never, unknown>
  ) {
    super()
  }
}

export const ConcatAllTypeId: unique symbol = Symbol()
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
> extends Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone3> {
  readonly _typeId: ConcatAllTypeId = ConcatAllTypeId
  constructor(
    readonly combineInners: (o: OutDone, o1: OutDone) => OutDone,
    readonly combineAll: (o: OutDone, o2: OutDone2) => OutDone3,
    readonly value: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>,
    readonly k: (
      o: OutElem
    ) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone>
  ) {
    super()
  }
}

export const FoldTypeId: unique symbol = Symbol()
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
> extends Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2> {
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

export const BridgeTypeId: unique symbol = Symbol()
export type BridgeTypeId = typeof BridgeTypeId

export class Bridge<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
> extends Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  readonly _typeId: BridgeTypeId = BridgeTypeId
  constructor(
    readonly input: AsyncInputProducer<InErr, InElem, InDone>,
    readonly channel: Channel<Env, unknown, unknown, unknown, OutErr, OutElem, OutDone>
  ) {
    super()
  }
}

export const BracketOutTypeId: unique symbol = Symbol()
export type BracketOutTypeId = typeof BracketOutTypeId

export class BracketOut<R, E, Z, OutDone> extends Channel<
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
    readonly acquire: T.Effect<R, E, Z>,
    readonly finalizer: (z: Z, e: Exit.Exit<unknown, unknown>) => T.RIO<R, unknown>
  ) {
    super()
  }
}

export const ProvideTypeId: unique symbol = Symbol()
export type ProvideTypeId = typeof ProvideTypeId

export class Provide<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
> extends Channel<unknown, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  readonly _typeId: ProvideTypeId = ProvideTypeId
  constructor(
    readonly env: Env,
    readonly channel: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) {
    super()
  }
}

export const EffectTotalTypeId: unique symbol = Symbol()
export type EffectTotalTypeId = typeof EffectTotalTypeId

export class EffectTotal<OutDone> extends Channel<
  unknown,
  unknown,
  unknown,
  unknown,
  never,
  never,
  OutDone
> {
  readonly _typeId: EffectTotalTypeId = EffectTotalTypeId
  constructor(readonly effect: () => OutDone) {
    super()
  }
}

export const EffectSuspendTotalTypeId: unique symbol = Symbol()
export type EffectSuspendTotalTypeId = typeof EffectSuspendTotalTypeId

export class EffectSuspendTotal<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
> extends Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  readonly _typeId: EffectSuspendTotalTypeId = EffectSuspendTotalTypeId
  constructor(
    readonly effect: () => Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) {
    super()
  }
}
