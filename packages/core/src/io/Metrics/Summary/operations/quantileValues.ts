import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { Tuple } from "../../../../collection/immutable/Tuple"
import type { Option } from "../../../../data/Option"
import type { UIO } from "../../../Effect"
import type { Summary } from "../definition"
import { withSummary } from "./_internal/InternalSummary"

/**
 * Returns the values corresponding to each quantile in this summary.
 *
 * @tsplus fluent ets/Summary quantileValues
 */
export function quantileValues<A>(
  self: Summary<A>,
  __tsplusTrace?: string
): UIO<Chunk<Tuple<[number, Option<number>]>>> {
  return withSummary(self, (summary) => summary.quantileValues())
}
