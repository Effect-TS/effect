// ets_tracing: off

import type { Compact } from "../Compact"
import type * as HKT from "../HKT"
import type { Separate } from "../Separate"

export interface Compactable<F extends HKT.HKT> extends Compact<F>, Separate<F> {}
