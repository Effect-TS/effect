/**
 * @since 4.0.0
 */

import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Argument from "effect/unstable/cli/Argument"
import * as CliError from "effect/unstable/cli/CliError"
import * as Command from "effect/unstable/cli/Command"
import * as Flag from "effect/unstable/cli/Flag"
import * as Files from "./internal/Files.ts"
import { Linter } from "./internal/Linter.ts"
import { Typechecker } from "./internal/Typechecker.ts"
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

const diagnosticHeader = "Documentation example typecheck failed:\n\n"
const lintDiagnosticHeader = "Documentation example lint failed:\n\n"
const run = Effect.fnUntraced(function*(patterns: ReadonlyArray<string>, configuredTsconfig: string | undefined) {
  const matched = yield* Effect.tryPromise(() => Files.discover(patterns, configuredTsconfig))

  const extracted = yield* Effect.tryPromise(() =>
    Promise.all(matched.map((file) => Source.extractFile(file).then((snippets) => ({ file, snippets }))))
  )
  const examples = extracted.filter(({ snippets }) => snippets.length > 0)

  const failures = yield* Effect.acquireUseRelease(
    Effect.sync(() => new Typechecker(configuredTsconfig)),
    (typechecker) =>
      Effect.promise(() => Promise.allSettled(examples.map(({ file, snippets }) => typechecker.check(file, snippets))))
        .pipe(Effect.map((results) =>
          results.flatMap((result) => {
            if (result.status !== "rejected") return []
            const message = result.reason instanceof Error ? result.reason.message : String(result.reason)
            return [message.startsWith(diagnosticHeader) ? message.slice(diagnosticHeader.length) : message]
          })
        )),
    (typechecker) => Effect.promise(() => typechecker.close())
  )

  if (failures.length > 0) {
    return yield* Effect.fail(new Error(`${diagnosticHeader}${failures.join("\n\n")}`))
  }

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
  const matched = yield* Effect.tryPromise(() => Files.discover(patterns, configuredTsconfig))
  const extracted = yield* Effect.tryPromise(() =>
    Promise.all(matched.map((file) => Source.extractFile(file).then((snippets) => ({ file, snippets }))))
  )
  const examples = extracted.filter(({ snippets }) => snippets.length > 0)

  const failures = yield* Effect.acquireUseRelease(
    Effect.sync(() => new Linter(configuredOxlint)),
    (linter) =>
      Effect.promise(() => Promise.allSettled(examples.map(({ file, snippets }) => linter.check(file, snippets))))
        .pipe(Effect.map((results) =>
          results.flatMap((result) => {
            if (result.status !== "rejected") return []
            const message = result.reason instanceof Error ? result.reason.message : String(result.reason)
            return [message.startsWith(lintDiagnosticHeader) ? message.slice(lintDiagnosticHeader.length) : message]
          })
        )),
    (linter) => Effect.promise(() => linter.close())
  )

  if (failures.length > 0) {
    return yield* Effect.fail(new Error(`${lintDiagnosticHeader}${failures.join("\n\n")}`))
  }

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
