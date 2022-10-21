/**
 * @tsplus static effect/core/stream/Sink.Ops mkString
 */
export function mkString(): Sink<never, never, unknown, never, string> {
  return Sink.suspend(() => {
    const strings: Array<string> = []
    return Sink.foldLeftChunks(undefined as void, (_, elems) =>
      elems.forEach((elem) => {
        strings.push(String(elem))
      })).map(() => strings.join(""))
  })
}
