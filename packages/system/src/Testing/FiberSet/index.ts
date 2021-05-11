import * as SortedSet from "../../Collections/Immutable/SortedSet"
import { runtimeOrd } from "../../Fiber/runtimeOrd"

export const fiberSet = SortedSet.make(runtimeOrd())
