// forked from https://github.com/planttheidea/fast-equals

import { createComparator } from "./comparator"
import { createCircularEqualCreator } from "./utils"

export const equals = createComparator(createCircularEqualCreator())
