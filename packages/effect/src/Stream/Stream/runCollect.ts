import type * as T from "../_internal/effect"
import type * as A from "../../Array"
import { pipe } from "../../Function"
import * as Sink from "../Sink"
import type { Stream } from "./definitions"
import { run } from "./run"

/**
 * Runs the stream and collects all of its elements to an array.
 */
export const runCollect = <S, R, E, O>(
  self: Stream<S, R, E, O>
): T.Effect<S, R, E, A.Array<O>> => pipe(self, run(Sink.collectAll<O>()))
