import * as CliConfig from "@effect/cli/CliConfig"
import * as HelpDoc from "@effect/cli/HelpDoc"
import * as Options from "@effect/cli/Options"
import * as ValidationError from "@effect/cli/ValidationError"
import { Data, Effect, Either, HashMap, Option, ReadonlyArray } from "effect"
import { describe, expect, it } from "vitest"

const firstName = Options.text("firstName").pipe(Options.withAlias("f"))
const lastName = Options.text("lastName")
const age = Options.integer("age")
const ageOptional = Options.optional(age)
const verbose = Options.boolean("verbose", { ifPresent: true })
const defs = Options.keyValueMap("defs").pipe(Options.withAlias("d"))

const validation = <A>(
  options: Options.Options<A>,
  args: ReadonlyArray<string>,
  config: CliConfig.CliConfig
): Effect.Effect<never, ValidationError.ValidationError, readonly [ReadonlyArray<string>, A]> =>
  Options.validate(options, args, config).pipe(Effect.flatMap(([err, rest, a]) =>
    Option.match(err, {
      onNone: () => Effect.succeed([rest, a]),
      onSome: Effect.fail
    })
  ))

describe("Options", () => {
  it("should validate without ambiguity", () =>
    Effect.gen(function*(_) {
      const args = ReadonlyArray.make("--firstName", "--lastName", "--lastName", "--firstName")
      const result1 = yield* _(validation(Options.all([firstName, lastName]), args, CliConfig.defaultConfig))
      const result2 = yield* _(validation(Options.all([lastName, firstName]), args, CliConfig.defaultConfig))
      const expected1 = [ReadonlyArray.empty(), ReadonlyArray.make("--lastName", "--firstName")]
      const expected2 = [ReadonlyArray.empty(), ReadonlyArray.make("--firstName", "--lastName")]
      expect(result1).toEqual(expected1)
      expect(result2).toEqual(expected2)
    }).pipe(Effect.runPromise))

  it("should not uncluster values", () =>
    Effect.gen(function*(_) {
      const args = ReadonlyArray.make("--firstName", "-ab")
      const result = yield* _(validation(firstName, args, CliConfig.defaultConfig))
      const expected = [ReadonlyArray.empty(), "-ab"]
      expect(result).toEqual(expected)
    }).pipe(Effect.runPromise))

  it("should return a HelpDoc if an option is not an exact match and it's a short option", () =>
    Effect.gen(function*(_) {
      const args = ReadonlyArray.make("--ag", "20")
      const result = yield* _(Effect.flip(validation(age, args, CliConfig.defaultConfig)))
      expect(result).toEqual(ValidationError.missingValue(HelpDoc.p(
        "Expected to find option: '--age'"
      )))
    }).pipe(Effect.runPromise))

  it("validates a boolean option without a value", () =>
    Effect.gen(function*(_) {
      const args = ReadonlyArray.make("--verbose")
      const result = yield* _(validation(verbose, args, CliConfig.defaultConfig))
      const expected = [ReadonlyArray.empty(), true]
      expect(result).toEqual(expected)
    }).pipe(Effect.runPromise))

  it("validates a boolean option with a followup option", () =>
    Effect.gen(function*(_) {
      const options = Options.all([Options.boolean("help"), Options.boolean("v")])
      const args1 = ReadonlyArray.empty()
      const args2 = ReadonlyArray.make("--help")
      const args3 = ReadonlyArray.make("--help", "-v")
      const result1 = yield* _(validation(options, args1, CliConfig.defaultConfig))
      const result2 = yield* _(validation(options, args2, CliConfig.defaultConfig))
      const result3 = yield* _(validation(options, args3, CliConfig.defaultConfig))
      const expected1 = [ReadonlyArray.empty(), [false, false]]
      const expected2 = [ReadonlyArray.empty(), [true, false]]
      const expected3 = [ReadonlyArray.empty(), [true, true]]
      expect(result1).toEqual(expected1)
      expect(result2).toEqual(expected2)
      expect(result3).toEqual(expected3)
    }).pipe(Effect.runPromise))

  it("validates a boolean option with negation", () =>
    Effect.gen(function*(_) {
      const option = Options.boolean("verbose", { aliases: ["v"], negationNames: ["silent", "s"] })
      const result1 = yield* _(validation(option, [], CliConfig.defaultConfig))
      const result2 = yield* _(validation(option, ["--verbose"], CliConfig.defaultConfig))
      const result3 = yield* _(validation(option, ["-v"], CliConfig.defaultConfig))
      const result4 = yield* _(validation(option, ["--silent"], CliConfig.defaultConfig))
      const result5 = yield* _(validation(option, ["-s"], CliConfig.defaultConfig))
      const result6 = yield* _(Effect.flip(validation(option, ["--verbose", "--silent"], CliConfig.defaultConfig)))
      const result7 = yield* _(Effect.flip(validation(option, ["-v", "-s"], CliConfig.defaultConfig)))
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
    }).pipe(Effect.runPromise))

  it("does not validate collision of boolean options with negation", () =>
    Effect.gen(function*(_) {
      const option = Options.boolean("v", { negationNames: ["s"] })
      const args = ReadonlyArray.make("-v", "-s")
      const result = yield* _(Effect.flip(validation(option, args, CliConfig.defaultConfig)))
      expect(result).toEqual(ValidationError.invalidValue(HelpDoc.p(
        "Collision between two options detected - " +
          "you can only specify one of either: ['-v', '-s']"
      )))
    }).pipe(Effect.runPromise))

  it("validates a text option", () =>
    Effect.gen(function*(_) {
      const result = yield* _(validation(firstName, ["--firstName", "John"], CliConfig.defaultConfig))
      expect(result).toEqual([[], "John"])
    }).pipe(Effect.runPromise))

  it("validates a text option with an alternative format", () =>
    Effect.gen(function*(_) {
      const result = yield* _(validation(firstName, ["--firstName=John"], CliConfig.defaultConfig))
      expect(result).toEqual([[], "John"])
    }).pipe(Effect.runPromise))

  it("validates a text option with an alias", () =>
    Effect.gen(function*(_) {
      const result = yield* _(validation(firstName, ["-f", "John"], CliConfig.defaultConfig))
      expect(result).toEqual([[], "John"])
    }).pipe(Effect.runPromise))

  it("validates an integer option", () =>
    Effect.gen(function*(_) {
      const result = yield* _(validation(age, ["--age", "100"], CliConfig.defaultConfig))
      expect(result).toEqual([[], 100])
    }).pipe(Effect.runPromise))

  it("validates an option and returns the remainder", () =>
    Effect.gen(function*(_) {
      const args = ReadonlyArray.make("--firstName", "John", "--lastName", "Doe")
      const result = yield* _(validation(firstName, args, CliConfig.defaultConfig))
      expect(result).toEqual([["--lastName", "Doe"], "John"])
    }).pipe(Effect.runPromise))

  it("does not validate when no valid values are passed", () =>
    Effect.gen(function*(_) {
      const args = ReadonlyArray.make("--lastName", "Doe")
      const result = yield* _(Effect.either(validation(firstName, args, CliConfig.defaultConfig)))
      expect(result).toEqual(Either.left(ValidationError.missingValue(HelpDoc.p(
        "Expected to find option: '--firstName'"
      ))))
    }).pipe(Effect.runPromise))

  it("does not validate when an option is passed without a corresponding value", () =>
    Effect.gen(function*(_) {
      const args = ReadonlyArray.make("--firstName")
      const result = yield* _(Effect.either(validation(firstName, args, CliConfig.defaultConfig)))
      expect(result).toEqual(Either.left(ValidationError.missingValue(HelpDoc.p(
        "Expected a value following option: '--firstName'"
      ))))
    }).pipe(Effect.runPromise))

  it("does not validate an invalid option value", () =>
    Effect.gen(function*(_) {
      const option = Options.integer("t")
      const args = ReadonlyArray.make("-t", "abc")
      const result = yield* _(Effect.flip(validation(option, args, CliConfig.defaultConfig)))
      expect(result).toEqual(ValidationError.invalidValue(HelpDoc.p("'abc' is not a integer")))
    }).pipe(Effect.runPromise))

  it("does not validate an invalid option value even when there is a default", () =>
    Effect.gen(function*(_) {
      const option = Options.withDefault(Options.integer("t"), 0)
      const args = ReadonlyArray.make("-t", "abc")
      const result = yield* _(Effect.flip(validation(option, args, CliConfig.defaultConfig)))
      expect(result).toEqual(ValidationError.invalidValue(HelpDoc.p("'abc' is not a integer")))
    }).pipe(Effect.runPromise))

  it("validates with case-sensitive configuration", () =>
    Effect.gen(function*(_) {
      const config = CliConfig.make({ isCaseSensitive: true, autoCorrectLimit: 2 })
      const option = Options.text("Firstname").pipe(Options.withAlias("F"))
      const args1 = ReadonlyArray.make("--Firstname", "John")
      const args2 = ReadonlyArray.make("-F", "John")
      const args3 = ReadonlyArray.make("--firstname", "John")
      const args4 = ReadonlyArray.make("-f", "John")
      const result1 = yield* _(validation(option, args1, config))
      const result2 = yield* _(validation(option, args2, config))
      const result3 = yield* _(Effect.flip(validation(option, args3, config)))
      const result4 = yield* _(Effect.flip(validation(option, args4, config)))
      expect(result1).toEqual([[], "John"])
      expect(result2).toEqual([[], "John"])
      expect(result3).toEqual(ValidationError.correctedFlag(HelpDoc.p(
        "The flag '--firstname' is not recognized. Did you mean '--Firstname'?"
      )))
      expect(result4).toEqual(ValidationError.missingValue(HelpDoc.p(
        "Expected to find option: '--Firstname'"
      )))
    }).pipe(Effect.runPromise))

  it("validates an unsupplied optional option", () =>
    Effect.gen(function*(_) {
      const result = yield* _(validation(ageOptional, [], CliConfig.defaultConfig))
      expect(result).toEqual([[], Option.none()])
    }).pipe(Effect.runPromise))

  it("validates an unsupplied optional option with remainder", () =>
    Effect.gen(function*(_) {
      const args = ReadonlyArray.make("--bar", "baz")
      const result = yield* _(validation(ageOptional, args, CliConfig.defaultConfig))
      expect(result).toEqual([args, Option.none()])
    }).pipe(Effect.runPromise))

  it("validates a supplied optional option", () =>
    Effect.gen(function*(_) {
      const args = ReadonlyArray.make("--age", "20")
      const result = yield* _(validation(ageOptional, args, CliConfig.defaultConfig))
      expect(result).toEqual([[], Option.some(20)])
    }).pipe(Effect.runPromise))

  it("validates using all and returns the specified structure", () =>
    Effect.gen(function*(_) {
      const option1 = Options.all({
        firstName: Options.text("firstName"),
        lastName: Options.text("lastName")
      })
      const option2 = Options.all([Options.text("firstName"), Options.text("lastName")])
      const args = ReadonlyArray.make("--firstName", "John", "--lastName", "Doe")
      const result1 = yield* _(validation(option1, args, CliConfig.defaultConfig))
      const result2 = yield* _(validation(option2, args, CliConfig.defaultConfig))
      expect(result1).toEqual([[], { firstName: "John", lastName: "Doe" }])
      expect(result2).toEqual([[], ["John", "Doe"]])
    }).pipe(Effect.runPromise))

  it("validate provides a suggestion if a provided option is close to a specified option", () =>
    Effect.gen(function*(_) {
      const args = ReadonlyArray.make("--firstme", "Alice")
      const result = yield* _(Effect.flip(validation(firstName, args, CliConfig.defaultConfig)))
      expect(result).toEqual(ValidationError.correctedFlag(HelpDoc.p(
        "The flag '--firstme' is not recognized. Did you mean '--firstName'?"
      )))
    }).pipe(Effect.runPromise))

  it("validate provides a suggestion if a provided option with a default is close to a specified option", () =>
    Effect.gen(function*(_) {
      const option = firstName.pipe(Options.withDefault("Jack"))
      const args = ReadonlyArray.make("--firstme", "Alice")
      const result = yield* _(Effect.flip(validation(option, args, CliConfig.defaultConfig)))
      expect(result).toEqual(ValidationError.invalidValue(HelpDoc.p(
        "The flag '--firstme' is not recognized. Did you mean '--firstName'?"
      )))
    }))

  it("orElse - two options", () =>
    Effect.gen(function*(_) {
      const option = Options.text("string").pipe(
        Options.map(Either.left),
        Options.orElse(
          Options.integer("integer").pipe(
            Options.map(Either.right)
          )
        )
      )
      const args1 = ReadonlyArray.make("--integer", "2")
      const args2 = ReadonlyArray.make("--string", "two")
      const result1 = yield* _(validation(option, args1, CliConfig.defaultConfig))
      const result2 = yield* _(validation(option, args2, CliConfig.defaultConfig))
      expect(result1).toEqual([[], Either.right(2)])
      expect(result2).toEqual([[], Either.left("two")])
    }).pipe(Effect.runPromise))

  it("orElse - option collision", () =>
    Effect.gen(function*(_) {
      const option = Options.orElse(Options.text("string"), Options.integer("integer"))
      const args = ReadonlyArray.make("--integer", "2", "--string", "two")
      const result = yield* _(Effect.flip(validation(option, args, CliConfig.defaultConfig)))
      expect(result).toEqual(ValidationError.invalidValue(HelpDoc.p(
        "Collision between two options detected - " +
          "you can only specify one of either: ['--string', '--integer']"
      )))
    }).pipe(Effect.runPromise))

  it("orElse - no options provided", () =>
    Effect.gen(function*(_) {
      const option = Options.orElse(Options.text("string"), Options.integer("integer"))
      const result = yield* _(Effect.flip(Options.validate(option, [], CliConfig.defaultConfig)))
      const error = ValidationError.missingValue(HelpDoc.sequence(
        HelpDoc.p("Expected to find option: '--string'"),
        HelpDoc.p("Expected to find option: '--integer'")
      ))
      expect(result).toEqual(error)
    }).pipe(Effect.runPromise))

  it("orElse - invalid option provided with a default", () =>
    Effect.gen(function*(_) {
      const option = Options.integer("min").pipe(
        Options.orElse(Options.integer("max")),
        Options.withDefault(0)
      )
      const args = ReadonlyArray.make("--min", "abc")
      const result = yield* _(Effect.flip(Options.validate(option, args, CliConfig.defaultConfig)))
      const error = ValidationError.invalidValue(HelpDoc.sequence(
        HelpDoc.p("'abc' is not a integer"),
        HelpDoc.p("Expected to find option: '--max'")
      ))
      expect(result).toEqual(error)
    }).pipe(Effect.runPromise))

  it("keyValueMap - validates a missing option", () =>
    Effect.gen(function*(_) {
      const result = yield* _(Effect.flip(validation(defs, [], CliConfig.defaultConfig)))
      expect(result).toEqual(ValidationError.missingValue(HelpDoc.p(
        "Expected to find option: '--defs'"
      )))
    }).pipe(Effect.runPromise))

  it("keyValueMap - validates repeated values", () =>
    Effect.gen(function*(_) {
      const args = ReadonlyArray.make("-d", "key1=v1", "-d", "key2=v2", "--verbose")
      const result = yield* _(validation(defs, args, CliConfig.defaultConfig))
      expect(result).toEqual([["--verbose"], HashMap.make(["key1", "v1"], ["key2", "v2"])])
    }).pipe(Effect.runPromise))

  it("keyValueMap - validates different key/values", () =>
    Effect.gen(function*(_) {
      const args = ReadonlyArray.make("--defs", "key1=v1", "key2=v2", "--verbose")
      const result = yield* _(validation(defs, args, CliConfig.defaultConfig))
      expect(result).toEqual([["--verbose"], HashMap.make(["key1", "v1"], ["key2", "v2"])])
    }).pipe(Effect.runPromise))

  it("keyValueMap - validates different key/values with alias", () =>
    Effect.gen(function*(_) {
      const args = ReadonlyArray.make("-d", "key1=v1", "key2=v2", "--verbose")
      const result = yield* _(validation(defs, args, CliConfig.defaultConfig))
      expect(result).toEqual([["--verbose"], HashMap.make(["key1", "v1"], ["key2", "v2"])])
    }).pipe(Effect.runPromise))

  it("keyValueMap - validate should keep non-key-value parameters that follow the key-value pairs (each preceded by alias -d)", () =>
    Effect.gen(function*(_) {
      const args = ReadonlyArray.make(
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
      const result = yield* _(validation(defs, args, CliConfig.defaultConfig))
      expect(result).toEqual([
        ["arg1", "arg2", "--verbose"],
        HashMap.make(["key1", "val1"], ["key2", "val2"], ["key3", "val3"])
      ])
    }).pipe(Effect.runPromise))

  it("keyValueMap - validate should keep non-key-value parameters that follow the key-value pairs (only the first key/value pair is preceded by alias)", () =>
    Effect.gen(function*(_) {
      const args = ReadonlyArray.make("-d", "key1=val1", "key2=val2", "key3=val3", "arg1", "arg2", "--verbose")
      const result = yield* _(validation(defs, args, CliConfig.defaultConfig))
      expect(result).toEqual([
        ["arg1", "arg2", "--verbose"],
        HashMap.make(["key1", "val1"], ["key2", "val2"], ["key3", "val3"])
      ])
    }).pipe(Effect.runPromise))

  it("keyValueMap - validate should keep non-key-value parameters that follow the key-value pairs (with a 'mixed' style of proceeding -- name or alias)", () =>
    Effect.gen(function*(_) {
      const args = ReadonlyArray.make(
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
      const result = yield* _(validation(defs, args, CliConfig.defaultConfig))
      expect(result).toEqual([
        ["key4=", "arg1", "arg2", "--verbose"],
        HashMap.make(["key1", "val1"], ["key2", "val2"], ["key3", "val3"])
      ])
    }).pipe(Effect.runPromise))

  it("choice", () =>
    Effect.gen(function*($) {
      const option = Options.choice("animal", ["cat", "dog"])
      const args1 = ReadonlyArray.make("--animal", "cat")
      const args2 = ReadonlyArray.make("--animal", "dog")
      const result1 = yield* $(validation(option, args1, CliConfig.defaultConfig))
      const result2 = yield* $(validation(option, args2, CliConfig.defaultConfig))
      expect(result1).toEqual([[], "cat"])
      expect(result2).toEqual([[], "dog"])
    }).pipe(Effect.runPromise))

  it("choiceWithValue", () =>
    Effect.gen(function*($) {
      type Animal = Dog | Cat
      class Dog extends Data.TaggedClass("Dog")<{}> {}
      class Cat extends Data.TaggedClass("Dog")<{}> {}
      const cat = new Cat()
      const dog = new Dog()
      const option: Options.Options<Animal> = Options.choiceWithValue("animal", [
        ["dog", dog],
        ["cat", cat]
      ])
      const args1 = ReadonlyArray.make("--animal", "cat")
      const args2 = ReadonlyArray.make("--animal", "dog")
      const result1 = yield* $(validation(option, args1, CliConfig.defaultConfig))
      const result2 = yield* $(validation(option, args2, CliConfig.defaultConfig))
      expect(result1).toEqual([[], cat])
      expect(result2).toEqual([[], dog])
    }).pipe(Effect.runPromise))
})
