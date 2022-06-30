import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * @tsplus static effect/core/stream/Sink.Ops dropWhile
 */
export function dropWhile<In>(
  p: Predicate<In>,
  __tsplusTrace?: string
): Sink<never, never, In, In, unknown> {
  const loop: Channel<
    never,
    never,
    Chunk<In>,
    unknown,
    never,
    Chunk<In>,
    unknown
  > = Channel.readWith(
    (chunk: Chunk<In>) => {
      const leftover = chunk.dropWhile(p)
      const more = leftover.isEmpty
      return more
        ? loop
        : Channel.write(leftover) > Channel.identity<never, Chunk<In>, unknown>()
    },
    (err) => Channel.fail(() => err),
    () => Channel.unit
  )
  return new SinkInternal(loop)
}
