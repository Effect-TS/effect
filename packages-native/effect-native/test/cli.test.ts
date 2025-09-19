import { NodeContext } from "@effect/platform-node"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { describe, expect, it } from "vitest"
import * as MockConsole from "../../../packages/cli/test/services/MockConsole.js"
import { cli, CliLayer } from "../src/cli.js"

const runWithMockConsole = <A>(effect: Effect.Effect<A>) =>
  Effect.gen(function*() {
    const mockConsole = yield* MockConsole.make
    const TestLayer = Layer.mergeAll(
      CliLayer,
      Console.setConsole(mockConsole),
      NodeContext.layer
    )

    return yield* Effect.provide(
      Effect.gen(function*() {
        const result = yield* effect
        const lines = yield* MockConsole.getLines({ stripAnsi: true })
        return [result, lines] as const
      }),
      TestLayer
    )
  }).pipe(Effect.runPromise)

describe("effect-native cli", () => {
  it("renders helpful guidance when invoked with --help", async () => {
    const [, lines] = await runWithMockConsole(cli([
      "node",
      "effect-native",
      "--help"
    ]))

    const output = lines.join("\n")

    expect(output).toContain("effect-native 0.0.1")
    expect(output).toContain("USAGE")
    expect(output).toContain("tight feedback loops")
    expect(output).toContain("Slice time very thinly")
  })
})
