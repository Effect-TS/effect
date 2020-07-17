import * as A from "fp-ts/lib/Array"
import * as TE from "fp-ts/lib/TaskEither"
import { Endomorphism } from "fp-ts/lib/function"
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

export const replace: Endomorphism<string> = (s) => {
  let ns = s

  pipe(
    packages,
    A.map((p) => {
      ns = ns.replace(
        new RegExp(
          `(\\.\\./)+(?:packages(?:|_be|_fe|_http|_sys|_inc)/)?${p}/build`,
          "gm"
        ),
        `@matechs/${p}`
      )
    })
  )

  return ns
}

const replaceFiles = modifyGlob(replace)(GLOB_PATTERN)

pipe(replaceFiles, TE.fold(onLeft, onRight("locals rewrite succeeded!")), runMain)
