import * as Args from "@effect/cli/Args"
import * as CliConfig from "@effect/cli/CliConfig"
import * as HelpDoc from "@effect/cli/HelpDoc"
import * as ValidationError from "@effect/cli/ValidationError"
import { FileSystem, Path } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { pipe } from "effect"
import * as Array from "effect/Array"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"

const runEffect = <E, A>(
  self: Effect.Effect<A, E, NodeContext.NodeContext>
): Promise<A> => Effect.provide(self, NodeContext.layer).pipe(Effect.runPromise)

describe("Args", () => {
  it("validates an valid argument with a default", () =>
    Effect.gen(function*() {
      const args = Args.integer().pipe(Args.withDefault(0))
      const result = yield* Args.validate(args, Array.empty(), CliConfig.defaultConfig)
      expect(result).toEqual([Array.empty(), 0])
    }).pipe(runEffect))

  it("validates an valid optional argument", () =>
    Effect.gen(function*() {
      const args = Args.integer().pipe(Args.optional)
      let result = yield* Args.validate(args, Array.empty(), CliConfig.defaultConfig)
      expect(result).toEqual([Array.empty(), Option.none()])

      result = yield* Args.validate(args, ["123"], CliConfig.defaultConfig)
      expect(result).toEqual([Array.empty(), Option.some(123)])
    }).pipe(runEffect))

  it("does not validate an invalid argument even when there is a default", () =>
    Effect.gen(function*() {
      const args = Args.integer().pipe(Args.withDefault(0))
      const result = yield* Effect.flip(
        Args.validate(args, Array.of("abc"), CliConfig.defaultConfig)
      )
      expect(result).toEqual(ValidationError.invalidArgument(HelpDoc.p("'abc' is not a integer")))
    }).pipe(runEffect))

  it("should validate an existing file that is expected to exist", () =>
    Effect.gen(function*() {
      const path = yield* Path.Path
      const filePath = path.join(__dirname, "Args.test.ts")
      const args = Args.file({ name: "files", exists: "yes" }).pipe(Args.repeated)
      const result = yield* Args.validate(args, Array.of(filePath), CliConfig.defaultConfig)
      expect(result).toEqual([Array.empty(), Array.of(filePath)])
    }).pipe(runEffect))

  it("should return an error when a file that is expected to exist is not found", () =>
    Effect.gen(function*() {
      const path = yield* Path.Path
      const filePath = path.join(__dirname, "NotExist.test.ts")
      const args = Args.file({ name: "files", exists: "yes" }).pipe(Args.repeated)
      const result = yield* Effect.flip(Args.validate(args, Array.of(filePath), CliConfig.defaultConfig))
      expect(result).toEqual(ValidationError.invalidArgument(HelpDoc.p(
        `Path '${filePath}' must exist`
      )))
    }).pipe(runEffect))

  it("should validate a non-existent file that is expected not to exist", () =>
    Effect.gen(function*() {
      const path = yield* Path.Path
      const filePath = path.join(__dirname, "NotExist.test.ts")
      const args = Args.file({ name: "files", exists: "no" }).pipe(Args.repeated)
      const result = yield* Args.validate(args, Array.of(filePath), CliConfig.defaultConfig)
      expect(result).toEqual([Array.empty(), Array.of(filePath)])
    }).pipe(runEffect))

  it("should validate a series of files", () =>
    Effect.gen(function*() {
      const path = yield* Path.Path
      const filePath = path.join(__dirname, "NotExist.test.ts")
      const args = Args.file({ name: "files", exists: "no" }).pipe(Args.repeated)
      const result = yield* Args.validate(args, Array.make(filePath, filePath), CliConfig.defaultConfig)
      expect(result).toEqual([Array.empty(), Array.make(filePath, filePath)])
    }).pipe(runEffect))

  it("validates an valid argument with a Schema", () =>
    Effect.gen(function*() {
      const args = Args.integer().pipe(Args.withSchema(Schema.Positive))
      const result = yield* Args.validate(args, ["123"], CliConfig.defaultConfig)
      expect(result).toEqual([Array.empty(), 123])
    }).pipe(runEffect))

  it("does not validate an invalid argument with a Schema", () =>
    Effect.gen(function*() {
      const args = Args.integer().pipe(Args.withSchema(Schema.Positive))
      const result = yield* Effect.flip(
        Args.validate(args, Array.of("-123"), CliConfig.defaultConfig)
      )
      expect(result).toEqual(ValidationError.invalidArgument(HelpDoc.p(
        "Positive\n" +
          "└─ Predicate refinement failure\n" +
          "   └─ Expected a positive number, actual -123"
      )))
    }).pipe(runEffect))

  it("fileContent", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const filePath = path.join(__dirname, "fixtures/config.json")
      const content = yield* fs.readFile(filePath)
      const args = Args.fileContent({ name: "files" }).pipe(Args.repeated)
      const result = yield* Args.validate(args, Array.of(filePath), CliConfig.defaultConfig)
      expect(result).toEqual([Array.empty(), Array.of([filePath, content])])
    }).pipe(runEffect))

  it("fileText", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const filePath = path.join(__dirname, "fixtures/config.json")
      const content = yield* fs.readFileString(filePath)
      const args = Args.fileText({ name: "files" }).pipe(Args.repeated)
      const result = yield* Args.validate(args, Array.of(filePath), CliConfig.defaultConfig)
      expect(result).toEqual([Array.empty(), Array.of([filePath, content])])
    }).pipe(runEffect))

  it("fileParse", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const filePath = path.join(__dirname, "fixtures/config.json")
      const content = yield* pipe(fs.readFileString(filePath), Effect.map(JSON.parse))
      const args = Args.fileParse({ name: "files" }).pipe(Args.repeated)
      const result = yield* Args.validate(args, Array.of(filePath), CliConfig.defaultConfig)
      expect(result).toEqual([Array.empty(), Array.of(content)])
    }).pipe(runEffect))

  it("fileSchema", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const filePath = path.join(__dirname, "fixtures/config.json")
      const content = yield* pipe(fs.readFileString(filePath), Effect.map(JSON.parse))
      const args = Args.fileSchema(
        Schema.Struct({
          foo: Schema.Boolean,
          bar: Schema.Literal("baz")
        }),
        { name: "files" }
      ).pipe(Args.repeated)
      const result = yield* Args.validate(args, Array.of(filePath), CliConfig.defaultConfig)
      expect(result).toEqual([Array.empty(), Array.of(content)])
    }).pipe(runEffect))

  it("displays default value in help when default wrapped in Option.Some (primitive)", () =>
    Effect.gen(function*() {
      const option = Args.withDefault(Args.integer({ name: "value" }), Option.some(123))
      const helpDoc = Args.getHelp(option)
      yield* Effect.promise(() => expect(helpDoc).toMatchFileSnapshot("./snapshots/help-output/args-default-primitive"))
    }).pipe(runEffect))

  it("displays default value in help when default wrapped in Option.Some (object)", () =>
    Effect.gen(function*() {
      const defaultObject = { key: "value", number: 456 }
      const option = Args.withDefault(Args.text({ name: "config" }), Option.some(defaultObject))
      const helpDoc = Args.getHelp(option)
      yield* Effect.promise(() => expect(helpDoc).toMatchFileSnapshot("./snapshots/help-output/args-default-object"))
    }).pipe(runEffect))

  it("displays no default value in help when default is not Option.Some", () =>
    Effect.gen(function*() {
      const option = Args.withDefault(Args.text({ name: "name" }), Option.none())
      const helpDoc = Args.getHelp(option)
      yield* Effect.promise(() => expect(helpDoc).toMatchFileSnapshot("./snapshots/help-output/args-no-default"))
    }).pipe(runEffect))
})
