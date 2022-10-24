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
} from "@effect/core/stream/Channel/definition/symbols"

/**
 * @category symbol
 * @since 1.0.0
 */
export const ChannelSym = Symbol.for("@effect/core/stream/Channel")

/**
 * @category symbol
 * @since 1.0.0
 */
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
 * @tsplus type effect/core/stream/Channel
 * @category model
 * @since 1.0.0
 */
export interface Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  readonly [ChannelSym]: ChannelSym
  readonly [_Env]: () => Env
  readonly [_InErr]: (_: InErr) => void
  readonly [_InElem]: (_: InElem) => void
  readonly [_InDone]: (_: InDone) => void
  readonly [_OutErr]: () => OutErr
  readonly [_OutElem]: () => OutElem
  readonly [_OutDone]: () => OutDone
}

/**
 * @tsplus type effect/core/stream/Channel.Ops
 * @category model
 * @since 1.0.0
 */
export interface ChannelOps {
  $: ChannelAspects
}
export const Channel: ChannelOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stream/Channel.Aspects
 * @category model
 * @since 1.0.0
 */
export interface ChannelAspects {}

/**
 * @tsplus unify effect/core/stream/Channel
 */
export function unifyChannel<X extends Channel<any, any, any, any, any, any, any>>(
  self: X
): Channel<
  [X] extends [{ [_Env]: () => infer Env }] ? Env : never,
  [X] extends [{ [_InErr]: (_: infer InErr) => void }] ? InErr : never,
  [X] extends [{ [_InElem]: (_: infer InElem) => void }] ? InElem : never,
  [X] extends [{ [_InDone]: (_: infer InDone) => void }] ? InDone : never,
  [X] extends [{ [_OutErr]: () => infer OutErr }] ? OutErr : never,
  [X] extends [{ [_OutElem]: () => infer OutElem }] ? OutElem : never,
  [X] extends [{ [_OutDone]: () => infer OutDone }] ? OutDone : never
> {
  return self
}

/** @internal */
export abstract class ChannelBase<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  implements Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
{
  readonly [ChannelSym]: ChannelSym = ChannelSym
  readonly [_Env]!: () => Env
  readonly [_InErr]!: (_: InErr) => void
  readonly [_InElem]!: (_: InElem) => void
  readonly [_InDone]!: (_: InDone) => void
  readonly [_OutErr]!: () => OutErr
  readonly [_OutElem]!: () => OutElem
  readonly [_OutDone]!: () => OutDone
}
