import { pipe } from "../../Function"
import type * as T from "../_internal/effect"
import * as Sink from "../Sink"
import type { Stream } from "./definitions"
import { run } from "./run"

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export const foreach = <A, R1, E1>(f: (i: A) => T.Effect<R1, E1, any>) => <R, E>(
  self: Stream<R, E, A>
): T.Effect<R & R1, E1 | E, void> => pipe(self, run(Sink.foreach(f)))
