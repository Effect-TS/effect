// tracing: off

import "../../../Operator"

import type * as Cause from "../../../Cause"
import * as Chunk from "../../../Collections/Immutable/Chunk"
import * as C from "../Channel"

export class Sink<R, InErr, In, OutErr, L, Z> {
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
    (i: Chunk.Chunk<A>) => collectLoop(Chunk.concat_(state, i)),
    (e: Cause.Cause<Err>) => C.halt(e),
    () => C.end(state)
  )
}

export function collect<Err, A>() {
  return new Sink(collectLoop<Err, A>(Chunk.empty()))
}
