// tracing: off

import * as T from "../../Effect"
import * as E from "../../Either"
import { tuple } from "../../Function"
import * as M from "../../Managed"
import type * as NA from "../../NonEmptyArray"
import * as Channel from "../Channel"
import * as Pipeline from "../Pipeline"
import * as Sink from "../Sink"

/**
 * Provides a stream of output values, without consuming any input or
 * producing a final result.
 */
export interface Stream<R, E, O> extends Pipeline.Pipeline<R, E, any, O, void> {}

/**
 * Take only the first N values from the stream
 */
export function takeN_<R, E, A>(self: Stream<R, E, A>, n: number): Stream<R, E, A> {
  return Pipeline.fuse_(self, Pipeline.isolate(n))
}

/**
 * Take only the first N values from the stream
 *
 * @dataFirst takeN_
 */
export function takeN(n: number): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A> {
  return (self) => takeN_(self, n)
}

type ConnectResumeGo<R, E, O, A> = E.Either<
  {
    rp: (i: O) => Sink.Sink<R, E, O, A>
    rc: (u: void) => Sink.Sink<R, E, O, A>
    left: Stream<R, E, O>
  },
  {
    left: Stream<R, E, O>
    right: Sink.Sink<R, E, O, A>
  }
>

function connectResumeGo<R, E, O, A>(
  input: ConnectResumeGo<R, E, O, A>
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
}

/**
 * Connect a `Stream` to a `Sink` until the latter closes. Returns both the
 * most recent state of the `Stream` and the result of the `Sink`.
 */
export function connectResume<R, E, O, A>(
  source: Stream<R, E, O>,
  sink: Sink.Sink<R, E, O, A>
): M.Managed<R, E, readonly [Stream<R, E, O>, A]> {
  return connectResumeGo(E.right({ left: source, right: sink }))
}

/**
 * Run a pipeline until processing completes, collecting elements into an array
 */
export function runArray<R, E, O>(self: Stream<R, E, O>) {
  return M.useNow(Pipeline.run(Pipeline.fuse_(self, Sink.array())))
}

/**
 * Run a pipeline until processing completes, collecting elements into a list
 */
export function runList<R, E, O>(self: Stream<R, E, O>) {
  return M.useNow(Pipeline.run(Pipeline.fuse_(self, Sink.list())))
}

/**
 * Run a pipeline until processing completes, discarding elements
 */
export function runDrain<R, E, O>(self: Stream<R, E, O>) {
  return M.useNow(Pipeline.run(Pipeline.fuse_(self, Sink.drain())))
}

/**
 * Send a single output value downstream. If the downstream `Channel`
 * terminates, this `Channel` will terminate as well.
 */
export function write<O>(o: O): Stream<unknown, never, O> {
  return Channel.haveOutput(() => Channel.unit, o)
}

/**
 * Send a single output value downstream. If the downstream `Channel`
 * terminates, this `Channel` will terminate as well.
 */
export function writeEffect<R, E, O>(o: T.Effect<R, E, O>): Stream<R, E, O> {
  return Channel.effect(T.map_(o, write))
}

function iterateGo<O>(x: O, f: (x: O) => O): Stream<unknown, never, O> {
  return Channel.haveOutput(() => iterateGo(f(x), f), x)
}

/**
 * Produces an infinite stream of repeated applications of f to x.
 */
export function iterate<O>(
  x: O,
  f: (x: O) => O,
  __trace?: string
): Stream<unknown, never, O> {
  return Channel.channelM(M.effectTotal(() => iterateGo(x, f), __trace))
}

/**
 * Send a bunch of values downstream to the next component to consume. If the
 * downstream component terminates, this call will never return control.
 */
export function writeMany<O>(...os: NA.NonEmptyArray<O>): Stream<unknown, never, O> {
  return writeIterable(os)
}

function writeIterableGo<O>(
  iterator: Iterator<O, any, undefined>,
  next: IteratorResult<O, any>
): Stream<unknown, never, O> {
  if (next.done) {
    return Channel.unit
  } else {
    return Channel.haveOutput(
      () => writeIterableGo(iterator, iterator.next()),
      next.value
    )
  }
}

/**
 * Converts an iterable into a stream (lazy)
 */
export function writeIterable<O>(it: Iterable<O>): Stream<unknown, never, O> {
  return new Channel.ChannelM(
    M.effectTotal(() => {
      const iterator = it[Symbol.iterator]()
      return writeIterableGo(iterator, iterator.next())
    })
  )
}

/**
 * Maps the stream output using the effectul function f
 */
export function mapEffect_<R, R1, E1, E, A, B>(
  self: Stream<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, B>
): Stream<R & R1, E | E1, B> {
  return Pipeline.fuse_(
    self,
    Channel.awaitForever((x: A) => writeEffect(f(x)))
  )
}

/**
 * Maps the stream output using the effectul function f
 *
 * @dataFirst mapEffect_
 */
export function mapEffect<R, R1, E1, E, A, B>(
  f: (a: A) => T.Effect<R1, E1, B>
): (self: Stream<R, E, A>) => Stream<R & R1, E | E1, B> {
  return (self) => mapEffect_(self, f)
}

/**
 * Maps the stream output using f
 */
export function map_<R, E, A, B>(
  self: Stream<R, E, A>,
  f: (a: A) => B
): Stream<R, E, B> {
  return Pipeline.fuse_(
    self,
    Channel.awaitForever((x: A) => write(f(x)))
  )
}

/**
 * Maps the stream output using f
 *
 * @dataFirst map_
 */
export function map<A, B>(
  f: (a: A) => B
): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B> {
  return (self) => map_(self, f)
}

/**
 * Maps the stream output using f
 */
export function mapConcat_<R, E, A, B>(
  self: Stream<R, E, A>,
  f: (a: A) => Iterable<B>
): Stream<R, E, B> {
  return Pipeline.fuse_(
    self,
    Channel.awaitForever((x: A) => writeIterable(f(x)))
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
  f: (a: A) => M.Managed<R1, E1, Iterable<B>>
): Stream<R & R1, E | E1, B> {
  return Pipeline.fuse_(
    self,
    Channel.awaitForever((x: A) => Channel.channelM(M.map_(f(x), writeIterable)))
  )
}

/**
 * Maps the stream output using f
 *
 * @dataFirst mapConcatM_
 */
export function mapConcatM<R1, E1, A, B>(
  f: (a: A) => M.Managed<R1, E1, Iterable<B>>
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
  return Pipeline.fuse_(self, Channel.awaitForever(f))
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
 * Concat the streams first self then that
 */
export function concatL_<R, E, A, R1, E1, B>(
  self: Stream<R, E, A>,
  that: () => Stream<R1, E1, B>
): Stream<R & R1, E | E1, A | B> {
  Channel.concrete(self)
  switch (self._typeId) {
    case Channel.DoneTypeId: {
      return that()
    }
    case Channel.HaveOutputTypeId: {
      return new Channel.HaveOutput(
        () => concatL_(self.nextChannel(), that),
        self.output
      )
    }
    case Channel.NeedInputTypeId: {
      return new Channel.NeedInput(
        (i) => concatL_(self.nextChannel(i), that),
        (u) => concatL_(self.fromUpstream(u), that)
      )
    }
    case Channel.ChannelMTypeId: {
      return new Channel.ChannelM(M.map_(self.nextChannel, (p) => concatL_(p, that)))
    }
    case Channel.LeftoverTypeId: {
      return new Channel.Leftover(
        () => concatL_(self.nextChannel(), that),
        self.leftover
      )
    }
  }
}

/**
 * Concat the streams first self then that
 *
 * @dataFirst concatL_
 */
export function concatL<R1, E1, B>(
  that: () => Stream<R1, E1, B>
): <R, E, A>(self: Stream<R, E, A>) => Stream<R & R1, E | E1, A | B> {
  return (self) => concatL_(self, that)
}

/**
 * Concat the streams first self then that
 */
export function concat_<R, E, A, R1, E1, B>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, B>
): Stream<R & R1, E | E1, A | B> {
  return concatL_(self, () => that)
}

/**
 * Concat the streams first self then that
 *
 * @dataFirst concat_
 */
export function concat<R1, E1, B>(
  that: Stream<R1, E1, B>
): <R, E, A>(self: Stream<R, E, A>) => Stream<R & R1, E | E1, A | B> {
  return (self) => concat_(self, that)
}

/**
 * Repeats the stream forever
 */
export function forever<R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> {
  Channel.concrete(self)
  if (self._typeId === Channel.DoneTypeId) {
    return self
  }
  return concatL_(self, () => forever(self))
}
