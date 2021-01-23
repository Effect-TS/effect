import * as TE from "fp-ts/lib/TaskEither"
import { Endomorphism } from "fp-ts/lib/function"
import { pipe } from "fp-ts/lib/pipeable"

import { modifyGlob, onLeft, onRight, runMain } from "./_common"

const ES6_GLOB_PATTERN = "build/esm/**/*.@(ts|js)"

const packages = [
  "fp-ts",
  "io-ts",
  "io-ts-types",
  "elm-ts",
  "fp-ts-contrib",
  "fp-ts-rxjs",
  "fp-ts-routing",
  "fp-ts-fluture",
  "parser-ts",
  "retry-ts",
  "hyper-ts",
  "fp—ts-local-storage"
]

const regexp = new RegExp(
  `(\\s(?:from|module)\\s['|"](?:${packages.join("|")}))\\/lib\\/([\\w-\\/]+['|"])`,
  "gm"
)
export const replace: Endomorphism<string> = (s) => s.replace(regexp, "$1/es6/$2")

pipe(
  ES6_GLOB_PATTERN,
  modifyGlob(replace),
  TE.fold(onLeft, onRight("import rewrite succeeded!")),
  runMain
)
