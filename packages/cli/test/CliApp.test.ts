import type * as CliApp from "@effect/cli/CliApp"
import * as Command from "@effect/cli/Command"
import * as HelpDoc from "@effect/cli/HelpDoc"
import * as ValidationError from "@effect/cli/ValidationError"
import * as FileSystem from "@effect/platform-node/FileSystem"
import * as Path from "@effect/platform-node/Path"
import * as Terminal from "@effect/platform-node/Terminal"
import { Effect, ReadonlyArray } from "effect"
import * as Layer from "effect/Layer"
import { describe, expect, it } from "vitest"

const MainLive = Layer.mergeAll(FileSystem.layer, Path.layer, Terminal.layer)

const runEffect = <E, A>(
  self: Effect.Effect<CliApp.CliApp.Environment, E, A>
): Promise<A> =>
  Effect.provide(self, MainLive).pipe(
    Effect.runPromise
  )

describe("CliApp", () => {
  it("should return an error if excess arguments are provided", () =>
    Effect.gen(function*(_) {
      const cli = Command.run(Command.make("foo"), {
        name: "Test",
        version: "1.0.0"
      })
      const args = ReadonlyArray.make("--bar")
      const result = yield* _(Effect.flip(cli(args)))
      expect(result).toEqual(ValidationError.invalidValue(HelpDoc.p(
        "Received unknown argument: '--bar'"
      )))
    }).pipe(runEffect))
})
