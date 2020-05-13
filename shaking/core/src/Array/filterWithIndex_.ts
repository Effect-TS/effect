import type { FilterWithIndex1 } from "fp-ts/lib/FilterableWithIndex"

import { filterWithIndex_ as filterWithIndex__1 } from "../Readonly/Array/filterWithIndex_"

import { URI } from "./URI"

export const filterWithIndex_: FilterWithIndex1<URI, number> = filterWithIndex__1 as any
