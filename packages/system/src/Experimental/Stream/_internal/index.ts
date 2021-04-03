// tracing: off

import "../../../Operator"

import * as T from "../../../Effect"
import * as E from "../../../Either"
import { tuple } from "../../../Function"
import * as M from "../../../Managed"
import * as Channel from "../Channel"
import * as Sink from "../Sink"

/**
 * Provides a stream of output values, without consuming any input or
 * producing a final result.
 */
export interface Stream<R, E, O>
  extends Channel.Channel<R, E, never, unknown, O, void, void> {}

/**
 * Take only the first N values from the stream
 */
export function take_<R, E, A>(self: Stream<R, E, A>, n: number): Stream<R, E, A> {
  return Channel.combine_(self, Channel.take(n))
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
    rp: (i: O) => Sink.Sink<R, E, O, O, A>
    rc: (u: void) => Sink.Sink<R, E, O, O, A>
    left: Stream<R, E, O>
  },
  {
    left: Stream<R, E, O>
    right: Sink.Sink<R, E, O, O, A>
  }
>

function connectResumeGo<R, E, O, A>(
  input: ConnectResumeGo<R, E, O, A>
): M.Managed<R, E, readonly [Stream<R, E, O>, A]> {
  return M.exposeTracer((tracer) => {
    // eslint-disable-next-line no-constant-condition
    while (1) {
      switch (input._tag) {
        case "Left": {
          const rp = input.left.rp
          const rc = input.left.rc
          const left = input.left.left
          Channel.concrete(left)
          switch (left._typeId) {
            case Channel.WithTracerTypeId: {
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
                right: rc(left.result)
              })
              break
            }
            case Channel.HaveOutputTypeId: {
              input = E.right({ left: left.nextChannel(), right: rp(left.output) })
              break
            }
            case Channel.ChannelMTypeId: {
              return M.chain_(left.nextChannel, (l) =>
                connectResumeGo(E.left({ rp, rc, left: l }))
              )
            }
            case Channel.LeftoverTypeId: {
              input = E.left({ rp, rc, left: left.nextChannel() })
              break
            }
            case Channel.NeedInputTypeId: {
              input = E.left({ rp, rc, left: left.fromUpstream() })
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
            case Channel.WithTracerTypeId: {
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
                right: right.nextChannel()
              })
              break
            }
            case Channel.NeedInputTypeId: {
              input = E.left({ rp: right.nextChannel, rc: right.fromUpstream, left })
              break
            }
            case Channel.ChannelMTypeId: {
              return M.chain_(right.nextChannel, (p) =>
                connectResumeGo(E.right({ left, right: p }))
              )
            }
          }
          break
        }
      }
    }
    throw new Error("Bug")
  })
}

/**
 * Connect a `Stream` to a `Sink` until the latter closes. Returns both the
 * most recent state of the `Stream` and the result of the `Sink`.
 */
export function connectResume_<R, E, O, A>(
  source: Stream<R, E, O>,
  sink: Sink.Sink<R, E, O, O, A>
): M.Managed<R, E, readonly [Stream<R, E, O>, A]> {
  return connectResumeGo(E.right({ left: source, right: sink }))
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
  f: (a: A) => T.Effect<R1, E1, B>
): Stream<R & R1, E | E1, B> {
  return Channel.combine_(
    self,
    Channel.awaitForever((x: A) => fromEffect(f(x)))
  )
}

/**
 * Maps the stream output using the effectul function f
 *
 * @dataFirst mapM_
 */
export function mapM<R, R1, E1, E, A, B>(
  f: (a: A) => T.Effect<R1, E1, B>
): (self: Stream<R, E, A>) => Stream<R & R1, E | E1, B> {
  return (self) => mapM_(self, f)
}

/**
 * Maps the stream output using f
 */
export function map_<R, E, A, B>(
  self: Stream<R, E, A>,
  f: (a: A) => B,
  __trace?: string
): Stream<R, E, B> {
  return Channel.combine_(
    self,
    Channel.awaitForever((x: A) => succeed(f(x)), __trace)
  )
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
  return (self) => map_(self, f, __trace)
}

/**
 * Maps the stream output using f
 */
export function mapConcat_<R, E, A, B>(
  self: Stream<R, E, A>,
  f: (a: A) => Iterable<B>
): Stream<R, E, B> {
  return Channel.combine_(
    self,
    Channel.awaitForever((x: A) => iterable(f(x)))
  )
}

/**
 * Maps the stream output using f
 *
 * @dataFirst mapConcat_
 */
export function mapConcat<A, B>(
  f: (a: A) => Iterable<B>
): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B> {
  return (self) => mapConcat_(self, f)
}

/**
 * Maps the stream output using f
 */
export function mapConcatM_<R, E, A, R1, E1, B>(
  self: Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, Iterable<B>>
): Stream<R & R1, E | E1, B> {
  return Channel.combine_(
    self,
    Channel.awaitForever((x: A) => Channel.effect(T.map_(f(x), iterable)))
  )
}

/**
 * Maps the stream output using f
 *
 * @dataFirst mapConcatM_
 */
export function mapConcatM<R1, E1, A, B>(
  f: (a: A) => T.Effect<R1, E1, Iterable<B>>
): <R, E>(self: Stream<R, E, A>) => Stream<R & R1, E | E1, B> {
  return (self) => mapConcatM_(self, f)
}

/**
 * Monadic chain
 */
export function chain_<R, E, R1, E1, A, B>(
  self: Stream<R, E, A>,
  f: (a: A) => Stream<R1, E1, B>
): Stream<R & R1, E | E1, B> {
  return Channel.combine_(self, Channel.awaitForever(f))
}

/**
 * Monadic chain
 *
 * @dataFirst chain_
 */
export function chain<R, E, A, B>(
  f: (a: A) => Stream<R, E, B>
): <R1, E1>(self: Stream<R1, E1, A>) => Stream<R & R1, E | E1, B> {
  return (self) => chain_(self, f)
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
  right: Channel.Channel<R1, E1, A, A, O, void, void>
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
  right: Channel.Channel<R1, E1, A, A, O, void, void>
) => <R, E>(left: Stream<R, E, A>) => Stream<R & R1, E | E1, O> = Channel.combine

/**
 * Catch all exceptions thrown by the current component of the pipeline.
 */
export const catchAll_: <R, E, A, R1, E1, A1>(
  self: Stream<R, E, A>,
  f: (e: E) => Stream<R1, E1, A1>
) => Stream<R & R1, E1, A | A1> = Channel.catchAll_

/**
 * Catch all exceptions thrown by the current component of the pipeline.
 *
 * @dataFirst catchAll_
 */
export const catchAll: <E, R1, E1, A1>(
  f: (e: E) => Stream<R1, E1, A1>
) => <R, A>(self: Stream<R, E, A>) => Stream<R & R1, E1, A | A1> = Channel.catchAll
