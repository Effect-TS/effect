import * as SortedSet from "../../Collections/Immutable/SortedSet"
import { runtimeOrd } from "../../Fiber/runtimeOrd.js"

export const fiberSet = SortedSet.make(runtimeOrd())
