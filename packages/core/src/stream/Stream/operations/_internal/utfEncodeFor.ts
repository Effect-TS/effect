import { Chunk } from "../../../../collection/immutable/Chunk"
import { Channel } from "../../../Channel"
import type { Stream } from "../../definition"
import { concreteStream, StreamInternal } from "./StreamInternal"

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
              const encoder = new TextEncoder()
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
