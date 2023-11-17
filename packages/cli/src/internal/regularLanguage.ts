import type * as FileSystem from "@effect/platform/FileSystem"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import { dual, identity, pipe } from "effect/Function"
import * as HashSet from "effect/HashSet"
import * as Option from "effect/Option"
import { pipeArguments } from "effect/Pipeable"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as CliConfig from "../CliConfig.js"
import type * as Compgen from "../Compgen.js"
import type * as Primitive from "../Primitive.js"
import type * as RegularLanguage from "../RegularLanguage.js"
import * as InternalPrimitive from "./primitive.js"

const RegularLanguageSymbolKey = "@effect/cli/RegularLanguage"

/** @internal */
export const RegularLanguageTypeId: RegularLanguage.RegularLanguageTypeId = Symbol.for(
  RegularLanguageSymbolKey
) as RegularLanguage.RegularLanguageTypeId

class Empty extends Data.TaggedClass("Empty")<{}> implements RegularLanguage.Empty {
  readonly [RegularLanguageTypeId] = (_: never) => _
  pipe() {
    return pipeArguments(this, arguments)
  }
  toString() {
    return "∅"
  }
}

class Epsilon extends Data.TaggedClass("Epsilon")<{}> implements RegularLanguage.Epsilon {
  readonly [RegularLanguageTypeId] = (_: never) => _
  pipe() {
    return pipeArguments(this, arguments)
  }
  toString() {
    return "ε"
  }
}

class StringToken extends Data.TaggedClass("StringToken")<{
  readonly value: string
}> implements RegularLanguage.StringToken {
  readonly [RegularLanguageTypeId] = (_: never) => _
  pipe() {
    return pipeArguments(this, arguments)
  }
}

class AnyStringToken extends Data.TaggedClass("AnyStringToken")<{}>
  implements RegularLanguage.AnyStringToken
{
  readonly [RegularLanguageTypeId] = (_: never) => _
  pipe() {
    return pipeArguments(this, arguments)
  }
}

class PrimitiveToken extends Data.TaggedClass("PrimitiveToken")<{
  readonly primitive: Primitive.Primitive<unknown>
}> implements RegularLanguage.PrimitiveToken {
  readonly [RegularLanguageTypeId] = (_: never) => _
  pipe() {
    return pipeArguments(this, arguments)
  }
}

class Cat extends Data.TaggedClass("Cat")<{
  readonly left: RegularLanguage.RegularLanguage
  readonly right: RegularLanguage.RegularLanguage
}> implements RegularLanguage.Cat {
  readonly [RegularLanguageTypeId] = (_: never) => _
  pipe() {
    return pipeArguments(this, arguments)
  }
}

class Alt extends Data.TaggedClass("Alt")<{
  readonly left: RegularLanguage.RegularLanguage
  readonly right: RegularLanguage.RegularLanguage
}> implements RegularLanguage.Alt {
  readonly [RegularLanguageTypeId] = (_: never) => _
  pipe() {
    return pipeArguments(this, arguments)
  }
}

class Repeat extends Data.TaggedClass("Repeat")<{
  readonly language: RegularLanguage.RegularLanguage
  readonly min: Option.Option<number>
  readonly max: Option.Option<number>
}> implements RegularLanguage.Repeat {
  readonly [RegularLanguageTypeId] = (_: never) => _
  pipe() {
    return pipeArguments(this, arguments)
  }
}

class Permutation extends Data.TaggedClass("Permutation")<{
  readonly values: ReadonlyArray<RegularLanguage.RegularLanguage>
}> implements RegularLanguage.Permutation {
  readonly [RegularLanguageTypeId] = (_: never) => _
  pipe() {
    return pipeArguments(this, arguments)
  }
}

// =============================================================================
// Refinements
// =============================================================================

/** @internal */
export const isRegularLanguage = (u: unknown): u is RegularLanguage.RegularLanguage =>
  typeof u === "object" && u !== null && RegularLanguageTypeId in u

/** @internal */
export const isEmpty = (self: RegularLanguage.RegularLanguage): self is RegularLanguage.Empty =>
  self._tag === "Empty"

/** @internal */
export const isEpsilon = (self: RegularLanguage.RegularLanguage): self is RegularLanguage.Epsilon =>
  self._tag === "Epsilon"

/** @internal */
export const isStringToken = (
  self: RegularLanguage.RegularLanguage
): self is RegularLanguage.StringToken => self._tag === "StringToken"

/** @internal */
export const isAnyStringToken = (
  self: RegularLanguage.RegularLanguage
): self is RegularLanguage.AnyStringToken => self._tag === "AnyStringToken"

/** @internal */
export const isPrimitiveToken = (
  self: RegularLanguage.RegularLanguage
): self is RegularLanguage.PrimitiveToken => self._tag === "PrimitiveToken"

/** @internal */
export const isCat = (self: RegularLanguage.RegularLanguage): self is RegularLanguage.Cat =>
  self._tag === "Cat"

/** @internal */
export const isAlt = (self: RegularLanguage.RegularLanguage): self is RegularLanguage.Alt =>
  self._tag === "Alt"

/** @internal */
export const isRepeat = (self: RegularLanguage.RegularLanguage): self is RegularLanguage.Repeat =>
  self._tag === "Repeat"

/** @internal */
export const isPermutation = (
  self: RegularLanguage.RegularLanguage
): self is RegularLanguage.Permutation => self._tag === "Permutation"

// =============================================================================
// Constructors
// =============================================================================

/** @internal */
export const empty: RegularLanguage.RegularLanguage = new Empty()

/** @internal */
export const epsilon: RegularLanguage.RegularLanguage = new Epsilon()

/** @internal */
export const string = (value: string): RegularLanguage.RegularLanguage => new StringToken({ value })

/** @internal */
export const anyString: RegularLanguage.RegularLanguage = new AnyStringToken()

/** @internal */
export const primitive = (
  primitive: Primitive.Primitive<unknown>
): RegularLanguage.RegularLanguage => new PrimitiveToken({ primitive })

/** @internal */
export const permutation = (
  values: ReadonlyArray<RegularLanguage.RegularLanguage>
): RegularLanguage.RegularLanguage => new Permutation({ values })

// =============================================================================
// Combinators
// =============================================================================

/** @internal */
export const concat = dual<
  (
    that: string | RegularLanguage.RegularLanguage
  ) => (self: RegularLanguage.RegularLanguage) => RegularLanguage.RegularLanguage,
  (
    self: RegularLanguage.RegularLanguage,
    that: string | RegularLanguage.RegularLanguage
  ) => RegularLanguage.RegularLanguage
>(
  2,
  (self, that) =>
    new Cat({
      left: self,
      right: typeof that === "string" ? new StringToken({ value: that }) : that
    })
)

/** @internal */
export const contains = dual<
  (
    tokens: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => (self: RegularLanguage.RegularLanguage) => Effect.Effect<never, never, boolean>,
  (
    self: RegularLanguage.RegularLanguage,
    tokens: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => Effect.Effect<FileSystem.FileSystem, never, boolean>
>(
  3,
  (self, tokens, config) =>
    Effect.reduce(
      tokens,
      self,
      (language, word) => derive(language, word, config)
    ).pipe(Effect.map(isNullable))
)

/** @internal */
export const derive = dual<
  (
    token: string,
    config: CliConfig.CliConfig
  ) => (
    self: RegularLanguage.RegularLanguage
  ) => Effect.Effect<FileSystem.FileSystem, never, RegularLanguage.RegularLanguage>,
  (
    self: RegularLanguage.RegularLanguage,
    token: string,
    config: CliConfig.CliConfig
  ) => Effect.Effect<FileSystem.FileSystem, never, RegularLanguage.RegularLanguage>
>(3, (
  self: RegularLanguage.RegularLanguage,
  token: string,
  config: CliConfig.CliConfig
): Effect.Effect<FileSystem.FileSystem, never, RegularLanguage.RegularLanguage> => {
  switch (self._tag) {
    case "Empty": {
      return Effect.succeed(empty)
    }
    case "Epsilon": {
      return Effect.succeed(empty)
    }
    case "StringToken": {
      const isMatch = config.isCaseSensitive
        ? self.value === token
        : self.value.toLowerCase() === token.toLowerCase()
      return isMatch
        ? Effect.succeed(epsilon)
        : Effect.succeed(empty)
    }
    case "AnyStringToken": {
      return Effect.succeed(epsilon)
    }
    case "PrimitiveToken": {
      return InternalPrimitive.validate(self.primitive, Option.some(token), config).pipe(
        Effect.match({
          onFailure: () => empty,
          onSuccess: () => epsilon
        })
      )
    }
    case "Cat": {
      if (isNullable(self.left)) {
        return Effect.all([
          derive(self.left, token, config),
          derive(self.right, token, config)
        ]).pipe(Effect.map(([dx, dy]) => orElse(concat(dx, self.right), dy)))
      }
      return derive(self.left, token, config).pipe(Effect.map((dx) => concat(dx, self.right)))
    }
    case "Alt": {
      return Effect.all([
        derive(self.left, token, config),
        derive(self.right, token, config)
      ]).pipe(Effect.map(([dx, dy]) => orElse(dx, dy)))
    }
    case "Repeat": {
      const newMin = Option.map(self.min, (n) => n - 1).pipe(Option.filter((n) => n > 0))
      const newMax = Option.map(self.max, (n) => n - 1)
      if (Option.match(newMax, { onNone: () => true, onSome: (n) => n >= 0 })) {
        return derive(self.language, token, config).pipe(
          Effect.map((dx) =>
            concat(
              dx,
              repeated(self.language, {
                min: Option.getOrUndefined(newMin),
                max: Option.getOrUndefined(newMax)
              })
            )
          )
        )
      }
      return Effect.succeed(empty)
    }
    case "Permutation": {
      return derive(desugared(self), token, config)
    }
  }
})

/** @internal */
export const firstTokens = dual<
  (
    prefix: string,
    compgen: Compgen.Compgen
  ) => (
    self: RegularLanguage.RegularLanguage
  ) => Effect.Effect<never, never, HashSet.HashSet<string>>,
  (
    self: RegularLanguage.RegularLanguage,
    prefix: string,
    compgen: Compgen.Compgen
  ) => Effect.Effect<never, never, HashSet.HashSet<string>>
>(3, (
  self: RegularLanguage.RegularLanguage,
  prefix: string,
  compgen: Compgen.Compgen
): Effect.Effect<never, never, HashSet.HashSet<string>> => {
  switch (self._tag) {
    case "Empty": {
      return Effect.succeed(HashSet.empty())
    }
    case "Epsilon": {
      return Effect.succeed(HashSet.make(""))
    }
    case "StringToken": {
      return Effect.succeed(
        HashSet.filter(HashSet.make(`${self.value} `), (str) => str.startsWith(prefix))
      )
    }
    case "AnyStringToken": {
      return Effect.succeed(HashSet.empty())
    }
    case "PrimitiveToken": {
      return primitiveFirstTokens(self.primitive as InternalPrimitive.Instruction, prefix, compgen)
    }
    case "Cat": {
      if (isNullable(self.left)) {
        return Effect.zipWith(
          firstTokens(self.left, prefix, compgen),
          firstTokens(self.right, prefix, compgen),
          (left, right) => HashSet.union(left, right)
        )
      }
      return firstTokens(self.left, prefix, compgen)
    }
    case "Alt": {
      return Effect.zipWith(
        firstTokens(self.left, prefix, compgen),
        firstTokens(self.right, prefix, compgen),
        (left, right) => HashSet.union(left, right)
      )
    }
    case "Repeat": {
      return firstTokens(self.language, prefix, compgen)
    }
    case "Permutation": {
      return Effect.forEach(self.values, (lang) => firstTokens(lang, prefix, compgen)).pipe(
        Effect.map((sets) => HashSet.flatMap(HashSet.fromIterable(sets), identity))
      )
    }
  }
})

/** @internal */
export const isNullable = (self: RegularLanguage.RegularLanguage): boolean => {
  switch (self._tag) {
    case "Empty":
    case "StringToken":
    case "AnyStringToken":
    case "PrimitiveToken": {
      return false
    }
    case "Epsilon": {
      return true
    }
    case "Cat": {
      return isNullable(self.left) && isNullable(self.right)
    }
    case "Alt": {
      return isNullable(self.left) || isNullable(self.right)
    }
    case "Repeat": {
      return Option.match(self.min, {
        onNone: () => true,
        onSome: (n) => n <= 0
      })
    }
    case "Permutation": {
      return ReadonlyArray.every(self.values, (language) => isNullable(language))
    }
  }
}

/** @internal */
export const optional = (self: RegularLanguage.RegularLanguage): RegularLanguage.RegularLanguage =>
  new Alt({ left: self, right: epsilon })

/** @internal */
export const orElse = dual<
  (
    that: string | RegularLanguage.RegularLanguage
  ) => (self: RegularLanguage.RegularLanguage) => RegularLanguage.RegularLanguage,
  (
    self: RegularLanguage.RegularLanguage,
    that: string | RegularLanguage.RegularLanguage
  ) => RegularLanguage.RegularLanguage
>(
  2,
  (self, that) =>
    new Alt({
      left: self,
      right: typeof that === "string" ? new StringToken({ value: that }) : that
    })
)

/** @internal */
export const repeated = dual<
  (
    params?: Partial<RegularLanguage.RegularLanguage.RepetitionConfiguration>
  ) => (self: RegularLanguage.RegularLanguage) => RegularLanguage.RegularLanguage,
  (
    self: RegularLanguage.RegularLanguage,
    params?: Partial<RegularLanguage.RegularLanguage.RepetitionConfiguration>
  ) => RegularLanguage.RegularLanguage
>((args) => isRegularLanguage(args[0]), (self, params = {}) => {
  const min = Option.fromNullable(params.min)
  const max = Option.fromNullable(params.max)
  return new Repeat({ language: self, min, max })
})

// =============================================================================
// Internals
// =============================================================================

const appendSpace = (str: string): string => `${str} `

const desugared = (self: RegularLanguage.Permutation): RegularLanguage.RegularLanguage =>
  ReadonlyArray.reduce<RegularLanguage.RegularLanguage, RegularLanguage.RegularLanguage>(
    self.values,
    epsilon,
    (acc, lang) => {
      const filtered = ReadonlyArray.filter(self.values, (_) => !Equal.equals(_, lang))
      return orElse(acc, concat(lang, permutation(filtered)))
    }
  )

const primitiveFirstTokens = (
  primitive: InternalPrimitive.Instruction,
  prefix: string,
  compgen: Compgen.Compgen
): Effect.Effect<never, never, HashSet.HashSet<string>> => {
  switch (primitive._tag) {
    case "Bool": {
      const set = HashSet.make("true", "false").pipe(
        HashSet.filter((str) => str.startsWith(prefix)),
        HashSet.map(appendSpace)
      )
      return Effect.succeed(set)
    }
    case "Choice": {
      const choices = pipe(
        ReadonlyArray.filterMap(primitive.alternatives, ([name]) =>
          name.startsWith(prefix)
            ? Option.some(name) :
            Option.none()),
        ReadonlyArray.map(appendSpace)
      )
      return Effect.succeed(HashSet.fromIterable(choices))
    }
    case "DateTime":
    case "Float":
    case "Integer":
    case "Text": {
      return Effect.succeed(HashSet.empty())
    }
    case "Path": {
      if (primitive.pathType === "either" || primitive.pathType === "file") {
        return compgen.completeFileNames(prefix).pipe(
          Effect.map(HashSet.fromIterable),
          Effect.orDie
        )
      }
      return compgen.completeDirectoryNames(prefix).pipe(
        Effect.map(HashSet.fromIterable),
        Effect.orDie
      )
    }
  }
}
