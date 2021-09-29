// ets_tracing: off

import "../../../Operator"

import * as Cause from "../../../Cause"
import * as AR from "../../../Collections/Immutable/Array"
import * as A from "../../../Collections/Immutable/Chunk"
import * as Tp from "../../../Collections/Immutable/Tuple"
import * as T from "../../../Effect"
import { sequential } from "../../../Effect"
import * as E from "../../../Either"
import * as Ex from "../../../Exit"
import * as F from "../../../Fiber"
import type { Predicate } from "../../../Function"
import { pipe } from "../../../Function"
import * as H from "../../../Hub"
import * as M from "../../../Managed"
import * as RM from "../../../Managed/ReleaseMap"
import * as O from "../../../Option"
import * as PR from "../../../Promise"
import * as Q from "../../../Queue"
import * as Ref from "../../../Ref"
import * as SM from "../../../Semaphore"
import type { ChannelState } from "./_internal/executor"
import {
  ChannelExecutor,
  ChannelStateDoneTypeId,
  ChannelStateEffectTypeId,
  ChannelStateEmitTypeId
} from "./_internal/executor"
import * as MH from "./_internal/mergeHelpers"
import * as P from "./_internal/primitives"
import type { AsyncInputConsumer } from "./_internal/producer"
import { makeSingleProducerAsyncInput } from "./_internal/producer"
import * as C from "./core"

/**
 * Returns a new channel that is the same as this one, except the terminal value of the channel
 * is the specified constant value.
 *
 * This method produces the same result as mapping this channel to the specified constant value.
 */
export function as_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutDone2>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  z2: OutDone2
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2> {
  return map_(self, (_) => z2)
}

/**
 * Returns a new channel that is the same as this one, except the terminal value of the channel
 * is the specified constant value.
 *
 * This method produces the same result as mapping this channel to the specified constant value.
 *
 * @ets_data_first as_
 */
export function as<OutDone2>(z2: OutDone2) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => as_(self, z2)
}

/**
 * Returns a new channel that is the same as this one, except if this channel errors for any
 * typed error, then the returned channel will switch over to using the fallback channel returned
 * by the specified error handler.
 */
export function catchAll_<
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
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (
    error: OutErr
  ) => C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): C.Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone | OutDone1
> {
  return catchAllCause_(self, (cause) =>
    E.fold_(
      Cause.failureOrCause(cause),
      (l) => f(l),
      (r) => C.failCause(r)
    )
  )
}

/**
 * Returns a new channel that is the same as this one, except if this channel errors for any
 * typed error, then the returned channel will switch over to using the fallback channel returned
 * by the specified error handler.
 *
 * @ets_data_first catchAll_
 */
export function catchAll<
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
    error: OutErr
  ) => C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => catchAll_(self, f)
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
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (
    cause: Cause.Cause<OutErr>
  ) => C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): C.Channel<
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
  >(self, new P.ContinuationK((_) => C.end(_), f))
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
  ) => C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => catchAllCause_(self, f)
}

/**
 * Returns a new channel, which is the same as this one, except its outputs are filtered and
 * transformed by the specified partial function.
 */
export function collect_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutElem2,
  OutDone
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (o: OutElem) => O.Option<OutElem2>
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone> {
  const collector: C.Channel<Env, OutErr, OutElem, OutDone, OutErr, OutElem2, OutDone> =
    C.readWith(
      (o) =>
        O.fold_(
          f(o),
          () => collector,
          (out2) => zipRight_(C.write(out2), collector)
        ),
      (e) => C.fail(e),
      (z) => C.end(z)
    )

  return C.pipeTo_(self, collector)
}

/**
 * Returns a new channel, which is the same as this one, except its outputs are filtered and
 * transformed by the specified partial function.
 *
 * @ets_data_first collect_
 */
export function collect<OutElem, OutElem2>(f: (o: OutElem) => O.Option<OutElem2>) {
  return <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => collect_(self, f)
}

/**
 * Returns a new channel, which is the concatenation of all the channels that are written out by
 * this channel. This method may only be called on channels that output other channels.
 */
export function concatOut<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: C.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>,
    OutDone
  >
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any> {
  return concatAll(mapOut_(self, (out) => out))
}

function contramapReader<InErr, InElem, InDone0, InDone>(
  f: (a: InDone0) => InDone
): C.Channel<unknown, InErr, InElem, InDone0, InErr, InElem, InDone> {
  return C.readWith(
    (_in) => zipRight_(C.write(_in), contramapReader(f)),
    (err) => C.fail(err),
    (done) => C.end(f(done))
  )
}

export function contramap_<
  Env,
  InErr,
  InElem,
  InDone0,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (a: InDone0) => InDone
): C.Channel<Env, InErr, InElem, InDone0, OutErr, OutElem, OutDone> {
  return C.pipeTo_(contramapReader(f), self)
}

/**
 * @ets_data_first contramap_
 */
export function contramap<InDone, InDone0>(f: (a: InDone0) => InDone) {
  return <Env, InErr, InElem, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => contramap_(self, f)
}

function contramapInReader<InErr, InElem0, InElem, InDone>(
  f: (a: InElem0) => InElem
): C.Channel<unknown, InErr, InElem0, InDone, InErr, InElem, InDone> {
  return C.readWith(
    (_in) => zipRight_(C.write(f(_in)), contramapInReader(f)),
    (err) => C.fail(err),
    (done) => C.end(done)
  )
}

export function contramapIn_<
  Env,
  InErr,
  InElem0,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (a: InElem0) => InElem
): C.Channel<Env, InErr, InElem0, InDone, OutErr, OutElem, OutDone> {
  return C.pipeTo_(contramapInReader(f), self)
}

/**
 * @ets_data_first contramapIn_
 */
export function contramapIn<InElem0, InElem>(f: (a: InElem0) => InElem) {
  return <Env, InErr, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => contramapIn_(self, f)
}

function contramapMReader<Env1, InErr, InElem, InDone0, InDone>(
  f: (i: InDone0) => T.Effect<Env1, InErr, InDone>
): C.Channel<Env1, InErr, InElem, InDone0, InErr, InElem, InDone> {
  return C.readWith(
    (_in) => zipRight_(C.write(_in), contramapMReader(f)),
    (err) => C.fail(err),
    (done0) => C.fromEffect(f(done0))
  )
}

export function contramapEffect_<
  Env,
  Env1,
  InErr,
  InElem,
  InDone0,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (i: InDone0) => T.Effect<Env1, InErr, InDone>
): C.Channel<Env1 & Env, InErr, InElem, InDone0, OutErr, OutElem, OutDone> {
  return C.pipeTo_(contramapMReader(f), self)
}

/**
 * @ets_data_first contramapEffect_
 */
export function contramapEffect<Env1, InErr, InDone0, InDone>(
  f: (i: InDone0) => T.Effect<Env1, InErr, InDone>
) {
  return <Env, InElem, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => contramapEffect_(self, f)
}

function contramapInMReader<Env1, InErr, InElem0, InElem, InDone>(
  f: (a: InElem0) => T.Effect<Env1, InErr, InElem>
): C.Channel<Env1, InErr, InElem0, InDone, InErr, InElem, InDone> {
  return C.readWith(
    (_in) =>
      zipRight_(
        C.chain_(C.fromEffect(f(_in)), (_) => C.write(_)),
        contramapInMReader(f)
      ),
    (err) => C.fail(err),
    (done) => C.end(done)
  )
}

export function contramapInEffect_<
  Env,
  Env1,
  InErr,
  InElem0,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (a: InElem0) => T.Effect<Env1, InErr, InElem>
): C.Channel<Env1 & Env, InErr, InElem0, InDone, OutErr, OutElem, OutDone> {
  return C.pipeTo_(contramapInMReader(f), self)
}

/**
 * @ets_data_first contramapInEffect_
 */
export function contramapInEffect<Env1, InErr, InElem0, InElem>(
  f: (a: InElem0) => T.Effect<Env1, InErr, InElem>
) {
  return <Env, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => contramapInEffect_(self, f)
}

function doneCollectReader<Env, OutErr, OutElem, OutDone>(
  builder: A.ChunkBuilder<OutElem>
): C.Channel<Env, OutErr, OutElem, OutDone, OutErr, never, OutDone> {
  return C.readWith(
    (out) =>
      zipRight_(
        C.succeedWith(() => {
          builder.append(out)
        }),
        doneCollectReader(builder)
      ),
    (err) => C.fail(err),
    (done) => C.end(done)
  )
}

/**
 * Returns a new channel, which is the same as this one, except that all the outputs are
 * collected and bundled into a tuple together with the terminal value of this channel.
 *
 * As the channel returned from this channel collect's all of this channel's output into an in-
 * memory chunk, it is not safe to call this method on channels that output a large or unbounded
 * number of values.
 */
export function doneCollect<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): C.Channel<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  never,
  Tp.Tuple<[A.Chunk<OutElem>, OutDone]>
> {
  return C.suspend(() => {
    const builder = A.builder<OutElem>()

    return C.chain_(C.pipeTo_(self, doneCollectReader(builder)), (z) =>
      C.succeedWith(() => Tp.tuple(builder.build(), z))
    )
  })
}

/**
 * Returns a new channel, which is the same as this one, except it will be interrupted when the
 * specified effect completes. If the effect completes successfully before the underlying channel
 * is done, then the returned channel will yield the success value of the effect as its terminal
 * value. On the other hand, if the underlying channel finishes first, then the returned channel
 * will yield the success value of the underlying channel as its terminal value.
 */
export function interruptWhen_<
  Env,
  Env1,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr1,
  OutElem,
  OutDone,
  OutDone1
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  io: T.Effect<Env1, OutErr1, OutDone1>
): C.Channel<
  Env1 & Env,
  InErr,
  InElem,
  InDone,
  OutErr | OutErr1,
  OutElem,
  OutDone | OutDone1
> {
  return mergeWith_(
    self,
    C.fromEffect(io),
    (selfDone) => MH.done(T.done(selfDone)),
    (ioDone) => MH.done(T.done(ioDone))
  )
}

/**
 * Returns a new channel, which is the same as this one, except it will be interrupted when the
 * specified effect completes. If the effect completes successfully before the underlying channel
 * is done, then the returned channel will yield the success value of the effect as its terminal
 * value. On the other hand, if the underlying channel finishes first, then the returned channel
 * will yield the success value of the underlying channel as its terminal value.
 *
 * @ets_data_first interruptWhen_
 */
export function interruptWhen<Env1, OutErr1, OutDone1>(
  io: T.Effect<Env1, OutErr1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => interruptWhen_(self, io)
}

/**
 * Returns a new channel, which is the same as this one, except it will be interrupted when the
 * specified promise is completed. If the promise is completed before the underlying channel is
 * done, then the returned channel will yield the value of the promise. Otherwise, if the
 * underlying channel finishes first, then the returned channel will yield the value of the
 * underlying channel.
 */
export function interruptWhenP_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr1,
  OutElem,
  OutDone,
  OutDone1
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  promise: PR.Promise<OutErr1, OutDone1>
): C.Channel<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr | OutErr1,
  OutElem,
  OutDone | OutDone1
> {
  return interruptWhen_(self, PR.await(promise))
}

/**
 * Returns a new channel, which is the same as this one, except it will be interrupted when the
 * specified promise is completed. If the promise is completed before the underlying channel is
 * done, then the returned channel will yield the value of the promise. Otherwise, if the
 * underlying channel finishes first, then the returned channel will yield the value of the
 * underlying channel.
 *
 * @ets_data_first interruptWhenP_
 */
export function interruptWhenP<OutErr1, OutDone1>(
  promise: PR.Promise<OutErr1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => interruptWhenP_(self, promise)
}

/**
 * Returns a new channel that collects the output and terminal value of this channel, which it
 * then writes as output of the returned channel.
 */
export function emitCollect<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): C.Channel<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  Tp.Tuple<[A.Chunk<OutElem>, OutDone]>,
  void
> {
  return C.chain_(doneCollect(self), (t) => C.write(t))
}

export function ensuring_<
  Env,
  Env1,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  Z
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  finalizer: T.RIO<Env1, Z>
): C.Channel<Env & Env1, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return C.ensuringWith_(self, (_) => finalizer)
}

/**
 * @ets_data_first ensuring_
 */
export function ensuring<Env1, Z>(finalizer: T.RIO<Env1, Z>) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => ensuring_(self, finalizer)
}

export function foldChannel_<
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
  OutErr1,
  OutErr2,
  OutElem,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone1,
  OutDone2
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  onErr: (
    oErr: OutErr
  ) => C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
  onSucc: (
    oErr: OutDone
  ) => C.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone2>
): P.Channel<
  Env & Env1 & Env2,
  InErr & InErr1 & InErr2,
  InElem & InElem1 & InElem2,
  InDone & InDone1 & InDone2,
  OutErr2 | OutErr1,
  OutElem | OutElem2 | OutElem1,
  OutDone2 | OutDone1
> {
  return C.foldCauseChannel_(
    self,
    (_) => {
      return E.fold_(
        Cause.failureOrCause(_),
        (err) => onErr(err),
        (cause) => C.failCause(cause)
      )
    },
    onSucc
  )
}

/**
 * @ets_data_first foldChannel_
 */
export function foldChannel<
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr,
  OutErr1,
  OutElem1,
  OutDone,
  OutDone1
>(
  onErr: (
    oErr: OutErr
  ) => C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
  onSucc: (
    oErr: OutDone
  ) => C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutElem>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => foldChannel_(self, onErr, onSucc)
}

/**
 * Returns a new channel that will perform the operations of this one, until failure, and then
 * it will switch over to the operations of the specified fallback channel.
 */
export function orElse_<
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
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): C.Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone | OutDone1
> {
  return catchAll_(self, (_) => that)
}

/**
 * Returns a new channel that will perform the operations of this one, until failure, and then
 * it will switch over to the operations of the specified fallback channel.
 *
 * @ets_data_first orElse_
 */
export function orElse<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => orElse_(self, that)
}

/**
 * Returns a new channel, which is the same as this one, except the terminal value of the
 * returned channel is created by applying the specified function to the terminal value of this
 * channel.
 */
export function map_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutDone2>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (out: OutDone) => OutDone2
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2> {
  return C.chain_(self, (z) => succeed(f(z)))
}

/**
 * Returns a new channel, which is the same as this one, except the terminal value of the
 * returned channel is created by applying the specified function to the terminal value of this
 * channel.
 *
 * @ets_data_first map_
 */
export function map<OutDone, OutDone2>(f: (out: OutDone) => OutDone2) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => map_(self, f)
}

/**
 * Returns a new channel, which is the same as this one, except the failure value of the returned
 * channel is created by applying the specified function to the failure value of this channel.
 */
export function mapError_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr2,
  OutElem,
  OutDone
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (err: OutErr) => OutErr2
): C.Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone> {
  return mapErrorCause_(self, (cause) => Cause.map_(cause, f))
}

/**
 * Returns a new channel, which is the same as this one, except the failure value of the returned
 * channel is created by applying the specified function to the failure value of this channel.
 *
 * @ets_data_first mapError_
 */
export function mapError<OutErr, OutErr2>(f: (err: OutErr) => OutErr2) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => mapError_(self, f)
}

/**
 * A more powerful version of `mapError` which also surfaces the `Cause` of the channel failure
 */
export function mapErrorCause_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr2,
  OutElem,
  OutDone
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (cause: Cause.Cause<OutErr>) => Cause.Cause<OutErr2>
): C.Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone> {
  return catchAllCause_(self, (cause) => C.failCause(f(cause)))
}

/**
 * A more powerful version of `mapError` which also surfaces the `Cause` of the channel failure
 *
 * @ets_data_first mapErrorCause_
 */
export function mapErrorCause<OutErr, OutErr2>(
  f: (cause: Cause.Cause<OutErr>) => Cause.Cause<OutErr2>
) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => mapErrorCause_(self, f)
}

function runManagedInterpret<Env, InErr, InDone, OutErr, OutDone>(
  channelState: ChannelState<Env, OutErr>,
  exec: ChannelExecutor<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): T.Effect<Env, OutErr, OutDone> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    switch (channelState._typeId) {
      case ChannelStateEffectTypeId: {
        return T.chain_(channelState.effect, () =>
          runManagedInterpret(exec.run(), exec)
        )
      }
      case ChannelStateEmitTypeId: {
        channelState = exec.run()
        break
      }
      case ChannelStateDoneTypeId: {
        return T.done(exec.getDone())
      }
    }
  }
  throw new Error("Bug")
}

function toPullInterpret<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  channelState: ChannelState<Env, OutErr>,
  exec: ChannelExecutor<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): T.Effect<Env, E.Either<OutErr, OutDone>, OutElem> {
  switch (channelState._typeId) {
    case ChannelStateEffectTypeId: {
      return T.chain_(T.mapError_(channelState.effect, E.left), () =>
        toPullInterpret(exec.run(), exec)
      )
    }
    case ChannelStateEmitTypeId: {
      return T.succeed(exec.getEmit())
    }
    case ChannelStateDoneTypeId: {
      const done = exec.getDone()
      if (done._tag === "Success") {
        return T.fail(E.right(done.value))
      } else {
        return T.halt(Cause.map_(done.cause, E.left))
      }
    }
  }
}

/**
 * Returns a new channel, which is the same as this one, except the terminal value of the
 * returned channel is created by applying the specified effectful function to the terminal value
 * of this channel.
 */
export function mapEffect_<
  Env,
  Env1,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr1,
  OutElem,
  OutDone,
  OutDone1
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (o: OutDone) => T.Effect<Env1, OutErr1, OutDone1>
): C.Channel<Env & Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem, OutDone1> {
  return C.chain_(self, (z) => C.fromEffect(f(z)))
}

/**
 * Returns a new channel, which is the same as this one, except the terminal value of the
 * returned channel is created by applying the specified effectful function to the terminal value
 * of this channel.
 *
 * @ets_data_first mapEffect_
 */
export function mapEffect<Env1, OutErr1, OutDone, OutDone1>(
  f: (o: OutDone) => T.Effect<Env1, OutErr1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => mapEffect_(self, f)
}

/**
 * Returns a new channel, which is the merge of this channel and the specified channel, where
 * the behavior of the returned channel on left or right early termination is decided by the
 * specified `leftDone` and `rightDone` merge decisions.
 */
export function mergeWith_<
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
  OutErr2,
  OutErr3,
  OutElem,
  OutElem1,
  OutDone,
  OutDone1,
  OutDone2,
  OutDone3
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
  leftDone: (
    ex: Ex.Exit<OutErr, OutDone>
  ) => MH.MergeDecision<Env1, OutErr1, OutDone1, OutErr2, OutDone2>,
  rightDone: (
    ex: Ex.Exit<OutErr1, OutDone1>
  ) => MH.MergeDecision<Env1, OutErr, OutDone, OutErr3, OutDone3>
): C.Channel<
  Env1 & Env,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr2 | OutErr3,
  OutElem | OutElem1,
  OutDone2 | OutDone3
> {
  const m = pipe(
    M.do,
    M.bind("input", () =>
      T.toManaged(
        makeSingleProducerAsyncInput<
          InErr & InErr1,
          InElem & InElem1,
          InDone & InDone1
        >()
      )
    ),
    M.let("queueReader", ({ input }) => fromInput(input)),
    M.bind("pullL", ({ queueReader }) => toPull(queueReader[">>>"](self))),
    M.bind("pullR", ({ queueReader }) => toPull(queueReader[">>>"](that))),
    M.map(({ input, pullL, pullR }) => {
      type MergeState = MH.MergeState<
        Env & Env1,
        OutErr,
        OutErr1,
        OutErr2 | OutErr3,
        OutElem | OutElem1,
        OutDone,
        OutDone1,
        OutDone2 | OutDone3
      >

      const handleSide =
        <Err, Done, Err2, Done2>(
          exit: Ex.Exit<E.Either<Err, Done>, OutElem | OutElem1>,
          fiber: F.Fiber<E.Either<Err2, Done2>, OutElem | OutElem1>,
          pull: T.Effect<Env & Env1, E.Either<Err, Done>, OutElem | OutElem1>
        ) =>
        (
          done: (
            ex: Ex.Exit<Err, Done>
          ) => MH.MergeDecision<
            Env & Env1,
            Err2,
            Done2,
            OutErr2 | OutErr3,
            OutDone2 | OutDone3
          >,
          both: (
            f1: F.Fiber<E.Either<Err, Done>, OutElem | OutElem1>,
            f2: F.Fiber<E.Either<Err2, Done2>, OutElem | OutElem1>
          ) => MergeState,
          single: (
            f: (
              ex: Ex.Exit<Err2, Done2>
            ) => T.Effect<Env & Env1, OutErr2 | OutErr3, OutDone2 | OutDone3>
          ) => MergeState
        ): T.Effect<
          Env & Env1,
          never,
          C.Channel<
            Env & Env1,
            unknown,
            unknown,
            unknown,
            OutErr2 | OutErr3,
            OutElem | OutElem1,
            OutDone2 | OutDone3
          >
        > =>
          Ex.fold_(
            exit,
            (
              cause
            ): T.Effect<
              Env & Env1,
              never,
              C.Channel<
                Env & Env1,
                unknown,
                unknown,
                unknown,
                OutErr2 | OutErr3,
                OutElem1 | OutElem,
                OutDone2 | OutDone3
              >
            > => {
              const result = done(
                E.fold_(
                  Cause.flipCauseEither(cause),
                  (_) => Ex.halt(_),
                  (_) => Ex.succeed(_)
                )
              )

              MH.concrete(result)

              if (result._typeId === MH.DoneTypeId) {
                return T.succeed(
                  C.fromEffect(T.zipRight_(F.interrupt(fiber), result.io))
                )
              } else if (result._typeId === MH.AwaitTypeId) {
                return T.map_(
                  fiber.await,
                  Ex.fold(
                    (cause) =>
                      C.fromEffect(
                        result.f(
                          E.fold_(
                            Cause.flipCauseEither(cause),
                            (_) => Ex.halt(_),
                            (_) => Ex.succeed(_)
                          )
                        )
                      ),
                    (elem) => zipRight_(C.write(elem), go(single(result.f)))
                  )
                )
              }

              throw new Error("Unexpected")
            },
            (elem) =>
              T.map_(T.fork(pull), (leftFiber) =>
                zipRight_(C.write(elem), go(both(leftFiber, fiber)))
              )
          )

      const go = (
        state: MergeState
      ): C.Channel<
        Env & Env1,
        unknown,
        unknown,
        unknown,
        OutErr2 | OutErr3,
        OutElem | OutElem1,
        OutDone2 | OutDone3
      > => {
        if (state._typeId === MH.BothRunningTypeId) {
          const lj: T.Effect<
            Env1,
            E.Either<OutErr, OutDone>,
            OutElem | OutElem1
          > = F.join(state.left)
          const rj: T.Effect<
            Env1,
            E.Either<OutErr1, OutDone1>,
            OutElem | OutElem1
          > = F.join(state.right)

          return C.unwrap(
            T.raceWith_(
              lj,
              rj,
              (leftEx, _) =>
                handleSide(leftEx, state.right, pullL)(
                  leftDone,
                  (l, r) => new MH.BothRunning(l, r),
                  (_) => new MH.LeftDone(_)
                ),
              (rightEx, _) =>
                handleSide(rightEx, state.left, pullR)(
                  rightDone,
                  (l, r) => new MH.BothRunning(r, l),
                  (_) => new MH.RightDone(_)
                )
            )
          )
        } else if (state._typeId === MH.LeftDoneTypeId) {
          return C.unwrap(
            T.map_(
              T.result(pullR),
              Ex.fold(
                (cause) =>
                  C.fromEffect(
                    state.f(
                      E.fold_(
                        Cause.flipCauseEither(cause),
                        (_) => Ex.halt(_),
                        (_) => Ex.succeed(_)
                      )
                    )
                  ),
                (elem) => zipRight_(C.write(elem), go(new MH.LeftDone(state.f)))
              )
            )
          )
        } else {
          return C.unwrap(
            T.map_(
              T.result(pullL),
              Ex.fold(
                (cause) =>
                  C.fromEffect(
                    state.f(
                      E.fold_(
                        Cause.flipCauseEither(cause),
                        (_) => Ex.halt(_),
                        (_) => Ex.succeed(_)
                      )
                    )
                  ),
                (elem) => zipRight_(C.write(elem), go(new MH.RightDone(state.f)))
              )
            )
          )
        }
      }

      return pipe(
        C.fromEffect(
          T.zipWith_(
            T.fork(pullL),
            T.fork(pullR),
            (a, b): MergeState =>
              new MH.BothRunning<
                unknown,
                OutErr,
                OutErr1,
                unknown,
                OutElem | OutElem1,
                OutDone,
                OutDone1,
                unknown
              >(a, b)
          )
        ),
        C.chain(go),
        C.embedInput(input)
      )
    })
  )

  return C.unwrapManaged(m)
}

/**
 * Returns a new channel, which is the merge of this channel and the specified channel, where
 * the behavior of the returned channel on left or right early termination is decided by the
 * specified `leftDone` and `rightDone` merge decisions.
 *
 * @ets_data_first mergeWith_
 */
export function mergeWith<
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr,
  OutErr1,
  OutErr2,
  OutErr3,
  OutElem1,
  OutDone,
  OutDone1,
  OutDone2,
  OutDone3
>(
  that: C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
  leftDone: (
    ex: Ex.Exit<OutErr, OutDone>
  ) => MH.MergeDecision<Env1, OutErr1, OutDone1, OutErr2, OutDone2>,
  rightDone: (
    ex: Ex.Exit<OutErr1, OutDone1>
  ) => MH.MergeDecision<Env1, OutErr, OutDone, OutErr3, OutDone3>
) {
  return <Env, InErr, InElem, InDone, OutElem>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => mergeWith_(self, that, leftDone, rightDone)
}

/**
 * Maps the output of this channel using f
 */
export function mapOut_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutElem2>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (o: OutElem) => OutElem2
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone> {
  const reader: C.Channel<Env, OutErr, OutElem, OutDone, OutErr, OutElem2, OutDone> =
    C.readWith((i) => C.chain_(C.write(f(i)), () => reader), C.fail, C.end)

  return self[">>>"](reader)
}

/**
 * Maps the output of this channel using f
 *
 * @ets_data_first mapOut_
 */
export function mapOut<OutElem, OutElem2>(
  f: (o: OutElem) => OutElem2
): <Env, InErr, InElem, InDone, OutErr, OutDone>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone> {
  return (self) => mapOut_(self, f)
}

const mapOutMReader = <Env, Env1, OutErr, OutErr1, OutElem, OutElem1, OutDone>(
  f: (o: OutElem) => T.Effect<Env1, OutErr1, OutElem1>
): C.Channel<
  Env & Env1,
  OutErr,
  OutElem,
  OutDone,
  OutErr | OutErr1,
  OutElem1,
  OutDone
> =>
  C.readWith(
    (out) =>
      C.chain_(C.fromEffect(f(out)), (_) => zipRight_(C.write(_), mapOutMReader(f))),
    (e) => C.fail(e),
    (z) => C.end(z)
  )

export function mapOutEffect_<
  Env,
  Env1,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr1,
  OutElem,
  OutElem1,
  OutDone
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (o: OutElem) => T.Effect<Env1, OutErr1, OutElem1>
): C.Channel<Env & Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem1, OutDone> {
  return C.pipeTo_(self, mapOutMReader(f))
}

/**
 * @ets_data_first mapOutEffect_
 */
export function mapOutEffect<Env1, OutErr1, OutElem, OutElem1>(
  f: (o: OutElem) => T.Effect<Env1, OutErr1, OutElem1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => mapOutEffect_(self, f)
}

export const never: C.Channel<unknown, unknown, unknown, unknown, never, never, never> =
  C.fromEffect(T.never)

export function orDie_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, E>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  err: E
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return orDieWith_(self, (_) => err)
}

/**
 * @ets_data_first orDie_
 */
export function orDie<E>(err: E) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => orDie_(self, err)
}

export function orDieWith_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, E>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (e: OutErr) => E
) {
  return catchAll_(self, (e) => C.die(f(e)))
}

/**
 * @ets_data_first orDieWith_
 */
export function orDieWith<OutErr, E>(f: (e: OutErr) => E) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => orDieWith_(self, f)
}

/**
 * Repeats this channel forever
 */
export function repeated<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return C.chain_(self, () => repeated(self))
}

/**
 * Runs a channel until the end is received
 */
export function runManaged<Env, InErr, InDone, OutErr, OutDone>(
  self: C.Channel<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): M.Managed<Env, OutErr, OutDone> {
  return M.mapM_(
    M.makeExit_(
      T.succeedWith(() => new ChannelExecutor(() => self, undefined)),
      (exec, exit) => exec.close(exit) || T.unit
    ),
    (exec) => T.suspend(() => runManagedInterpret(exec.run(), exec))
  )
}

/**
 * Runs a channel until the end is received
 */
export function run<Env, InErr, InDone, OutErr, OutDone>(
  self: C.Channel<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): T.Effect<Env, OutErr, OutDone> {
  return M.useNow(runManaged(self))
}

export function runCollect<Env, InErr, InDone, OutErr, OutElem, OutDone>(
  self: C.Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>
): T.Effect<Env, OutErr, Tp.Tuple<[A.Chunk<OutElem>, OutDone]>> {
  return run(doneCollect(self))
}

/**
 * Runs a channel until the end is received
 */
export function runDrain<Env, InErr, InDone, OutElem, OutErr, OutDone>(
  self: C.Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>
): T.Effect<Env, OutErr, OutDone> {
  return run(C.drain(self))
}

export function unit_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, void> {
  return as_(self, undefined)
}

/**
 * Interpret a channel to a managed Pull
 */
export function toPull<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): M.Managed<Env, never, T.Effect<Env, E.Either<OutErr, OutDone>, OutElem>> {
  return M.map_(
    M.makeExit_(
      T.succeedWith(() => new ChannelExecutor(() => self, undefined)),
      (exec, exit) => exec.close(exit) || T.unit
    ),
    (exec) => T.suspend(() => toPullInterpret(exec.run(), exec))
  )
}

/**
 * Returns a new channel that is the sequential composition of this channel and the specified
 * channel. The returned channel terminates with a tuple of the terminal values of both channels.
 */
export function zip_<
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
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): C.Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  Tp.Tuple<[OutDone, OutDone1]>
> {
  return C.chain_(self, (z) => map_(that, (z2) => Tp.tuple(z, z2)))
}

/**
 * Returns a new channel that is the sequential composition of this channel and the specified
 * channel. The returned channel terminates with a tuple of the terminal values of both channels.
 *
 * @ets_data_first zip_
 */
export function zip<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => zip_(self, that)
}

/**
 * Returns a new channel that is the sequential composition of this channel and the specified
 * channel. The returned channel terminates with the terminal value of this channel.
 */
export function zipLeft_<
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
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): C.Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone
> {
  return map_(zip_(self, that), Tp.get(0))
}

/**
 * Returns a new channel that is the sequential composition of this channel and the specified
 * channel. The returned channel terminates with the terminal value of this channel.
 *
 * @ets_data_first zipLeft_
 */
export function zipLeft<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => zipLeft_(self, that)
}

export function zipPar_<
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
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): C.Channel<
  Env1 & Env,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  Tp.Tuple<[OutDone, OutDone1]>
> {
  return mergeWith_(
    self,
    that,
    (exit1) => MH.await_((exit2) => T.done(Ex.zip_(exit1, exit2))),
    (exit2) => MH.await_((exit1) => T.done(Ex.zip_(exit1, exit2)))
  )
}

/**
 * @ets_data_first zipPar_
 */
export function zipPar<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => zipPar_(self, that)
}

export function zipParLeft_<
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
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): C.Channel<
  Env1 & Env,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone
> {
  return map_(zipPar_(self, that), Tp.get(0))
}

/**
 * @ets_data_first zipParLeft_
 */
export function zipParLeft<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => zipParLeft_(self, that)
}

export function zipParRight_<
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
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): C.Channel<
  Env1 & Env,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone1
> {
  return map_(zipPar_(self, that), Tp.get(1))
}

/**
 * @ets_data_first zipParRight_
 */
export function zipParRight<
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr1,
  OutElem1,
  OutDone1
>(that: C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => zipParRight_(self, that)
}

/**
 * Returns a new channel that is the sequential composition of this channel and the specified
 * channel. The returned channel terminates with the terminal value of the other channel.
 */
export function zipRight_<
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
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): C.Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr1 | OutErr,
  OutElem1 | OutElem,
  OutDone1
> {
  return map_(zip_(self, that), Tp.get(1))
}

/**
 * Returns a new channel that is the sequential composition of this channel and the specified
 * channel. The returned channel terminates with the terminal value of the other channel.
 *
 * @ets_data_first zipRight_
 */
export function zipRight<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => zipRight_(self, that)
}

export function bracketOut_<Env, OutErr, Acquired, Z>(
  acquire: T.Effect<Env, OutErr, Acquired>,
  release: (a: Acquired) => T.RIO<Env, Z>
): C.Channel<Env, unknown, unknown, unknown, OutErr, Acquired, void> {
  return C.bracketOutExit_(acquire, (z, _) => release(z))
}

/**
 * @ets_data_first bracketOut_
 */
export function bracketOut<Env, Acquired, Z>(release: (a: Acquired) => T.RIO<Env, Z>) {
  return <OutErr>(acquire: T.Effect<Env, OutErr, Acquired>) =>
    bracketOut_(acquire, release)
}

export function bracket_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem1,
  OutDone,
  Acquired
>(
  acquire: T.Effect<Env, OutErr, Acquired>,
  use: (
    a: Acquired
  ) => C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>,
  release: (a: Acquired) => T.RIO<Env, any>
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone> {
  return bracketExit_(acquire, use, (a, _) => release(a))
}

/**
 * @ets_data_first bracket_
 */
export function bracket<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem1,
  OutDone,
  Acquired
>(
  use: (
    a: Acquired
  ) => C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>,
  release: (a: Acquired) => T.RIO<Env, any>
) {
  return (acquire: T.Effect<Env, OutErr, Acquired>) => bracket_(acquire, use, release)
}

export function bracketExit_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem1,
  OutDone,
  Acquired
>(
  acquire: T.Effect<Env, OutErr, Acquired>,
  use: (
    a: Acquired
  ) => C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>,
  release: (a: Acquired, exit: Ex.Exit<OutErr, OutDone>) => T.RIO<Env, any>
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone> {
  return pipe(
    C.fromEffect(
      Ref.makeRef<(exit: Ex.Exit<OutErr, OutDone>) => T.RIO<Env, any>>((_) => T.unit)
    ),
    C.chain((ref) =>
      pipe(
        C.fromEffect(
          T.uninterruptible(T.tap_(acquire, (a) => ref.set((_) => release(a, _))))
        ),
        C.chain(use),
        C.ensuringWith((ex) => T.chain_(ref.get, (_) => _(ex)))
      )
    )
  )
}

/**
 * @ets_data_first bracketExit_
 */
export function bracketExit<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem1,
  OutDone,
  Acquired
>(
  use: (
    a: Acquired
  ) => C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>,
  release: (a: Acquired, exit: Ex.Exit<OutErr, OutDone>) => T.RIO<Env, any>
) {
  return (acquire: T.Effect<Env, OutErr, Acquired>) =>
    bracketExit_(acquire, use, release)
}

/**
 * Creates a channel backed by a buffer. When the buffer is empty, the channel will simply
 * passthrough its input as output. However, when the buffer is non-empty, the value inside
 * the buffer will be passed along as output.
 */
export function buffer<InElem, InErr, InDone>(
  empty: InElem,
  isEmpty: Predicate<InElem>,
  ref: Ref.Ref<InElem>
): C.Channel<unknown, InErr, InElem, InDone, InErr, InElem, InDone> {
  return C.unwrap(
    Ref.modify_(ref, (v) => {
      if (isEmpty(v)) {
        return Tp.tuple(
          C.readWith(
            (_in) => zipRight_(C.write(_in), buffer(empty, isEmpty, ref)),
            (err) => C.fail(err),
            (done) => C.end(done)
          ),
          v
        )
      } else {
        return Tp.tuple(zipRight_(C.write(v), buffer(empty, isEmpty, ref)), empty)
      }
    })
  )
}

export function bufferChunk<InElem, InErr, InDone>(
  ref: Ref.Ref<A.Chunk<InElem>>
): C.Channel<unknown, InErr, A.Chunk<InElem>, InDone, InErr, A.Chunk<InElem>, InDone> {
  return buffer<A.Chunk<InElem>, InErr, InDone>(
    A.empty<InElem>(),
    (_) => A.isEmpty(_),
    ref
  )
}

export function concatAll<Env, InErr, InElem, InDone, OutErr, OutElem>(
  channels: C.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>,
    any
  >
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any> {
  return C.concatAllWith_(
    channels,
    (_, __) => void 0,
    (_, __) => void 0
  )
}

export function fromEither<E, A>(
  either: E.Either<E, A>
): C.Channel<unknown, unknown, unknown, unknown, E, never, A> {
  return E.fold_(either, C.fail, succeed)
}

export function fromOption<A>(
  option: O.Option<A>
): C.Channel<unknown, unknown, unknown, unknown, O.None, never, A> {
  return O.fold_(
    option,
    () => C.fail(O.none as O.None),
    (_) => succeed(_)
  )
}

export function identity<Err, Elem, Done>(): C.Channel<
  unknown,
  Err,
  Elem,
  Done,
  Err,
  Elem,
  Done
> {
  return C.readWith(
    (_in) => zipRight_(C.write(_in), identity<Err, Elem, Done>()),
    (err) => C.fail(err),
    (done) => C.end(done)
  )
}

export function interrupt(
  fiberId: F.FiberID
): C.Channel<unknown, unknown, unknown, unknown, never, never, never> {
  return C.failCause(Cause.interrupt(fiberId))
}

export function managed_<
  Env,
  Env1,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr1,
  OutElem,
  OutDone,
  A
>(
  m: M.Managed<Env, OutErr, A>,
  use: (a: A) => C.Channel<Env1, InErr, InElem, InDone, OutErr1, OutElem, OutDone>
): P.Channel<Env & Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem, OutDone> {
  return bracket_(
    RM.makeReleaseMap,
    (releaseMap) => {
      return pipe(
        C.fromEffect<Env, OutErr, A>(
          pipe(
            m.effect,
            T.provideSome((_: Env) => Tp.tuple(_, releaseMap)),
            T.map(Tp.get(1))
          )
        ),
        C.chain(use)
      )
    },
    (_) =>
      RM.releaseAll(
        Ex.unit, // FIXME: BracketOut should be BracketOutExit (From ZIO)
        sequential
      )(_)
  )
}

/**
 * @ets_data_first managed_
 */
export function managed<
  Env,
  Env1,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr1,
  OutElem,
  OutDone,
  A
>(use: (a: A) => C.Channel<Env1, InErr, InElem, InDone, OutErr1, OutElem, OutDone>) {
  return (m: M.Managed<Env, OutErr, A>) => managed_(m, use)
}

export function readOrFail<In, E>(
  e: E
): C.Channel<unknown, unknown, In, unknown, E, never, In> {
  return new P.Read<unknown, unknown, In, unknown, E, never, In, never, In>(
    (in_) => C.end(in_),
    new P.ContinuationK(
      (_) => C.fail(e),
      (_) => C.fail(e)
    )
  )
}

export function read<In>(): C.Channel<
  unknown,
  unknown,
  In,
  unknown,
  O.None,
  never,
  In
> {
  return readOrFail(O.none as O.None)
}

export function succeed<Z>(
  z: Z
): C.Channel<unknown, unknown, unknown, unknown, never, never, Z> {
  return C.end(z)
}

export function fromHub<Err, Done, Elem>(
  hub: H.Hub<Ex.Exit<E.Either<Err, Done>, Elem>>
) {
  return managed_(H.subscribe(hub), fromQueue)
}

export function fromInput<Err, Elem, Done>(
  input: AsyncInputConsumer<Err, Elem, Done>
): C.Channel<unknown, unknown, unknown, unknown, Err, Elem, Done> {
  return C.unwrap(
    input.takeWith(
      (_) => C.failCause(_),
      (_) => zipRight_(C.write(_), fromInput(input)),
      (_) => C.end(_)
    )
  )
}

export function fromQueue<Err, Elem, Done>(
  queue: Q.Dequeue<Ex.Exit<E.Either<Err, Done>, Elem>>
): C.Channel<unknown, unknown, unknown, unknown, Err, Elem, Done> {
  return C.chain_(
    C.fromEffect(Q.take(queue)),
    Ex.fold(
      (cause) =>
        E.fold_(
          Cause.flipCauseEither(cause),
          (cause) => C.failCause(cause),
          (done) => C.end(done)
        ),
      (elem) => zipRight_(C.write(elem), fromQueue(queue))
    )
  )
}

export function toHub<Err, Done, Elem>(hub: H.Hub<Ex.Exit<E.Either<Err, Done>, Elem>>) {
  return toQueue(H.toQueue(hub))
}

export function toQueue<Err, Done, Elem>(
  queue: Q.Enqueue<Ex.Exit<E.Either<Err, Done>, Elem>>
): C.Channel<unknown, Err, Elem, Done, never, never, any> {
  return C.readWithCause(
    (in_: Elem) =>
      zipRight_(C.fromEffect(Q.offer_(queue, Ex.succeed(in_))), toQueue(queue)),
    (cause: Cause.Cause<Err>) =>
      C.fromEffect(Q.offer_(queue, Ex.halt(Cause.map_(cause, (_) => E.left(_))))),
    (done: Done) => C.fromEffect(Q.offer_(queue, Ex.fail(E.right(done))))
  )
}

export function writeAll<Out>(
  ...outs: AR.Array<Out>
): C.Channel<unknown, unknown, unknown, unknown, never, Out, void> {
  return AR.reduceRight_(
    outs,
    C.end(undefined) as C.Channel<unknown, unknown, unknown, unknown, never, Out, void>,
    (out, conduit) => zipRight_(C.write(out), conduit)
  )
}

export function writeChunk<Out>(
  outs: A.Chunk<Out>
): P.Channel<unknown, unknown, unknown, unknown, never, Out, void> {
  const writer = (
    idx: number,
    len: number
  ): C.Channel<unknown, unknown, unknown, unknown, never, Out, void> =>
    idx === len
      ? C.unit
      : zipRight_(C.write(A.unsafeGet_(outs, idx)), writer(idx + 1, len))

  return writer(0, A.size(outs))
}

export type MergeStrategy = "BackPressure" | "BufferSliding"

export function mergeAllWith_<
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
  OutDone
>(
  channels: P.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    P.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, OutDone>,
    OutDone
  >,
  n: number,
  f: (o1: OutDone, o2: OutDone) => OutDone,
  bufferSize = 16,
  mergeStrategy: MergeStrategy = "BackPressure"
): P.Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem,
  OutDone
> {
  return managed_(
    M.withChildren((getChildren) =>
      pipe(
        M.do,
        M.tap(() => M.finalizer(T.chain_(getChildren, F.interruptAll))),
        M.bind("queue", () =>
          T.toManagedRelease_(
            Q.makeBounded<T.Effect<Env, E.Either<OutErr | OutErr1, OutDone>, OutElem>>(
              bufferSize
            ),
            Q.shutdown
          )
        ),
        M.bind("cancelers", () =>
          T.toManagedRelease_(Q.makeBounded<PR.Promise<never, void>>(n), Q.shutdown)
        ),
        M.bind("lastDone", () => Ref.makeManagedRef<O.Option<OutDone>>(O.none)),
        M.bind("errorSignal", () => PR.makeManaged<never, void>()),
        M.bind("permits", () => T.toManaged(SM.makeSemaphore(n))),
        M.bind("pull", () => toPull(channels)),
        M.let(
          "evaluatePull",
          ({ errorSignal, lastDone, queue }) =>
            (
              pull: T.Effect<Env & Env1, E.Either<OutErr | OutErr1, OutDone>, OutElem>
            ) =>
              pipe(
                pull,
                T.chain((outElem) => Q.offer_(queue, T.succeed(outElem))),
                T.forever,
                T.catchAllCause((c) =>
                  E.fold_(
                    Cause.flipCauseEither(c),
                    (cause) =>
                      T.zipRight_(
                        Q.offer_(queue, T.halt(Cause.map_(cause, E.left))),
                        T.asUnit(PR.succeed_(errorSignal, void 0))
                      ),
                    (outDone) =>
                      Ref.update_(
                        lastDone,
                        O.fold(
                          () => O.some(outDone),
                          (lastDone) => O.some(f(lastDone, outDone))
                        )
                      )
                  )
                )
              )
        ),
        M.tap(
          ({
            cancelers,
            errorSignal,
            evaluatePull,
            lastDone,
            permits,
            pull,
            queue
          }) => {
            return pipe(
              pull,
              T.foldCauseM(
                (c) =>
                  E.fold_(
                    Cause.flipCauseEither(c),
                    (cause) =>
                      pipe(
                        getChildren,
                        T.chain(F.interruptAll),
                        T.zipRight(
                          T.as_(
                            Q.offer_(queue, T.halt(Cause.map_(cause, E.left))),
                            false
                          )
                        )
                      ),
                    (outDone) =>
                      T.raceWith_(
                        PR.await(errorSignal),
                        SM.withPermits_(T.unit, permits, n),
                        (_, permitAcquisition) =>
                          pipe(
                            getChildren,
                            T.chain(F.interruptAll),
                            T.zipRight(T.as_(F.interrupt(permitAcquisition), false))
                          ),
                        (_, failureAwait) =>
                          pipe(
                            F.interrupt(failureAwait),
                            T.zipRight(
                              T.as_(
                                T.chain_(
                                  lastDone.get,
                                  O.fold(
                                    () => Q.offer_(queue, T.fail(E.right(outDone))),
                                    (lastDone) =>
                                      Q.offer_(
                                        queue,
                                        T.fail(E.right(f(lastDone, outDone)))
                                      )
                                  )
                                ),
                                false
                              )
                            )
                          )
                      )
                  ),
                (channel) => {
                  switch (mergeStrategy) {
                    case "BackPressure": {
                      return pipe(
                        T.do,
                        T.bind("latch", () => PR.make<never, void>()),
                        T.let("raceIOs", () =>
                          M.use_(toPull(channel), (_) =>
                            T.race_(evaluatePull(_), PR.await(errorSignal))
                          )
                        ),
                        T.tap(({ latch, raceIOs }) =>
                          T.fork(
                            SM.withPermit_(
                              T.zipRight_(PR.succeed_(latch, void 0), raceIOs),
                              permits
                            )
                          )
                        ),
                        T.tap(({ latch }) => PR.await(latch)),
                        T.bind("errored", () => PR.isDone(errorSignal)),
                        T.map(({ errored }) => !errored)
                      )
                    }
                    case "BufferSliding": {
                      return pipe(
                        T.do,
                        T.bind("canceler", () => PR.make<never, void>()),
                        T.bind("latch", () => PR.make<never, void>()),
                        T.bind("size", () => Q.size(cancelers)),
                        T.tap(({ size }) =>
                          T.when_(
                            T.chain_(Q.take(cancelers), (_) => PR.succeed_(_, void 0)),
                            () => size >= n
                          )
                        ),
                        T.tap(({ canceler }) => Q.offer_(cancelers, canceler)),
                        T.let("raceIOs", ({ canceler }) =>
                          M.use_(toPull(channel), (_) =>
                            T.race_(
                              T.race_(evaluatePull(_), PR.await(errorSignal)),
                              PR.await(canceler)
                            )
                          )
                        ),
                        T.tap(({ latch, raceIOs }) =>
                          T.fork(
                            SM.withPermit_(
                              T.zipRight_(PR.succeed_(latch, void 0), raceIOs),
                              permits
                            )
                          )
                        ),
                        T.tap(({ latch }) => PR.await(latch)),
                        T.bind("errored", () => PR.isDone(errorSignal)),
                        T.map(({ errored }) => !errored)
                      )
                    }
                  }
                }
              ),
              T.repeatWhile((x) => x),
              T.forkManaged
            )
          }
        ),
        M.map(({ queue }) => queue)
      )
    ),
    (queue) => {
      const consumer: P.Channel<
        Env & Env1,
        unknown,
        unknown,
        unknown,
        OutErr | OutErr1,
        OutElem,
        OutDone
      > = C.unwrap(
        pipe(
          Q.take(queue),
          T.flatten,
          T.foldCause(
            (c) =>
              E.fold_(
                Cause.flipCauseEither(c),
                (cause) => C.failCause(cause),
                (outDone) => C.end(outDone)
              ),
            (outElem) => zipRight_(C.write(outElem), consumer)
          )
        )
      )

      return consumer
    }
  )
}

/**
 * @ets_data_first mergeAllWith_
 */
export function mergeAllWith<OutDone>(
  n: number,
  f: (o1: OutDone, o2: OutDone) => OutDone,
  bufferSize = 16,
  mergeStrategy: MergeStrategy = "BackPressure"
) {
  return <
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
    OutElem
  >(
    channels: P.Channel<
      Env,
      InErr,
      InElem,
      InDone,
      OutErr,
      P.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, OutDone>,
      OutDone
    >
  ) => mergeAllWith_(channels, n, f, bufferSize, mergeStrategy)
}

export function mergeMap_<
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
  Z
>(
  self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  n: number,
  f: (
    outElem: OutElem
  ) => P.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>,
  bufferSize = 16,
  mergeStrategy: MergeStrategy = "BackPressure"
): P.Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem1,
  Z
> {
  return mergeAll_<
    Env & Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem1
  >(mapOut_(self, f), n, bufferSize, mergeStrategy)
}

/**
 * @ets_data_first mergeMap_
 */
export function mergeMap<OutElem, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>(
  n: number,
  f: (
    outElem: OutElem
  ) => P.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>,
  bufferSize = 16,
  mergeStrategy: MergeStrategy = "BackPressure"
) {
  return <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => mergeMap_(self, n, f, bufferSize, mergeStrategy)
}

export function mergeAll_<Env, InErr, InElem, InDone, OutErr, OutElem>(
  channels: P.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>,
    any
  >,
  n: number,
  bufferSize = 16,
  mergeStrategy: MergeStrategy = "BackPressure"
): P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any> {
  return mergeAllWith_(channels, n, (_, __) => void 0, bufferSize, mergeStrategy)
}

/**
 * @ets_data_first mergeAll_
 */
export function mergeAll(
  n: number,
  bufferSize = 16,
  mergeStrategy: MergeStrategy = "BackPressure"
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem>(
    channels: P.Channel<
      Env,
      InErr,
      InElem,
      InDone,
      OutErr,
      P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>,
      any
    >
  ) => mergeAll_(channels, n, bufferSize, mergeStrategy)
}

export function mergeOut_<
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
  OutElem1,
  OutDone
>(
  self: P.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    P.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, any>,
    OutDone
  >,
  n: number
): P.Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem1,
  any
> {
  return mergeAll_<
    Env & Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem1
  >(
    mapOut_(self, (x) => x),
    n
  )
}

/**
 * @ets_data_first mergeOut_
 */
export function mergeOut(n: number) {
  return <
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
    OutElem1,
    OutDone
  >(
    self: P.Channel<
      Env,
      InErr,
      InElem,
      InDone,
      OutErr,
      P.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, any>,
      OutDone
    >
  ) => mergeOut_(self, n)
}

export function mergeOutWith_<
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
  OutElem1,
  OutDone1
>(
  self: P.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    P.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
    OutDone1
  >,
  n: number,
  f: (o1: OutDone1, o2: OutDone1) => OutDone1
): P.Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem1,
  OutDone1
> {
  return mergeAllWith_(
    mapOut_(self, (x) => x),
    n,
    f
  )
}

/**
 * @ets_data_first mergeOutWith_
 */
export function mergeOutWith<OutDone1>(
  n: number,
  f: (o1: OutDone1, o2: OutDone1) => OutDone1
) {
  return <
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
    OutElem1
  >(
    self: P.Channel<
      Env,
      InErr,
      InElem,
      InDone,
      OutErr,
      P.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
      OutDone1
    >
  ) => mergeOutWith_(self, n, f)
}

export function mergeAllUnbounded<Env, InErr, InElem, InDone, OutErr, OutElem>(
  channels: P.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>,
    any
  >
): P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any> {
  return mergeAll_(channels, Number.MAX_SAFE_INTEGER)
}

export function mapOutEffectPar_<
  Env,
  Env1,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr1,
  OutElem,
  OutElem1,
  OutDone
>(
  self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  n: number,
  f: (o: OutElem) => T.Effect<Env1, OutErr1, OutElem1>
): P.Channel<Env & Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem1, OutDone> {
  return managed_(
    M.withChildren((getChildren) =>
      pipe(
        M.do,
        M.tap(() => M.finalizer(T.chain_(getChildren, F.interruptAll))),
        M.bind("queue", () =>
          T.toManagedRelease_(
            Q.makeBounded<
              T.Effect<Env1, E.Either<OutErr | OutErr1, OutDone>, OutElem1>
            >(n),
            Q.shutdown
          )
        ),
        M.bind("errorSignal", () => PR.makeManaged<OutErr1, never>()),
        M.bind("permits", () => T.toManaged(SM.makeSemaphore(n))),
        M.bind("pull", () => toPull(self)),
        M.tap(({ errorSignal, permits, pull, queue }) =>
          pipe(
            pull,
            T.foldCauseM(
              (c) =>
                E.fold_(
                  Cause.flipCauseEither(c),
                  (cause) => Q.offer_(queue, T.halt(Cause.map_(cause, E.left))),
                  (outDone) =>
                    pipe(
                      SM.withPermits_(T.unit, permits, n),
                      T.interruptible,
                      T.zipRight(Q.offer_(queue, T.fail(E.right(outDone))))
                    )
                ),
              (outElem) =>
                pipe(
                  T.do,
                  T.bind("p", () => PR.make<OutErr1, OutElem1>()),
                  T.bind("latch", () => PR.make<never, void>()),
                  T.tap(({ p }) => Q.offer_(queue, T.mapError_(PR.await(p), E.left))),
                  T.tap(({ latch, p }) =>
                    T.fork(
                      SM.withPermit_(
                        pipe(
                          PR.succeed_(latch, void 0),
                          T.zipRight(
                            pipe(
                              T.raceFirst_(PR.await(errorSignal), f(outElem)),
                              T.tapCause((_) => PR.halt_(errorSignal, _)),
                              T.to(p)
                            )
                          )
                        ),
                        permits
                      )
                    )
                  ),
                  T.tap(({ latch }) => PR.await(latch)),
                  T.asUnit
                )
            ),
            T.forever,
            T.interruptible,
            T.forkManaged
          )
        ),
        M.map(({ queue }) => queue)
      )
    ),
    (queue) => {
      const consumer: P.Channel<
        Env1,
        unknown,
        unknown,
        unknown,
        OutErr | OutErr1,
        OutElem1,
        OutDone
      > = C.unwrap(
        pipe(
          Q.take(queue),
          T.flatten,
          T.foldCause(
            (c) =>
              E.fold_(
                Cause.flipCauseEither(c),
                (cause) => C.failCause(cause),
                (outDone) => C.end(outDone)
              ),
            (outElem) => zipRight_(C.write(outElem), consumer)
          )
        )
      )

      return consumer
    }
  )
}

/**
 * @ets_data_first mapOutEffectPar_
 */
export function mapOutEffectPar<Env1, OutErr1, OutElem, OutElem1>(
  n: number,
  f: (o: OutElem) => T.Effect<Env1, OutErr1, OutElem1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => mapOutEffectPar_(self, n, f)
}
