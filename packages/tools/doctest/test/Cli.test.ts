import { cli } from "@effect/doctest/Cli"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Stream from "effect/Stream"
import * as Command from "effect/unstable/cli/Command"
import { ChildProcess } from "effect/unstable/process"
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

describe("Cli", () => {
  it.effect("typechecks virtual snippets and reports source diagnostics", () =>
    Effect.acquireUseRelease(
      Effect.sync(() => {
        const root = mkdtempSync(join(tmpdir(), "effect-doctest-cli-"))
        const sourceDirectory = join(root, "src")
        const excludedDirectory = join(sourceDirectory, "excluded")
        const valid = join(sourceDirectory, "valid.ts")
        const validSecond = join(sourceDirectory, "valid-second.ts")
        const invalid = join(sourceDirectory, "invalid.md")
        const tsconfig = join(root, "tsconfig.json")
        const configDirectory = join(root, "config")
        mkdirSync(excludedDirectory, { recursive: true })
        mkdirSync(configDirectory)
        writeFileSync(
          join(configDirectory, "base.json"),
          JSON.stringify({
            include: ["${configDir}/../src"],
            exclude: ["${configDir}/../src/excluded"],
            compilerOptions: {
              module: "Preserve",
              moduleResolution: "Bundler",
              strict: true
            }
          })
        )
        writeFileSync(
          tsconfig,
          JSON.stringify({
            extends: "./config/base.json"
          })
        )
        writeFileSync(
          valid,
          [
            "/**",
            " * ```ts import.meta.vitest",
            " * const value = 1",
            " * ```",
            " * ```ts import.meta.vitest",
            " * const value = 2",
            " * ```",
            " */"
          ].join("\n")
        )
        writeFileSync(
          invalid,
          [
            "# Invalid",
            "```ts import.meta.vitest",
            "",
            "const value: string = 1",
            "```"
          ].join("\n")
        )
        writeFileSync(validSecond, "/**\n * ```ts import.meta.vitest\n * const value = 3\n * ```\n */")
        writeFileSync(
          join(excludedDirectory, "invalid.ts"),
          "/**\n * ```ts import.meta.vitest\n * const value: string = 1\n * ```\n */"
        )
        return { root, invalid, tsconfig }
      }),
      ({ root, invalid, tsconfig }) =>
        Effect.gen(function*() {
          yield* Command.runWith(cli, { version: "0.0.0" })([
            "--tsconfig",
            tsconfig,
            join(root, "src/valid*.ts")
          ])

          assert.isFalse(existsSync(join(root, ".effect-doctest.tsconfig.json")))
          assert.isFalse(existsSync(join(root, "src/.effect-doctest-valid.ts-0.ts")))

          const exit = yield* Effect.exit(Command.runWith(cli, { version: "0.0.0" })(["--tsconfig", tsconfig]))
          assert.isTrue(Exit.isFailure(exit))
          if (Exit.isFailure(exit)) {
            assert.include(Cause.pretty(exit.cause), `${invalid}:4:7 TS2322`)
          }

          const handle = yield* ChildProcess.make("node", [
            join(import.meta.dirname, "../src/internal/bin.ts"),
            "--tsconfig",
            tsconfig
          ])
          const result = yield* Effect.all({
            exitCode: handle.exitCode,
            stdout: Stream.mkString(Stream.decodeText(handle.stdout)),
            stderr: Stream.mkString(Stream.decodeText(handle.stderr))
          }, { concurrency: "unbounded" })
          assert.strictEqual(result.exitCode, 1)
          assert.strictEqual(result.stdout, "")
          assert.include(result.stderr, `${invalid}:4:7 TS2322`)
          assert.notInclude(result.stderr, "~effect/")

          writeFileSync(invalid, "```ts import.meta.vitest\nconst value: string = \"ok\"\n```")
          yield* Command.runWith(cli, { version: "0.0.0" })(["--tsconfig", tsconfig])
        }),
      ({ root }) => Effect.sync(() => rmSync(root, { recursive: true, force: true }))
    ).pipe(Effect.provide(NodeServices.layer)))
})
