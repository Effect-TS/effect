import type { Monoid } from "../../Monoid"
import { foldMapWithIndex_ as foldMapWithIndex__1 } from "../Array"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

export const foldMapWithIndex_: <M>(
  M: Monoid<M>
) => <A>(
  fa: ReadonlyNonEmptyArray<A>,
  f: (i: number, a: A) => M
) => M = foldMapWithIndex__1 as any
