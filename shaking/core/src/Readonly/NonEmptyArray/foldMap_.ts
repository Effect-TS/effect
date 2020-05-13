import type { Monoid } from "../../Monoid"
import { foldMap_ as foldMap__1 } from "../Array"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

export const foldMap_: <M>(
  M: Monoid<M>
) => <A>(fa: ReadonlyNonEmptyArray<A>, f: (a: A) => M) => M = foldMap__1 as any
