import type * as Channel from "../Channel"
import type * as Effect from "../Effect"
import type * as Effectable from "../Effectable"
import * as Equal from "../Equal"
import * as Hash from "../Hash"
import { pipeArguments } from "../Pipeable"
import type * as Sink from "../Sink"
import type * as Stream from "../Stream"
import * as Data from "./Data"
import * as OpCodes from "./opCodes/effect"

/** @internal */
export const EffectTypeId: Effect.EffectTypeId = Symbol.for("effect/Effect") as Effect.EffectTypeId

/** @internal */
export const StreamTypeId: Stream.StreamTypeId = Symbol.for("effect/Stream") as Stream.StreamTypeId

/** @internal */
export const SinkTypeId: Sink.SinkTypeId = Symbol.for("effect/Sink") as Sink.SinkTypeId

/** @internal */
export const ChannelTypeId: Channel.ChannelTypeId = Symbol.for("effect/Channel") as Channel.ChannelTypeId

/** @internal */
export const effectVariance = {
  _R: (_: never) => _,
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
export const sinkVariance = {
  _R: (_: never) => _,
  _E: (_: never) => _,
  _In: (_: unknown) => _,
  _L: (_: never) => _,
  _Z: (_: never) => _
}

/** @internal */
export const channelVariance = {
  _Env: (_: never) => _,
  _InErr: (_: unknown) => _,
  _InElem: (_: unknown) => _,
  _InDone: (_: unknown) => _,
  _OutErr: (_: never) => _,
  _OutElem: (_: never) => _,
  _OutDone: (_: never) => _
}

/** @internal */
export const EffectPrototype: Effect.Effect<never, never, never> = {
  [EffectTypeId]: effectVariance,
  [StreamTypeId]: effectVariance,
  [SinkTypeId]: sinkVariance,
  [ChannelTypeId]: channelVariance,
  [Equal.symbol](that: any) {
    return this === that
  },
  [Hash.symbol]() {
    return Hash.random(this)
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const CommitPrototype = {
  ...EffectPrototype,
  _op: OpCodes.OP_COMMIT
}

/** @internal */
export const StructuralCommitPrototype = {
  ...CommitPrototype,
  ...Data.Structural.prototype
}

/** @internal */
export const Base: Effectable.CommitPrimitive = (function() {
  function Base() {}
  Base.prototype = CommitPrototype
  return Base as any
})()

/** @internal */
export const StructuralBase: Effectable.CommitPrimitive = (function() {
  function Base() {}
  Base.prototype = StructuralCommitPrototype
  return Base as any
})()
