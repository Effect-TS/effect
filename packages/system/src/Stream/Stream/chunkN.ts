// tracing: off

import * as C from "../../Cause"
import * as A from "../../Collections/Immutable/Chunk"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import * as Pull from "../Pull"
import { Stream } from "./definitions"
import { halt } from "./halt"

class State<X> {
  constructor(public buffer: A.Chunk<X>, public done: boolean) {}
}

function emitOrAccumulate<R, E, O>(
  buffer: A.Chunk<O>,
  done: boolean,
  ref: Ref.Ref<State<O>>,
  pull: T.Effect<R, O.Option<E>, A.Chunk<O>>,
  n: number
): T.Effect<R, O.Option<E>, A.Chunk<O>> {
  if (A.size(buffer) < n) {
    if (done) {
      if (A.isEmpty(buffer)) {
        return Pull.end
      } else {
        return T.zipRight_(ref.set(new State(A.empty(), true)), Pull.emitChunk(buffer))
      }
    } else {
      return T.foldM_(
        pull,
        O.fold(() => emitOrAccumulate(buffer, true, ref, pull, n), Pull.fail),
        (ch) => emitOrAccumulate(A.concat_(buffer, ch), false, ref, pull, n)
      )
    }
  } else {
    const [chunk, leftover] = A.splitAt_(buffer, n)

    return T.zipRight_(ref.set(new State(leftover, done)), Pull.emitChunk(chunk))
  }
}

/**
 * Re-chunks the elements of the stream into chunks of
 * `n` elements each.
 * The last chunk might contain less than `n` elements
 */
export function chunkN_<R, E, O>(self: Stream<R, E, O>, n: number): Stream<R, E, O> {
  if (n < 1) {
    return halt(C.die(new C.IllegalArgumentException("chunkN: n must be at least 1")))
  } else {
    return new Stream(
      pipe(
        M.do,
        M.bind("ref", () =>
          T.toManaged(Ref.makeRef<State<O>>(new State(A.empty(), false)))
        ),
        M.bind("p", () => self.proc),
        M.let("pull", ({ p, ref }) =>
          T.chain_(ref.get, (s) => emitOrAccumulate(s.buffer, s.done, ref, p, n))
        ),
        M.map(({ pull }) => pull)
      )
    )
  }
}

/**
 * Re-chunks the elements of the stream into chunks of
 * `n` elements each.
 * The last chunk might contain less than `n` elements
 */
export function chunkN(n: number) {
  return <R, E, O>(self: Stream<R, E, O>) => chunkN_(self, n)
}
