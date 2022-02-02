// ets_tracing: off

import "../../../Operator/index.js"

import * as Cause from "../../../Cause/index.js"
import type * as T from "../../../Effect/index.js"
import type * as Exit from "../../../Exit/index.js"
import { identity } from "../../../Function/index.js"
import * as P from "./_internal/primitives.js"
import type * as PR from "./_internal/producer.js"

export type {
  SingleProducerAsyncInput,
  AsyncInputProducer,
  AsyncInputConsumer
} from "./_internal/producer.js"

export { makeSingleProducerAsyncInput } from "./_internal/producer.js"

export * from "./_internal/primitives.js"

/**
 * Pipe the output of a channel into the input of another
 */
export function pipeTo_<
  Env,
  Env2,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  OutErr2,
  OutElem2,
  OutDone2
>(
  left: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  right: P.Channel<Env2, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>
): P.Channel<Env & Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2> {
  return new P.PipeTo<
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
    () => left,
    () => right
  )
}

/**
 * Pipe the output of a channel into the input of another
 *
 * @ets_data_first pipeTo_
 */
export function pipeTo<Env2, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>(
  right: P.Channel<Env2, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>
): <Env, InErr, InElem, InDone>(
  left: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => P.Channel<Env & Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2> {
  return (left) => pipeTo_(left, right)
}

/**
 * Reads an input and continue exposing both full error cause and completion
 */
export function readWithCause<
  Env,
  Env1,
  Env2,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr1,
  OutErr2,
  OutElem,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone1,
  OutDone2
>(
  inp: (i: InElem) => P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  halt: (
    e: Cause.Cause<InErr>
  ) => P.Channel<Env1, InErr, InElem, InDone, OutErr1, OutElem1, OutDone1>,
  done: (
    d: InDone
  ) => P.Channel<Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2>
): P.Channel<
  Env & Env1 & Env2,
  InErr,
  InElem,
  InDone,
  OutErr | OutErr1 | OutErr2,
  OutElem | OutElem1 | OutElem2,
  OutDone | OutDone1 | OutDone2
> {
  return new P.Read<
    Env & Env1 & Env2,
    InErr,
    InElem,
    InDone,
    OutErr | OutErr1 | OutErr2,
    OutElem | OutElem1 | OutElem2,
    OutDone | OutDone1 | OutDone2,
    InErr,
    InDone
  >(
    inp,
    new P.ContinuationK<
      Env & Env1 & Env2,
      InErr,
      InElem,
      InDone,
      InErr,
      OutErr | OutErr1 | OutErr2,
      OutElem | OutElem1 | OutElem2,
      InDone,
      OutDone | OutDone1 | OutDone2
    >(done, halt)
  )
}

/**
 * End a channel with the specified result
 */
export function endWith<OutDone>(
  result: () => OutDone
): P.Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  return new P.Done(result)
}

/**
 * End a channel with the specified result
 */
export function end<OutDone>(
  result: OutDone
): P.Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  return new P.Done(() => result)
}

/**
 * Halt a channel with the specified cause
 */
export function failCauseWith<E>(
  result: () => Cause.Cause<E>
): P.Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new P.Halt(result)
}

/**
 * Halt a channel with the specified cause
 */
export function failCause<E>(
  result: Cause.Cause<E>
): P.Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new P.Halt(() => result)
}

/**
 * Halt a channel with the specified error
 */
export function failWith<E>(
  error: () => E
): P.Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new P.Halt(() => Cause.fail(error()))
}

/**
 * Halt a channel with the specified error
 */
export function fail<E>(
  error: E
): P.Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new P.Halt(() => Cause.fail(error))
}

/**
 * Halt a channel with the specified exception
 */
export function die(
  defect: unknown
): P.Channel<unknown, unknown, unknown, unknown, never, never, never> {
  return new P.Halt(() => Cause.die(defect))
}

/**
 * Halt a channel with the specified exception
 */
export function dieWith(
  defect: () => unknown
): P.Channel<unknown, unknown, unknown, unknown, never, never, never> {
  return new P.Halt(() => Cause.die(defect()))
}

/**
 * Writes an output to the channel
 */
export function writeWith<OutElem>(
  out: () => OutElem
): P.Channel<unknown, unknown, unknown, unknown, never, OutElem, void> {
  return new P.Emit(out)
}

/**
 * Writes an output to the channel
 */
export function write<OutElem>(
  out: OutElem
): P.Channel<unknown, unknown, unknown, unknown, never, OutElem, void> {
  return new P.Emit(() => out)
}

/**
 * Returns a new channel with an attached finalizer. The finalizer is guaranteed to be executed
 * so long as the channel begins execution (and regardless of whether or not it completes).
 */
export function ensuringWith_<
  Env,
  Env2,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  channel: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  finalizer: (e: Exit.Exit<OutErr, OutDone>) => T.Effect<Env2, never, unknown>
): P.Channel<Env & Env2, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new P.Ensuring<Env & Env2, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    channel,
    finalizer
  )
}

/**
 * Returns a new channel with an attached finalizer. The finalizer is guaranteed to be executed
 * so long as the channel begins execution (and regardless of whether or not it completes).
 *
 * @ets_data_first ensuringWith_
 */
export function ensuringWith<Env2, OutErr, OutDone>(
  finalizer: (e: Exit.Exit<OutErr, OutDone>) => T.Effect<Env2, never, unknown>
): <Env, InErr, InElem, InDone, OutElem>(
  channel: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => P.Channel<Env & Env2, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return (channel) => ensuringWith_(channel, finalizer)
}

/**
 * Returns a new channel whose outputs are fed to the specified factory function, which creates
 * new channels in response. These new channels are sequentially concatenated together, and all
 * their outputs appear as outputs of the newly returned channel. The provided merging function
 * is used to merge the terminal values of all channels into the single terminal value of the
 * returned channel.
 */
export function concatMapWith_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutElem2,
  OutDone,
  OutDone2,
  OutDone3,
  Env2,
  InErr2,
  InElem2,
  InDone2,
  OutErr2
>(
  self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>,
  f: (
    o: OutElem
  ) => P.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>,
  g: (o: OutDone, o1: OutDone) => OutDone,
  h: (o: OutDone, o2: OutDone2) => OutDone3
): P.Channel<
  Env & Env2,
  InErr & InErr2,
  InElem & InElem2,
  InDone & InDone2,
  OutErr | OutErr2,
  OutElem2,
  OutDone3
> {
  return new P.ConcatAll<
    Env & Env2,
    InErr & InErr2,
    InElem & InElem2,
    InDone & InDone2,
    OutErr | OutErr2,
    OutElem2,
    OutDone3,
    OutElem,
    OutDone,
    OutDone2
  >(g, h, self, f)
}

/**
 * Returns a new channel whose outputs are fed to the specified factory function, which creates
 * new channels in response. These new channels are sequentially concatenated together, and all
 * their outputs appear as outputs of the newly returned channel. The provided merging function
 * is used to merge the terminal values of all channels into the single terminal value of the
 * returned channel.
 *
 * @ets_data_first concatMapWith_
 */
export function concatMapWith<
  OutDone,
  OutElem,
  Env2,
  InErr2,
  InElem2,
  InDone2,
  OutErr2,
  OutElem2,
  OutDone2,
  OutDone3
>(
  f: (
    o: OutElem
  ) => P.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>,
  g: (o: OutDone, o1: OutDone) => OutDone,
  h: (o: OutDone, o2: OutDone2) => OutDone3
): <Env, InErr, InElem, InDone, OutErr>(
  self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>
) => P.Channel<
  Env & Env2,
  InErr & InErr2,
  InElem & InElem2,
  InDone & InDone2,
  OutErr | OutErr2,
  OutElem2,
  OutDone3
> {
  return (self) => concatMapWith_(self, f, g, h)
}

/**
 * Concat sequentially a channel of channels
 */
export function concatAllWith_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  OutDone2,
  OutDone3,
  Env2,
  InErr2,
  InElem2,
  InDone2,
  OutErr2
>(
  channels: P.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    P.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem, OutDone>,
    OutDone2
  >,
  f: (o: OutDone, o1: OutDone) => OutDone,
  g: (o: OutDone, o2: OutDone2) => OutDone3
): P.Channel<
  Env & Env2,
  InErr & InErr2,
  InElem & InElem2,
  InDone & InDone2,
  OutErr | OutErr2,
  OutElem,
  OutDone3
> {
  return new P.ConcatAll<
    Env & Env2,
    InErr & InErr2,
    InElem & InElem2,
    InDone & InDone2,
    OutErr | OutErr2,
    OutElem,
    OutDone3,
    P.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem, OutDone>,
    OutDone,
    OutDone2
  >(f, g, channels, identity)
}

/**
 * Concat sequentially a channel of channels
 *
 * @ets_data_first concatAllWith_
 */
export function concatAllWith<OutDone, OutDone2, OutDone3>(
  f: (o: OutDone, o1: OutDone) => OutDone,
  g: (o: OutDone, o2: OutDone2) => OutDone3
): <
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  Env2,
  InErr2,
  InElem2,
  InDone2,
  OutErr2
>(
  channels: P.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    P.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem, OutDone>,
    OutDone2
  >
) => P.Channel<
  Env & Env2,
  InErr & InErr2,
  InElem & InElem2,
  InDone & InDone2,
  OutErr | OutErr2,
  OutElem,
  OutDone3
> {
  return (channels) => concatAllWith_(channels, f, g)
}

/**
 * Fold the channel exposing success and full error cause
 */
export function foldCauseChannel_<
  Env,
  Env1,
  Env2,
  InErr,
  InErr1,
  InErr2,
  InElem,
  InElem1,
  InElem2,
  InDone,
  InDone1,
  InDone2,
  OutErr,
  OutErr2,
  OutErr3,
  OutElem,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone2,
  OutDone3
>(
  self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  onErr: (
    c: Cause.Cause<OutErr>
  ) => P.Channel<Env1, InErr1, InElem1, InDone1, OutErr2, OutElem1, OutDone2>,
  onSucc: (
    o: OutDone
  ) => P.Channel<Env2, InErr2, InElem2, InDone2, OutErr3, OutElem2, OutDone3>
): P.Channel<
  Env & Env1 & Env2,
  InErr & InErr1 & InErr2,
  InElem & InElem1 & InElem2,
  InDone & InDone1 & InDone2,
  OutErr2 | OutErr3,
  OutElem | OutElem1 | OutElem2,
  OutDone2 | OutDone3
> {
  return new P.Fold<
    Env & Env1 & Env2,
    InErr & InErr1 & InErr2,
    InElem & InElem1 & InElem2,
    InDone & InDone1 & InDone2,
    OutErr2 | OutErr3,
    OutElem | OutElem1 | OutElem2,
    OutDone2 | OutDone3,
    OutErr,
    OutDone
  >(
    self,
    new P.ContinuationK<
      Env & Env1 & Env2,
      InErr & InErr1 & InErr2,
      InElem & InElem1 & InElem2,
      InDone & InDone1 & InDone2,
      OutErr,
      OutErr2 | OutErr3,
      OutElem | OutElem1 | OutElem2,
      OutDone,
      OutDone2 | OutDone3
    >(onSucc, onErr)
  )
}

/**
 * Fold the channel exposing success and full error cause
 *
 * @ets_data_first foldCauseChannel_
 */
export function foldCauseChannel<
  Env1,
  Env2,
  InErr1,
  InErr2,
  InElem1,
  InElem2,
  InDone1,
  InDone2,
  OutErr,
  OutErr2,
  OutErr3,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone2,
  OutDone3
>(
  onErr: (
    c: Cause.Cause<OutErr>
  ) => P.Channel<Env1, InErr1, InElem1, InDone1, OutErr2, OutElem1, OutDone2>,
  onSucc: (
    o: OutDone
  ) => P.Channel<Env2, InErr2, InElem2, InDone2, OutErr3, OutElem2, OutDone3>
): <Env, InErr, InElem, InDone, OutElem>(
  self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => P.Channel<
  Env & Env1 & Env2,
  InErr & InErr1 & InErr2,
  InElem & InElem1 & InElem2,
  InDone & InDone1 & InDone2,
  OutErr2 | OutErr3,
  OutElem | OutElem1 | OutElem2,
  OutDone2 | OutDone3
> {
  return (self) => foldCauseChannel_(self, onErr, onSucc)
}

/**
 * Embed inputs from continuos pulling of a producer
 */
export function embedInput_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: P.Channel<Env, unknown, unknown, unknown, OutErr, OutElem, OutDone>,
  input: PR.AsyncInputProducer<InErr, InElem, InDone>
): P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new P.Bridge(input, self)
}

/**
 * Embed inputs from continuos pulling of a producer
 *
 * @ets_data_first embedInput_
 */
export function embedInput<InErr, InElem, InDone>(
  input: PR.AsyncInputProducer<InErr, InElem, InDone>
): <Env, OutErr, OutElem, OutDone>(
  self: P.Channel<Env, unknown, unknown, unknown, OutErr, OutElem, OutDone>
) => P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return (self) => embedInput_(self, input)
}

/**
 * Construct a resource Channel with Acquire / Release
 */
export function acquireReleaseOutExitWith_<R, R2, E, Z>(
  self: T.Effect<R, E, Z>,
  release: (z: Z, e: Exit.Exit<unknown, unknown>) => T.RIO<R2, unknown>
): P.Channel<R & R2, unknown, unknown, unknown, E, Z, void> {
  return new P.BracketOut<R & R2, E, Z, void>(self, release)
}

/**
 * Construct a resource Channel with Acquire / Release
 *
 * @ets_data_first acquireReleaseOutExitWith_
 */
export function acquireReleaseOutExitWith<R2, Z>(
  release: (z: Z, e: Exit.Exit<unknown, unknown>) => T.RIO<R2, unknown>
): <R, E>(
  self: T.Effect<R, E, Z>
) => P.Channel<R & R2, unknown, unknown, unknown, E, Z, void> {
  return (self) => acquireReleaseOutExitWith_(self, release)
}

/**
 * Provides the channel with its required environment, which eliminates
 * its dependency on `Env`.
 */
export function provideAll_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  env: Env
): P.Channel<unknown, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new P.Provide(env, self)
}

/**
 * Provides the channel with its required environment, which eliminates
 * its dependency on `Env`.
 *
 * @ets_data_first provideAll_
 */
export function provideAll<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  env: Env
): (
  self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => P.Channel<unknown, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return (self) => provideAll_(self, env)
}

/**
 * Returns a new channel, which sequentially combines this channel, together with the provided
 * factory function, which creates a second channel based on the terminal value of this channel.
 * The result is a channel that will first perform the functions of this channel, before
 * performing the functions of the created channel (including yielding its terminal value).
 */
export function chain_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr1,
  OutElem1,
  OutDone2
>(
  self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (
    d: OutDone
  ) => P.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>
): P.Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone2
> {
  return new P.Fold<
    Env & Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem | OutElem1,
    OutDone2,
    OutErr | OutErr1,
    OutDone
  >(self, new P.ContinuationK(f, failCause))
}

/**
 * Returns a new channel, which sequentially combines this channel, together with the provided
 * factory function, which creates a second channel based on the terminal value of this channel.
 * The result is a channel that will first perform the functions of this channel, before
 * performing the functions of the created channel (including yielding its terminal value).
 *
 * @ets_data_first chain_
 */
export function chain<
  OutDone,
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr1,
  OutElem1,
  OutDone2
>(
  f: (
    d: OutDone
  ) => P.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>
): <Env, InErr, InElem, InDone, OutErr, OutElem>(
  self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => P.Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone2
> {
  return (self) => chain_(self, f)
}

export function suspend<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  effect: () => P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new P.EffectSuspendTotal(effect)
}

/**
 * Use an effect to end a channel
 */
export function fromEffect<R, E, A>(
  self: T.Effect<R, E, A>
): P.Channel<R, unknown, unknown, unknown, E, never, A> {
  return new P.Effect(self)
}

export function succeedWith<OutDone>(
  effect: () => OutDone
): P.Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  return new P.EffectTotal(effect)
}

export function readOrFail<In, E>(
  e: E
): P.Channel<unknown, unknown, In, unknown, E, never, In> {
  return new P.Read<unknown, unknown, In, unknown, E, never, In, never, In>(
    (in_) => end(in_),
    new P.ContinuationK(
      (_) => fail(e),
      (_) => fail(e)
    )
  )
}

/**
 * Returns a new channel that is the same as this one, except if this channel errors for any
 * typed error, then the returned channel will switch over to using the fallback channel returned
 * by the specified error handler.
 */
export function catchAllCause_<
  Env,
  Env1,
  InErr,
  InErr1,
  InElem,
  InElem1,
  InDone,
  InDone1,
  OutErr,
  OutErr1,
  OutElem,
  OutElem1,
  OutDone,
  OutDone1
>(
  self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (
    cause: Cause.Cause<OutErr>
  ) => P.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): P.Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr1,
  OutElem | OutElem1,
  OutDone | OutDone1
> {
  return new P.Fold<
    Env & Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr1,
    OutElem | OutElem1,
    OutDone | OutDone1,
    OutErr,
    OutDone | OutDone1
  >(self, new P.ContinuationK((_) => end(_), f))
}

/**
 * Returns a new channel that is the same as this one, except if this channel errors for any
 * typed error, then the returned channel will switch over to using the fallback channel returned
 * by the specified error handler.
 *
 * @ets_data_first catchAllCause_
 */
export function catchAllCause<
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr,
  OutErr1,
  OutElem1,
  OutDone1
>(
  f: (
    cause: Cause.Cause<OutErr>
  ) => P.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => catchAllCause_(self, f)
}
