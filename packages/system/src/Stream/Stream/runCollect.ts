// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk"
import type * as L from "../../Collections/Immutable/List"
import { pipe } from "../../Function"
import * as T from "../_internal/effect"
import * as SK from "../Sink"
import type { Stream } from "./definitions"
import { run } from "./run"

/**
 * Runs the stream and collects all of its elements to an array.
 */
export const runCollect = <R, E, O>(
  self: Stream<R, E, O>
): T.Effect<R, E, readonly O[]> => pipe(self, run(SK.collectAll<O>()), T.map(A.toArray))

/**
 * Runs the stream and collects all of its elements to an array.
 */
export const runList = <R, E, O>(self: Stream<R, E, O>): T.Effect<R, E, L.List<O>> =>
  pipe(self, run(SK.collectAllToList<O>()))
