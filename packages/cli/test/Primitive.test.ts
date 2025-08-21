import * as CliConfig from "@effect/cli/CliConfig"
import * as Primitive from "@effect/cli/Primitive"
import type { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Array, Effect, Equal, Function, Option } from "effect"
import * as fc from "effect/FastCheck"

const runEffect = <E, A>(self: Effect.Effect<A, E, FileSystem.FileSystem>): Promise<A> =>
  Effect.provide(self, NodeFileSystem.layer).pipe(Effect.runPromise)

describe("Primitive", () => {
  describe("Bool", () => {
    it("validates that truthy text representations of a boolean return true", () =>
      fc.assert(fc.asyncProperty(trueValuesArb, (str) =>
        Effect.gen(function*() {
          const bool = Primitive.boolean(Option.none())
          const result = yield* Primitive.validate(
            bool,
            Option.some(str),
            CliConfig.defaultConfig
          )
          expect(result).toBe(true)
        }).pipe(runEffect))))

    it("validates that falsy text representations of a boolean return false", () =>
      fc.assert(fc.asyncProperty(falseValuesArb, (str) =>
        Effect.gen(function*() {
          const bool = Primitive.boolean(Option.none())
          const result = yield* Primitive.validate(
            bool,
            Option.some(str),
            CliConfig.defaultConfig
          )
          expect(result).toBe(false)
        }).pipe(runEffect))))

    it("validates that invalid boolean representations are rejected", () =>
      Effect.gen(function*() {
        const bool = Primitive.boolean(Option.none())
        const result = yield* Effect.flip(Primitive.validate(bool, Option.some("bad"), CliConfig.defaultConfig))
        expect(result).toBe("Unable to recognize 'bad' as a valid boolean")
      }).pipe(runEffect))

    it("validates that the default value will be used if a value is not provided", () =>
      fc.assert(fc.asyncProperty(fc.boolean(), (value) =>
        Effect.gen(function*() {
          const bool = Primitive.boolean(Option.some(value))
          const result = yield* Primitive.validate(bool, Option.none(), CliConfig.defaultConfig)
          expect(result).toBe(value)
        }).pipe(runEffect))))
  })

  describe("Choice", () => {
    it("validates a choice that is one of the alternatives", () =>
      fc.assert(
        fc.asyncProperty(pairsArb, ([[selectedName, selectedValue], pairs]) =>
          Effect.gen(function*() {
            const alternatives = Function.unsafeCoerce<
              ReadonlyArray<[string, number]>,
              Array.NonEmptyReadonlyArray<[string, number]>
            >(pairs)
            const choice = Primitive.choice(alternatives)
            const result = yield* Primitive.validate(
              choice,
              Option.some(selectedName),
              CliConfig.defaultConfig
            )
            expect(result).toEqual(selectedValue)
          }).pipe(runEffect))
      ))

    it("does not validate a choice that is not one of the alternatives", () =>
      fc.assert(fc.asyncProperty(pairsArb, ([tuple, pairs]) =>
        Effect.gen(function*() {
          const selectedName = tuple[0]
          const alternatives = Function.unsafeCoerce<
            ReadonlyArray<[string, number]>,
            Array.NonEmptyReadonlyArray<[string, number]>
          >(Array.filter(pairs, (pair) => !Equal.equals(tuple, pair)))
          const choice = Primitive.choice(alternatives)
          const result = yield* Effect.flip(Primitive.validate(
            choice,
            Option.some(selectedName),
            CliConfig.defaultConfig
          ))
          expect(result).toMatch(/^Expected one of the following cases:\s.*/)
        }).pipe(runEffect))))
  })

  simplePrimitiveTestSuite(Primitive.date, fc.date({ noInvalidDate: true }), "Date")

  simplePrimitiveTestSuite(
    Primitive.float,
    fc.float({ noNaN: true }).filter((n) => n !== 0),
    "Float"
  )

  simplePrimitiveTestSuite(Primitive.integer, fc.integer(), "Integer")

  describe("Text", () => {
    it("validates all user-defined text", () =>
      fc.assert(fc.asyncProperty(fc.string(), (str) =>
        Effect.gen(function*() {
          const result = yield* Primitive.validate(
            Primitive.text,
            Option.some(str),
            CliConfig.defaultConfig
          )
          expect(result).toEqual(str)
        }).pipe(runEffect))))
  })
})

const simplePrimitiveTestSuite = <A>(
  primitive: Primitive.Primitive<A>,
  arb: fc.Arbitrary<A>,
  primitiveTypeName: string
) => {
  describe(`${primitiveTypeName}`, () => {
    it(`validates that valid values are accepted`, () =>
      fc.assert(fc.asyncProperty(arb, (value) =>
        Effect.gen(function*() {
          const str = value instanceof Date ? value.toISOString() : `${value}`
          const result = yield* Primitive.validate(primitive, Option.some(str), CliConfig.defaultConfig)
          expect(result).toEqual(value)
        }).pipe(runEffect))))

    it(`validates that invalid values are rejected`, () =>
      Effect.gen(function*() {
        const result = yield* Effect.flip(Primitive.validate(primitive, Option.some("bad"), CliConfig.defaultConfig))
        expect(result).toBe(`'bad' is not a ${Primitive.getTypeName(primitive)}`)
      }).pipe(runEffect))
  })
}

const randomizeCharacterCases = (str: string): string => {
  let result = ""
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    result += Math.random() < 0.5 ? char.toLowerCase() : char.toUpperCase()
  }
  return result
}

const trueValuesArb = fc.constantFrom("true", "1", "y", "yes", "on").map(randomizeCharacterCases)
const falseValuesArb = fc.constantFrom("false", "0", "n", "no", "off").map(randomizeCharacterCases)

const pairsArb = fc.array(fc.tuple(fc.string(), fc.float()), { minLength: 2, maxLength: 100 })
  .map((pairs) => Array.dedupeWith(pairs, ([str1], [str2]) => str1 === str2))
  .chain((pairs) => fc.tuple(fc.constantFrom(...pairs), fc.constant(pairs)))
