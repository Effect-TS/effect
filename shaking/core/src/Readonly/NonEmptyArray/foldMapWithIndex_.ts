import type { Monoid } from "fp-ts/lib/Monoid"

import { foldMapWithIndex_ as foldMapWithIndex__1 } from "../Array"

import { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

export const foldMapWithIndex_: <M>(
  M: Monoid<M>
) => <A>(
  fa: ReadonlyNonEmptyArray<A>,
  f: (i: number, a: A) => M
) => M = foldMapWithIndex__1 as any
