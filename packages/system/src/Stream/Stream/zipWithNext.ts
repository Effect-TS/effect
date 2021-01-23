import * as A from "../../Chunk"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import * as Pull from "../Pull"
import { Stream } from "./definitions"

/**
 * Zips each element with the next element if present.
 */
export function zipWithNext<R, E, O>(
  self: Stream<R, E, O>
): Stream<R, E, readonly [O, O.Option<O>]> {
  return new Stream(
    pipe(
      M.do,
      M.bind("chunks", () => self.proc),
      M.bind("ref", () => T.toManaged_(Ref.makeRef<O.Option<O>>(O.none))),
      M.let("last", ({ ref }) =>
        pipe(
          Ref.getAndSet_(ref, O.none),
          T.some,
          T.map((_) => [_, O.none] as const),
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
              A.mapAccum(prev)(
                (prev, curr) =>
                  [O.some(curr), O.map_(prev, (_) => [_, curr] as const)] as const
              )
            )
          ),
          T.tap(({ sc }) => ref.set(sc[0])),
          T.bind("result", ({ sc }) =>
            Pull.emitChunk(
              A.filterMap_(
                sc[1],
                O.fold(
                  () => O.none,
                  ([prev, curr]) => O.some([prev, O.some(curr)] as const)
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
