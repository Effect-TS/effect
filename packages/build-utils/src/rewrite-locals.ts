import * as TE from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"

import { modifyGlob, onLeft, onRight, runMain } from "./_common"

const GLOB_PATTERN = "build/**/*.@(d.ts)"

pipe(
  GLOB_PATTERN,
  modifyGlob((x) =>
    x.replace(
      new RegExp(`(\\.\\./)+(?:packages(?:.*)/)?(.*)/build`, "gm"),
      `${process.argv[2] ?? "@effect-ts"}/$2`
    )
  ),
  TE.foldM(onLeft, onRight("locals rewrite succeeded!")),
  runMain
)
