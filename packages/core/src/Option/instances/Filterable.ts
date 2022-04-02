// ets_tracing: off

import * as P from "../../Prelude/index.js"
import type { OptionF } from "../definitions.js"
import { filter } from "../operations/filter.js"
import { filterMap } from "../operations/filterMap.js"
import { partition } from "../operations/partition.js"
import { partitionMap } from "../operations/partitionMap.js"

export const Filterable = P.instance<P.Filterable<OptionF>>({
  filter,
  filterMap,
  partition,
  partitionMap
})
