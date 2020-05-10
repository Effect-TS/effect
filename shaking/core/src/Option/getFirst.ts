import type { Option } from "fp-ts/lib/Option"

import { fold as foldMonoid } from "../Monoid"

import { AOfOptions } from "./AOfOptions"
import { getFirstMonoid } from "./getFirstMonoid"

export const getFirst = <Ts extends Option<any>[]>(
  ...items: Ts
): Option<AOfOptions<Ts>> => foldMonoid(getFirstMonoid<AOfOptions<Ts>>())(items)
