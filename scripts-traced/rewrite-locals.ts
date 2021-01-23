import * as A from "fp-ts/lib/Array"
import { tuple } from "fp-ts/lib/function"
import { pipe } from "fp-ts/lib/pipeable"
import * as TE from "fp-ts/lib/TaskEither"

import { modifyGlob, onLeft, onRight, runMain } from "../scripts/_common"

const GLOB_PATTERN = "build/_traced/**/*.@(ts|js)"

const packages = ["system", "core", "morphic", "monocle"]

export const replace = pipe(
  packages,
  A.map((p) =>
    tuple(
      new RegExp(
        `(\\.\\./)+(?:packages(?:|_be|_fe|_http|_sys|_inc)/)?${p}/build`,
        "gm"
      ),
      `@effect-ts/${p}`
    )
  ),
  A.map(([reg, repl]) => (x: string) => x.replace(reg, repl))
)

pipe(
  GLOB_PATTERN,
  modifyGlob((x) => {
    let y = x
    for (const f of replace) {
      y = f(y)
    }
    return y
  }),
  TE.fold(onLeft, onRight("locals rewrite succeeded!")),
  runMain
)
