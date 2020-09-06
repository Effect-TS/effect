import { identity } from "../../Function"
import { chain } from "./chain"
import type { Stream } from "./definitions"

/**
 * Flattens this stream-of-streams into a stream made of the concatenation in
 * strict order of all the streams.
 */
export const flatten: <S1, R1, E1, S, R, E, A>(
  streams: Stream<S1, R1, E1, Stream<S, R, E, A>>
) => Stream<S1 | S, R1 & R, E1 | E, A> = chain(identity)
