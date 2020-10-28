import type { Array } from "../../Array"
import type { Effect } from "../../Effect"
import type { Managed } from "../../Managed"
import type { Option } from "../../Option"
import { Stream } from "./definitions"

export function source<R, E, A>(
  managedSource: Managed<R, never, Effect<R, Option<E>, Array<A>>>
) {
  return new Stream(managedSource)
}
