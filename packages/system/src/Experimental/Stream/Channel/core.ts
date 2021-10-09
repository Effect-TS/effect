// ets_tracing: off

import "../../../Operator"

import * as Cause from "../../../Cause"
import * as Tp from "../../../Collections/Immutable/Tuple"
import * as T from "../../../Effect"
import * as E from "../../../Either"
import type * as Exit from "../../../Exit"
import { identity } from "../../../Function"
import type * as M from "../../../Managed"
import * as ReleaseMap from "../../../Managed/ReleaseMap"
import * as P from "./_internal/primitives"
import {
  BracketOut,
  Bridge,
  ConcatAll,
  Done,
  Emit,
  Ensuring,
  Fold,
  Halt,
  PipeTo,
  Provide,
  Read
} from "./_internal/primitives"
import type { AsyncInputProducer } from "./_internal/producer"

export type { Channel } from "./_internal/primitives"
export type {
  SingleProducerAsyncInput,
  makeSingleProducerAsyncInput
} from "./_internal/producer"

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
  return new PipeTo<
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
  return new Read<
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
 * Reads an input and continue exposing both error and completion
 */
export function readWith<
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
  error: (
    e: InErr
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
  return readWithCause(
    inp,
    (c) => E.fold_(Cause.failureOrCause(c), error, failCause),
    done
  )
}

/**
 * End a channel with the specified result
 */
export function endWith<OutDone>(
  result: () => OutDone
): P.Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  return new Done(result)
}

/**
 * End a channel with the specified result
 */
export function end<OutDone>(
  result: OutDone
): P.Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  return new Done(() => result)
}

/**
 * Halt a channel with the specified cause
 */
export function failCauseWith<E>(
  result: () => Cause.Cause<E>
): P.Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new Halt(result)
}

/**
 * Halt a channel with the specified cause
 */
export function failCause<E>(
  result: Cause.Cause<E>
): P.Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new Halt(() => result)
}

/**
 * Halt a channel with the specified error
 */
export function failWith<E>(
  error: () => E
): P.Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new Halt(() => Cause.fail(error()))
}

/**
 * Halt a channel with the specified error
 */
export function fail<E>(
  error: E
): P.Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new Halt(() => Cause.fail(error))
}

/**
 * Halt a channel with the specified exception
 */
export function die(
  defect: unknown
): P.Channel<unknown, unknown, unknown, unknown, never, never, never> {
  return new Halt(() => Cause.die(defect))
}

/**
 * Halt a channel with the specified exception
 */
export function dieWith(
  defect: () => unknown
): P.Channel<unknown, unknown, unknown, unknown, never, never, never> {
  return new Halt(() => Cause.die(defect()))
}

/**
 * Writes an output to the channel
 */
export function writeWith<OutElem>(
  out: () => OutElem
): P.Channel<unknown, unknown, unknown, unknown, never, OutElem, void> {
  return new Emit(out)
}

/**
 * Writes an output to the channel
 */
export function write<OutElem>(
  out: OutElem
): P.Channel<unknown, unknown, unknown, unknown, never, OutElem, void> {
  return new Emit(() => out)
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
  return new Ensuring<Env & Env2, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
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
  return new ConcatAll<
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
  return new ConcatAll<
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
 * Returns a new channel whose outputs are fed to the specified factory function, which creates
 * new channels in response. These new channels are sequentially concatenated together, and all
 * their outputs appear as outputs of the newly returned channel.
 */
export function concatMap_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutElem2,
  OutDone,
  OutDone2,
  Env2,
  InErr2,
  InElem2,
  InDone2,
  OutErr2
>(
  self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>,
  f: (
    o: OutElem
  ) => P.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>
): P.Channel<
  Env & Env2,
  InErr & InErr2,
  InElem & InElem2,
  InDone & InDone2,
  OutErr | OutErr2,
  OutElem2,
  unknown
> {
  return concatMapWith_(
    self,
    f,
    () => void 0,
    () => void 0
  )
}

/**
 * Returns a new channel whose outputs are fed to the specified factory function, which creates
 * new channels in response. These new channels are sequentially concatenated together, and all
 * their outputs appear as outputs of the newly returned channel.
 *
 * @ets_data_first concatMap_
 */
export function concatMap<
  OutElem,
  OutElem2,
  OutDone,
  Env2,
  InErr2,
  InElem2,
  InDone2,
  OutErr2
>(
  f: (
    o: OutElem
  ) => P.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>
): <Env, InErr, InElem, InDone, OutErr, OutDone2>(
  self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>
) => P.Channel<
  Env & Env2,
  InErr & InErr2,
  InElem & InElem2,
  InDone & InDone2,
  OutErr | OutErr2,
  OutElem2,
  unknown
> {
  return (self) => concatMap_(self, f)
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
  return new Fold<
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
  input: AsyncInputProducer<InErr, InElem, InDone>
): P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new Bridge(input, self)
}

/**
 * Embed inputs from continuos pulling of a producer
 *
 * @ets_data_first embedInput_
 */
export function embedInput<InErr, InElem, InDone>(
  input: AsyncInputProducer<InErr, InElem, InDone>
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
  return new BracketOut<R & R2, E, Z, void>(self, release)
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
  return new Provide(env, self)
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

/**
 * Returns a new channel which reads all the elements from upstream's output channel
 * and ignores them, then terminates with the upstream result value.
 */
export function drain<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): P.Channel<Env, InErr, InElem, InDone, OutErr, never, OutDone> {
  const drainer: P.Channel<Env, OutErr, OutElem, OutDone, OutErr, never, OutDone> =
    readWithCause((_) => drainer, failCause, end)
  return self[">>>"](drainer)
}

/**
 * Use an effect to end a channel
 */
export function fromEffect<R, E, A>(
  self: T.Effect<R, E, A>
): P.Channel<R, unknown, unknown, unknown, E, never, A> {
  return new P.Effect(self)
}

/**
 * Use a managed to emit an output element
 */
export function managedOut<R, E, A>(
  self: M.Managed<R, E, A>
): P.Channel<R, unknown, unknown, unknown, E, A, unknown> {
  return concatMap_(
    acquireReleaseOutExitWith_(ReleaseMap.makeReleaseMap, (rm, ex) =>
      ReleaseMap.releaseAll(ex, T.sequential)(rm)
    ),
    (rm) =>
      chain_(
        fromEffect(
          T.map_(
            T.provideSome_(self.effect, (r: R) => Tp.tuple(r, rm)),
            Tp.get(1)
          )
        ),
        write
      )
  )
}

/**
 * Returns a new channel, which flattens the terminal value of this channel. This function may
 * only be called if the terminal value of this channel is another channel of compatible types.
 */
export function flatten<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr1,
  OutElem1,
  OutDone2
>(
  self: P.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    OutElem,
    P.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>
  >
): P.Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone2
> {
  return chain_(self, identity)
}

/**
 * Makes a channel from an effect that returns a channel in case of success
 */
export function unwrap<R, E, Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: T.Effect<R, E, P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>>
): P.Channel<R & Env, InErr, InElem, InDone, E | OutErr, OutElem, OutDone> {
  return flatten(fromEffect(self))
}

/**
 * Makes a channel from a managed that returns a channel in case of success
 */
export function unwrapManaged<
  R,
  E,
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  self: M.Managed<R, E, P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>>
): P.Channel<R & Env, InErr, InElem, InDone, E | OutErr, OutElem, OutDone> {
  return concatAllWith_(managedOut(self), identity, identity)
}

/**
 * Unit channel
 */
export const unit: P.Channel<unknown, unknown, unknown, unknown, never, never, void> =
  end(void 0)

export function succeedWith<OutDone>(
  effect: () => OutDone
): P.Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  return new P.EffectTotal(effect)
}

export function suspend<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  effect: () => P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new P.EffectSuspendTotal(effect)
}
