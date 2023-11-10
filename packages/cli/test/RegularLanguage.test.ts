import * as CliConfig from "@effect/cli/CliConfig"
import * as Primitive from "@effect/cli/Primitive"
import * as RegularLanguage from "@effect/cli/RegularLanguage"
import * as FileSystem from "@effect/platform-node/FileSystem"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

const runEffect = <E, A>(self: Effect.Effect<FileSystem.FileSystem, E, A>): Promise<A> =>
  Effect.provide(self, FileSystem.layer).pipe(Effect.runPromise)

describe("RegularLanguage", () => {
  it("Empty language - rejects all strings", () =>
    fc.assert(
      fc.asyncProperty(fc.array(fc.string(), { minLength: 0, maxLength: 5 }), (tokens) =>
        Effect.gen(function*(_) {
          const result = yield* _(
            RegularLanguage.contains(RegularLanguage.empty, tokens, CliConfig.defaultConfig)
          )
          expect(result).toBe(false)
        }).pipe(runEffect))
    ))

  it("Epsilon language - accepts the empty string", () =>
    Effect.gen(function*(_) {
      const tokens = ReadonlyArray.empty()
      const result = yield* _(
        RegularLanguage.contains(RegularLanguage.epsilon, tokens, CliConfig.defaultConfig)
      )
      expect(result).toBe(true)
    }).pipe(runEffect))

  it("Epsilon language - rejects all non-empty strings", () =>
    fc.assert(
      fc.asyncProperty(fc.array(fc.string(), { minLength: 1, maxLength: 5 }), (tokens) =>
        Effect.gen(function*(_) {
          const result = yield* _(
            RegularLanguage.contains(RegularLanguage.epsilon, tokens, CliConfig.defaultConfig)
          )
          expect(result).toBe(false)
        }).pipe(runEffect))
    ))

  it("StringToken language - accepts the target string", () =>
    Effect.gen(function*(_) {
      const tokens = ReadonlyArray.make("foo")
      const result = yield* _(
        RegularLanguage.contains(RegularLanguage.string("foo"), tokens, CliConfig.defaultConfig)
      )
      expect(result).toBe(true)
    }).pipe(runEffect))

  it("StringToken language - rejects anything other than the target string", () =>
    fc.assert(
      fc.asyncProperty(fc.string().filter((str) => str !== "foo"), (token) =>
        Effect.gen(function*(_) {
          const tokens = ReadonlyArray.make(token)
          const result = yield* _(
            RegularLanguage.contains(RegularLanguage.string("foo"), tokens, CliConfig.defaultConfig)
          )
          expect(result).toBe(false)
        }).pipe(runEffect))
    ))

  it("Primitive.Bool language - accepts values corresponding to 'true' and 'false'", () =>
    fc.assert(
      fc.asyncProperty(fc.oneof(trueValuesArb, falseValuesArb), (token) =>
        Effect.gen(function*(_) {
          const tokens = ReadonlyArray.make(token)
          const language = RegularLanguage.primitive(Primitive.boolean(Option.none()))
          const result = yield* _(
            RegularLanguage.contains(language, tokens, CliConfig.defaultConfig)
          )
          expect(result).toBe(true)
        }).pipe(runEffect))
    ))

  it("Primitive.Bool language - rejects values that do not correspond to 'true' or 'false'", () => {
    const arbitrary = fc.string()
      .map((str) => str.toLowerCase())
      .filter((str) => !trueValues.has(str) && !falseValues.has(str))
    return fc.assert(
      fc.asyncProperty(arbitrary, (token) =>
        Effect.gen(function*(_) {
          const tokens = ReadonlyArray.make(token)
          const language = RegularLanguage.primitive(Primitive.boolean(Option.none()))
          const result = yield* _(
            RegularLanguage.contains(language, tokens, CliConfig.defaultConfig)
          )
          expect(result).toBe(false)
        }).pipe(runEffect))
    )
  })

  it("Cat language - accepts 'foo' 'bar' 'baz'", () =>
    Effect.gen(function*(_) {
      const tokens = ReadonlyArray.make("foo", "bar", "baz")
      const language = RegularLanguage.concat(
        RegularLanguage.string("foo"),
        RegularLanguage.concat(
          RegularLanguage.string("bar"),
          RegularLanguage.string("baz")
        )
      )
      const result = yield* _(RegularLanguage.contains(language, tokens, CliConfig.defaultConfig))
      expect(result).toBe(true)
    }).pipe(runEffect))

  it("Cat language - rejects anything that is not 'foo' 'bar' 'baz'", () => {
    const arbitrary = fc.oneof(
      fc.constant(ReadonlyArray.empty<string>()),
      fc.constant(["foo"]),
      fc.constant(["foo", "bar"]),
      fc.constant(["foo", "baz"]),
      fc.constant(["foo", "bar", "baz", "bippy"])
    )
    return fc.assert(
      fc.asyncProperty(arbitrary, (tokens) =>
        Effect.gen(function*(_) {
          const language = RegularLanguage.concat(
            RegularLanguage.string("foo"),
            RegularLanguage.concat(
              RegularLanguage.string("bar"),
              RegularLanguage.string("baz")
            )
          )
          const result = yield* _(
            RegularLanguage.contains(language, tokens, CliConfig.defaultConfig)
          )
          expect(result).toBe(false)
        }).pipe(runEffect))
    )
  })

  it("Alt language - accepts 'foo' 'bar'", () =>
    Effect.gen(function*(_) {
      const tokens = ReadonlyArray.make("foo", "bar")
      const language = RegularLanguage.orElse(
        RegularLanguage.concat(RegularLanguage.string("foo"), RegularLanguage.string("bar")),
        RegularLanguage.concat(RegularLanguage.string("foo"), RegularLanguage.string("baz"))
      )
      const result = yield* _(RegularLanguage.contains(language, tokens, CliConfig.defaultConfig))
      expect(result).toBe(true)
    }).pipe(runEffect))

  it("Alt language - accepts 'foo' 'baz'", () =>
    Effect.gen(function*(_) {
      const tokens = ReadonlyArray.make("foo", "baz")
      const language = RegularLanguage.orElse(
        RegularLanguage.concat(RegularLanguage.string("foo"), RegularLanguage.string("bar")),
        RegularLanguage.concat(RegularLanguage.string("foo"), RegularLanguage.string("baz"))
      )
      const result = yield* _(RegularLanguage.contains(language, tokens, CliConfig.defaultConfig))
      expect(result).toBe(true)
    }).pipe(runEffect))

  it("Alt language - rejects anything that is not 'foo' 'bar' | 'foo' 'baz'", () => {
    const arbitrary = fc.oneof(
      fc.constant(ReadonlyArray.empty<string>()),
      fc.constant(["foo"]),
      fc.constant(["foo", "bar", "baz"]),
      fc.constant(["foo", "bar", "foo", "baz"])
    )
    return fc.assert(
      fc.asyncProperty(arbitrary, (tokens) =>
        Effect.gen(function*(_) {
          const language = RegularLanguage.orElse(
            RegularLanguage.concat(RegularLanguage.string("foo"), RegularLanguage.string("bar")),
            RegularLanguage.concat(RegularLanguage.string("foo"), RegularLanguage.string("baz"))
          )
          const result = yield* _(
            RegularLanguage.contains(language, tokens, CliConfig.defaultConfig)
          )
          expect(result).toBe(false)
        }).pipe(runEffect))
    )
  })

  it("Repeat language - accepts zero or more repetitions of 'foo' 'bar' | 'foo' 'baz'", () => {
    const arbitrary = fc.oneof(
      fc.constant(ReadonlyArray.empty<string>()),
      fc.constant(["foo", "bar"]),
      fc.constant(["foo", "baz"]),
      fc.constant(["foo", "bar", "foo", "baz"]),
      fc.constant(["foo", "baz", "foo", "bar"]),
      fc.constant(["foo", "bar", "foo", "bar"]),
      fc.constant(["foo", "baz", "foo", "baz"]),
      fc.constant(["foo", "bar", "foo", "baz", "foo", "bar"]),
      fc.constant(["foo", "baz", "foo", "baz", "foo", "bar", "foo", "baz"])
    )
    return fc.assert(
      fc.asyncProperty(arbitrary, (tokens) =>
        Effect.gen(function*(_) {
          const language = RegularLanguage.orElse(
            RegularLanguage.concat(RegularLanguage.string("foo"), RegularLanguage.string("bar")),
            RegularLanguage.concat(RegularLanguage.string("foo"), RegularLanguage.string("baz"))
          ).pipe(RegularLanguage.repeated())
          const result = yield* _(
            RegularLanguage.contains(language, tokens, CliConfig.defaultConfig)
          )
          expect(result).toBe(true)
        }).pipe(runEffect))
    )
  })

  it("Repeat language - rejects everything except zero or more repetitions of 'foo' 'bar' | 'foo' 'baz'", () => {
    const arbitrary = fc.oneof(
      fc.constant(["foo", "bar", "foo"]),
      fc.constant(["foo", "baz", "foo"]),
      fc.constant(["foo", "bar", "foo", "baz", "foo"]),
      fc.constant(["foo", "baz", "foo", "bar", "baz"]),
      fc.constant(["foo", "bar", "foo", "bar", "bar"]),
      fc.constant(["foo", "baz", "foo", "baz", "baz"])
    )
    return fc.assert(
      fc.asyncProperty(arbitrary, (tokens) =>
        Effect.gen(function*(_) {
          const language = RegularLanguage.orElse(
            RegularLanguage.concat(RegularLanguage.string("foo"), RegularLanguage.string("bar")),
            RegularLanguage.concat(RegularLanguage.string("foo"), RegularLanguage.string("baz"))
          ).pipe(RegularLanguage.repeated())
          const result = yield* _(
            RegularLanguage.contains(language, tokens, CliConfig.defaultConfig)
          )
          expect(result).toBe(false)
        }).pipe(runEffect))
    )
  })

  it("Repeat language - accepts two to four repetitions of 'foo' 'bar' | 'foo' 'baz'", () => {
    const arbitrary = fc.oneof(
      fc.constant(["foo", "bar", "foo", "bar"]),
      fc.constant(["foo", "bar", "foo", "baz"]),
      fc.constant(["foo", "bar", "foo", "baz", "foo", "bar"]),
      fc.constant(["foo", "baz", "foo", "bar", "foo", "bar"]),
      fc.constant(["foo", "bar", "foo", "baz", "foo", "bar", "foo", "baz"]),
      fc.constant(["foo", "baz", "foo", "baz", "foo", "bar", "foo", "baz"])
    )
    return fc.assert(
      fc.asyncProperty(arbitrary, (tokens) =>
        Effect.gen(function*(_) {
          const language = RegularLanguage.orElse(
            RegularLanguage.concat(RegularLanguage.string("foo"), RegularLanguage.string("bar")),
            RegularLanguage.concat(RegularLanguage.string("foo"), RegularLanguage.string("baz"))
          ).pipe(RegularLanguage.repeated({ min: 2, max: 4 }))
          const result = yield* _(
            RegularLanguage.contains(language, tokens, CliConfig.defaultConfig)
          )
          expect(result).toBe(true)
        }).pipe(runEffect))
    )
  })

  it("Repeat language - rejects everything except two to four repetitions of 'foo' 'bar' | 'foo' 'baz'", () => {
    const arbitrary = fc.oneof(
      fc.constant(ReadonlyArray.empty<string>()),
      fc.constant(["foo", "bar"]),
      fc.constant(["foo", "baz"]),
      fc.constant(["foo", "baz", "foo"]),
      fc.constant(["foo", "baz", "bar"]),
      fc.constant(["foo", "bar", "foo", "baz", "foo"]),
      fc.constant(["foo", "baz", "foo", "bar", "baz"]),
      fc.constant(["foo", "bar", "foo", "bar", "bar"]),
      fc.constant(["foo", "baz", "foo", "baz", "baz"]),
      fc.constant(["foo", "baz", "foo", "baz", "foo", "baz", "foo", "baz", "foo", "baz"])
    )
    return fc.assert(
      fc.asyncProperty(arbitrary, (tokens) =>
        Effect.gen(function*(_) {
          const language = RegularLanguage.orElse(
            RegularLanguage.concat(RegularLanguage.string("foo"), RegularLanguage.string("bar")),
            RegularLanguage.concat(RegularLanguage.string("foo"), RegularLanguage.string("baz"))
          ).pipe(RegularLanguage.repeated({ min: 2, max: 4 }))
          const result = yield* _(
            RegularLanguage.contains(language, tokens, CliConfig.defaultConfig)
          )
          expect(result).toBe(false)
        }).pipe(runEffect))
    )
  })

  describe("Permutation Language - { 'a', 'b', 'c', 'd' }", () => {
    it("accepts permutations of { 'a', 'b', 'c', 'd' }", () => {
      const arbitrary = fc.constantFrom(...permutations(["a", "b", "c", "d"]))
      return fc.assert(
        fc.asyncProperty(arbitrary, (tokens) =>
          Effect.gen(function*(_) {
            const values = pipe(
              ReadonlyArray.make("a", "b", "c", "d"),
              ReadonlyArray.map((str) => RegularLanguage.string(str))
            )
            const language = RegularLanguage.permutation(values)
            const result = yield* _(
              RegularLanguage.contains(language, tokens, CliConfig.defaultConfig)
            )
            expect(result).toBe(true)
          }).pipe(runEffect))
      )
    })

    it("rejects everything except permutations of { 'a', 'b', 'c', 'd' }", () => {
      const arbitrary = fc.oneof(
        fc.constant(ReadonlyArray.empty<string>()),
        fc.constant(["a"]),
        fc.constant(["b"]),
        fc.constant(["c"]),
        fc.constant(["d"]),
        fc.constant(["a", "b", "c"]),
        fc.constant(["d", "c", "b"]),
        fc.constant(["a", "b", "c", "d", "d"])
      )
      return fc.assert(
        fc.asyncProperty(arbitrary, (tokens) =>
          Effect.gen(function*(_) {
            const values = pipe(
              ReadonlyArray.make("a", "b", "c", "d"),
              ReadonlyArray.map((str) => RegularLanguage.string(str))
            )
            const language = RegularLanguage.permutation(values)
            const result = yield* _(
              RegularLanguage.contains(language, tokens, CliConfig.defaultConfig)
            )
            expect(result).toBe(false)
          }).pipe(runEffect))
      )
    })
  })

  describe("Permutation Language - { 'a', 'b' | 'c', 'd'.* }", () => {
    it("accepts language members", () => {
      const arbitrary = fc.oneof(
        fc.constant(["a", "b"]),
        fc.constant(["a", "c"]),
        fc.constant(["a", "b", "d"]),
        fc.constant(["a", "b", "d", "d", "d"]),
        fc.constant(["a", "c", "d"]),
        fc.constant(["a", "c", "d", "d", "d"]),
        fc.constant(["d", "b", "a"]),
        fc.constant(["d", "d", "d", "b", "a"]),
        fc.constant(["d", "c", "a"]),
        fc.constant(["d", "d", "d", "c", "a"]),
        fc.constant(["d", "a", "b"])
      )
      return fc.assert(
        fc.asyncProperty(arbitrary, (tokens) =>
          Effect.gen(function*(_) {
            const language = RegularLanguage.permutation([
              RegularLanguage.string("a"),
              RegularLanguage.orElse(RegularLanguage.string("b"), RegularLanguage.string("c")),
              RegularLanguage.repeated(RegularLanguage.string("d"))
            ])
            const result = yield* _(
              RegularLanguage.contains(language, tokens, CliConfig.defaultConfig)
            )
            expect(result).toBe(true)
          }).pipe(runEffect))
      )
    })

    it("rejects language non-members", () => {
      const arbitrary = fc.oneof(
        fc.constant(ReadonlyArray.empty<string>()),
        fc.constant(["a"]),
        fc.constant(["b"]),
        fc.constant(["c"]),
        fc.constant(["d"]),
        fc.constant(["d", "a", "d"]),
        fc.constant(["a", "c", "c"])
      )
      return fc.assert(
        fc.asyncProperty(arbitrary, (tokens) =>
          Effect.gen(function*(_) {
            const language = RegularLanguage.permutation([
              RegularLanguage.string("a"),
              RegularLanguage.orElse(RegularLanguage.string("b"), RegularLanguage.string("c")),
              RegularLanguage.repeated(RegularLanguage.string("d"))
            ])
            const result = yield* _(
              RegularLanguage.contains(language, tokens, CliConfig.defaultConfig)
            )
            expect(result).toBe(false)
          }).pipe(runEffect))
      )
    })
  })

  describe("Permutation Language - { 'a'?, 'b'?, 'c'?, 'd'? } 'z'", () => {
    it("accepts language members", () => {
      const arbitrary = fc.oneof(
        fc.constant(["z"]),
        fc.constant(["a", "b", "z"]),
        fc.constant(["a", "c", "z"]),
        fc.constant(["a", "b", "d", "z"]),
        fc.constant(["d", "z"]),
        fc.constant(["a", "c", "d", "z"]),
        fc.constant(["d", "b", "a", "z"]),
        fc.constant(["d", "c", "a", "z"]),
        fc.constant(["d", "a", "b", "z"])
      )
      return fc.assert(
        fc.asyncProperty(arbitrary, (tokens) =>
          Effect.gen(function*(_) {
            const language = RegularLanguage.permutation([
              RegularLanguage.string("a").pipe(RegularLanguage.optional),
              RegularLanguage.string("b").pipe(RegularLanguage.optional),
              RegularLanguage.string("c").pipe(RegularLanguage.optional),
              RegularLanguage.string("d").pipe(RegularLanguage.optional)
            ]).pipe(RegularLanguage.concat(RegularLanguage.string("z")))
            const result = yield* _(
              RegularLanguage.contains(language, tokens, CliConfig.defaultConfig)
            )
            expect(result).toBe(true)
          }).pipe(runEffect))
      )
    })

    it("rejects language non-members", () => {
      const arbitrary = fc.oneof(
        fc.constant(ReadonlyArray.empty<string>()),
        fc.constant(["a", "b"]),
        fc.constant(["a", "c", "c", "z"]),
        fc.constant(["a", "b", "d"]),
        fc.constant(["d", "z", "z"]),
        fc.constant(["a", "c", "d"]),
        fc.constant(["d", "b", "a"]),
        fc.constant(["d", "c", "a"]),
        fc.constant(["d", "a", "b"])
      )
      return fc.assert(
        fc.asyncProperty(arbitrary, (tokens) =>
          Effect.gen(function*(_) {
            const language = RegularLanguage.permutation([
              RegularLanguage.string("a").pipe(RegularLanguage.optional),
              RegularLanguage.string("b").pipe(RegularLanguage.optional),
              RegularLanguage.string("c").pipe(RegularLanguage.optional),
              RegularLanguage.string("d").pipe(RegularLanguage.optional)
            ]).pipe(RegularLanguage.concat(RegularLanguage.string("z")))
            const result = yield* _(
              RegularLanguage.contains(language, tokens, CliConfig.defaultConfig)
            )
            expect(result).toBe(false)
          }).pipe(runEffect))
      )
    })
  })
})

const trueValues = new Set(["true", "1", "y", "yes", "on"])
const falseValues = new Set(["false", "0", "n", "no", "off"])

const trueValuesArb = fc.constantFrom(...trueValues)
const falseValuesArb = fc.constantFrom(...falseValues)

const permutations = <A>(elements: Array<A>): ReadonlyArray<ReadonlyArray<A>> => {
  const result: Array<Array<A>> = []
  const permute = (arr: Array<A>, m: Array<A>) => {
    if (arr.length === 0) {
      result.push(m)
    } else {
      for (let i = 0; i < arr.length; i++) {
        const curr = arr.slice()
        const next = curr.splice(i, 1)
        permute(curr.slice(), m.concat(next))
      }
    }
  }
  permute(elements, [])
  return result
}
