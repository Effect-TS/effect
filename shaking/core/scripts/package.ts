/**
 * @since 0.0.1
 */
import * as fs from "fs"

import { array } from "fp-ts/lib/Array"
import { parseJSON } from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import { pipe } from "fp-ts/lib/pipeable"

const readFile = TE.taskify<fs.PathLike, string, NodeJS.ErrnoException, string>(
  fs.readFile
)

const writeFile = TE.taskify<fs.PathLike, string, NodeJS.ErrnoException, void>(
  fs.writeFile
)

const modules: string[] = ["exit", "common"]

pipe(
  readFile("./package.json", "utf8"),
  TE.chain((content) =>
    TE.fromEither(parseJSON(content, () => new Error("json parse error")))
  ),
  TE.chain((content: any) =>
    writeFile(
      "./build/package.json",
      JSON.stringify(
        {
          name: content["name"],
          version: content["version"],
          license: content["license"],
          repository: content["repository"],
          sideEffects: content["sideEffects"],
          peerDependencies: content["peerDependencies"],
          gitHead: content["gitHead"],
          main: "./index.js",
          module: "./esm/index.js",
          typings: "./index.d.ts"
        },
        null,
        2
      )
    )
  ),
  TE.chain(() =>
    array.traverse(TE.taskEither)(modules, (m) =>
      writeFile(
        `./build/${m}/package.json`,
        JSON.stringify(
          {
            sideEffects: false,
            module: `../esm/${m}/index.js`,
            typings: `../esm/${m}/index.d.ts`
          },
          null,
          2
        )
      )
    )
  )
)().catch((e) => {
  console.error(e)
})
