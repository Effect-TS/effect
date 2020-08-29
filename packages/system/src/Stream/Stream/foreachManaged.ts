import type * as T from "../_internal/effect"
import type * as M from "../_internal/managed"
import { pipe } from "../../Function"
import * as Sink from "../Sink"
import type { Stream } from "./definitions"
import { runManaged } from "./runManaged"

/**
 * Like `foreach`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export const foreachManaged = <A, S1, R1, E1>(
  f: (i: A) => T.Effect<S1, R1, E1, any>
) => <S, R, E>(self: Stream<S, R, E, A>): M.Managed<S1 | S, R & R1, E1 | E, void> =>
  pipe(self, runManaged(Sink.foreach(f)))
