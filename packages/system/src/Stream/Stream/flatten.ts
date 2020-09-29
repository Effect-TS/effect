import { identity } from "../../Function"
import { chain } from "./chain"
import type { Stream } from "./definitions"

/**
 * Flattens this stream-of-streams into a stream made of the concatenation in
 * strict order of all the streams.
 */
export const flatten: <R1, E1, R, E, A>(
  streams: Stream<R1, E1, Stream<R, E, A>>
) => Stream<R1 & R, E1 | E, A> = chain(identity)
