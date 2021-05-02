import * as SortedSet from "../Collections/Immutable/SortedSet"
import { runtimeOrd } from "../Fiber"

export const fiberSet = SortedSet.make(runtimeOrd())
