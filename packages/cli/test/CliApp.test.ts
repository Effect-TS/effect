import type * as CliApp from "@effect/cli/CliApp"
import * as Command from "@effect/cli/Command"
import * as HelpDoc from "@effect/cli/HelpDoc"
import * as ValidationError from "@effect/cli/ValidationError"
import { NodeContext } from "@effect/platform-node"
import { Effect, Array as ReadonlyArray } from "effect"
import { describe, expect, it } from "vitest"

const runEffect = <E, A>(
  self: Effect.Effect<A, E, CliApp.CliApp.Environment>
): Promise<A> =>
  Effect.provide(self, NodeContext.layer).pipe(
    Effect.runPromise
  )

describe("CliApp", () => {
  it("should return an error if excess arguments are provided", () =>
    Effect.gen(function*(_) {
      const cli = Command.run(Command.make("foo"), {
        name: "Test",
        version: "1.0.0"
      })
      const args = ReadonlyArray.make("node", "test.js", "--bar")
      const result = yield* _(Effect.flip(cli(args)))
      expect(result).toEqual(ValidationError.invalidValue(HelpDoc.p(
        "Received unknown argument: '--bar'"
      )))
    }).pipe(runEffect))
})
