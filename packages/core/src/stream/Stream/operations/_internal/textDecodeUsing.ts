import type { Chunk } from "../../../../collection/immutable/Chunk"
import { Channel } from "../../../Channel"
import type { Stream } from "../../../Stream"
import type { Charset } from "./Charset"
import { concreteStream, StreamInternal } from "./StreamInternal"
import { stringChunkFrom } from "./stringChunkFrom"

export function textDecodeUsing(charset: Charset, __tsplusTrace?: string) {
  return <R, E>(stream: Stream<R, E, number>): Stream<R, E, string> => {
    concreteStream(stream)
    return new StreamInternal(
      Channel.suspend(stream.channel >> transform<R, E>(charset))
    )
  }
}

function transform<R, E>(
  charset: Charset
): Channel<R, E, Chunk<number>, unknown, E, Chunk<string>, unknown> {
  return Channel.readWith(
    (received: Chunk<number>) =>
      received.isEmpty()
        ? transform(charset)
        : Channel.write(stringChunkFrom(received, charset)),
    (err) => Channel.fail(err),
    () => Channel.unit
  )
}
