import type { Filter2 } from "fp-ts/lib/Filterable"

import * as RM from "../Readonly/Map/filter_"

import { URI } from "./URI"

export const filter_: Filter2<URI> = RM.filter_ as any
