// ets_tracing: off

import * as SortedSet from "../../Collections/Immutable/SortedSet/index.js"
import { runtimeOrd } from "../../Fiber/runtimeOrd.js"

export const fiberSet = SortedSet.make(runtimeOrd())
