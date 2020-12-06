import type * as A from "../../Chunk"
import { pipe } from "../../Function"
import type * as T from "../_internal/effect"
import * as SK from "../Sink"
import type { Stream } from "./definitions"
import { run } from "./run"

/**
 * Runs the stream and collects all of its elements to an array.
 */
export const runCollect = <R, E, O>(
  self: Stream<R, E, O>
): T.Effect<R, E, A.Chunk<O>> => pipe(self, run(SK.collectAll<O>()))
