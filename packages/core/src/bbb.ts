import { pipe, tuple } from "@effect-ts/core/Function"

import * as NA from "./NonEmptyArray"
import * as R from "./Record"

const toRecord = R.fromFoldable(NA.getAssociative<string>(), NA.Foldable)

export const rec = pipe(
  NA.make([tuple("a", NA.single("aa")), tuple("b", NA.single("bb"))]),
  toRecord
)
