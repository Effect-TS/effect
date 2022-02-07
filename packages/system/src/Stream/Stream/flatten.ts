// ets_tracing: off

import { identity } from "../../Function/index.js"
import { chain } from "./chain.js"
import type { Stream } from "./definitions.js"

/**
 * Flattens this stream-of-streams into a stream made of the concatenation in
 * strict order of all the streams.
 */
export const flatten: <R1, E1, R, E, A>(
  streams: Stream<R1, E1, Stream<R, E, A>>
) => Stream<R1 & R, E1 | E, A> = chain(identity)
