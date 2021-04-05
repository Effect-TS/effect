import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"

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
  TE.fold(onLeft, onRight("locals rewrite succeeded!")),
  runMain
)
