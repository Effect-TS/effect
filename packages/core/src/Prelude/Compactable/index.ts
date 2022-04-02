// ets_tracing: off

import type { Compact } from "../Compact/index.js"
import type * as HKT from "../HKT/index.js"
import type { Separate } from "../Separate/index.js"

export interface Compactable<F extends HKT.HKT> extends Compact<F>, Separate<F> {}
