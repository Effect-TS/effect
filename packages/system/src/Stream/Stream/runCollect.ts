import type * as T from "../_internal/effect"
import type * as Array from "../../Array"
import { pipe } from "../../Function"
import * as Sink from "../Sink"
import type { Stream } from "./definitions"
import { run } from "./run"

/**
 * Runs the stream and collects all of its elements to an array.
 */
export const runCollect = <R, E, O>(
  self: Stream<R, E, O>
): T.Effect<R, E, Array.Array<O>> => pipe(self, run(Sink.collectAll<O>()))
