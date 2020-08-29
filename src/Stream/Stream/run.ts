import type * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import { pipe } from "../../Function"
import type * as Sink from "../Sink"
import type { Stream } from "./definitions"
import { runManaged } from "./runManaged"

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export const run = <S1, R1, E1, O, B>(sink: Sink.Sink<S1, R1, E1, O, any, B>) => <
  S,
  R,
  E
>(
  self: Stream<S, R, E, O>
): T.Effect<S1 | S, R & R1, E1 | E, B> => pipe(self, runManaged(sink), M.useNow)
