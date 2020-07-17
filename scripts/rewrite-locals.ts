import { monoid } from "fp-ts"
import * as A from "fp-ts/lib/Array"
import * as TE from "fp-ts/lib/TaskEither"
import { tuple } from "fp-ts/lib/function"
import { pipe } from "fp-ts/lib/pipeable"

import { modifyGlob, onLeft, onRight, runMain } from "./_common"

const GLOB_PATTERN = "build/**/*.@(ts|js)"

const packages = [
  "aio",
  "contrib",
  "core",
  "test-jest",
  "test",
  "graceful",
  "orm",
  "tracing",
  "uuid",
  "zoo",
  "browser",
  "epics",
  "rxjs",
  "apollo",
  "express",
  "http-client-libcurl",
  "http-client-fetch",
  "http-client",
  "koa",
  "rpc-client",
  "rpc",
  "cqrs-es",
  "cqrs",
  "fancy",
  "console",
  "logger-pino",
  "logger-winston",
  "logger",
  "morphic-alg",
  "morphic"
]

export const replace = pipe(
  packages,
  A.map((p) =>
    tuple(
      new RegExp(
        `(\\.\\./)+(?:packages(?:|_be|_fe|_http|_sys|_inc)/)?${p}/build`,
        "gm"
      ),
      `@matechs/${p}`
    )
  ),
  A.map(([reg, repl]) => (x: string) => x.replace(reg, repl)),
  monoid.fold(monoid.getEndomorphismMonoid<string>())
)

pipe(
  GLOB_PATTERN,
  modifyGlob(replace),
  TE.fold(onLeft, onRight("locals rewrite succeeded!")),
  runMain
)
