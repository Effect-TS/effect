import * as Effect from "effect/Effect"
import * as Command from "effect/unstable/cli/Command"
import * as Flag from "effect/unstable/cli/Flag"
import { ApiDiff, type ApiDiffOptions } from "./ApiDiff.ts"

const baseRef = Flag.string("base-ref").pipe(
  Flag.withDescription("Explicit base Git ref")
)

const headRef = Flag.string("head-ref").pipe(
  Flag.withDescription("Explicit head Git ref")
)

const output = Flag.string("output").pipe(
  Flag.withMetavar("DIRECTORY"),
  Flag.withDescription("Report output directory")
)

const runApiDiff = Effect.fnUntraced(function*(options: ApiDiffOptions) {
  const apiDiff = yield* ApiDiff
  yield* apiDiff.run(options)
})

export const cli = Command.make("api-diff", {
  baseRef,
  headRef,
  output
}).pipe(
  Command.withDescription("Compare the consumer-visible TypeScript API of two repository revisions"),
  Command.withHandler(runApiDiff)
)
