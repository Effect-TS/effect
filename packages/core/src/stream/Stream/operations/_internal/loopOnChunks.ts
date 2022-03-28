import type { Chunk } from "../../../../collection/immutable/Chunk"
import { Channel } from "../../../Channel"
import type { Stream } from "../../definition"
import { concreteStream, StreamInternal } from "./StreamInternal"

export function loopOnChunks<R, E, A, R1, E1, A1>(
  self: Stream<R, E, A>,
  f: (
    a: Chunk<A>
  ) => Channel<R1, E | E1, Chunk<A>, unknown, E | E1, Chunk<A1>, boolean>,
  __tsplusTrace?: string
): Stream<R & R1, E | E1, A1> {
  const loop: Channel<
    R1,
    E | E1,
    Chunk<A>,
    unknown,
    E | E1,
    Chunk<A1>,
    boolean
  > = Channel.readWith(
    (chunk: Chunk<A>) =>
      f(chunk).flatMap((cont) => (cont ? loop : Channel.succeedNow(false))),
    (e) => Channel.fail(e),
    () => Channel.succeed(false)
  )
  concreteStream(self)
  return new StreamInternal(self.channel >> loop)
}
