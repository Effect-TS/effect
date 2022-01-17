// ets_tracing: off

import { succeed as succeedManaged } from "../../Managed/operations/succeed"
import type { Layer } from "../definition/base"
import { fromRawManaged } from "./fromRawManaged"

/**
 * Constructs a layer from the specified value.
 */
export function succeed<T>(resource: T): Layer<unknown, never, T> {
  return fromRawManaged(succeedManaged(() => resource))
}
