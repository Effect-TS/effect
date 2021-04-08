// tracing: off

import "../../../Operator"

import * as C from "../../../Cause"
import type { NonEmptyArray } from "../../../Collections/Immutable/NonEmptyArray"
import * as T from "../../../Effect"
import * as E from "../../../Either"
import type * as Ex from "../../../Exit"
import type { Callback } from "../../../Fiber"
import { identity, pipe, tuple } from "../../../Function"
import * as M from "../../../Managed"
import * as O from "../../../Option"
import * as Q from "../../../Queue"
import { accessCallTrace } from "../../../Tracing"
import * as Channel from "../Channel"
import * as Pipeline from "../Pipeline"
import * as Sink from "../Sink"

/**
 * Provides a stream of output values, without consuming any input or
 * producing a final result.
 */
export type Stream<R, E, O> = Channel.Channel<R, E, never, unknown, O, unknown, unknown>

/**
 * Submerges the error case of an `Either` into the `Stream`.
 */
export function absolve<R, E, E2, O>(
  xs: Stream<R, E, E.Either<E2, O>>,
  __trace?: string
): Stream<R, E | E2, O> {
  return chain_(xs, E.fold(fail, succeed), __trace)
}

/**
 * Accesses the environment of the stream.
 */
export function access<R, A>(f: (r: R) => A, __trace?: string): Stream<R, never, A> {
  return map_(environment<R>(), f, __trace)
}

/**
 * Accesses the whole environment of the stream.
 */
export function environment<R>(__trace?: string): Stream<R, never, R> {
  return fromEffect(T.environment<R>(__trace))
}

/**
 * Accesses the environment of the stream in the context of an effect.
 */
export function accessM<R, E, A>(
  f: (r: R) => T.Effect<R, E, A>,
  __trace?: string
): Stream<R, E, A> {
  return fromEffect(T.accessM(f))
}

/**
 * Accesses the environment of the stream in the context of a stream.
 */
export function accessStream<R, E, A>(
  f: (r: R) => Stream<R, E, A>,
  __trace?: string
): Stream<R, E, A> {
  return chain_(environment<R>(), f, __trace)
}

/**
 * Maps the success values of this stream to the specified constant value.
 */
export function as_<R, E, O, O2>(
  self: Stream<R, E, O>,
  o2: O2,
  __trace?: string
): Stream<R, E, O2> {
  return map_(self, () => o2, __trace)
}

/**
 * Maps the success values of this stream to the specified constant value.
 *
 * @dataFirst as_
 */
export function as<O2>(o2: O2, __trace?: string) {
  return <R, E, O>(self: Stream<R, E, O>) => as_(self, o2, __trace)
}

/**
 * Returns a stream whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap_<R, E, E1, O, O1>(
  self: Stream<R, E, O>,
  f: (e: E) => E1,
  g: (o: O) => O1,
  __trace?: string
): Stream<R, E1, O1> {
  return map_(mapError_(self, f, __trace), g, __trace)
}

/**
 * Returns a stream whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @dataFirst bimap_
 */
export function bimap<E, E1, O, O1>(
  f: (e: E) => E1,
  g: (o: O) => O1,
  __trace?: string
) {
  return <R>(self: Stream<R, E, O>) => bimap_(self, f, g, __trace)
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracket_<R, E, A, X>(
  acquire: T.Effect<R, E, A>,
  release: (a: A) => T.Effect<R, never, X>,
  __trace?: string
): Stream<R, E, A> {
  return fromManaged(M.make_(acquire, release, __trace))
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 *
 * @dataFirst bracket_
 */
export function bracket<R, A, X>(
  release: (a: A) => T.Effect<R, never, X>,
  __trace?: string
) {
  return <E>(acquire: T.Effect<R, E, A>) => bracket_(acquire, release, __trace)
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracketExit_<R, E, A, X>(
  acquire: T.Effect<R, E, A>,
  release: (a: A, exit: Ex.Exit<any, any>) => T.Effect<R, never, X>,
  __trace?: string
): Stream<R, E, A> {
  return fromManaged(M.makeExit_(acquire, release, __trace))
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 *
 * @dataFirst bracketExit_
 */
export function bracketExit<R, A, X>(
  release: (a: A, exit: Ex.Exit<any, any>) => T.Effect<R, never, X>,
  __trace?: string
) {
  return <E>(acquire: T.Effect<R, E, A>) => bracketExit_(acquire, release, __trace)
}

/**
 * Catch all exceptions thrown by the current component of the pipeline.
 */
export const catchAll_: <R, E, A, R1, E1, A1>(
  self: Stream<R, E, A>,
  f: (e: E) => Stream<R1, E1, A1>,
  __trace?: string
) => Stream<R & R1, E1, A | A1> = Channel.catchAll_

/**
 * Catch all exceptions thrown by the current component of the pipeline.
 *
 * @dataFirst catchAll_
 */
export const catchAll: <E, R1, E1, A1>(
  f: (e: E) => Stream<R1, E1, A1>,
  __trace?: string
) => <R, A>(self: Stream<R, E, A>) => Stream<R & R1, E1, A | A1> = Channel.catchAll

/**
 * Catch all exceptions thrown by the current component of the pipeline exposing full cause.
 */
export const catchAllCause_: <R, E, A, R1, E1, A1>(
  self: Stream<R, E, A>,
  f: (e: C.Cause<E>) => Stream<R1, E1, A1>,
  __trace?: string
) => Stream<R & R1, E1, A | A1> = Channel.catchAllCause_

/**
 * Catch all exceptions thrown by the current component of the pipeline exposing full cause.
 *
 * @dataFirst catchAllCause_
 */
export const catchAllCause: <E, R1, E1, A1>(
  f: (e: C.Cause<E>) => Stream<R1, E1, A1>,
  __trace?: string
) => <R, A>(self: Stream<R, E, A>) => Stream<R & R1, E1, A | A1> = Channel.catchAllCause

/**
 * Combine two `Channel`s together into a new `Channel` (aka 'fuse').
 *
 * Output from the upstream (left) conduit will be fed into the
 * downstream (right) conduit. Processing will terminate when
 * downstream (right) returns.
 * Leftover data returned from the right `Channel` will be discarded.
 */
export const combine_: <R, E, R1, E1, A, O>(
  left: Stream<R, E, A>,
  right: Channel.Channel<R1, E1, A, A, O, unknown, unknown>
) => Stream<R & R1, E | E1, O> = Channel.combine_

/**
 * Combine two `Channel`s together into a new `Channel` (aka 'fuse').
 *
 * Output from the upstream (left) conduit will be fed into the
 * downstream (right) conduit. Processing will terminate when
 * downstream (right) returns.
 * Leftover data returned from the right `Channel` will be discarded.
 *
 * @dataFirst combine_
 */
export const combine: <R1, E1, A, O>(
  right: Channel.Channel<R1, E1, A, A, O, unknown, unknown>
) => <R, E>(left: Stream<R, E, A>) => Stream<R & R1, E | E1, O> = Channel.combine

type ConnectResumeGo<R, E, O, A> = E.Either<
  {
    rp: (i: O, _: Channel.Tracer) => Sink.Sink<R, E, O, O, A>
    rc: (u: unknown, _: Channel.Tracer) => Sink.Sink<R, E, O, O, A>
    left: Stream<R, E, O>
  },
  {
    left: Stream<R, E, O>
    right: Sink.Sink<R, E, O, O, A>
  }
>

function connectResumeGo<R, E, O, A>(
  input: ConnectResumeGo<R, E, O, A>,
  tracer: Channel.Tracer
): M.Managed<R, E, readonly [Stream<R, E, O>, A]> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    switch (input._tag) {
      case "Left": {
        const rp = input.left.rp
        const rc = input.left.rc
        const left = input.left.left
        Channel.concrete(left)
        switch (left._typeId) {
          case Channel.SuspendTypeId: {
            input = E.left({
              rp,
              rc,
              left: left.nextChannel(tracer)
            })
            break
          }
          case Channel.DoneTypeId: {
            input = E.right({
              left: new Channel.Done(left.result),
              right: rc(left.result, tracer)
            })
            break
          }
          case Channel.HaveOutputTypeId: {
            input = E.right({
              left: left.nextChannel(tracer),
              right: rp(left.output, tracer)
            })
            break
          }
          case Channel.ChannelMTypeId: {
            return M.chain_(left.nextChannel, (l) =>
              connectResumeGo(E.left({ rp, rc, left: l }), tracer)
            )
          }
          case Channel.LeftoverTypeId: {
            input = E.left({
              rp,
              rc,
              left: left.nextChannel(tracer)
            })
            break
          }
          case Channel.NeedInputTypeId: {
            input = E.left({
              rp,
              rc,
              left: left.nextChannel(undefined, tracer)
            })
            break
          }
        }
        break
      }
      case "Right": {
        const left = input.right.left
        const right = input.right.right
        Channel.concrete(right)
        switch (right._typeId) {
          case Channel.SuspendTypeId: {
            input = E.right({
              left,
              right: right.nextChannel(tracer)
            })
            break
          }
          case Channel.HaveOutputTypeId: {
            throw new Error(`Sink should not produce outputs: ${right.output}`)
          }
          case Channel.DoneTypeId: {
            return M.succeed(tuple(left, right.result))
          }
          case Channel.LeftoverTypeId: {
            input = E.right({
              left: new Channel.HaveOutput(() => left, right.leftover),
              right: right.nextChannel(tracer)
            })
            break
          }
          case Channel.NeedInputTypeId: {
            input = E.left({ rp: right.nextChannel, rc: right.fromUpstream, left })
            break
          }
          case Channel.ChannelMTypeId: {
            return M.chain_(right.nextChannel, (p) =>
              connectResumeGo(E.right({ left, right: p }), tracer)
            )
          }
        }
        break
      }
    }
  }
  throw new Error("Bug")
}

/**
 * Connect a `Stream` to a `Sink` until the latter closes. Returns both the
 * most recent state of the `Stream` and the result of the `Sink`.
 */
export function connectResume_<R, E, O, A>(
  source: Stream<R, E, O>,
  sink: Sink.Sink<R, E, O, O, A>
): M.Managed<R, E, readonly [Stream<R, E, O>, A]> {
  return M.exposeTracer((tracer) =>
    connectResumeGo(E.right({ left: source, right: sink }), tracer)
  )
}

/**
 * Connect a `Stream` to a `Sink` until the latter closes. Returns both the
 * most recent state of the `Stream` and the result of the `Sink`.
 *
 * @dataFirst connectResume_
 */
export function connectResume<R, E, O, A>(
  sink: Sink.Sink<R, E, O, O, A>
): (source: Stream<R, E, O>) => M.Managed<R, E, readonly [Stream<R, E, O>, A]> {
  return (self) => connectResume_(self, sink)
}

/**
 * Monadic chain
 */
export function chain_<R, E, R1, E1, A, B>(
  self: Stream<R, E, A>,
  f: (a: A) => Stream<R1, E1, B>,
  __trace?: string
): Stream<R & R1, E | E1, B> {
  return Channel.combine_(self, Pipeline.mapChannel(f, __trace))
}

/**
 * Monadic chain
 *
 * @dataFirst chain_
 */
export function chain<R, E, A, B>(
  f: (a: A) => Stream<R, E, B>,
  __trace?: string
): <R1, E1>(self: Stream<R1, E1, A>) => Stream<R & R1, E | E1, B> {
  return (self) => chain_(self, f, __trace)
}

/**
 * Fails with a checked error `E`
 */
export const fail: <E>(e: E, __trace?: string) => Stream<unknown, E, never> =
  Channel.fail

/**
 * Fails with a checked error `E`
 */
export const failL: <E>(e: () => E, __trace?: string) => Stream<unknown, E, never> =
  Channel.failL

/**
 * Repeats the stream forever
 */
export function forever<R, E, A>(
  self: Stream<R, E, A>,
  __trace?: string
): Stream<R, E, A> {
  return Channel.chain_(self, () => forever(self, __trace), __trace)
}

/**
 * Send a single output value downstream. If the downstream `Channel`
 * terminates, this `Channel` will terminate as well.
 */
export const fromEffect: <R, E, O>(
  o: T.Effect<R, E, O>,
  __trace?: string
) => Stream<R, E, O> = Channel.writeEffect

/**
 * Send a single output value downstream. If the downstream `Channel`
 * terminates, this `Channel` will terminate as well.
 */
export const fromManaged: <R, E, A>(
  self: M.Managed<R, E, A>,
  __trace?: string
) => Stream<R, E, A> = Channel.writeManaged

/**
 * Construct a `Stream` dependent on a `Managed`.
 */
export const fromManagedStream: <R, R1, E, E1, A>(
  self: M.Managed<R, E, Stream<R1, E1, A>>,
  __trace?: string
) => Stream<R & R1, E | E1, A> = Channel.managed

/**
 * Construct a `Stream` dependent on a `Effect`.
 */
export const fromEffectStream: <R, R1, E, E1, A>(
  self: T.Effect<R, E, Stream<R1, E1, A>>,
  __trace?: string
) => Stream<R & R1, E | E1, A> = Channel.effect

/**
 * Creates a stream of values that pull from the queue until a none is recieved
 */
export function fromQueue<R, E, A>(
  queue: Q.Queue<T.Effect<R, O.Option<E>, A>>,
  __trace?: string
): Stream<R, E, A> {
  return Channel.effect(
    T.foldM_(
      T.flatten(queue.take),
      (err) => (err._tag === "Some" ? T.fail(err.value) : T.succeed(Channel.unit)),
      (a) => T.succeed(Channel.chain_(Channel.write(a), () => fromQueue(queue)))
    ),
    __trace
  )
}

/**
 * Creates a stream of values that pull from both the queues until any one
 * returns a none and merges the results using f
 */
export function fromZipQueue<R, R1, E, E1, A, B, C>(
  leftQueue: Q.Queue<T.Effect<R, O.Option<E>, A>>,
  rightQueue: Q.Queue<T.Effect<R1, O.Option<E1>, B>>,
  f: (a: A, b: B) => C,
  __trace?: string
): Stream<R & R1, E | E1, C> {
  return Channel.effect(
    T.foldM_(
      T.zipPar_(T.flatten(leftQueue.take), T.flatten(rightQueue.take)),
      (err) => (err._tag === "Some" ? T.fail(err.value) : T.succeed(Channel.unit)),
      ([oa, ob]) =>
        T.succeed(
          Channel.chain_(Channel.write(f(oa, ob)), () =>
            fromZipQueue(leftQueue, rightQueue, f)
          )
        )
    ),
    __trace
  )
}

/**
 * Fails with a specified error cause
 */
export const halt: <E>(e: C.Cause<E>, __trace?: string) => Stream<unknown, E, never> =
  Channel.halt

/**
 * Fails with a specified error cause
 */
export const haltL: <E>(
  e: () => C.Cause<E>,
  __trace?: string
) => Stream<unknown, E, never> = Channel.haltL

/**
 * Converts an iterable into a stream (lazy)
 */
export const iterable: <O>(
  it: Iterable<O>,
  __trace?: string
) => Stream<unknown, never, O> = Channel.writeIterable

/**
 * Produces an infinite stream of repeated applications of f to x.
 */
export const iterate: <O>(
  x: O,
  f: (x: O) => O,
  __trace?: string
) => Stream<unknown, never, O> = Channel.writeIterate

/**
 * Produces an infinite stream of repeated applications of f to x.
 */
export const iterateM: <R, E, O>(
  x: O,
  f: (x: O) => T.Effect<R, E, O>,
  __trace?: string
) => Stream<R, E, O> = Channel.writeIterateM

/**
 * Maps the stream output using f
 */
export function map_<R, E, A, B>(
  self: Stream<R, E, A>,
  f: (a: A) => B,
  __trace?: string
): Stream<R, E, B> {
  return Channel.combine_(self, Pipeline.function(f, __trace))
}

/**
 * Maps the stream output using f
 *
 * @dataFirst map_
 */
export function map<A, B>(
  f: (a: A) => B,
  __trace?: string
): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B> {
  return (self) => map_(self, f)
}

/**
 * Reduces a state S using f while mapping the output
 */
export function mapAccum_<R, E, A, S, B>(
  self: Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => readonly [S, B],
  __trace?: string
): Stream<R, E, B> {
  return Channel.combine_(self, Pipeline.mapAccum(s, f, __trace))
}

/**
 * Reduces a state S using f while mapping the output
 *
 * @dataFirst mapAccum_
 */
export function mapAccum<A, S, B>(
  s: S,
  f: (s: S, a: A) => readonly [S, B],
  __trace?: string
): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B> {
  return (self) => mapAccum_(self, s, f, __trace)
}

/**
 * Reduces a state S using f while mapping the output
 */
export function mapAccumM_<R, E, A, R1, E1, S, B>(
  self: Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => T.Effect<R1, E1, readonly [S, B]>,
  __trace?: string
): Stream<R & R1, E | E1, B> {
  return Channel.combine_(self, Pipeline.mapAccumM(s, f, __trace))
}

/**
 * Reduces a state S using f while mapping the output
 *
 * @dataFirst mapAccumM_
 */
export function mapAccumM<R1, E1, A, S, B>(
  s: S,
  f: (s: S, a: A) => T.Effect<R1, E1, readonly [S, B]>,
  __trace?: string
): <R, E>(self: Stream<R, E, A>) => Stream<R & R1, E | E1, B> {
  return (self) => mapAccumM_(self, s, f, __trace)
}

/**
 * Maps the stream output using f
 */
export function mapConcat_<R, E, A, B>(
  self: Stream<R, E, A>,
  f: (a: A) => Iterable<B>,
  __trace?: string
): Stream<R, E, B> {
  return Channel.combine_(self, Pipeline.mapIterable(f, __trace))
}

/**
 * Maps the stream output using f
 *
 * @dataFirst mapConcat_
 */
export function mapConcat<A, B>(
  f: (a: A) => Iterable<B>,
  __trace?: string
): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B> {
  return (self) => mapConcat_(self, f, __trace)
}

/**
 * Maps the stream output using f
 */
export function mapConcatM_<R, E, A, R1, E1, B>(
  self: Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, Iterable<B>>,
  __trace?: string
): Stream<R & R1, E | E1, B> {
  return Channel.combine_(
    self,
    Pipeline.mapChannel((x: A) => Channel.effect(T.map_(f(x), iterable)), __trace)
  )
}

/**
 * Maps the stream output using f
 *
 * @dataFirst mapConcatM_
 */
export function mapConcatM<R1, E1, A, B>(
  f: (a: A) => T.Effect<R1, E1, Iterable<B>>,
  __trace?: string
): <R, E>(self: Stream<R, E, A>) => Stream<R & R1, E | E1, B> {
  return (self) => mapConcatM_(self, f, __trace)
}

/**
 * Transforms the errors emitted by this stream using `f`.
 */
export function mapError_<R, E, E2, O>(
  self: Stream<R, E, O>,
  f: (e: E) => E2,
  __trace?: string
): Stream<R, E2, O> {
  return catchAll_(self, (e) => fail(f(e)), __trace)
}

/**
 * Transforms the errors emitted by this stream using `f`.
 *
 * @dataFirst mapError_
 */
export function mapError<E, E2>(f: (e: E) => E2, __trace?: string) {
  return <R, O>(self: Stream<R, E, O>) => mapError_(self, f, __trace)
}

/**
 * Transforms the full causes of failures emitted by this stream.
 */
export function mapErrorCause_<R, E, E2, O>(
  self: Stream<R, E, O>,
  f: (e: C.Cause<E>) => C.Cause<E2>,
  __trace?: string
): Stream<R, E2, O> {
  return catchAllCause_(self, (e) => halt(f(e)), __trace)
}

/**
 * Transforms the full causes of failures emitted by this stream.
 *
 * @dataFirst mapErrorCause_
 */
export function mapErrorCause<E, E2>(
  f: (e: C.Cause<E>) => C.Cause<E2>,
  __trace?: string
) {
  return <R, O>(self: Stream<R, E, O>) => mapErrorCause_(self, f, __trace)
}

/**
 * Maps the stream output using the effectul function f
 */
export function mapM_<R, R1, E1, E, A, B>(
  self: Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, B>,
  __trace?: string
): Stream<R & R1, E | E1, B> {
  return Channel.combine_(
    self,
    Pipeline.mapChannel((x: A) => fromEffect(f(x)), __trace)
  )
}

/**
 * Maps the stream output using the effectul function f
 *
 * @dataFirst mapM_
 */
export function mapM<R, R1, E1, E, A, B>(
  f: (a: A) => T.Effect<R1, E1, B>,
  __trace?: string
): (self: Stream<R, E, A>) => Stream<R & R1, E | E1, B> {
  return (self) => mapM_(self, f, __trace)
}

/**
 * Merges an iterable of streams toghether, exits as soon as all streams
 * are starved or as soon as any of the streams errors, internally uses
 * a bounded queue with a size of 16
 */
export function merge<R, E, A>(
  streams: Iterable<Stream<R, E, A>>,
  __trace?: string
): Stream<R, E, A> {
  return mergeBuffer(streams, 16, __trace)
}

/**
 * Merges an iterable of streams toghether, exits as soon as all streams
 * are starved or as soon as any of the streams errors, internally uses
 * a bounded queue with a size of bufferSize
 */
export function mergeBuffer<R, E, A>(
  streams: Iterable<Stream<R, E, A>>,
  bufferSize: number,
  __trace?: string
): Stream<R, E, A> {
  return Channel.managed(
    pipe(
      Q.makeBounded<T.Effect<unknown, O.Option<E>, A>>(bufferSize)["|>"](
        M.makeExit(Q.shutdown)
      ),
      M.tap((queue) =>
        T.forkManaged(
          T.forEachUnitPar_(streams, (s) =>
            runDrain(mapM_(s, (a) => queue.offer(T.succeed(a))))
          )["|>"](
            T.foldCauseM(
              (cause) => queue.offer(T.halt(C.map_(cause, O.some))),
              () => queue.offer(T.fail(O.none))
            )
          )
        )
      ),
      M.map((queue) => fromQueue(queue))
    ),
    __trace
  )
}

/**
 * Merges a tuple of streams toghether, exits as soon as all streams
 * are starved or as soon as any of the streams errors, internally uses
 * a bounded queue with a size of bufferSize
 *
 * @trace call
 */
export function mergeT<Streams extends NonEmptyArray<Stream<any, any, any>>>(
  ...streams: Streams
): Stream<
  [Streams[number]] extends [Stream<infer R, any, any>] ? R : never,
  [Streams[number]] extends [Stream<any, infer E, any>] ? E : never,
  [Streams[number]] extends [Stream<any, any, infer A>] ? A : never
> {
  return merge(streams, accessCallTrace())
}

/**
 * Merges a tuple of streams toghether, exits as soon as all streams
 * are starved or as soon as any of the streams errors, internally uses
 * a bounded queue with a size of bufferSize
 *
 * @trace call
 */
export function mergeBufferT<Streams extends NonEmptyArray<Stream<any, any, any>>>(
  bufferSize: number,
  ...streams: Streams
): Stream<
  [Streams[number]] extends [Stream<infer R, any, any>] ? R : never,
  [Streams[number]] extends [Stream<any, infer E, any>] ? E : never,
  [Streams[number]] extends [Stream<any, any, infer A>] ? A : never
> {
  return mergeBuffer(streams, bufferSize, accessCallTrace())
}

/**
 * Creates a stream of integer numbers from low to high (both included)
 */
export function range(
  low: number,
  high: number,
  __trace?: string
): Stream<unknown, never, number> {
  if (low > high) {
    return Channel.unit
  }
  return Channel.chain_(Channel.write(low, __trace), () =>
    range(low + 1, high, __trace)
  )
}

/**
 * Produces an infinite stream by repeating the value `a`
 */
export function repeat<A>(a: A, __trace?: string): Stream<unknown, never, A> {
  return Channel.chain_(Channel.write(a), () => repeat(a, __trace), __trace)
}

/**
 * Produces an infinite stream by repeating the effect `a`
 */
export function repeatM<R, E, A>(
  a: T.Effect<R, E, A>,
  __trace?: string
): Stream<R, E, A> {
  return Channel.chain_(fromEffect(a, __trace), () => repeatM(a, __trace))
}

/**
 * Produces an infinite stream by repeating the managed `a`
 */
export function repeatManaged<R, E, A>(
  a: M.Managed<R, E, A>,
  __trace?: string
): Stream<R, E, A> {
  return Channel.chain_(fromManaged(a, __trace), () => repeatManaged(a, __trace))
}

/**
 * Run a pipeline until processing completes, collecting elements into an array
 */
export function runArray<R, E, O>(self: Stream<R, E, O>, __trace?: string) {
  return M.useNow(Channel.run(Channel.combine_(self, Sink.array())), __trace)
}

/**
 * Run a pipeline until processing completes, collecting elements into a list
 */
export function runList<R, E, O>(self: Stream<R, E, O>, __trace?: string) {
  return M.useNow(Channel.run(Channel.combine_(self, Sink.list())), __trace)
}

/**
 * Run a pipeline until processing completes, discarding elements
 */
export function runDrain<R, E, O>(self: Stream<R, E, O>, __trace?: string) {
  return M.useNow(Channel.run(Channel.combine_(self, Sink.drain())), __trace)
}

/**
 * Scan through a stream using f
 */
export function scan_<R, E, A, S>(
  self: Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => S,
  __trace?: string
): Stream<R, E, S> {
  return Channel.combine_(self, Pipeline.scan(s, f, __trace))
}

/**
 * Scan through a stream using f
 *
 * @dataFirst scan_
 */
export function scan<A, S>(
  s: S,
  f: (s: S, a: A) => S,
  __trace?: string
): <R, E>(self: Stream<R, E, A>) => Stream<R, E, S> {
  return (self) => scan_(self, s, f, __trace)
}

/**
 * Scan through a stream using f
 */
export function scanM_<R, E, A, R1, E1, S>(
  self: Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => T.Effect<R1, E1, S>,
  __trace?: string
): Stream<R & R1, E | E1, S> {
  return Channel.combine_(self, Pipeline.scanM(s, f, __trace))
}

/**
 * Scan through a stream using f
 *
 * @dataFirst scanM_
 */
export function scanM<A, R1, E1, S>(
  s: S,
  f: (s: S, a: A) => T.Effect<R1, E1, S>,
  __trace?: string
): <R, E>(self: Stream<R, E, A>) => Stream<R & R1, E | E1, S> {
  return (self) => scanM_(self, s, f, __trace)
}

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 */
export function streamAsync<R, E, A>(
  register: (
    nextCb: (
      next: Stream<R, E, A>,
      offerCb?: Callback<never, boolean>
    ) => T.UIO<Ex.Exit<never, boolean>>,
    doneCb: (offerCb?: Callback<never, boolean>) => T.UIO<Ex.Exit<never, boolean>>
  ) => T.UIO<void>,
  __trace?: string
): Stream<R, E, A> {
  return streamAsyncBuffer(register, 16, __trace)
}

function fromStreamQueue<R, E, A>(
  queue: Q.Queue<Stream<R, E, A> | undefined>
): Stream<R, E, A> {
  return Channel.effect(
    T.map_(queue.take, (o) =>
      o ? Channel.chain_(o, () => fromStreamQueue(queue)) : Channel.unit
    )
  )
}

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 */
export function streamAsyncBuffer<R, E, A>(
  register: (
    nextCb: (
      next: Stream<R, E, A>,
      offerCb?: Callback<never, boolean>
    ) => T.UIO<Ex.Exit<never, boolean>>,
    doneCb: (offerCb?: Callback<never, boolean>) => T.UIO<Ex.Exit<never, boolean>>
  ) => T.UIO<void>,
  outputBuffer: number,
  __trace?: string
): Stream<R, E, A> {
  return Channel.managed(
    pipe(
      M.do,
      M.bind("output", () =>
        Q.makeBounded<Stream<R, E, A> | undefined>(outputBuffer)["|>"](
          M.makeExit(Q.shutdown)
        )
      ),
      M.bind("runtime", () => pipe(T.runtime<R>(), T.toManaged)),
      M.bind("maybeStream", ({ output, runtime }) =>
        M.makeExit_(
          T.effectTotal(() =>
            register(
              (k, cb) => runtime.runCancel(output.offer(k), cb),
              (cb) => runtime.runCancel(output.offer(void 0), cb)
            )
          ),
          identity
        )
      ),
      M.map(({ output }) => fromStreamQueue(output))
    ),
    __trace
  )
}

/**
 * Send a single output value downstream. If the downstream `Channel`
 * terminates, this `Channel` will terminate as well.
 */
export const succeed: <O>(o: O, __trace?: string) => Stream<unknown, never, O> =
  Channel.write

/**
 * Send a single output value downstream. If the downstream `Channel`
 * terminates, this `Channel` will terminate as well.
 */
export const succeedL: <O>(o: () => O, __trace?: string) => Stream<unknown, never, O> =
  Channel.writeL

/**
 * Send a bunch of values downstream to the next component to consume. If the
 * downstream component terminates, this call will never return control.
 *
 * @trace call
 */
export const succeedMany: <O>(...os: Array<O>) => Stream<unknown, never, O> =
  Channel.writeMany

/**
 * Take only the first N values from the stream
 */
export function take_<R, E, A>(
  self: Stream<R, E, A>,
  n: number,
  __trace?: string
): Stream<R, E, A> {
  return Channel.combine_(self, Pipeline.take(n, __trace))
}

/**
 * Take only the first N values from the stream
 *
 * @dataFirst take_
 */
export function take(
  n: number,
  __trace?: string
): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A> {
  return (self) => take_(self, n, __trace)
}

/**
 * Combines two sources. The new source will stop producing once either
 * source has been exhausted.
 */
export function zip_<R, E, A, R1, E1, B>(
  left: Stream<R, E, A>,
  right: Stream<R1, E1, B>,
  __trace?: string
): Stream<R & R1, E | E1, readonly [A, B]> {
  return zipWith_(left, right, tuple, __trace)
}

/**
 * Combines two sources. The new source will stop producing once either
 * source has been exhausted.
 *
 * @dataFirst zip_
 */
export function zip<R1, E1, B>(
  right: Stream<R1, E1, B>,
  __trace?: string
): <R, E, A>(left: Stream<R, E, A>) => Stream<R & R1, E | E1, readonly [A, B]> {
  return (left) => zip_(left, right, __trace)
}

/**
 * Combines two sources in parallel using queues of size 16.
 * The new source will stop producing once either source has been exhausted.
 */
export function zipPar_<R, E, A, R1, E1, B>(
  left: Stream<R, E, A>,
  right: Stream<R1, E1, B>,
  __trace?: string
): Stream<R & R1, E | E1, readonly [A, B]> {
  return zipWithParBuffer_(left, right, tuple, 16, __trace)
}

/**
 * Combines two sources in parallel using queues of size 16.
 * The new source will stop producing once either source has been exhausted.
 *
 * @dataFirst zipPar_
 */
export function zipPar<R, E, A, R1, E1, B>(
  right: Stream<R1, E1, B>,
  __trace?: string
): (left: Stream<R, E, A>) => Stream<R & R1, E | E1, readonly [A, B]> {
  return (left) => zipPar_(left, right, __trace)
}

/**
 * Combines two sources in parallel using queues of bufferSize.
 * The new source will stop producing once either source has been exhausted.
 */
export function zipParBuffer_<R, E, A, R1, E1, B>(
  left: Stream<R, E, A>,
  right: Stream<R1, E1, B>,
  bufferSize: number,
  __trace?: string
): Stream<R & R1, E | E1, readonly [A, B]> {
  return zipWithParBuffer_(left, right, tuple, bufferSize, __trace)
}

/**
 * Combines two sources in parallel using queues of bufferSize.
 * The new source will stop producing once either source has been exhausted.
 *
 * @dataFirst zipParBuffer_
 */
export function zipParBuffer<R, E, A, R1, E1, B>(
  right: Stream<R1, E1, B>,
  bufferSize: number,
  __trace?: string
): (left: Stream<R, E, A>) => Stream<R & R1, E | E1, readonly [A, B]> {
  return (left) => zipParBuffer_(left, right, bufferSize, __trace)
}

/**
 * Combines two sources using f. The new source will stop producing once either
 * source has been exhausted.
 */
export function zipWith_<R, E, A, R1, E1, B, C>(
  left: Stream<R, E, A>,
  right: Stream<R1, E1, B>,
  f: (a: A, b: B) => C,
  __trace?: string
): Stream<R & R1, E | E1, C> {
  Channel.concrete(left)
  Channel.concrete(right)

  if (left._typeId === Channel.DoneTypeId || right._typeId === Channel.DoneTypeId) {
    return Channel.unit
  }
  if (left._typeId === Channel.LeftoverTypeId) {
    return new Channel.Suspend((_) => zipWith_(left.nextChannel(_), right, f))
  }
  if (right._typeId === Channel.LeftoverTypeId) {
    return new Channel.Suspend((_) => zipWith_(left, right.nextChannel(_), f))
  }
  if (left._typeId === Channel.SuspendTypeId) {
    return new Channel.Suspend((_) => zipWith_(left.nextChannel(_), right, f))
  }
  if (right._typeId === Channel.SuspendTypeId) {
    return new Channel.Suspend((_) => zipWith_(left, right.nextChannel(_), f))
  }
  if (left._typeId === Channel.ChannelMTypeId) {
    return new Channel.ChannelM(M.map_(left.nextChannel, (p) => zipWith_(p, right, f)))
  }
  if (right._typeId === Channel.ChannelMTypeId) {
    return new Channel.ChannelM(M.map_(right.nextChannel, (p) => zipWith_(left, p, f)))
  }
  if (left._typeId === Channel.NeedInputTypeId) {
    return new Channel.NeedInput(
      (i, _) => zipWith_(left.nextChannel(i, _), right, f),
      (i, _) => zipWith_(left.fromUpstream(i, _), right, f)
    )
  }
  if (right._typeId === Channel.NeedInputTypeId) {
    return new Channel.NeedInput(
      (i, _) => zipWith_(left, right.nextChannel(i, _), f),
      (i, _) => zipWith_(left, right.fromUpstream(i, _), f)
    )
  }
  return new Channel.Suspend(
    () =>
      new Channel.HaveOutput(
        (_) => zipWith_(left.nextChannel(_), right.nextChannel(_), f),
        f(left.output, right.output)
      ),
    __trace
  )
}

/**
 * Combines two sources using f. The new source will stop producing once either
 * source has been exhausted.
 *
 * @dataFirst zipWith_
 */
export function zipWith<A, R1, E1, B, C>(
  right: Stream<R1, E1, B>,
  f: (a: A, b: B) => C,
  __trace?: string
): <R, E>(left: Stream<R, E, A>) => Stream<R & R1, E | E1, C> {
  return (left) => zipWith_(left, right, f, __trace)
}

/**
 * Combines two sources using f in parallel using queues of size 16.
 * The new source will stop producing once either source has been exhausted.
 */
export function zipWithPar_<R, E, A, R1, E1, B, C>(
  left: Stream<R, E, A>,
  right: Stream<R1, E1, B>,
  f: (a: A, b: B) => C,
  __trace?: string
): Stream<R & R1, E | E1, C> {
  return zipWithParBuffer_(left, right, f, 16, __trace)
}

/**
 * Combines two sources using f in parallel using queues of size 16.
 * The new source will stop producing once either source has been exhausted.
 *
 * @dataFirst zipWithPar_
 */
export function zipWithPar<A, R1, E1, B, C>(
  right: Stream<R1, E1, B>,
  f: (a: A, b: B) => C,
  __trace?: string
): <R, E>(left: Stream<R, E, A>) => Stream<R & R1, E | E1, C> {
  return (left) => zipWithPar_(left, right, f, __trace)
}

/**
 * Combines two sources using f in parallel using queues of bufferSize.
 * The new source will stop producing once either source has been exhausted.
 */
export function zipWithParBuffer_<R, E, A, R1, E1, B, C>(
  left: Stream<R, E, A>,
  right: Stream<R1, E1, B>,
  f: (a: A, b: B) => C,
  bufferSize: number,
  __trace?: string
): Stream<R & R1, E | E1, C> {
  return pipe(
    M.do,
    M.bind("leftQueue", () =>
      Q.makeBounded<T.Effect<unknown, O.Option<E>, A>>(bufferSize)["|>"](
        M.makeExit(Q.shutdown)
      )
    ),
    M.bind("rightQueue", () =>
      Q.makeBounded<T.Effect<unknown, O.Option<E1>, B>>(bufferSize)["|>"](
        M.makeExit(Q.shutdown)
      )
    ),
    M.tap(({ leftQueue }) =>
      T.forkManaged(
        runDrain(mapM_(left, (a) => leftQueue.offer(T.succeed(a))))["|>"](
          T.foldCauseM(
            (cause) => leftQueue.offer(T.halt(C.map_(cause, O.some))),
            () => leftQueue.offer(T.fail(O.none))
          )
        )
      )
    ),
    M.tap(({ rightQueue }) =>
      T.forkManaged(
        runDrain(mapM_(right, (a) => rightQueue.offer(T.succeed(a))))["|>"](
          T.foldCauseM(
            (cause) => rightQueue.offer(T.halt(C.map_(cause, O.some))),
            () => rightQueue.offer(T.fail(O.none))
          )
        )
      )
    ),
    M.map(({ leftQueue, rightQueue }) => fromZipQueue(leftQueue, rightQueue, f)),
    Channel.managed
  )
}

/**
 * Combines two sources using f in parallel using queues of bufferSize.
 * The new source will stop producing once either source has been exhausted.
 *
 * @dataFirst zipWithParBuffer_
 */
export function zipWithParBuffer<A, R1, E1, B, C>(
  right: Stream<R1, E1, B>,
  f: (a: A, b: B) => C,
  bufferSize: number,
  __trace?: string
): <R, E>(left: Stream<R, E, A>) => Stream<R & R1, E | E1, C> {
  return (left) => zipWithParBuffer_(left, right, f, bufferSize, __trace)
}
