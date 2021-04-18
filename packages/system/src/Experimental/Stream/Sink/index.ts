// tracing: off

import "../../../Operator"

import * as Chunk from "../../../Collections/Immutable/Chunk"
import * as St from "../../../Structural"
import * as C from "../Channel"

/**
 * Sink is a data type that represent a channel that reads elements
 * of type `In`, handles input errors of type `InErr`, emits errors
 * of type `OutErr`, emits outputs of type `L` and ends with a value
 * of type `Z`.
 */
export class Sink<R, InErr, In, OutErr, L, Z> implements St.HasEquals, St.HasHash {
  constructor(
    readonly channel: C.Channel<
      R,
      InErr,
      Chunk.Chunk<In>,
      unknown,
      OutErr,
      Chunk.Chunk<L>,
      Z
    >
  ) {}

  [St.hashSym](): number {
    return St.hashIncremental(this)
  }

  [St.equalsSym](that: unknown): boolean {
    return this === that
  }
}

function collectLoop<Err, A>(
  state: Chunk.Chunk<A>
): C.Channel<
  unknown,
  Err,
  Chunk.Chunk<A>,
  unknown,
  Err,
  Chunk.Chunk<never>,
  Chunk.Chunk<A>
> {
  return C.readWithCause(
    (i) => collectLoop(Chunk.concat_(state, i)),
    C.halt,
    (_) => C.end(state)
  )
}

/**
 * A sink that collects all of its inputs into a chunk.
 */
export function collectAll<Err, A>() {
  return new Sink(collectLoop<Err, A>(Chunk.empty()))
}

/**
 * A sink that ignores all of its inputs.
 */
export function drain<Err, A>() {
  const drain: C.Channel<
    unknown,
    Err,
    Chunk.Chunk<A>,
    unknown,
    Err,
    Chunk.Chunk<never>,
    void
  > = C.readWithCause(
    (_) => drain,
    C.halt,
    (_) => C.unit
  )

  return new Sink(drain)
}
