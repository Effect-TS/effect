/**
 * @since 4.0.0
 */

import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Option from "effect/Option"
import * as Argument from "effect/unstable/cli/Argument"
import * as CliError from "effect/unstable/cli/CliError"
import * as Command from "effect/unstable/cli/Command"
import * as Flag from "effect/unstable/cli/Flag"
import * as Files from "./internal/Files.ts"
import * as Linter from "./internal/Linter.ts"
import * as OxlintLsp from "./internal/OxlintLsp.ts"
import * as Typechecker from "./internal/Typechecker.ts"
import * as Source from "./Source.ts"

const files = Argument.string("files").pipe(
  Argument.withDescription("Optional source files or glob patterns used to filter the configured project"),
  Argument.variadic()
)

const tsconfig = Flag.file("tsconfig", { mustExist: true }).pipe(
  Flag.withDescription("TypeScript configuration to use for every documentation example"),
  Flag.optional
)

const oxlintConfig = Flag.file("oxlint-config", { mustExist: true }).pipe(
  Flag.withDescription("Oxlint configuration to use for every documentation example"),
  Flag.optional
)

const run = Effect.fnUntraced(function*(patterns: ReadonlyArray<string>, configuredTsconfig: string | undefined) {
  const fs = yield* FileSystem.FileSystem
  const matched = yield* Files.discover(patterns, configuredTsconfig)
  const extracted = yield* Effect.forEach(
    matched,
    (file) =>
      fs.readFileString(file).pipe(
        Effect.map((source) => ({
          file,
          snippets: Source.extract(source, file.endsWith(".md") ? "markdown" : "jsdoc")
        }))
      ),
    { concurrency: "unbounded" }
  )
  const examples = extracted.filter(({ snippets }) => snippets.length > 0)
  const typechecker = yield* Typechecker.Typechecker
  yield* typechecker.check(examples)

  const count = examples.reduce((total, { snippets }) => total + snippets.length, 0)
  yield* Console.log(
    `Typechecked ${count} documentation snippet${count === 1 ? "" : "s"} in ${matched.length} file${
      matched.length === 1 ? "" : "s"
    }`
  )
})

const runLint = Effect.fnUntraced(function*(
  patterns: ReadonlyArray<string>,
  configuredTsconfig: string | undefined,
  configuredOxlint: string | undefined
) {
  const fs = yield* FileSystem.FileSystem
  const matched = yield* Files.discover(patterns, configuredTsconfig)
  const extracted = yield* Effect.forEach(
    matched,
    (file) =>
      fs.readFileString(file).pipe(
        Effect.map((source) => ({
          file,
          snippets: Source.extract(source, file.endsWith(".md") ? "markdown" : "jsdoc")
        }))
      ),
    { concurrency: "unbounded" }
  )
  const examples = extracted.filter(({ snippets }) => snippets.length > 0)
  yield* Linter.check(examples).pipe(Effect.provide(OxlintLsp.layer(configuredOxlint)))

  const count = examples.reduce((total, { snippets }) => total + snippets.length, 0)
  yield* Console.log(
    `Linted ${count} documentation snippet${count === 1 ? "" : "s"} in ${matched.length} file${
      matched.length === 1 ? "" : "s"
    }`
  )
})

/**
 * Command for typechecking marked documentation examples with the TypeScript native API.
 *
 * @category commands
 * @since 4.0.0
 */
export const cli = Command.make("doctest-typecheck", { files, tsconfig }).pipe(
  Command.withDescription("Typecheck marked TypeScript documentation examples without writing temporary files"),
  Command.withHandler(({ files, tsconfig }) =>
    run(files, Option.getOrUndefined(tsconfig)).pipe(
      Effect.provide(Typechecker.layer(Option.getOrUndefined(tsconfig))),
      Effect.mapError((cause) => new CliError.UserError({ cause }))
    )
  )
)

/**
 * Command for linting marked documentation examples with oxlint.
 *
 * @category commands
 * @since 4.0.0
 */
export const lintCli = Command.make("doctest-lint", { files, oxlintConfig, tsconfig }).pipe(
  Command.withDescription("Lint marked TypeScript documentation examples without writing temporary files"),
  Command.withHandler(({ files, oxlintConfig, tsconfig }) =>
    runLint(files, Option.getOrUndefined(tsconfig), Option.getOrUndefined(oxlintConfig)).pipe(
      Effect.mapError((cause) => new CliError.UserError({ cause }))
    )
  )
)
