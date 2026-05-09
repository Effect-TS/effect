import * as CliConfig from "@effect/cli/CliConfig"
import * as HelpDoc from "@effect/cli/HelpDoc"
import * as Options from "@effect/cli/Options"
import * as ValidationError from "@effect/cli/ValidationError"
import * as NodeContext from "@effect/platform-node/NodeContext"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import { assert, describe, expect, it } from "@effect/vitest"
import { BigDecimal, pipe } from "effect"
import * as Array from "effect/Array"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { identity } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"

const firstName = Options.text("firstName").pipe(Options.withAlias("f"))
const lastName = Options.text("lastName")
const age = Options.integer("age")
const balance = Options.text("balance").pipe(Options.withSchema(Schema.BigDecimal))
const ageOptional = Options.optional(age)
const verbose = Options.boolean("verbose", { ifPresent: true })
const defs = Options.keyValueMap("defs").pipe(Options.withAlias("d"))

const runEffect = <E, A>(
  self: Effect.Effect<A, E, NodeContext.NodeContext>
): Promise<A> => Effect.provide(self, NodeContext.layer).pipe(Effect.runPromise)

const process = <A>(
  options: Options.Options<A>,
  args: ReadonlyArray<string>,
  config: CliConfig.CliConfig
): Effect.Effect<
  [ReadonlyArray<string>, A],
  ValidationError.ValidationError,
  NodeContext.NodeContext
> =>
  Options.processCommandLine(options, args, config).pipe(
    Effect.flatMap(([err, rest, a]) =>
      Option.match(err, {
        onNone: () => Effect.succeed([rest, a]),
        onSome: Effect.fail
      })
    )
  )

describe("Options", () => {
  it("should validate without ambiguity", () =>
    Effect.gen(function*() {
      const args = Array.make("--firstName", "--lastName", "--lastName", "--firstName")
      const result1 = yield* process(Options.all([firstName, lastName]), args, CliConfig.defaultConfig)
      const result2 = yield* process(Options.all([lastName, firstName]), args, CliConfig.defaultConfig)
      const expected1 = [Array.empty(), Array.make("--lastName", "--firstName")]
      const expected2 = [Array.empty(), Array.make("--firstName", "--lastName")]
      expect(result1).toEqual(expected1)
      expect(result2).toEqual(expected2)
    }).pipe(runEffect))

  it("should not uncluster values", () =>
    Effect.gen(function*() {
      const args = Array.make("--firstName", "-ab")
      const result = yield* process(firstName, args, CliConfig.defaultConfig)
      const expected = [Array.empty(), "-ab"]
      expect(result).toEqual(expected)
    }).pipe(runEffect))

  it("should return a HelpDoc if an option is not an exact match and it's a short option", () =>
    Effect.gen(function*() {
      const args = Array.make("--ag", "20")
      const result = yield* Effect.flip(process(age, args, CliConfig.defaultConfig))
      expect(result).toEqual(ValidationError.missingValue(HelpDoc.p(
        "Expected to find option: '--age'"
      )))
    }).pipe(runEffect))

  it("should return a HelpDoc if there is a collision between arguments", () =>
    Effect.gen(function*() {
      const options = Options.orElse(
        Options.text("a").pipe(Options.map(identity)),
        Options.text("b").pipe(Options.map(identity))
      )
      const args = Array.make("-a", "a", "-b", "b")
      const result = yield* Effect.flip(process(options, args, CliConfig.defaultConfig))
      expect(result).toEqual(ValidationError.invalidValue(HelpDoc.p(
        "Collision between two options detected - you can only " +
          "specify one of either: ['-a', '-b']"
      )))
    }).pipe(runEffect))

  it("validates a boolean option without a value", () =>
    Effect.gen(function*() {
      const args = Array.make("--verbose")
      const result = yield* process(verbose, args, CliConfig.defaultConfig)
      const expected = [Array.empty(), true]
      expect(result).toEqual(expected)
    }).pipe(runEffect))

  it("validates a boolean option with a followup option", () =>
    Effect.gen(function*() {
      const options = Options.all([Options.boolean("help"), Options.boolean("v")])
      const args1 = Array.empty()
      const args2 = Array.make("--help")
      const args3 = Array.make("--help", "-v")
      const result1 = yield* process(options, args1, CliConfig.defaultConfig)
      const result2 = yield* process(options, args2, CliConfig.defaultConfig)
      const result3 = yield* process(options, args3, CliConfig.defaultConfig)
      const expected1 = [Array.empty(), [false, false]]
      const expected2 = [Array.empty(), [true, false]]
      const expected3 = [Array.empty(), [true, true]]
      expect(result1).toEqual(expected1)
      expect(result2).toEqual(expected2)
      expect(result3).toEqual(expected3)
    }).pipe(runEffect))

  it("validates a boolean option with negation", () =>
    Effect.gen(function*() {
      const option = Options.boolean("verbose", { aliases: ["v"], negationNames: ["silent", "s"] })
      const result1 = yield* process(option, [], CliConfig.defaultConfig)
      const result2 = yield* process(option, ["--verbose"], CliConfig.defaultConfig)
      const result3 = yield* process(option, ["-v"], CliConfig.defaultConfig)
      const result4 = yield* process(option, ["--silent"], CliConfig.defaultConfig)
      const result5 = yield* process(option, ["-s"], CliConfig.defaultConfig)
      const result6 = yield* Effect.flip(process(option, ["--verbose", "--silent"], CliConfig.defaultConfig))
      const result7 = yield* Effect.flip(process(option, ["-v", "-s"], CliConfig.defaultConfig))
      expect(result1).toEqual([[], false])
      expect(result2).toEqual([[], true])
      expect(result3).toEqual([[], true])
      expect(result4).toEqual([[], false])
      expect(result5).toEqual([[], false])
      expect(result6).toEqual(ValidationError.invalidValue(HelpDoc.p(
        "Collision between two options detected - " +
          "you can only specify one of either: ['--verbose', '--silent']"
      )))
      expect(result7).toEqual(ValidationError.invalidValue(HelpDoc.p(
        "Collision between two options detected - " +
          "you can only specify one of either: ['--verbose', '--silent']"
      )))
    }).pipe(runEffect))

  it("does not validate collision of boolean options with negation", () =>
    Effect.gen(function*() {
      const option = Options.boolean("v", { negationNames: ["s"] })
      const args = Array.make("-v", "-s")
      const result = yield* Effect.flip(process(option, args, CliConfig.defaultConfig))
      expect(result).toEqual(ValidationError.invalidValue(HelpDoc.p(
        "Collision between two options detected - " +
          "you can only specify one of either: ['-v', '-s']"
      )))
    }).pipe(runEffect))

  it("validates a option with choices", () =>
    Effect.gen(function*() {
      const option = Options.choice("animal", ["cat", "dog"])
      const args1 = Array.make("--animal", "cat")
      const args2 = Array.make("--animal", "dog")
      const result1 = yield* process(option, args1, CliConfig.defaultConfig)
      const result2 = yield* process(option, args2, CliConfig.defaultConfig)
      expect(result1).toEqual([[], "cat"])
      expect(result2).toEqual([[], "dog"])
    }).pipe(runEffect))

  it("validates an option with choices that map to values", () =>
    Effect.gen(function*() {
      type Animal = Dog | Cat
      class Dog extends Data.TaggedClass("Dog")<{}> {}
      class Cat extends Data.TaggedClass("Dog")<{}> {}
      const cat = new Cat()
      const dog = new Dog()
      const option: Options.Options<Animal> = Options.choiceWithValue("animal", [
        ["dog", dog],
        ["cat", cat]
      ])
      const args1 = Array.make("--animal", "cat")
      const args2 = Array.make("--animal", "dog")
      const result1 = yield* process(option, args1, CliConfig.defaultConfig)
      const result2 = yield* process(option, args2, CliConfig.defaultConfig)
      expect(result1).toEqual([[], cat])
      expect(result2).toEqual([[], dog])
    }).pipe(runEffect))

  it("validates a text option", () =>
    Effect.gen(function*() {
      const result = yield* process(firstName, ["--firstName", "John"], CliConfig.defaultConfig)
      expect(result).toEqual([[], "John"])
    }).pipe(runEffect))

  it("validates a text option with an alternative format", () =>
    Effect.gen(function*() {
      const result = yield* process(firstName, ["--firstName=John"], CliConfig.defaultConfig)
      expect(result).toEqual([[], "John"])
    }).pipe(runEffect))

  it("validates a text option with an alias", () =>
    Effect.gen(function*() {
      const result = yield* process(firstName, ["-f", "John"], CliConfig.defaultConfig)
      expect(result).toEqual([[], "John"])
    }).pipe(runEffect))

  it("validates an integer option", () =>
    Effect.gen(function*() {
      const result = yield* process(age, ["--age", "100"], CliConfig.defaultConfig)
      expect(result).toEqual([[], 100])
    }).pipe(runEffect))

  it("validates an option and returns the remainder", () =>
    Effect.gen(function*() {
      const args = Array.make("--firstName", "John", "--lastName", "Doe")
      const result = yield* process(firstName, args, CliConfig.defaultConfig)
      expect(result).toEqual([["--lastName", "Doe"], "John"])
    }).pipe(runEffect))

  it("does not validate when no valid values are passed", () =>
    Effect.gen(function*() {
      const args = Array.make("--lastName", "Doe")
      const result = yield* Effect.either(process(firstName, args, CliConfig.defaultConfig))
      expect(result).toEqual(Either.left(ValidationError.missingValue(HelpDoc.p(
        "Expected to find option: '--firstName'"
      ))))
    }).pipe(runEffect))

  it("does not validate when an option is passed without a corresponding value", () =>
    Effect.gen(function*() {
      const args = Array.make("--firstName")
      const result = yield* Effect.either(process(firstName, args, CliConfig.defaultConfig))
      expect(result).toEqual(Either.left(ValidationError.missingValue(HelpDoc.p(
        "Expected a value following option: '--firstName'"
      ))))
    }).pipe(runEffect))

  it("does not validate an invalid option value", () =>
    Effect.gen(function*() {
      const option = Options.integer("t")
      const args = Array.make("-t", "abc")
      const result = yield* Effect.flip(process(option, args, CliConfig.defaultConfig))
      expect(result).toEqual(ValidationError.invalidValue(HelpDoc.p("'abc' is not a integer")))
    }).pipe(runEffect))

  it("does not validate an invalid option value even when there is a default", () =>
    Effect.gen(function*() {
      const option = Options.withDefault(Options.integer("t"), 0)
      const args = Array.make("-t", "abc")
      const result = yield* Effect.flip(process(option, args, CliConfig.defaultConfig))
      expect(result).toEqual(ValidationError.invalidValue(HelpDoc.p("'abc' is not a integer")))
    }).pipe(runEffect))

  it("validates with case-sensitive configuration", () =>
    Effect.gen(function*() {
      const config = CliConfig.make({ isCaseSensitive: true, autoCorrectLimit: 2 })
      const option = Options.text("Firstname").pipe(Options.withAlias("F"))
      const args1 = Array.make("--Firstname", "John")
      const args2 = Array.make("-F", "John")
      const args3 = Array.make("--firstname", "John")
      const args4 = Array.make("-f", "John")
      const result1 = yield* process(option, args1, config)
      const result2 = yield* process(option, args2, config)
      const result3 = yield* Effect.flip(process(option, args3, config))
      const result4 = yield* Effect.flip(process(option, args4, config))
      expect(result1).toEqual([[], "John"])
      expect(result2).toEqual([[], "John"])
      expect(result3).toEqual(ValidationError.correctedFlag(HelpDoc.p(
        "The flag '--firstname' is not recognized. Did you mean '--Firstname'?"
      )))
      expect(result4).toEqual(ValidationError.missingValue(HelpDoc.p(
        "Expected to find option: '--Firstname'"
      )))
    }).pipe(runEffect))

  it("validates an unsupplied optional option", () =>
    Effect.gen(function*() {
      const result = yield* process(ageOptional, [], CliConfig.defaultConfig)
      expect(result).toEqual([[], Option.none()])
    }).pipe(runEffect))

  it("validates an unsupplied optional option with remainder", () =>
    Effect.gen(function*() {
      const args = Array.make("--bar", "baz")
      const result = yield* process(ageOptional, args, CliConfig.defaultConfig)
      expect(result).toEqual([args, Option.none()])
    }).pipe(runEffect))

  it("validates a supplied optional option", () =>
    Effect.gen(function*() {
      const args = Array.make("--age", "20")
      const result = yield* process(ageOptional, args, CliConfig.defaultConfig)
      expect(result).toEqual([[], Option.some(20)])
    }).pipe(runEffect))

  it("validates using all and returns the specified structure", () =>
    Effect.gen(function*() {
      const option1 = Options.all({
        firstName: Options.text("firstName"),
        lastName: Options.text("lastName")
      })
      const option2 = Options.all([Options.text("firstName"), Options.text("lastName")])
      const args = Array.make("--firstName", "John", "--lastName", "Doe")
      const result1 = yield* process(option1, args, CliConfig.defaultConfig)
      const result2 = yield* process(option2, args, CliConfig.defaultConfig)
      expect(result1).toEqual([[], { firstName: "John", lastName: "Doe" }])
      expect(result2).toEqual([[], ["John", "Doe"]])
    }).pipe(runEffect))

  it("validate provides a suggestion if a provided option is close to a specified option", () =>
    Effect.gen(function*() {
      const args = Array.make("--firstme", "Alice")
      const result = yield* Effect.flip(process(firstName, args, CliConfig.defaultConfig))
      expect(result).toEqual(ValidationError.correctedFlag(HelpDoc.p(
        "The flag '--firstme' is not recognized. Did you mean '--firstName'?"
      )))
    }).pipe(runEffect))

  it("validate provides a suggestion if a provided option with a default is close to a specified option", () =>
    Effect.gen(function*() {
      const option = firstName.pipe(Options.withDefault("Jack"))
      const args = Array.make("--firstme", "Alice")
      const result = yield* Effect.flip(process(option, args, CliConfig.defaultConfig))
      expect(result).toEqual(ValidationError.invalidValue(HelpDoc.p(
        "The flag '--firstme' is not recognized. Did you mean '--firstName'?"
      )))
    }))

  it("orElse - two options", () =>
    Effect.gen(function*() {
      const option = Options.text("string").pipe(
        Options.map(Either.left),
        Options.orElse(
          Options.integer("integer").pipe(
            Options.map(Either.right)
          )
        )
      )
      const args1 = Array.make("--integer", "2")
      const args2 = Array.make("--string", "two")
      const result1 = yield* process(option, args1, CliConfig.defaultConfig)
      const result2 = yield* process(option, args2, CliConfig.defaultConfig)
      expect(result1).toEqual([[], Either.right(2)])
      expect(result2).toEqual([[], Either.left("two")])
    }).pipe(runEffect))

  it("orElse - option collision", () =>
    Effect.gen(function*() {
      const option = Options.orElse(Options.text("string"), Options.integer("integer"))
      const args = Array.make("--integer", "2", "--string", "two")
      const result = yield* Effect.flip(process(option, args, CliConfig.defaultConfig))
      expect(result).toEqual(ValidationError.invalidValue(HelpDoc.p(
        "Collision between two options detected - " +
          "you can only specify one of either: ['--string', '--integer']"
      )))
    }).pipe(runEffect))

  it("orElse - no options provided", () =>
    Effect.gen(function*() {
      const option = Options.orElse(Options.text("string"), Options.integer("integer"))
      const result = yield* Effect.flip(process(option, [], CliConfig.defaultConfig))
      const error = ValidationError.missingValue(HelpDoc.sequence(
        HelpDoc.p("Expected to find option: '--string'"),
        HelpDoc.p("Expected to find option: '--integer'")
      ))
      expect(result).toEqual(error)
    }).pipe(runEffect))

  it("orElse - invalid option provided with a default", () =>
    Effect.gen(function*() {
      const option = Options.integer("min").pipe(
        Options.orElse(Options.integer("max")),
        Options.withDefault(0)
      )
      const args = Array.make("--min", "abc")
      const result = yield* Effect.flip(process(option, args, CliConfig.defaultConfig))
      const error = ValidationError.invalidValue(HelpDoc.sequence(
        HelpDoc.p("'abc' is not a integer"),
        HelpDoc.p("Expected to find option: '--max'")
      ))
      expect(result).toEqual(error)
    }).pipe(runEffect))

  it("keyValueMap - validates a missing option", () =>
    Effect.gen(function*() {
      const result = yield* Effect.flip(process(defs, [], CliConfig.defaultConfig))
      expect(result).toEqual(ValidationError.missingValue(HelpDoc.p(
        "Expected to find option: '--defs'"
      )))
    }).pipe(runEffect))

  it("keyValueMap - validates repeated values", () =>
    Effect.gen(function*() {
      const args = Array.make("-d", "key1=v1", "-d", "key2=v2", "--verbose")
      const result = yield* process(defs, args, CliConfig.defaultConfig)
      expect(result).toEqual([["--verbose"], HashMap.make(["key1", "v1"], ["key2", "v2"])])
    }).pipe(runEffect))

  it("keyValueMap - validates different key/values", () =>
    Effect.gen(function*() {
      const args = Array.make("--defs", "key1=v1", "key2=v2", "--verbose")
      const result = yield* process(defs, args, CliConfig.defaultConfig)
      expect(result).toEqual([["--verbose"], HashMap.make(["key1", "v1"], ["key2", "v2"])])
    }).pipe(runEffect))

  it("keyValueMap - validates different key/values with alias", () =>
    Effect.gen(function*() {
      const args = Array.make("-d", "key1=v1", "key2=v2", "--verbose")
      const result = yield* process(defs, args, CliConfig.defaultConfig)
      expect(result).toEqual([["--verbose"], HashMap.make(["key1", "v1"], ["key2", "v2"])])
    }).pipe(runEffect))

  it("keyValueMap - validates key/values with equals in alias value", () =>
    Effect.gen(function*() {
      const args = Array.make("-d", "key1=v1", "key2=v2=vv", "--verbose")
      const result = yield* process(defs, args, CliConfig.defaultConfig)
      expect(result).toEqual([["--verbose"], HashMap.make(["key1", "v1"], ["key2", "v2=vv"])])
    }).pipe(runEffect))

  it("keyValueMap - validates key/values with equals in aliased longer value", () =>
    Effect.gen(function*() {
      const args = Array.make("-d", "key1=v1", "key2=v2=1+1", "--verbose")
      const result = yield* process(defs, args, CliConfig.defaultConfig)
      expect(result).toEqual([["--verbose"], HashMap.make(["key1", "v1"], ["key2", "v2=1+1"])])
    }).pipe(runEffect))

  it("keyValueMap - validate should keep non-key-value parameters that follow the key-value pairs (each preceded by alias -d)", () =>
    Effect.gen(function*() {
      const args = Array.make(
        "-d",
        "key1=val1",
        "-d",
        "key2=val2",
        "-d",
        "key3=val3",
        "arg1",
        "arg2",
        "--verbose"
      )
      const result = yield* process(defs, args, CliConfig.defaultConfig)
      expect(result).toEqual([
        ["arg1", "arg2", "--verbose"],
        HashMap.make(["key1", "val1"], ["key2", "val2"], ["key3", "val3"])
      ])
    }).pipe(runEffect))

  it("keyValueMap - validate should keep non-key-value parameters that follow the key-value pairs (only the first key/value pair is preceded by alias)", () =>
    Effect.gen(function*() {
      const args = Array.make(
        "-d",
        "key1=val1",
        "key2=val2",
        "key3=val3",
        "arg1",
        "arg2",
        "--verbose"
      )
      const result = yield* process(defs, args, CliConfig.defaultConfig)
      expect(result).toEqual([
        ["arg1", "arg2", "--verbose"],
        HashMap.make(["key1", "val1"], ["key2", "val2"], ["key3", "val3"])
      ])
    }).pipe(runEffect))

  it("keyValueMap - validate should return an error for invalid key/value pairs", () =>
    Effect.gen(function*() {
      const args = Array.make(
        "-d",
        "key1=val1",
        "key2=val2",
        "--defs",
        "key3=val3",
        "key4=",
        "arg1",
        "arg2",
        "--verbose"
      )
      const result = yield* process(defs, args, CliConfig.defaultConfig)
      expect(result).toEqual([
        ["key4=", "arg1", "arg2", "--verbose"],
        HashMap.make(["key1", "val1"], ["key2", "val2"], ["key3", "val3"])
      ])
    }).pipe(runEffect))

  it("repeated", () =>
    Effect.gen(function*() {
      const option = Options.integer("foo").pipe(Options.repeated)
      const args2 = ["--foo", "1", "--foo", "2", "--foo", "3"]
      const args3 = ["--foo", "v2"]
      const args4 = ["--foo", "1", "--foo", "v2", "--foo", "3"]
      const args5 = ["--foo", "1", "-d", "--foo", "2"]
      const args6 = ["--foo", "1", "-f", "firstName", "--foo", "2"]
      const result1 = yield* process(option, [], CliConfig.defaultConfig)
      const result2 = yield* process(option, args2, CliConfig.defaultConfig)
      const result3 = yield* Effect.flip(process(option, args3, CliConfig.defaultConfig))
      const result4 = yield* Effect.flip(process(option, args4, CliConfig.defaultConfig))
      const result5 = yield* process(option, args5, CliConfig.defaultConfig)
      const result6 = yield* process(option, args6, CliConfig.defaultConfig)
      expect(result1).toEqual([Array.empty(), []])
      expect(result2).toEqual([Array.empty(), [1, 2, 3]])
      expect(result3).toEqual(ValidationError.invalidValue(HelpDoc.p("'v2' is not a integer")))
      expect(result4).toEqual(ValidationError.invalidValue(HelpDoc.p("'v2' is not a integer")))
      expect(result5).toEqual([["-d"], [1, 2]])
      expect(result6).toEqual([["-f", "firstName"], [1, 2]])
    }).pipe(runEffect))

  it("atLeast", () =>
    Effect.gen(function*() {
      const option = Options.integer("foo").pipe(Options.atLeast(2))
      const args1 = ["--foo", "1", "--foo", "2"]
      const args2 = ["--foo", "1"]
      const result1 = yield* process(option, args1, CliConfig.defaultConfig)
      const result2 = yield* Effect.flip(process(option, args2, CliConfig.defaultConfig))
      expect(result1).toEqual([Array.empty(), [1, 2]])
      expect(result2).toEqual(ValidationError.invalidValue(HelpDoc.p(
        "Expected at least 2 value(s) for option: '--foo'"
      )))
    }).pipe(runEffect))

  it("atMost", () =>
    Effect.gen(function*() {
      const option = Options.integer("foo").pipe(Options.atMost(2))
      const args1 = ["--foo", "1", "--foo", "2"]
      const args2 = ["--foo", "1", "--foo", "2", "--foo", "3"]
      const result1 = yield* process(option, args1, CliConfig.defaultConfig)
      const result2 = yield* Effect.flip(process(option, args2, CliConfig.defaultConfig))
      expect(result1).toEqual([Array.empty(), [1, 2]])
      expect(result2).toEqual(ValidationError.invalidValue(HelpDoc.p(
        "Expected at most 2 value(s) for option: '--foo'"
      )))
    }).pipe(runEffect))

  it("between", () =>
    Effect.gen(function*() {
      const option = Options.integer("foo").pipe(Options.between(2, 3))
      const args1 = ["--foo", "1"]
      const args2 = ["--foo", "1", "--foo", "2"]
      const args3 = ["--foo", "1", "--foo", "2", "--foo", "3"]
      const args4 = ["--foo", "1", "--foo", "2", "--foo", "3", "--foo", "4"]
      const result1 = yield* Effect.flip(process(option, args1, CliConfig.defaultConfig))
      const result2 = yield* process(option, args2, CliConfig.defaultConfig)
      const result3 = yield* process(option, args3, CliConfig.defaultConfig)
      const result4 = yield* Effect.flip(process(option, args4, CliConfig.defaultConfig))
      expect(result1).toEqual(ValidationError.invalidValue(HelpDoc.p(
        "Expected at least 2 value(s) for option: '--foo'"
      )))
      expect(result2).toEqual([Array.empty(), [1, 2]])
      expect(result3).toEqual([Array.empty(), [1, 2, 3]])
      expect(result4).toEqual(ValidationError.invalidValue(HelpDoc.p(
        "Expected at most 3 value(s) for option: '--foo'"
      )))
    }).pipe(runEffect))

  it("validates with a Schema", () =>
    Effect.gen(function*() {
      const result = yield* process(balance, ["--balance", "100.50"], CliConfig.defaultConfig)
      assert.deepStrictEqual(result, [[], BigDecimal.unsafeFromString("100.50").pipe(BigDecimal.normalize)])
    }).pipe(runEffect))

  it("failure with a Schema", () =>
    Effect.gen(function*() {
      const result = yield* process(balance, ["--balance", "abc"], CliConfig.defaultConfig).pipe(Effect.flip)
      assert.deepStrictEqual(
        result,
        ValidationError.invalidValue(HelpDoc.p(
          "BigDecimal\n" +
            "└─ Transformation process failure\n" +
            "   └─ Unable to decode \"abc\" into a BigDecimal"
        ))
      )
    }).pipe(runEffect))

  it("fileContent", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const filePath = path.join(__dirname, "fixtures/config.json")
      const result = yield* process(Options.fileContent("config"), ["--config", filePath], CliConfig.defaultConfig)
      const content = yield* fs.readFile(filePath)
      assert.deepStrictEqual(result, [[], [filePath, content]])
    }).pipe(runEffect))

  it("fileText", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const filePath = path.join(__dirname, "fixtures/config.json")
      const result = yield* process(Options.fileText("config"), ["--config", filePath], CliConfig.defaultConfig)
      const content = yield* pipe(fs.readFileString(filePath))
      assert.deepStrictEqual(result, [[], [filePath, content]])
    }).pipe(runEffect))

  it("fileParse", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const filePath = path.join(__dirname, "fixtures/config.json")
      const result = yield* process(Options.fileParse("config"), ["--config", filePath], CliConfig.defaultConfig)
      const content = yield* pipe(fs.readFileString(filePath), Effect.map(JSON.parse))
      assert.deepStrictEqual(result, [[], content])
    }).pipe(runEffect))

  it("fileSchema", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const filePath = path.join(__dirname, "fixtures/config.json")
      const result = yield* process(
        Options.fileSchema(
          "config",
          Schema.Struct({
            foo: Schema.Boolean,
            bar: Schema.Literal("baz")
          })
        ),
        ["--config", filePath],
        CliConfig.defaultConfig
      )
      const content = yield* pipe(fs.readFileString(filePath), Effect.map(JSON.parse))
      assert.deepStrictEqual(result, [[], content])
    }).pipe(runEffect))

  it("fileSchema yaml", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const filePath = path.join(__dirname, "fixtures/config.yaml")
      const jsonPath = path.join(__dirname, "fixtures/config.json")
      const result = yield* process(
        Options.fileSchema(
          "config",
          Schema.Struct({
            foo: Schema.Boolean,
            bar: Schema.Literal("baz")
          })
        ),
        ["--config", filePath],
        CliConfig.defaultConfig
      )
      const content = yield* pipe(fs.readFileString(jsonPath), Effect.map(JSON.parse))
      assert.deepStrictEqual(result, [[], content])
    }).pipe(runEffect))

  it("fileSchema ini", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const filePath = path.join(__dirname, "fixtures/config.ini")
      const jsonPath = path.join(__dirname, "fixtures/config.json")
      const result = yield* process(
        Options.fileSchema(
          "config",
          Schema.Struct({
            foo: Schema.Boolean,
            bar: Schema.Literal("baz")
          })
        ),
        ["--config", filePath],
        CliConfig.defaultConfig
      )
      const content = yield* pipe(fs.readFileString(jsonPath), Effect.map(JSON.parse))
      assert.deepStrictEqual(result, [[], content])
    }).pipe(runEffect))

  it("fileSchema toml", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const filePath = path.join(__dirname, "fixtures/config.toml")
      const jsonPath = path.join(__dirname, "fixtures/config.json")
      const result = yield* process(
        Options.fileSchema(
          "config",
          Schema.Struct({
            foo: Schema.Boolean,
            bar: Schema.Literal("baz")
          })
        ),
        ["--config", filePath],
        CliConfig.defaultConfig
      )
      const content = yield* pipe(fs.readFileString(jsonPath), Effect.map(JSON.parse))
      assert.deepStrictEqual(result, [[], content])
    }).pipe(runEffect))

  it("displays default value in help when default wrapped in Option.Some (primitive)", () =>
    Effect.gen(function*() {
      const option = Options.withDefault(Options.integer("value"), Option.some(123))
      const helpDoc = Options.getHelp(option)
      yield* Effect.promise(() =>
        expect(helpDoc).toMatchFileSnapshot("./snapshots/help-output/options-default-primitive")
      )
    }).pipe(runEffect))

  it("displays default value in help when default wrapped in Option.Some (object)", () =>
    Effect.gen(function*() {
      const defaultObject = { key: "value", number: 456 }
      const option = Options.withDefault(Options.text("config"), Option.some(defaultObject))
      const helpDoc = Options.getHelp(option)
      yield* Effect.promise(() => expect(helpDoc).toMatchFileSnapshot("./snapshots/help-output/options-default-object"))
    }).pipe(runEffect))

  it("displays no default value in help when default is not Option.Some", () =>
    Effect.gen(function*() {
      const option = Options.withDefault(Options.text("name"), Option.none())
      const helpDoc = Options.getHelp(option)
      yield* Effect.promise(() => expect(helpDoc).toMatchFileSnapshot("./snapshots/help-output/options-no-default"))
    }).pipe(runEffect))

  describe("options after positional arguments", () => {
    it("parses a text option that appears after positional args", () =>
      Effect.gen(function*() {
        // Simulating: cmd positional --firstName John
        const args = Array.make("positional", "--firstName", "John")
        const result = yield* process(firstName, args, CliConfig.defaultConfig)
        // The "positional" should be in the leftover, firstName should be parsed
        expect(result).toEqual([["positional"], "John"])
      }).pipe(runEffect))

    it("parses a text option with alias that appears after positional args", () =>
      Effect.gen(function*() {
        // Simulating: cmd positional -f John
        const args = Array.make("positional", "-f", "John")
        const result = yield* process(firstName, args, CliConfig.defaultConfig)
        expect(result).toEqual([["positional"], "John"])
      }).pipe(runEffect))

    it("parses a boolean option that appears after positional args", () =>
      Effect.gen(function*() {
        // Simulating: cmd positional --verbose
        const args = Array.make("positional", "--verbose")
        const result = yield* process(verbose, args, CliConfig.defaultConfig)
        expect(result).toEqual([["positional"], true])
      }).pipe(runEffect))

    it("parses multiple options when some appear after positional args", () =>
      Effect.gen(function*() {
        const options = Options.all([firstName, lastName])
        // Simulating: cmd --firstName John positional --lastName Doe
        const args = Array.make("--firstName", "John", "positional", "--lastName", "Doe")
        const result = yield* process(options, args, CliConfig.defaultConfig)
        expect(result).toEqual([["positional"], ["John", "Doe"]])
      }).pipe(runEffect))

    it("parses options interspersed with multiple positional args", () =>
      Effect.gen(function*() {
        const options = Options.all([firstName, verbose])
        // Simulating: cmd pos1 --firstName John pos2 --verbose pos3
        const args = Array.make("pos1", "--firstName", "John", "pos2", "--verbose", "pos3")
        const result = yield* process(options, args, CliConfig.defaultConfig)
        expect(result).toEqual([["pos1", "pos2", "pos3"], ["John", true]])
      }).pipe(runEffect))

    it("parses text option with = syntax after positional args", () =>
      Effect.gen(function*() {
        // Simulating: cmd positional --firstName=John
        const args = Array.make("positional", "--firstName=John")
        const result = yield* process(firstName, args, CliConfig.defaultConfig)
        expect(result).toEqual([["positional"], "John"])
      }).pipe(runEffect))

    it("parses boolean option with explicit true value after positional args", () =>
      Effect.gen(function*() {
        // Simulating: cmd positional --verbose true
        const args = Array.make("positional", "--verbose", "true")
        const result = yield* process(verbose, args, CliConfig.defaultConfig)
        expect(result).toEqual([["positional"], true])
      }).pipe(runEffect))

    it("parses boolean option with explicit false value after positional args", () =>
      Effect.gen(function*() {
        // Simulating: cmd positional --verbose false
        const args = Array.make("positional", "--verbose", "false")
        const result = yield* process(verbose, args, CliConfig.defaultConfig)
        expect(result).toEqual([["positional"], false])
      }).pipe(runEffect))

    it("parses keyValueMap option that appears after positional args", () =>
      Effect.gen(function*() {
        // Simulating: cmd positional --defs key=value
        const args = Array.make("positional", "--defs", "key=value")
        const result = yield* process(defs, args, CliConfig.defaultConfig)
        expect(result).toEqual([["positional"], HashMap.make(["key", "value"])])
      }).pipe(runEffect))

    it("parses keyValueMap option with multiple values after positional args", () =>
      Effect.gen(function*() {
        // Simulating: cmd positional --defs key1=value1 key2=value2
        const args = Array.make("positional", "-d", "key1=value1", "key2=value2")
        const result = yield* process(defs, args, CliConfig.defaultConfig)
        expect(result).toEqual([["positional"], HashMap.make(["key1", "value1"], ["key2", "value2"])])
      }).pipe(runEffect))
  })
})
