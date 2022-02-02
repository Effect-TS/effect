// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Switches to the provided stream in case this one is empty.
 */
function defaultIfEmptyStream<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  stream: C.Stream<R1, E1, A1>
): C.Stream<R & R1, E | E1, A | A1> {
  const writer = (): CH.Channel<
    R1,
    E,
    CK.Chunk<A>,
    unknown,
    E | E1,
    CK.Chunk<A | A1>,
    any
  > =>
    CH.readWith(
      (in_) =>
        CK.isEmpty(in_)
          ? writer()
          : CH.zipRight_(CH.write(in_), CH.identity<E | E1, CK.Chunk<A | A1>, any>()),
      (e) => CH.fail(e),
      (_) => stream.channel
    )

  return new C.Stream(self.channel[">>>"](writer()))
}

/**
 * Produces the specified chunk if this stream is empty.
 */
function defaultIfEmptyChunk<R, E, A, A1>(
  self: C.Stream<R, E, A>,
  chunk: CK.Chunk<A1>
): C.Stream<R, E, A | A1> {
  return defaultIfEmptyStream(self, new C.Stream(CH.write(chunk)))
}

/**
 * Produces the specified element if this stream is empty.
 */
function defaultIfEmptyValue<R, E, A, A1>(
  self: C.Stream<R, E, A>,
  a: A1
): C.Stream<R, E, A | A1> {
  return defaultIfEmptyChunk(self, CK.single(a))
}

export function defaultIfEmpty_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  stream: C.Stream<R1, E1, A1>
): C.Stream<R & R1, E | E1, A | A1>
export function defaultIfEmpty_<R, E, A, A1>(
  self: C.Stream<R, E, A>,
  chunk: CK.Chunk<A1>
): C.Stream<R, E, A | A1>
export function defaultIfEmpty_<R, E, A, A1>(
  self: C.Stream<R, E, A>,
  a: A1
): C.Stream<R, E, A | A1>
export function defaultIfEmpty_<R, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  emptyValue: A1 | CK.Chunk<A1> | C.Stream<unknown, E1, A1>
): C.Stream<R, E | E1, A | A1> {
  if (CK.isChunk(emptyValue)) {
    return defaultIfEmptyChunk(self, emptyValue)
  }

  if (C.isStream(emptyValue)) {
    return defaultIfEmptyStream(self, emptyValue)
  }

  return defaultIfEmptyValue(self, emptyValue)
}

/**
 * @ets_data_first defaultIfEmpty_
 */
export function defaultIfEmpty<R, R1, E, E1, A, A1>(
  stream: C.Stream<R1, E1, A1>
): (self: C.Stream<R, E, A>) => C.Stream<R & R1, E | E1, A | A1>
export function defaultIfEmpty<R, E, A, A1>(
  chunk: CK.Chunk<A1>
): (self: C.Stream<R, E, A>) => C.Stream<R, E, A | A1>
export function defaultIfEmpty<R, E, A, A1>(
  a: A1
): (self: C.Stream<R, E, A>) => C.Stream<R, E, A | A1>
export function defaultIfEmpty<R, E, A>(
  emptyValue: unknown
): (self: C.Stream<R, E, A>) => C.Stream<R, E, unknown> {
  return (self: C.Stream<R, E, A>) => defaultIfEmpty_(self, emptyValue)
}
