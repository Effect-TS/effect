import * as Args from "@effect/cli/Args"
import * as CliConfig from "@effect/cli/CliConfig"
import * as HelpDoc from "@effect/cli/HelpDoc"
import * as ValidationError from "@effect/cli/ValidationError"
import * as NodeContext from "@effect/platform-node/NodeContext"
import * as Path from "@effect/platform-node/Path"
import * as Effect from "effect/Effect"
import * as ReadonlyArray from "effect/ReadonlyArray"
import { describe, expect, it } from "vitest"

const runEffect = <E, A>(
  self: Effect.Effect<NodeContext.NodeContext, E, A>
): Promise<A> => Effect.provide(self, NodeContext.layer).pipe(Effect.runPromise)

describe("Args", () => {
  it("validates an valid argument with a default", () =>
    Effect.gen(function*(_) {
      const args = Args.integer().pipe(Args.withDefault(0))
      const result = yield* _(
        Args.validate(args, ReadonlyArray.empty(), CliConfig.defaultConfig)
      )
      expect(result).toEqual([ReadonlyArray.empty(), 0])
    }).pipe(runEffect))

  it("does not validate an invalid argument even when there is a default", () =>
    Effect.gen(function*(_) {
      const args = Args.integer().pipe(Args.withDefault(0))
      const result = yield* _(Effect.flip(
        Args.validate(args, ReadonlyArray.of("abc"), CliConfig.defaultConfig)
      ))
      expect(result).toEqual(ValidationError.invalidArgument(HelpDoc.p("'abc' is not a integer")))
    }).pipe(runEffect))

  it("should validate an existing file that is expected to exist", () =>
    Effect.gen(function*(_) {
      const path = yield* _(Path.Path)
      const filePath = path.join(__dirname, "Args.test.ts")
      const args = Args.file({ name: "files", exists: "yes" }).pipe(Args.repeated)
      const result = yield* _(
        Args.validate(args, ReadonlyArray.of(filePath), CliConfig.defaultConfig)
      )
      expect(result).toEqual([ReadonlyArray.empty(), ReadonlyArray.of(filePath)])
    }).pipe(runEffect))

  it("should return an error when a file that is expected to exist is not found", () =>
    Effect.gen(function*(_) {
      const path = yield* _(Path.Path)
      const filePath = path.join(__dirname, "NotExist.test.ts")
      const args = Args.file({ name: "files", exists: "yes" }).pipe(Args.repeated)
      const result = yield* _(
        Effect.flip(Args.validate(args, ReadonlyArray.of(filePath), CliConfig.defaultConfig))
      )
      expect(result).toEqual(ValidationError.invalidArgument(HelpDoc.p(
        `Path '${filePath}' must exist`
      )))
    }).pipe(runEffect))

  it("should validate a non-existent file that is expected not to exist", () =>
    Effect.gen(function*(_) {
      const path = yield* _(Path.Path)
      const filePath = path.join(__dirname, "NotExist.test.ts")
      const args = Args.file({ name: "files", exists: "no" }).pipe(Args.repeated)
      const result = yield* _(
        Args.validate(args, ReadonlyArray.of(filePath), CliConfig.defaultConfig)
      )
      expect(result).toEqual([ReadonlyArray.empty(), ReadonlyArray.of(filePath)])
    }).pipe(runEffect))

  it("should validate a series of files", () =>
    Effect.gen(function*(_) {
      const path = yield* _(Path.Path)
      const filePath = path.join(__dirname, "NotExist.test.ts")
      const args = Args.file({ name: "files", exists: "no" }).pipe(Args.repeated)
      const result = yield* _(
        Args.validate(args, ReadonlyArray.make(filePath, filePath), CliConfig.defaultConfig)
      )
      expect(result).toEqual([ReadonlyArray.empty(), ReadonlyArray.make(filePath, filePath)])
    }).pipe(runEffect))
})
