import * as A from "../../Array"
import * as C from "../../Cause"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import * as Pull from "../Pull"
import { Stream } from "./definitions"
import { halt } from "./halt"

class State<X> {
  constructor(public buffer: A.Array<X>, public done: boolean) {}
}

/**
 * Re-chunks the elements of the stream into chunks of
 * `n` elements each.
 * The last chunk might contain less than `n` elements
 */
export function chunkN_<R, E, O>(self: Stream<R, E, O>, n: number): Stream<R, E, O> {
  const emitOrAccumulate = (
    buffer: A.Array<O>,
    done: boolean,
    ref: Ref.Ref<State<O>>,
    pull: T.Effect<R, O.Option<E>, A.Array<O>>
  ): T.Effect<R, O.Option<E>, A.Array<O>> => {
    if (buffer.length < n) {
      if (done) {
        if (A.isEmpty(buffer)) {
          return Pull.end
        } else {
          return T.andThen_(ref.set(new State(A.empty, true)), Pull.emitChunk(buffer))
        }
      } else {
        return T.foldM_(
          pull,
          O.fold(() => emitOrAccumulate(buffer, true, ref, pull), Pull.fail),
          (ch) => emitOrAccumulate([...buffer, ...ch], false, ref, pull)
        )
      }
    } else {
      const [chunk, leftover] = A.splitAt_(buffer, n)

      return T.andThen_(ref.set(new State(leftover, done)), Pull.emitChunk(chunk))
    }
  }

  if (n < 1) {
    return halt(C.die(new C.IllegalArgumentException("chunkN: n must be at least 1")))
  } else {
    return new Stream(
      pipe(
        M.do,
        M.bind("ref", () =>
          T.toManaged_(Ref.makeRef<State<O>>(new State(A.empty, false)))
        ),
        M.bind("p", () => self.proc),
        M.let("pull", ({ p, ref }) =>
          T.chain_(ref.get, (s) => emitOrAccumulate(s.buffer, s.done, ref, p))
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
