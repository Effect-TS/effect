// ets_tracing: off

import type { OptionURI } from "../../Modules/index.js"
import * as P from "../../Prelude/index.js"
import { filter } from "../operations/filter.js"
import { filterMap } from "../operations/filterMap.js"
import { partition } from "../operations/partition.js"
import { partitionMap } from "../operations/partitionMap.js"

export const Filterable = P.instance<P.Filterable<[P.URI<OptionURI>]>>({
  filter,
  filterMap,
  partition,
  partitionMap
})
