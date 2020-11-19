import { pipe } from "../../Function"
import type * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import type * as Sink from "../Sink"
import type { Stream } from "./definitions"
import { runManaged } from "./runManaged"

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export const run_ = <R, R1, E, E1, O, B>(
  self: Stream<R, E, O>,
  sink: Sink.Sink<R1, E1, O, any, B>
): T.Effect<R & R1, E1 | E, B> => pipe(self, runManaged(sink), M.useNow)

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export const run = <R1, E1, O, B>(sink: Sink.Sink<R1, E1, O, any, B>) => <R, E>(
  self: Stream<R, E, O>
) => run_(self, sink)
