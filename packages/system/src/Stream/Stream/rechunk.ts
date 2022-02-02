// ets_tracing: off

import * as C from "../../Cause/index.js"
import * as A from "../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import * as Pull from "../Pull/index.js"
import { Stream } from "./definitions.js"
import { halt } from "./halt.js"

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
    const {
      tuple: [chunk, leftover]
    } = A.splitAt_(buffer, n)

    return T.zipRight_(ref.set(new State(leftover, done)), Pull.emitChunk(chunk))
  }
}

/**
 * Re-chunks the elements of the stream into chunks of
 * `n` elements each.
 * The last chunk might contain less than `n` elements
 */
export function rechunk_<R, E, O>(self: Stream<R, E, O>, n: number): Stream<R, E, O> {
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
export function rechunk(n: number) {
  return <R, E, O>(self: Stream<R, E, O>) => rechunk_(self, n)
}
