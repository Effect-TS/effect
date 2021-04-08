import * as A from "@effect-ts/core/Collections/Immutable/Array"
import * as TE from "@effect-ts/core/Effect"
import * as E from "@effect-ts/core/Either"
import type { Endomorphism } from "@effect-ts/core/Function"
import { flow, pipe, unsafeCoerce } from "@effect-ts/core/Function"
import { posix } from "path"

import { copy, modifyGlob, onLeft, onRight, runMain } from "./_common"

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
    E.parseJSON_(
      content,
      (reason) => new Error("could not parse json: " + String(reason))
    ),
    E.map((x) => unsafeCoerce<unknown, SourceMapInterface>(x)),
    E.map(
      flow(
        Object.entries,
        A.map(([k, v]) =>
          k === "sources" ? [k, A.map_(v as string[], replaceString(path))] : [k, v]
        ),
        A.reduce({}, (acc, [k, v]) => ({ ...acc, [k]: v }))
      ) as <A>(x: A) => A
    ),
    E.chain((obj) =>
      E.stringifyJSON_(
        obj,
        (reason) => new Error("could not stringify json: " + String(reason))
      )
    ),
    E.getOrElse(() => content)
  )

pipe(
  TE.tuple(
    copy("src/**/*", "build/_src", { update: true }),
    modifyGlob(replace)(MAP_GLOB_PATTERN)
  ),
  TE.foldM(onLeft, onRight("source map linking succeeded!")),
  runMain
)
