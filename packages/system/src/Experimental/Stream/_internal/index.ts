// tracing: off

import "../../../Operator"

import * as T from "../../../Effect"
import * as E from "../../../Either"
import { pipe, tuple } from "../../../Function"
import * as M from "../../../Managed"
import type { NonEmptyArray } from "../../../NonEmptyArray"
import * as O from "../../../Option"
import * as Q from "../../../Queue"
import * as Channel from "../Channel"
import * as Pipeline from "../Pipeline"
import * as Sink from "../Sink"

/**
 * Provides a stream of output values, without consuming any input or
 * producing a final result.
 */
export type Stream<R, E, O> = Channel.Channel<R, E, never, unknown, O, unknown, unknown>

/**
 * Take only the first N values from the stream
 */
export function take_<R, E, A>(self: Stream<R, E, A>, n: number): Stream<R, E, A> {
  return Channel.combine_(self, Pipeline.take(n))
}

/**
 * Take only the first N values from the stream
 *
 * @dataFirst take_
 */
export function take(n: number): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A> {
  return (self) => take_(self, n)
}

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
 * Send a single output value downstream. If the downstream `Channel`
 * terminates, this `Channel` will terminate as well.
 */
export const succeed: <O>(o: O) => Stream<unknown, never, O> = Channel.write

/**
 * Send a single output value downstream. If the downstream `Channel`
 * terminates, this `Channel` will terminate as well.
 */
export const succeedL: <O>(o: () => O) => Stream<unknown, never, O> = Channel.writeL

/**
 * Send a single output value downstream. If the downstream `Channel`
 * terminates, this `Channel` will terminate as well.
 */
export const fromEffect: <R, E, O>(o: T.Effect<R, E, O>) => Stream<R, E, O> =
  Channel.writeEffect

/**
 * Send a single output value downstream. If the downstream `Channel`
 * terminates, this `Channel` will terminate as well.
 */
export const fromManaged: <R, E, A>(self: M.Managed<R, E, A>) => Stream<R, E, A> =
  Channel.writeManaged

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
 * Send a bunch of values downstream to the next component to consume. If the
 * downstream component terminates, this call will never return control.
 */
export const succeedMany: <O>(...os: Array<O>) => Stream<unknown, never, O> =
  Channel.writeMany

/**
 * Converts an iterable into a stream (lazy)
 */
export const iterable: <O>(it: Iterable<O>) => Stream<unknown, never, O> =
  Channel.writeIterable

/**
 * Construct a `Stream` dependent on a `Managed`.
 */
export const fromManagedStream: <R, R1, E, E1, A>(
  self: M.Managed<R, E, Stream<R1, E1, A>>
) => Stream<R & R1, E | E1, A> = Channel.managed

/**
 * Construct a `Stream` dependent on a `Effect`.
 */
export const fromEffectStream: <R, R1, E, E1, A>(
  self: T.Effect<R, E, Stream<R1, E1, A>>
) => Stream<R & R1, E | E1, A> = Channel.effect

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
 * Repeats the stream forever
 */
export function forever<R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> {
  return Channel.chain_(self, () => forever(self))
}

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
 * Creates a stream of values that pull from the queue until a none is recieved
 */
export function fromQueue<R, E, A>(
  queue: Q.Queue<T.Effect<R, E, O.Option<A>>>
): Stream<R, E, A> {
  return Channel.effect(
    T.map_(
      T.flatten(queue.take),
      O.fold(
        () => Channel.unit,
        (a) => Channel.chain_(Channel.write(a), () => fromQueue(queue))
      )
    )
  )
}

/**
 * Merges an iterable of streams toghether, exits as soon as all streams
 * are starved or as soon as any of the streams errors, internally uses
 * a bounded queue with a size of bufferSize
 */
export function mergeBuffer<R, E, A>(
  streams: Iterable<Stream<R, E, A>>,
  bufferSize: number
): Stream<R, E, A> {
  return pipe(
    Q.makeBounded<T.Effect<unknown, E, O.Option<A>>>(bufferSize)["|>"](
      M.makeExit(Q.shutdown)
    ),
    M.tap((queue) =>
      T.forkManaged(
        T.forEachUnitPar_(streams, (s) =>
          runDrain(mapM_(s, (a) => queue.offer(T.succeed(O.some(a)))))
        )["|>"](
          T.foldCauseM(
            (cause) => queue.offer(T.halt(cause)),
            () => queue.offer(T.succeed(O.none))
          )
        )
      )
    ),
    M.map((queue) => fromQueue(queue)),
    Channel.managed
  )
}

/**
 * Merges an iterable of streams toghether, exits as soon as all streams
 * are starved or as soon as any of the streams errors, internally uses
 * a bounded queue with a size of 16
 */
export function merge<R, E, A>(streams: Iterable<Stream<R, E, A>>): Stream<R, E, A> {
  return mergeBuffer(streams, 16)
}

/**
 * Merges a tuple of streams toghether, exits as soon as all streams
 * are starved or as soon as any of the streams errors, internally uses
 * a bounded queue with a size of bufferSize
 */
export function mergeBufferT<Streams extends NonEmptyArray<Stream<any, any, any>>>(
  bufferSize: number,
  ...streams: Streams
): Stream<
  [Streams[number]] extends [Stream<infer R, any, any>] ? R : never,
  [Streams[number]] extends [Stream<any, infer E, any>] ? E : never,
  [Streams[number]] extends [Stream<any, any, infer A>] ? A : never
> {
  return mergeBuffer(streams, bufferSize)
}

/**
 * Merges a tuple of streams toghether, exits as soon as all streams
 * are starved or as soon as any of the streams errors, internally uses
 * a bounded queue with a size of bufferSize
 */
export function mergeT<Streams extends NonEmptyArray<Stream<any, any, any>>>(
  ...streams: Streams
): Stream<
  [Streams[number]] extends [Stream<infer R, any, any>] ? R : never,
  [Streams[number]] extends [Stream<any, infer E, any>] ? E : never,
  [Streams[number]] extends [Stream<any, any, infer A>] ? A : never
> {
  return merge(streams)
}

/**
 * Combines two sources. The new source will stop producing once either
 * source has been exhausted.
 */
export function zip_<R, E, A, R1, E1, B>(
  left: Stream<R, E, A>,
  right: Stream<R1, E1, B>
): Stream<R & R1, E | E1, readonly [A, B]> {
  Channel.concrete(left)
  Channel.concrete(right)

  if (left._typeId === Channel.DoneTypeId || right._typeId === Channel.DoneTypeId) {
    return Channel.unit
  }
  if (left._typeId === Channel.LeftoverTypeId) {
    return new Channel.Suspend((_) => zip_(left.nextChannel(_), right))
  }
  if (right._typeId === Channel.LeftoverTypeId) {
    return new Channel.Suspend((_) => zip_(left, right.nextChannel(_)))
  }
  if (left._typeId === Channel.SuspendTypeId) {
    return new Channel.Suspend((_) => zip_(left.nextChannel(_), right))
  }
  if (right._typeId === Channel.SuspendTypeId) {
    return new Channel.Suspend((_) => zip_(left, right.nextChannel(_)))
  }
  if (left._typeId === Channel.ChannelMTypeId) {
    return new Channel.ChannelM(M.map_(left.nextChannel, (p) => zip_(p, right)))
  }
  if (right._typeId === Channel.ChannelMTypeId) {
    return new Channel.ChannelM(M.map_(right.nextChannel, (p) => zip_(left, p)))
  }
  if (left._typeId === Channel.NeedInputTypeId) {
    return new Channel.NeedInput(
      (i, _) => zip_(left.nextChannel(i, _), right),
      (i, _) => zip_(left.fromUpstream(i, _), right)
    )
  }
  if (right._typeId === Channel.NeedInputTypeId) {
    return new Channel.NeedInput(
      (i, _) => zip_(left, right.nextChannel(i, _)),
      (i, _) => zip_(left, right.fromUpstream(i, _))
    )
  }
  return new Channel.HaveOutput(
    (_) => zip_(left.nextChannel(_), right.nextChannel(_)),
    [left.output, right.output]
  )
}

/**
 * Combines two sources. The new source will stop producing once either
 * source has been exhausted.
 *
 * @dataFirst zip_
 */
export function zip<R1, E1, B>(
  right: Stream<R1, E1, B>
): <R, E, A>(left: Stream<R, E, A>) => Stream<R & R1, E | E1, readonly [A, B]> {
  return (left) => zip_(left, right)
}

/**
 * Combines two sources using f. The new source will stop producing once either
 * source has been exhausted.
 */
export function zipWith_<R, E, A, R1, E1, B, C>(
  left: Stream<R, E, A>,
  right: Stream<R1, E1, B>,
  f: (a: A, b: B) => C
): Stream<R & R1, E | E1, C> {
  return map_(zip_(left, right), ([a, b]) => f(a, b))
}

/**
 * Combines two sources using f. The new source will stop producing once either
 * source has been exhausted.
 *
 * @dataFirst zipWith_
 */
export function zipWith<A, R1, E1, B, C>(
  right: Stream<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(left: Stream<R, E, A>) => Stream<R & R1, E | E1, C> {
  return (left) => zipWith_(left, right, f)
}
