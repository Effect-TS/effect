import type * as A from "../../Chunk"
import type * as O from "../../Option"
import type * as T from "../_internal/effect"
import type * as M from "../_internal/managed"
import { Stream } from "./definitions"

export function source<R, E, A>(
  managedSource: M.Managed<R, never, T.Effect<R, O.Option<E>, A.Chunk<A>>>
) {
  return new Stream(managedSource)
}
