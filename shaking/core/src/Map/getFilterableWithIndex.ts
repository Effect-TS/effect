import type { FilterableWithIndex2C } from "fp-ts/lib/FilterableWithIndex"

import * as RM from "../Readonly/Map/getFilterableWithIndex"

import { URI } from "./URI"

/**
 * @since 2.0.0
 */
export const getFilterableWithIndex: <K = never>() => FilterableWithIndex2C<
  URI,
  K,
  K
> = RM.getFilterableWithIndex as any
