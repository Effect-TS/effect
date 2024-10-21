import * as Args from "@effect/cli/Args"
import * as CliConfig from "@effect/cli/CliConfig"
import * as HelpDoc from "@effect/cli/HelpDoc"
import * as ValidationError from "@effect/cli/ValidationError"
import { FileSystem, Path } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import * as Array from "effect/Array"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"

const runEffect = <E, A>(
  self: Effect.Effect<A, E, NodeContext.NodeContext>
): Promise<A> => Effect.provide(self, NodeContext.layer).pipe(Effect.runPromise)

describe("Args", () => {
  it("validates an valid argument with a default", () =>
    Effect.gen(function*(_) {
      const args = Args.integer().pipe(Args.withDefault(0))
      const result = yield* _(
        Args.validate(args, Array.empty(), CliConfig.defaultConfig)
      )
      expect(result).toEqual([Array.empty(), 0])
    }).pipe(runEffect))

  it("validates an valid optional argument", () =>
    Effect.gen(function*(_) {
      const args = Args.integer().pipe(Args.optional)
      let result = yield* _(
        Args.validate(args, Array.empty(), CliConfig.defaultConfig)
      )
      expect(result).toEqual([Array.empty(), Option.none()])

      result = yield* _(
        Args.validate(args, ["123"], CliConfig.defaultConfig)
      )
      expect(result).toEqual([Array.empty(), Option.some(123)])
    }).pipe(runEffect))

  it("does not validate an invalid argument even when there is a default", () =>
    Effect.gen(function*(_) {
      const args = Args.integer().pipe(Args.withDefault(0))
      const result = yield* _(Effect.flip(
        Args.validate(args, Array.of("abc"), CliConfig.defaultConfig)
      ))
      expect(result).toEqual(ValidationError.invalidArgument(HelpDoc.p("'abc' is not a integer")))
    }).pipe(runEffect))

  it("should validate an existing file that is expected to exist", () =>
    Effect.gen(function*(_) {
      const path = yield* _(Path.Path)
      const filePath = path.join(__dirname, "Args.test.ts")
      const args = Args.file({ name: "files", exists: "yes" }).pipe(Args.repeated)
      const result = yield* _(
        Args.validate(args, Array.of(filePath), CliConfig.defaultConfig)
      )
      expect(result).toEqual([Array.empty(), Array.of(filePath)])
    }).pipe(runEffect))

  it("should return an error when a file that is expected to exist is not found", () =>
    Effect.gen(function*(_) {
      const path = yield* _(Path.Path)
      const filePath = path.join(__dirname, "NotExist.test.ts")
      const args = Args.file({ name: "files", exists: "yes" }).pipe(Args.repeated)
      const result = yield* _(
        Effect.flip(Args.validate(args, Array.of(filePath), CliConfig.defaultConfig))
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
        Args.validate(args, Array.of(filePath), CliConfig.defaultConfig)
      )
      expect(result).toEqual([Array.empty(), Array.of(filePath)])
    }).pipe(runEffect))

  it("should validate a series of files", () =>
    Effect.gen(function*(_) {
      const path = yield* _(Path.Path)
      const filePath = path.join(__dirname, "NotExist.test.ts")
      const args = Args.file({ name: "files", exists: "no" }).pipe(Args.repeated)
      const result = yield* _(
        Args.validate(args, Array.make(filePath, filePath), CliConfig.defaultConfig)
      )
      expect(result).toEqual([Array.empty(), Array.make(filePath, filePath)])
    }).pipe(runEffect))

  it("validates an valid argument with a Schema", () =>
    Effect.gen(function*(_) {
      const args = Args.integer().pipe(Args.withSchema(Schema.Positive))
      const result = yield* _(
        Args.validate(args, ["123"], CliConfig.defaultConfig)
      )
      expect(result).toEqual([Array.empty(), 123])
    }).pipe(runEffect))

  it("does not validate an invalid argument with a Schema", () =>
    Effect.gen(function*(_) {
      const args = Args.integer().pipe(Args.withSchema(Schema.Positive))
      const result = yield* _(Effect.flip(
        Args.validate(args, Array.of("-123"), CliConfig.defaultConfig)
      ))
      expect(result).toEqual(ValidationError.invalidArgument(HelpDoc.p(
        "Positive\n" +
          "└─ Predicate refinement failure\n" +
          "   └─ Expected Positive, actual -123"
      )))
    }).pipe(runEffect))

  it("fileContent", () =>
    Effect.gen(function*(_) {
      const fs = yield* _(FileSystem.FileSystem)
      const path = yield* _(Path.Path)
      const filePath = path.join(__dirname, "fixtures/config.json")
      const content = yield* _(fs.readFile(filePath))
      const args = Args.fileContent({ name: "files" }).pipe(Args.repeated)
      const result = yield* _(
        Args.validate(args, Array.of(filePath), CliConfig.defaultConfig)
      )
      expect(result).toEqual([Array.empty(), Array.of([filePath, content])])
    }).pipe(runEffect))

  it("fileText", () =>
    Effect.gen(function*(_) {
      const fs = yield* _(FileSystem.FileSystem)
      const path = yield* _(Path.Path)
      const filePath = path.join(__dirname, "fixtures/config.json")
      const content = yield* _(fs.readFileString(filePath))
      const args = Args.fileText({ name: "files" }).pipe(Args.repeated)
      const result = yield* _(
        Args.validate(args, Array.of(filePath), CliConfig.defaultConfig)
      )
      expect(result).toEqual([Array.empty(), Array.of([filePath, content])])
    }).pipe(runEffect))

  it("fileParse", () =>
    Effect.gen(function*(_) {
      const fs = yield* _(FileSystem.FileSystem)
      const path = yield* _(Path.Path)
      const filePath = path.join(__dirname, "fixtures/config.json")
      const content = yield* _(fs.readFileString(filePath), Effect.map(JSON.parse))
      const args = Args.fileParse({ name: "files" }).pipe(Args.repeated)
      const result = yield* _(
        Args.validate(args, Array.of(filePath), CliConfig.defaultConfig)
      )
      expect(result).toEqual([Array.empty(), Array.of(content)])
    }).pipe(runEffect))

  it("fileSchema", () =>
    Effect.gen(function*(_) {
      const fs = yield* _(FileSystem.FileSystem)
      const path = yield* _(Path.Path)
      const filePath = path.join(__dirname, "fixtures/config.json")
      const content = yield* _(fs.readFileString(filePath), Effect.map(JSON.parse))
      const args = Args.fileSchema(
        Schema.Struct({
          foo: Schema.Boolean,
          bar: Schema.Literal("baz")
        }),
        { name: "files" }
      ).pipe(Args.repeated)
      const result = yield* _(
        Args.validate(args, Array.of(filePath), CliConfig.defaultConfig)
      )
      expect(result).toEqual([Array.empty(), Array.of(content)])
    }).pipe(runEffect))
})
