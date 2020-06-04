import * as fs from "fs"

import chalk from "chalk"
import * as A from "fp-ts/lib/Array"
import { log } from "fp-ts/lib/Console"
import { parseJSON } from "fp-ts/lib/Either"
import * as IO from "fp-ts/lib/IO"
import * as T from "fp-ts/lib/Task"
import * as TE from "fp-ts/lib/TaskEither"
import { pipe } from "fp-ts/lib/pipeable"

const readFile = TE.taskify<fs.PathLike, string, NodeJS.ErrnoException, string>(
  fs.readFile
)

const writeFile = TE.taskify<fs.PathLike, string, NodeJS.ErrnoException, void>(
  fs.writeFile
)

const modules: string[] = [
  "Compatibility",
  "Const",
  "Base",
  "Base/HKT",
  "Base/Applicative",
  "Base/Apply",
  "Base/Chain",
  "Base/Compactable",
  "Base/Filterable",
  "Base/FilterableWithIndex",
  "Base/Foldable",
  "Base/FoldableWithIndex",
  "Base/Functor",
  "Base/FunctorWithIndex",
  "Base/Monad",
  "Base/Traversable",
  "Base/TraversableWithIndex",
  "Base/Witherable",
  "Base/Unfoldable",
  "Base/Extend",
  "Base/Comonad",
  "Base/ChainRec",
  "Base/Bifunctor",
  "Base/Alt",
  "Base/Of",
  "Base/Alternative",
  "Base/Contravariant",
  "Base/Semigroupoid",
  "Model",
  "Apply",
  "Identity",
  "Exit",
  "Deferred",
  "Effect",
  "Effect/Fiber",
  "EffectOption",
  "Ref",
  "Utils",
  "Function/Operator",
  "Function",
  "Provider",
  "Semaphore",
  "Queue",
  "Ticket",
  "Managed",
  "Process",
  "List",
  "ConcurrentRef",
  "Either",
  "Option",
  "Service",
  "Retry",
  "Boolean",
  "Array",
  "NonEmptyArray",
  "Ord",
  "Eq",
  "Magma",
  "Monoid",
  "Map",
  "Set",
  "Show",
  "These",
  "Tree",
  "Tuple",
  "Random",
  "Semigroup",
  "Record",
  "RecursionSchemes",
  "Prelude",
  "Stream",
  "Stream/Sink",
  "Stream/Step",
  "Stream/Support",
  "StreamEither",
  "Support",
  "Support/Common",
  "Support/Dequeue",
  "Support/Utils",
  "Support/Completable",
  "Support/LinkedList",
  "Support/DoublyLinkedList",
  "Support/Runtime",
  "Support/Driver",
  "Support/Utils",
  "Support/Types",
  "Monocle/common",
  "Monocle/Fold",
  "Monocle/Getter",
  "Monocle/Iso",
  "Monocle/Lens",
  "Monocle/Optional",
  "Monocle/Prism",
  "Monocle/Setter",
  "Monocle/Traversal",
  "Monocle/At",
  "Monocle/Index",
  "Monocle/All",
  "Newtype",
  "Layer"
]

const exit = (code: 0 | 1): IO.IO<void> => () => process.exit(code)

function onLeft(e: NodeJS.ErrnoException): T.Task<void> {
  return T.fromIO(
    pipe(
      log(e),
      IO.chain(() => exit(1))
    )
  )
}

function onRight(): T.Task<void> {
  return T.fromIO(log(chalk.bold.green("package copy succeeded!")))
}

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
          private: false,
          license: content["license"],
          repository: content["repository"],
          sideEffects: content["sideEffects"],
          dependencies: content["dependencies"],
          gitHead: content["gitHead"],
          main: "./index.js",
          module: "./esm/index.js",
          typings: "./index.d.ts",
          publishConfig: {
            access: "public"
          }
        },
        null,
        2
      )
    )
  ),
  TE.chain(() => readFile("./README.md", "utf8")),
  TE.chain((content: any) => writeFile("./build/README.md", content)),
  TE.chain(() =>
    A.array.traverse(TE.taskEither)(modules, (m) =>
      writeFile(
        `./build/${m}/package.json`,
        JSON.stringify(
          {
            sideEffects: false,
            main: "./index.js",
            module: `${A.range(1, m.split("/").length)
              .map(() => "../")
              .join("")}esm/${m}/index.js`,
            typings: `./index.d.ts`
          },
          null,
          2
        )
      )
    )
  ),
  TE.fold(onLeft, onRight)
)().catch((e) => console.log(chalk.bold.red(`Unexpected error: ${e}`)))
