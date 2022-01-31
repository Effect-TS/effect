// ets_tracing: off

import type * as A from "../../Collections/Immutable/Chunk/index.js"
import type * as O from "../../Option/index.js"
import type * as T from "../_internal/effect.js"
import type * as M from "../_internal/managed.js"
import { Stream } from "./definitions.js"

export function source<R, E, A>(
  managedSource: M.Managed<R, never, T.Effect<R, O.Option<E>, A.Chunk<A>>>
) {
  return new Stream(managedSource)
}
