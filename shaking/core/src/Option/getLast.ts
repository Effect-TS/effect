import type { Option } from "fp-ts/lib/Option"

import { fold as foldMonoid } from "../Monoid"

import { AOfOptions } from "./AOfOptions"
import { getLastMonoid } from "./getLastMonoid"

export const getLast = <Ts extends Option<any>[]>(
  ...items: Ts
): Option<AOfOptions<Ts>> => foldMonoid(getLastMonoid<AOfOptions<Ts>>())(items)
