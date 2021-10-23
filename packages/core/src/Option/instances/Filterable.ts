// ets_tracing: off

import type { OptionURI } from "../../Modules"
import * as P from "../../Prelude"
import { filter } from "../operations/filter"
import { filterMap } from "../operations/filterMap"
import { partition } from "../operations/partition"
import { partitionMap } from "../operations/partitionMap"

export const Filterable = P.instance<P.Filterable<[P.URI<OptionURI>]>>({
  filter,
  filterMap,
  partition,
  partitionMap
})
