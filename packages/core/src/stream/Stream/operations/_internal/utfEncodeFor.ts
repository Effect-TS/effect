import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { TextEncoder } from "util"

/** @internal */
export function utfEncodeFor(bom: Chunk.Chunk<number> = Chunk.empty) {
  return <R, E>(stream: Stream<R, E, string>): Stream<R, E, number> => {
    concreteStream(stream)
    return new StreamInternal(
      Channel.suspend(() => {
        const transform: Channel<
          R,
          E,
          Chunk.Chunk<string>,
          unknown,
          E,
          Chunk.Chunk<number>,
          unknown
        > = Channel.readWith(
          (received: Chunk.Chunk<string>) => {
            if (Chunk.isEmpty(received)) {
              return transform
            }
            const bytes = pipe(
              received,
              Chunk.reduce(Chunk.empty as Chunk.Chunk<number>, (acc, string) => {
                // @ts-expect-error
                const encoder: TextEncoder = new TextEncoder()
                const bytes = encoder.encode(string)
                return pipe(acc, Chunk.concat(Chunk.fromIterable(bytes)))
              })
            )
            return Channel.write(bytes).flatMap(() => transform)
          },
          (err) => Channel.fail(err),
          () => Channel.unit
        )
        const channel = Channel.write(bom).flatMap(() => transform)
        return stream.channel.pipeTo(channel)
      })
    )
  }
}
