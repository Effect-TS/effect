import { Chunk } from "../../../collection/immutable/Chunk"
import { Channel } from "../../Channel"
import { Stream } from "../../Stream"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * If this stream is empty, produce the specified element or chunk of elements,
 * or switch to the specified stream.
 *
 * @tsplus fluent ets/Stream defaultIfEmpty
 */
export function defaultIfEmpty_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  stream: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, A | A1>
export function defaultIfEmpty_<R, E, A, A1>(
  self: Stream<R, E, A>,
  chunk: Chunk<A1>
): Stream<R, E, A | A1>
export function defaultIfEmpty_<R, E, A, A1>(
  self: Stream<R, E, A>,
  a: A1
): Stream<R, E, A | A1>
export function defaultIfEmpty_<R, E, E1, A, A1>(
  self: Stream<R, E, A>,
  emptyValue: A1 | Chunk<A1> | Stream<unknown, E1, A1>
): Stream<R, E | E1, A | A1> {
  if (Chunk.isChunk(emptyValue)) {
    return defaultIfEmptyChunk(self, emptyValue)
  }
  if (Stream.isStream(emptyValue)) {
    return defaultIfEmptyStream(self, emptyValue)
  }
  return defaultIfEmptyValue(self, emptyValue)
}

/**
 * If this stream is empty, produce the specified element or chunk of elements,
 * or switch to the specified stream.
 */
export const defaultIfEmpty = Pipeable(defaultIfEmpty_)

/**
 * Produces the specified element if this stream is empty.
 */
function defaultIfEmptyValue<R, E, A, A1>(
  self: Stream<R, E, A>,
  a: A1
): Stream<R, E, A | A1> {
  return defaultIfEmptyChunk(self, Chunk.single(a))
}

/**
 * Produces the specified chunk if this stream is empty.
 */
function defaultIfEmptyChunk<R, E, A, A1>(
  self: Stream<R, E, A>,
  chunk: Chunk<A1>
): Stream<R, E, A | A1> {
  return defaultIfEmptyStream(self, new StreamInternal(Channel.write(chunk)))
}

/**
 * Switches to the provided stream in case this one is empty.
 */
function defaultIfEmptyStream<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  stream: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, A | A1> {
  const writer: Channel<
    R1,
    E,
    Chunk<A>,
    unknown,
    E | E1,
    Chunk<A | A1>,
    any
  > = Channel.readWith(
    (input: Chunk<A>) =>
      input.isEmpty()
        ? writer
        : Channel.write(input) > Channel.identity<E | E1, Chunk<A | A1>, unknown>(),
    (e) => Channel.fail(e),
    () => {
      concreteStream(stream)
      return stream.channel
    }
  )

  concreteStream(self)

  return new StreamInternal(self.channel >> writer)
}
