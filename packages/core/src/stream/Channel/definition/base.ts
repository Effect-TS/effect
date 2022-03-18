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

export const ChannelSym = Symbol.for("@effect-ts/core/stream/Channel")
export type ChannelSym = typeof ChannelSym

/**
 * A `Channel` is a nexus of I/O operations, which supports both reading and
 * writing. A channel may read values of type `InElem` and write values of type
 * `OutElem`. When the channel finishes, it yields a value of type `OutDone`. A
 * channel may fail with a value of type `OutErr`.
 *
 * Channels are the foundation of Streams: both streams and sinks are built on
 * channels. Most users shouldn't have to use channels directly, as streams and
 * sinks are much more convenient and cover all common use cases. However, when
 * adding new stream and sink operators, or doing something highly specialized,
 * it may be useful to use channels directly.
 *
 * Channels compose in a variety of ways:
 *
 *  - **Piping**: One channel can be piped to another channel, assuming the
 *    input type of the second is the same as the output type of the first.
 *  - **Sequencing**: The terminal value of one channel can be used to create
 *    another channel, and both the first channel and the function that makes
 *    the second channel can be composed into a channel.
 *  - **Concatenating**: The output of one channel can be used to create other
 *    channels, which are all concatenated together. The first channel and the
 *    function that makes the other channels can be composed into a channel.
 *
 * @tsplus type ets/Channel
 */
export interface Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  readonly [ChannelSym]: ChannelSym
  readonly [_Env]: (_: Env) => void
  readonly [_InErr]: (_: InErr) => void
  readonly [_InElem]: (_: InElem) => void
  readonly [_InDone]: (_: InDone) => void
  readonly [_OutErr]: () => OutErr
  readonly [_OutElem]: () => OutElem
  readonly [_OutDone]: () => OutDone
}

/**
 * @tsplus type ets/ChannelOps
 */
export interface ChannelOps {}
export const Channel: ChannelOps = {}

export abstract class ChannelBase<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  implements Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
{
  readonly [ChannelSym]: ChannelSym = ChannelSym;
  readonly [_Env]!: (_: Env) => void;
  readonly [_InErr]!: (_: InErr) => void;
  readonly [_InElem]!: (_: InElem) => void;
  readonly [_InDone]!: (_: InDone) => void;
  readonly [_OutErr]!: () => OutErr;
  readonly [_OutElem]!: () => OutElem;
  readonly [_OutDone]!: () => OutDone
}
