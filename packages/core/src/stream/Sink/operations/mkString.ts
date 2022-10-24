import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * @tsplus static effect/core/stream/Sink.Ops mkString
 * @category constructors
 * @since 1.0.0
 */
export function mkString(): Sink<never, never, unknown, never, string> {
  return Sink.suspend(() => {
    const strings: Array<string> = []
    return Sink.foldLeftChunks(
      "",
      (_, elems): string => {
        pipe(
          elems,
          Chunk.forEach((elem) => {
            strings.push(String(elem))
          })
        )
        return strings.join("")
      }
    )
  })
}
