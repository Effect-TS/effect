import type { Partition2 } from "fp-ts/lib/Filterable"

import * as RM from "../Readonly/Map/partition_"

import { URI } from "./URI"

export const partition_: Partition2<URI> = RM.partition_ as any
