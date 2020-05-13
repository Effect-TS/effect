import { Monoid } from "fp-ts/lib/Monoid"

import { foldMap_ as foldMap__1 } from "../Array"

import { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

export const foldMap_: <M>(
  M: Monoid<M>
) => <A>(fa: ReadonlyNonEmptyArray<A>, f: (a: A) => M) => M = foldMap__1 as any
