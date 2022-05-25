import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { TextEncoder } from "util"

export function utfEncodeFor(
  bom: Chunk<number> = Chunk.empty<number>(),
  __tsplusTrace?: string
) {
  return <R, E>(stream: Stream<R, E, string>): Stream<R, E, number> => {
    concreteStream(stream)
    return new StreamInternal(
      Channel.suspend(() => {
        const transform: Channel<
          R,
          E,
          Chunk<string>,
          unknown,
          E,
          Chunk<number>,
          unknown
        > = Channel.readWith(
          (received: Chunk<string>) => {
            if (received.isEmpty()) {
              return transform
            }
            const bytes = received.reduce(Chunk.empty<number>(), (acc, string) => {
              // @ts-expect-error
              const encoder: TextEncoder = new TextEncoder()
              const bytes = encoder.encode(string)
              return acc + Chunk.from(bytes)
            })
            return Channel.write(bytes) > transform
          },
          (err) => Channel.fail(err),
          () => Channel.unit
        )
        const channel = Channel.write(bom) > transform
        return stream.channel >> channel
      })
    )
  }
}
