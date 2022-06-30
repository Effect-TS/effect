import { constVoid } from "@tsplus/stdlib/data/Function"

/**
 * @tsplus static effect/core/stream/Sink.Ops mkString
 */
export function mkString(
  __tsplusTrace?: string
): Sink<never, never, unknown, never, string> {
  return Sink.suspend(() => {
    const strings: Array<string> = []
    return Sink.foldLeftChunks(constVoid, (_, elems) =>
      elems.forEach((elem) => {
        strings.push(String(elem))
      })).map(() => strings.join(""))
  })
}
