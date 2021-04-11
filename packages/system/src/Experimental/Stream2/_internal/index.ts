// tracing: off

import "../../../Operator"

import * as Chunk from "../../../Collections/Immutable/Chunk"
import * as T from "../../../Effect"
import * as C from "../Channel"
import * as Sink from "../Sink"

export const StreamTypeId = Symbol()
export type StreamTypeId = typeof StreamTypeId

export class Stream<R, E, A> {
  readonly _typeId: StreamTypeId = StreamTypeId;
  readonly [T._R]!: (_: R) => void;
  readonly [T._E]!: () => E;
  readonly [T._A]!: () => A

  constructor(
    readonly channel: C.Channel<
      R,
      unknown,
      unknown,
      unknown,
      E,
      Chunk.Chunk<A>,
      unknown
    >
  ) {}
}

/**
 * Creates a single-valued pure stream
 */
export function succeed<O>(o: O): Stream<unknown, never, O> {
  return fromChunk(Chunk.single(o))
}

/**
 * Creates a single-valued pure stream
 */
export function succeedL<O>(o: () => O): Stream<unknown, never, O> {
  return fromChunkL(() => Chunk.single(o()))
}

/**
 * Creates a stream from a `Chunk` of values
 *
 * @param c a chunk of values
 * @return a finite stream of values
 */
export function fromChunk<O>(c: Chunk.Chunk<O>): Stream<unknown, never, O> {
  return new Stream(C.unwrap(T.effectTotal(() => C.write(c))))
}

/**
 * Creates a stream from a `Chunk` of values
 *
 * @param c a chunk of values
 * @return a finite stream of values
 */
export function fromChunkL<O>(c: () => Chunk.Chunk<O>): Stream<unknown, never, O> {
  return new Stream(C.unwrap(T.effectTotal(() => C.writeL(c))))
}

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f`
 */
export function chain_<R, E, O, R1, E1, O1>(
  self: Stream<R, E, O>,
  f: (o: O) => Stream<R1, E1, O1>
): Stream<R & R1, E | E1, O1> {
  return new Stream(
    C.concatMap_(self.channel, (o) =>
      Chunk.reduce_(
        Chunk.map_(o, (x) => f(x).channel),
        C.unit as C.Channel<
          R1,
          unknown,
          unknown,
          unknown,
          E1,
          Chunk.Chunk<O1>,
          unknown
        >,
        (s, a) => C.chain_(s, () => a)
      )
    )
  )
}

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f`
 *
 * @dataFirst chain_
 */
export function chain<O, R1, E1, O1>(
  f: (o: O) => Stream<R1, E1, O1>
): <R, E>(self: Stream<R, E, O>) => Stream<R & R1, E | E1, O1> {
  return (self) => chain_(self, f)
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function run_<R, E, A, R2, E2, Z>(
  self: Stream<R, E, A>,
  sink: Sink.Sink<R2, E, A, E2, unknown, Z>
): T.Effect<R & R2, E2, Z> {
  return C.runDrain(self.channel[">>>"](sink.channel))
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 *
 * @dataFirst run_
 */
export function run<E, A, R2, E2, Z>(
  sink: Sink.Sink<R2, E, A, E2, unknown, Z>
): <R>(self: Stream<R, E, A>) => T.Effect<R & R2, E2, Z> {
  return (self) => run_(self, sink)
}

/**
 * Runs the stream and collects all of its elements to a chunk.
 */
export function runCollect<R, E, A>(
  self: Stream<R, E, A>
): T.Effect<R, E, Chunk.Chunk<A>> {
  return run_(self, Sink.collect())
}

/**
 * Transforms the elements of this stream using the supplied function.
 */
export function map_<R, E, O, O1>(
  self: Stream<R, E, O>,
  f: (o: O) => O1
): Stream<R, E, O1> {
  return new Stream(C.mapOut_(self.channel, (o) => Chunk.map_(o, f)))
}

/**
 * Transforms the elements of this stream using the supplied function.
 *
 * @dataFirst map_
 */
export function map<O, O1>(
  f: (o: O) => O1
): <R, E>(self: Stream<R, E, O>) => Stream<R, E, O1> {
  return (self) => map_(self, f)
}
