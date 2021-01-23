import chalk from "chalk"
import { sequenceT } from "fp-ts/lib/Apply"
import * as A from "fp-ts/lib/Array"
import * as E from "fp-ts/lib/Either"
import type { Endomorphism } from "fp-ts/lib/function"
import { flow, unsafeCoerce } from "fp-ts/lib/function"
import { pipe } from "fp-ts/lib/pipeable"
import * as TE from "fp-ts/lib/TaskEither"
import { posix } from "path"

import { copy, modifyGlob, onLeft, onRight } from "./_common"

const MAP_GLOB_PATTERN = "build/**/*.map"

interface SourceMapInterface {
  sources: string[]
}

const replaceString: (path: string) => Endomorphism<string> = (path) => {
  const dir = posix.dirname(path)
  return flow(
    (x) => x.replace(/(.*)\.\.\/src(.*)/gm, "$1_src$2"),
    (x) => posix.relative(dir, posix.join(dir, x)),
    (x) => (x.startsWith(".") ? x : "./" + x)
  )
}

const replace = (content: string, path: string): string =>
  pipe(
    E.parseJSON(
      content,
      (reason) => new Error("could not parse json: " + String(reason))
    ),
    E.map((x) => unsafeCoerce<E.Json, SourceMapInterface>(x)),
    E.map(
      flow(
        Object.entries,
        A.map(([k, v]) =>
          k === "sources"
            ? [k, A.array.map(v as string[], replaceString(path))]
            : [k, v]
        ),
        A.reduce({}, (acc, [k, v]) => ({ ...acc, [k]: v }))
      ) as <A>(x: A) => A
    ),
    E.chain((obj) =>
      E.stringifyJSON(
        obj,
        (reason) => new Error("could not stringify json: " + String(reason))
      )
    ),
    E.getOrElse(() => content)
  )

pipe(
  sequenceT(TE.taskEither)(
    copy("src/**/*", "build/_src", { update: true }),
    modifyGlob(replace)(MAP_GLOB_PATTERN)
  ),
  TE.fold(onLeft, onRight("source map linking succeeded!"))
)().catch((e) => console.log(chalk.bold.red(`Unexpected error: ${e}`), e.stack))
