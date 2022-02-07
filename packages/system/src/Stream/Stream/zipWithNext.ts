// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import * as Pull from "../Pull/index.js"
import { Stream } from "./definitions.js"

/**
 * Zips each element with the next element if present.
 */
export function zipWithNext<R, E, O>(
  self: Stream<R, E, O>
): Stream<R, E, Tp.Tuple<[O, O.Option<O>]>> {
  return new Stream(
    pipe(
      M.do,
      M.bind("chunks", () => self.proc),
      M.bind("ref", () => T.toManaged(Ref.makeRef<O.Option<O>>(O.none))),
      M.let("last", ({ ref }) =>
        pipe(
          Ref.getAndSet_(ref, O.none),
          T.some,
          T.map((_) => Tp.tuple(_, O.none)),
          T.map(A.single)
        )
      ),
      M.let("pull", ({ chunks, ref }) => {
        return pipe(
          T.do,
          T.bind("prev", () => ref.get),
          T.bind("chunk", () => chunks),
          T.let("sc", ({ chunk, prev }) =>
            pipe(
              chunk,
              A.mapAccum(prev, (prev, curr) =>
                Tp.tuple(
                  O.some(curr),
                  O.map_(prev, (_) => Tp.tuple(_, curr))
                )
              )
            )
          ),
          T.tap(({ sc }) => ref.set(sc.get(0))),
          T.bind("result", ({ sc }) =>
            Pull.emitChunk(
              A.collect_(
                sc.get(1),
                O.fold(
                  () => O.none,
                  ({ tuple: [prev, curr] }) => O.some(Tp.tuple(prev, O.some(curr)))
                )
              )
            )
          ),
          T.map(({ result }) => result)
        )
      }),
      M.map(({ last, pull }) => T.orElseOptional_(pull, () => last))
    )
  )
}
