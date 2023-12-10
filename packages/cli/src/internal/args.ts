import type * as FileSystem from "@effect/platform/FileSystem"
import type * as Terminal from "@effect/platform/Terminal"
import type * as Config from "effect/Config"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { dual, pipe } from "effect/Function"
import * as Option from "effect/Option"
import { pipeArguments } from "effect/Pipeable"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Ref from "effect/Ref"
import type * as Secret from "effect/Secret"
import type * as Args from "../Args.js"
import type * as CliConfig from "../CliConfig.js"
import type * as HelpDoc from "../HelpDoc.js"
import type * as Primitive from "../Primitive.js"
import type * as Usage from "../Usage.js"
import type * as ValidationError from "../ValidationError.js"
import * as InternalHelpDoc from "./helpDoc.js"
import * as InternalSpan from "./helpDoc/span.js"
import * as InternalPrimitive from "./primitive.js"
import * as InternalNumberPrompt from "./prompt/number.js"
import * as InternalSelectPrompt from "./prompt/select.js"
import * as InternalUsage from "./usage.js"
import * as InternalValidationError from "./validationError.js"

const ArgsSymbolKey = "@effect/cli/Args"

/** @internal */
export const ArgsTypeId: Args.ArgsTypeId = Symbol.for(
  ArgsSymbolKey
) as Args.ArgsTypeId

/** @internal */
export type Op<Tag extends string, Body = {}> = Args.Args<never> & Body & {
  readonly _tag: Tag
}

const proto = {
  [ArgsTypeId]: {
    _A: (_: never) => _
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export type Instruction =
  | Empty
  | Single
  | Map
  | Both
  | Variadic
  | WithDefault
  | WithFallbackConfig

/** @internal */
export interface Empty extends Op<"Empty", {}> {}

/** @internal */
export interface Single extends
  Op<"Single", {
    readonly name: string
    readonly pseudoName: Option.Option<string>
    readonly primitiveType: Primitive.Primitive<unknown>
    readonly description: HelpDoc.HelpDoc
  }>
{}

/** @internal */
export interface Map extends
  Op<"Map", {
    readonly args: Args.Args<unknown>
    readonly f: (value: unknown) => Either.Either<HelpDoc.HelpDoc, unknown>
  }>
{}

/** @internal */
export interface Both extends
  Op<"Both", {
    readonly left: Args.Args<unknown>
    readonly right: Args.Args<unknown>
  }>
{}

/** @internal */
export interface Variadic extends
  Op<"Variadic", {
    readonly args: Args.Args<unknown>
    readonly min: Option.Option<number>
    readonly max: Option.Option<number>
  }>
{}

/** @internal */
export interface WithDefault extends
  Op<"WithDefault", {
    readonly args: Args.Args<unknown>
    readonly fallback: unknown
  }>
{}

/** @internal */
export interface WithFallbackConfig extends
  Op<"WithFallbackConfig", {
    readonly args: Args.Args<unknown>
    readonly config: Config.Config<unknown>
  }>
{}

// =============================================================================
// Refinements
// =============================================================================

/** @internal */
export const isArgs = (u: unknown): u is Args.Args<unknown> =>
  typeof u === "object" && u != null && ArgsTypeId in u

/** @internal */
export const isInstruction = <_>(self: Args.Args<_>): self is Instruction => self as any

/** @internal */
export const isEmpty = (self: Instruction): self is Empty => self._tag === "Empty"

/** @internal */
export const isSingle = (self: Instruction): self is Single => self._tag === "Single"

/** @internal */
export const isBoth = (self: Instruction): self is Both => self._tag === "Both"

/** @internal */
export const isMap = (self: Instruction): self is Map => self._tag === "Map"

/** @internal */
export const isVariadic = (self: Instruction): self is Variadic => self._tag === "Variadic"

/** @internal */
export const isWithDefault = (self: Instruction): self is WithDefault => self._tag === "WithDefault"

/** @internal */
export const isWithFallbackConfig = (self: Instruction): self is WithFallbackConfig =>
  self._tag === "WithFallbackConfig"

// =============================================================================
// Constructors
// =============================================================================

/** @internal */
export const all: <
  const Arg extends Iterable<Args.Args<any>> | Record<string, Args.Args<any>>
>(arg: Arg) => Args.All.Return<Arg> = function() {
  if (arguments.length === 1) {
    if (isArgs(arguments[0])) {
      return map(arguments[0], (x) => [x]) as any
    } else if (Array.isArray(arguments[0])) {
      return allTupled(arguments[0]) as any
    } else {
      const entries = Object.entries(arguments[0] as Readonly<{ [K: string]: Args.Args<any> }>)
      let result = map(entries[0][1], (value) => ({ [entries[0][0]]: value }))
      if (entries.length === 1) {
        return result as any
      }
      const rest = entries.slice(1)
      for (const [key, options] of rest) {
        result = map(makeBoth(result, options), ([record, value]) => ({
          ...record,
          [key]: value
        }))
      }
      return result as any
    }
  }
  return allTupled(arguments[0]) as any
}

/** @internal */
export const boolean = (config: Args.Args.BaseArgsConfig = {}): Args.Args<boolean> =>
  makeSingle(Option.fromNullable(config.name), InternalPrimitive.boolean(Option.none()))

/** @internal */
export const choice = <A>(
  choices: ReadonlyArray.NonEmptyReadonlyArray<[string, A]>,
  config: Args.Args.BaseArgsConfig = {}
): Args.Args<A> => makeSingle(Option.fromNullable(config.name), InternalPrimitive.choice(choices))

/** @internal */
export const date = (config: Args.Args.BaseArgsConfig = {}): Args.Args<globalThis.Date> =>
  makeSingle(Option.fromNullable(config.name), InternalPrimitive.date)

/** @internal */
export const directory = (config: Args.Args.PathArgsConfig = {}): Args.Args<string> =>
  makeSingle(
    Option.fromNullable(config.name),
    InternalPrimitive.path("directory", config.exists || "either")
  )

/** @internal */
export const file = (config: Args.Args.PathArgsConfig = {}): Args.Args<string> =>
  makeSingle(
    Option.fromNullable(config.name),
    InternalPrimitive.path("file", config.exists || "either")
  )

/** @internal */
export const float = (config: Args.Args.BaseArgsConfig = {}): Args.Args<number> =>
  makeSingle(Option.fromNullable(config.name), InternalPrimitive.float)

/** @internal */
export const integer = (config: Args.Args.BaseArgsConfig = {}): Args.Args<number> =>
  makeSingle(Option.fromNullable(config.name), InternalPrimitive.integer)

/** @internal */
export const none: Args.Args<void> = (() => {
  const op = Object.create(proto)
  op._tag = "Empty"
  return op
})()

/** @internal */
export const path = (config: Args.Args.PathArgsConfig = {}): Args.Args<string> =>
  makeSingle(
    Option.fromNullable(config.name),
    InternalPrimitive.path("either", config.exists || "either")
  )

/** @internal */
export const secret = (
  config: Args.Args.BaseArgsConfig = {}
): Args.Args<Secret.Secret> =>
  makeSingle(Option.fromNullable(config.name), InternalPrimitive.secret)

/** @internal */
export const text = (config: Args.Args.BaseArgsConfig = {}): Args.Args<string> =>
  makeSingle(Option.fromNullable(config.name), InternalPrimitive.text)

// =============================================================================
// Combinators
// =============================================================================

/** @internal */
export const atLeast = dual<
  {
    (times: 0): <A>(self: Args.Args<A>) => Args.Args<ReadonlyArray<A>>
    (times: number): <A>(self: Args.Args<A>) => Args.Args<ReadonlyArray.NonEmptyReadonlyArray<A>>
  },
  {
    <A>(self: Args.Args<A>, times: 0): Args.Args<ReadonlyArray<A>>
    <A>(self: Args.Args<A>, times: number): Args.Args<ReadonlyArray.NonEmptyReadonlyArray<A>>
  }
>(2, (self, times) => makeVariadic(self, Option.some(times), Option.none()) as any)

/** @internal */
export const atMost = dual<
  (times: number) => <A>(self: Args.Args<A>) => Args.Args<ReadonlyArray<A>>,
  <A>(self: Args.Args<A>, times: number) => Args.Args<ReadonlyArray<A>>
>(2, (self, times) => makeVariadic(self, Option.none(), Option.some(times)))

/** @internal */
export const between = dual<
  {
    (min: 0, max: number): <A>(self: Args.Args<A>) => Args.Args<ReadonlyArray<A>>
    (
      min: number,
      max: number
    ): <A>(self: Args.Args<A>) => Args.Args<ReadonlyArray.NonEmptyReadonlyArray<A>>
  },
  {
    <A>(self: Args.Args<A>, min: 0, max: number): Args.Args<ReadonlyArray<A>>
    <A>(
      self: Args.Args<A>,
      min: number,
      max: number
    ): Args.Args<ReadonlyArray.NonEmptyReadonlyArray<A>>
  }
>(3, (self, min, max) => makeVariadic(self, Option.some(min), Option.some(max)) as any)

/** @internal */
export const getHelp = <A>(self: Args.Args<A>): HelpDoc.HelpDoc =>
  getHelpInternal(self as Instruction)

/** @internal */
export const getIdentifier = <A>(self: Args.Args<A>): Option.Option<string> =>
  getIdentifierInternal(self as Instruction)

/** @internal */
export const getMinSize = <A>(self: Args.Args<A>): number => getMinSizeInternal(self as Instruction)

/** @internal */
export const getMaxSize = <A>(self: Args.Args<A>): number => getMaxSizeInternal(self as Instruction)

/** @internal */
export const getUsage = <A>(self: Args.Args<A>): Usage.Usage =>
  getUsageInternal(self as Instruction)

/** @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => (self: Args.Args<A>) => Args.Args<B>,
  <A, B>(self: Args.Args<A>, f: (a: A) => B) => Args.Args<B>
>(2, (self, f) => mapOrFail(self, (a) => Either.right(f(a))))

/** @internal */
export const mapOrFail = dual<
  <A, B>(f: (a: A) => Either.Either<HelpDoc.HelpDoc, B>) => (self: Args.Args<A>) => Args.Args<B>,
  <A, B>(self: Args.Args<A>, f: (a: A) => Either.Either<HelpDoc.HelpDoc, B>) => Args.Args<B>
>(2, (self, f) => makeMap(self, f))

/** @internal */
export const mapTryCatch = dual<
  <A, B>(
    f: (a: A) => B,
    onError: (e: unknown) => HelpDoc.HelpDoc
  ) => (self: Args.Args<A>) => Args.Args<B>,
  <A, B>(
    self: Args.Args<A>,
    f: (a: A) => B,
    onError: (e: unknown) => HelpDoc.HelpDoc
  ) => Args.Args<B>
>(3, (self, f, onError) =>
  mapOrFail(self, (a) => {
    try {
      return Either.right(f(a))
    } catch (e) {
      return Either.left(onError(e))
    }
  }))

/** @internal */
export const optional = <A>(self: Args.Args<A>): Args.Args<Option.Option<A>> =>
  makeWithDefault(self as Instruction, Option.none())

/** @internal */
export const repeated = <A>(self: Args.Args<A>): Args.Args<ReadonlyArray<A>> =>
  makeVariadic(self, Option.none(), Option.none())

/** @internal */
export const validate = dual<
  (
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => <A>(self: Args.Args<A>) => Effect.Effect<
    FileSystem.FileSystem,
    ValidationError.ValidationError,
    [ReadonlyArray<string>, A]
  >,
  <A>(
    self: Args.Args<A>,
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => Effect.Effect<
    FileSystem.FileSystem,
    ValidationError.ValidationError,
    [ReadonlyArray<string>, A]
  >
>(3, (self, args, config) => validateInternal(self as Instruction, args, config))

/** @internal */
export const withDefault = dual<
  <const B>(fallback: B) => <A>(self: Args.Args<A>) => Args.Args<A | B>,
  <A, const B>(self: Args.Args<A>, fallback: B) => Args.Args<A | B>
>(2, (self, fallback) => makeWithDefault(self, fallback))

/** @internal */
export const withFallbackConfig: {
  <B>(config: Config.Config<B>): <A>(self: Args.Args<A>) => Args.Args<B | A>
  <A, B>(self: Args.Args<A>, config: Config.Config<B>): Args.Args<A | B>
} = dual<
  <B>(config: Config.Config<B>) => <A>(self: Args.Args<A>) => Args.Args<A | B>,
  <A, B>(self: Args.Args<A>, config: Config.Config<B>) => Args.Args<A | B>
>(2, (self, config) => {
  if (isInstruction(self) && isWithDefault(self)) {
    return makeWithDefault(
      withFallbackConfig(self.args, config),
      self.fallback as any
    )
  }
  return makeWithFallbackConfig(self, config)
})

/** @internal */
export const withDescription = dual<
  (description: string) => <A>(self: Args.Args<A>) => Args.Args<A>,
  <A>(self: Args.Args<A>, description: string) => Args.Args<A>
>(2, (self, description) => withDescriptionInternal(self as Instruction, description))

/** @internal */
export const wizard = dual<
  (config: CliConfig.CliConfig) => <A>(self: Args.Args<A>) => Effect.Effect<
    FileSystem.FileSystem | Terminal.Terminal,
    Terminal.QuitException | ValidationError.ValidationError,
    ReadonlyArray<string>
  >,
  <A>(self: Args.Args<A>, config: CliConfig.CliConfig) => Effect.Effect<
    FileSystem.FileSystem | Terminal.Terminal,
    Terminal.QuitException | ValidationError.ValidationError,
    ReadonlyArray<string>
  >
>(2, (self, config) => wizardInternal(self as Instruction, config))

// =============================================================================
// Internals
// =============================================================================

const allTupled = <const T extends ArrayLike<Args.Args<any>>>(arg: T): Args.Args<
  {
    [K in keyof T]: [T[K]] extends [Args.Args<infer A>] ? A : never
  }
> => {
  if (arg.length === 0) {
    return none as any
  }
  if (arg.length === 1) {
    return map(arg[0], (x) => [x]) as any
  }
  let result = map(arg[0], (x) => [x])
  for (let i = 1; i < arg.length; i++) {
    const curr = arg[i]
    result = map(makeBoth(result, curr), ([a, b]) => [...a, b])
  }
  return result as any
}

const getHelpInternal = (self: Instruction): HelpDoc.HelpDoc => {
  switch (self._tag) {
    case "Empty": {
      return InternalHelpDoc.empty
    }
    case "Single": {
      return InternalHelpDoc.descriptionList([[
        InternalSpan.weak(self.name),
        InternalHelpDoc.sequence(
          InternalHelpDoc.p(InternalPrimitive.getHelp(self.primitiveType)),
          self.description
        )
      ]])
    }
    case "Map": {
      return getHelpInternal(self.args as Instruction)
    }
    case "Both": {
      return InternalHelpDoc.sequence(
        getHelpInternal(self.left as Instruction),
        getHelpInternal(self.right as Instruction)
      )
    }
    case "Variadic": {
      const help = getHelpInternal(self.args as Instruction)
      return InternalHelpDoc.mapDescriptionList(help, (oldSpan, oldBlock) => {
        const min = getMinSizeInternal(self as Instruction)
        const max = getMaxSizeInternal(self as Instruction)
        const newSpan = InternalSpan.text(
          Option.isSome(self.max) ? ` ${min} - ${max}` : min === 0 ? "..." : ` ${min}+`
        )
        const newBlock = InternalHelpDoc.p(
          Option.isSome(self.max)
            ? `This argument must be repeated at least ${min} times and may be repeated up to ${max} times.`
            : min === 0
            ? "This argument may be repeated zero or more times."
            : `This argument must be repeated at least ${min} times.`
        )
        return [InternalSpan.concat(oldSpan, newSpan), InternalHelpDoc.sequence(oldBlock, newBlock)]
      })
    }
    case "WithDefault": {
      return InternalHelpDoc.mapDescriptionList(
        getHelpInternal(self.args as Instruction),
        (span, block) => {
          const optionalDescription = Option.isOption(self.fallback)
            ? Option.match(self.fallback, {
              onNone: () => InternalHelpDoc.p("This setting is optional."),
              onSome: () =>
                InternalHelpDoc.p(`This setting is optional. Defaults to: ${self.fallback}`)
            })
            : InternalHelpDoc.p("This setting is optional.")
          return [span, InternalHelpDoc.sequence(block, optionalDescription)]
        }
      )
    }
    case "WithFallbackConfig": {
      return InternalHelpDoc.mapDescriptionList(
        getHelpInternal(self.args as Instruction),
        (span, block) => [
          span,
          InternalHelpDoc.sequence(
            block,
            InternalHelpDoc.p(
              "This argument can be set from environment variables."
            )
          )
        ]
      )
    }
  }
}

const getIdentifierInternal = (self: Instruction): Option.Option<string> => {
  switch (self._tag) {
    case "Empty": {
      return Option.none()
    }
    case "Single": {
      return Option.some(self.name)
    }
    case "Map":
    case "Variadic":
    case "WithDefault":
    case "WithFallbackConfig": {
      return getIdentifierInternal(self.args as Instruction)
    }
    case "Both": {
      const ids = ReadonlyArray.getSomes([
        getIdentifierInternal(self.left as Instruction),
        getIdentifierInternal(self.right as Instruction)
      ])
      return ReadonlyArray.match(ids, {
        onEmpty: () => Option.none(),
        onNonEmpty: (ids) => Option.some(ReadonlyArray.join(ids, ", "))
      })
    }
  }
}

const getMinSizeInternal = (self: Instruction): number => {
  switch (self._tag) {
    case "Empty":
    case "WithDefault":
    case "WithFallbackConfig": {
      return 0
    }
    case "Single": {
      return 1
    }
    case "Map": {
      return getMinSizeInternal(self.args as Instruction)
    }
    case "Both": {
      const leftMinSize = getMinSizeInternal(self.left as Instruction)
      const rightMinSize = getMinSizeInternal(self.right as Instruction)
      return leftMinSize + rightMinSize
    }
    case "Variadic": {
      const argsMinSize = getMinSizeInternal(self.args as Instruction)
      return Math.floor(Option.getOrElse(self.min, () => 0) * argsMinSize)
    }
  }
}

const getMaxSizeInternal = (self: Instruction): number => {
  switch (self._tag) {
    case "Empty": {
      return 0
    }
    case "Single": {
      return 1
    }
    case "Map":
    case "WithDefault":
    case "WithFallbackConfig": {
      return getMaxSizeInternal(self.args as Instruction)
    }
    case "Both": {
      const leftMaxSize = getMaxSizeInternal(self.left as Instruction)
      const rightMaxSize = getMaxSizeInternal(self.right as Instruction)
      return leftMaxSize + rightMaxSize
    }
    case "Variadic": {
      const argsMaxSize = getMaxSizeInternal(self.args as Instruction)
      return Math.floor(Option.getOrElse(self.max, () => Number.MAX_SAFE_INTEGER / 2) * argsMaxSize)
    }
  }
}

const getUsageInternal = (self: Instruction): Usage.Usage => {
  switch (self._tag) {
    case "Empty": {
      return InternalUsage.empty
    }
    case "Single": {
      return InternalUsage.named(
        ReadonlyArray.of(self.name),
        InternalPrimitive.getChoices(self.primitiveType)
      )
    }
    case "Map": {
      return getUsageInternal(self.args as Instruction)
    }
    case "Both": {
      return InternalUsage.concat(
        getUsageInternal(self.left as Instruction),
        getUsageInternal(self.right as Instruction)
      )
    }
    case "Variadic": {
      return InternalUsage.repeated(getUsageInternal(self.args as Instruction))
    }
    case "WithDefault":
    case "WithFallbackConfig": {
      return InternalUsage.optional(getUsageInternal(self.args as Instruction))
    }
  }
}

const makeSingle = <A>(
  pseudoName: Option.Option<string>,
  primitiveType: Primitive.Primitive<A>,
  description: HelpDoc.HelpDoc = InternalHelpDoc.empty
): Args.Args<A> => {
  const op = Object.create(proto)
  op._tag = "Single"
  op.name = `<${Option.getOrElse(pseudoName, () => InternalPrimitive.getTypeName(primitiveType))}>`
  op.pseudoName = pseudoName
  op.primitiveType = primitiveType
  op.description = description
  return op
}

const makeMap = <A, B>(
  self: Args.Args<A>,
  f: (a: A) => Either.Either<HelpDoc.HelpDoc, B>
): Args.Args<B> => {
  const op = Object.create(proto)
  op._tag = "Map"
  op.args = self
  op.f = f
  return op
}

const makeBoth = <A, B>(left: Args.Args<A>, right: Args.Args<B>): Args.Args<[A, B]> => {
  const op = Object.create(proto)
  op._tag = "Both"
  op.left = left
  op.right = right
  return op
}

const makeWithDefault = <A, const B>(
  self: Args.Args<A>,
  fallback: B
): Args.Args<A | B> => {
  const op = Object.create(proto)
  op._tag = "WithDefault"
  op.args = self
  op.fallback = fallback
  return op
}

const makeWithFallbackConfig = <A, B>(
  args: Args.Args<A>,
  config: Config.Config<B>
): Args.Args<A | B> => {
  const op = Object.create(proto)
  op._tag = "WithFallbackConfig"
  op.args = args
  op.config = config
  return op
}

const makeVariadic = <A>(
  args: Args.Args<A>,
  min: Option.Option<number>,
  max: Option.Option<number>
): Args.Args<ReadonlyArray<A>> => {
  const op = Object.create(proto)
  op._tag = "Variadic"
  op.args = args
  op.min = min
  op.max = max
  return op
}

const validateInternal = (
  self: Instruction,
  args: ReadonlyArray<string>,
  config: CliConfig.CliConfig
): Effect.Effect<
  FileSystem.FileSystem,
  ValidationError.ValidationError,
  [ReadonlyArray<string>, any]
> => {
  switch (self._tag) {
    case "Empty": {
      return Effect.succeed([args, undefined])
    }
    case "Single": {
      return Effect.suspend(() => {
        return ReadonlyArray.matchLeft(args, {
          onEmpty: () => {
            const choices = InternalPrimitive.getChoices(self.primitiveType)
            if (Option.isSome(self.pseudoName) && Option.isSome(choices)) {
              return Effect.fail(InternalValidationError.missingValue(InternalHelpDoc.p(
                `Missing argument <${self.pseudoName.value}> with choices ${choices.value}`
              )))
            }
            if (Option.isSome(self.pseudoName)) {
              return Effect.fail(InternalValidationError.missingValue(InternalHelpDoc.p(
                `Missing argument <${self.pseudoName.value}>`
              )))
            }
            if (Option.isSome(choices)) {
              return Effect.fail(InternalValidationError.missingValue(InternalHelpDoc.p(
                `Missing argument ${
                  InternalPrimitive.getTypeName(self.primitiveType)
                } with choices ${choices.value}`
              )))
            }
            return Effect.fail(InternalValidationError.missingValue(InternalHelpDoc.p(
              `Missing argument ${InternalPrimitive.getTypeName(self.primitiveType)}`
            )))
          },
          onNonEmpty: (head, tail) =>
            InternalPrimitive.validate(self.primitiveType, Option.some(head), config).pipe(
              Effect.mapBoth({
                onFailure: (text) =>
                  InternalValidationError.invalidArgument(InternalHelpDoc.p(text)),
                onSuccess: (a) => [tail, a] as [ReadonlyArray<string>, any]
              })
            )
        })
      })
    }
    case "Map": {
      return validateInternal(self.args as Instruction, args, config).pipe(
        Effect.flatMap(([leftover, a]) =>
          Either.match(self.f(a), {
            onLeft: (doc) => Effect.fail(InternalValidationError.invalidArgument(doc)),
            onRight: (b) => Effect.succeed([leftover, b])
          })
        )
      )
    }
    case "Both": {
      return validateInternal(self.left as Instruction, args, config).pipe(
        Effect.flatMap(([args, a]) =>
          validateInternal(self.right as Instruction, args, config).pipe(
            Effect.map(([args, b]) => [args, [a, b]])
          )
        )
      )
    }
    case "Variadic": {
      const min1 = Option.getOrElse(self.min, () => 0)
      const max1 = Option.getOrElse(self.max, () => Number.MAX_SAFE_INTEGER)
      const loop = (
        args: ReadonlyArray<string>,
        acc: ReadonlyArray<any>
      ): Effect.Effect<
        FileSystem.FileSystem,
        ValidationError.ValidationError,
        [ReadonlyArray<string>, ReadonlyArray<any>]
      > => {
        if (acc.length >= max1) {
          return Effect.succeed([args, acc])
        }
        return validateInternal(self.args as Instruction, args, config).pipe(Effect.matchEffect({
          onFailure: (failure) =>
            acc.length >= min1 && ReadonlyArray.isEmptyReadonlyArray(args)
              ? Effect.succeed([args, acc])
              : Effect.fail(failure),
          onSuccess: ([args, a]) => loop(args, ReadonlyArray.append(acc, a))
        }))
      }
      return loop(args, ReadonlyArray.empty()).pipe(
        Effect.map(([args, acc]) => [args, acc])
      )
    }
    case "WithDefault": {
      return validateInternal(self.args as Instruction, args, config).pipe(
        Effect.catchTag("MissingValue", () =>
          Effect.succeed<[ReadonlyArray<string>, any]>([
            args,
            self.fallback
          ]))
      )
    }
    case "WithFallbackConfig": {
      return validateInternal(self.args as Instruction, args, config).pipe(
        Effect.catchTag("MissingValue", (e) =>
          Effect.map(
            Effect.mapError(self.config, () => e),
            (value) => [args, value] as [ReadonlyArray<string>, any]
          ))
      )
    }
  }
}

const withDescriptionInternal = (self: Instruction, description: string): Args.Args<any> => {
  switch (self._tag) {
    case "Empty": {
      return none
    }
    case "Single": {
      const desc = InternalHelpDoc.sequence(self.description, InternalHelpDoc.p(description))
      return makeSingle(self.pseudoName, self.primitiveType, desc)
    }
    case "Map": {
      return makeMap(withDescriptionInternal(self.args as Instruction, description), self.f)
    }
    case "Both": {
      return makeBoth(
        withDescriptionInternal(self.left as Instruction, description),
        withDescriptionInternal(self.right as Instruction, description)
      )
    }
    case "Variadic": {
      return makeVariadic(
        withDescriptionInternal(self.args as Instruction, description),
        self.min,
        self.max
      )
    }
    case "WithDefault": {
      return makeWithDefault(
        withDescriptionInternal(self.args as Instruction, description),
        self.fallback
      )
    }
    case "WithFallbackConfig": {
      return makeWithFallbackConfig(
        withDescriptionInternal(self.args as Instruction, description),
        self.config
      )
    }
  }
}

const wizardInternal = (self: Instruction, config: CliConfig.CliConfig): Effect.Effect<
  FileSystem.FileSystem | Terminal.Terminal,
  Terminal.QuitException | ValidationError.ValidationError,
  ReadonlyArray<string>
> => {
  switch (self._tag) {
    case "Empty": {
      return Effect.succeed(ReadonlyArray.empty())
    }
    case "Single": {
      const help = getHelpInternal(self)
      return InternalPrimitive.wizard(self.primitiveType, help).pipe(
        Effect.zipLeft(Console.log()),
        Effect.flatMap((input) => {
          const args = ReadonlyArray.of(input as string)
          return validateInternal(self, args, config).pipe(Effect.as(args))
        })
      )
    }
    case "Map": {
      return wizardInternal(self.args as Instruction, config).pipe(
        Effect.tap((args) => validateInternal(self.args as Instruction, args, config))
      )
    }
    case "Both": {
      return Effect.zipWith(
        wizardInternal(self.left as Instruction, config),
        wizardInternal(self.right as Instruction, config),
        (left, right) => ReadonlyArray.appendAll(left, right)
      ).pipe(Effect.tap((args) => validateInternal(self, args, config)))
    }
    case "Variadic": {
      const repeatHelp = InternalHelpDoc.p(
        "How many times should this argument should be repeated?"
      )
      const message = pipe(
        getHelpInternal(self),
        InternalHelpDoc.sequence(repeatHelp)
      )
      return InternalNumberPrompt.integer({
        message: InternalHelpDoc.toAnsiText(message).trimEnd(),
        min: getMinSizeInternal(self),
        max: getMaxSizeInternal(self)
      }).pipe(
        Effect.zipLeft(Console.log()),
        Effect.flatMap((n) =>
          Ref.make(ReadonlyArray.empty<string>()).pipe(
            Effect.flatMap((ref) =>
              wizardInternal(self.args as Instruction, config).pipe(
                Effect.flatMap((args) => Ref.update(ref, ReadonlyArray.appendAll(args))),
                Effect.repeatN(n - 1),
                Effect.zipRight(Ref.get(ref)),
                Effect.tap((args) => validateInternal(self, args, config))
              )
            )
          )
        )
      )
    }
    case "WithDefault": {
      const defaultHelp = InternalHelpDoc.p(`This argument is optional - use the default?`)
      const message = pipe(
        getHelpInternal(self.args as Instruction),
        InternalHelpDoc.sequence(defaultHelp)
      )
      return InternalSelectPrompt.select({
        message: InternalHelpDoc.toAnsiText(message).trimEnd(),
        choices: [
          { title: `Default ['${JSON.stringify(self.fallback)}']`, value: true },
          { title: "Custom", value: false }
        ]
      }).pipe(
        Effect.zipLeft(Console.log()),
        Effect.flatMap((useFallback) =>
          useFallback
            ? Effect.succeed(ReadonlyArray.empty())
            : wizardInternal(self.args as Instruction, config)
        )
      )
    }
    case "WithFallbackConfig": {
      const defaultHelp = InternalHelpDoc.p(`Try load this option from the environment?`)
      const message = pipe(
        getHelpInternal(self.args as Instruction),
        InternalHelpDoc.sequence(defaultHelp)
      )
      return InternalSelectPrompt.select({
        message: InternalHelpDoc.toAnsiText(message).trimEnd(),
        choices: [
          { title: `Use environment variables`, value: true },
          { title: "Custom", value: false }
        ]
      }).pipe(
        Effect.zipLeft(Console.log()),
        Effect.flatMap((useFallback) =>
          useFallback
            ? Effect.succeed(ReadonlyArray.empty())
            : wizardInternal(self.args as Instruction, config)
        )
      )
    }
  }
}

// =============================================================================
// Completion Internals
// =============================================================================

const getShortDescription = (self: Instruction): string => {
  switch (self._tag) {
    case "Empty":
    case "Both": {
      return ""
    }
    case "Single": {
      return InternalSpan.getText(InternalHelpDoc.getSpan(self.description))
    }
    case "Map":
    case "Variadic":
    case "WithDefault":
    case "WithFallbackConfig": {
      return getShortDescription(self.args as Instruction)
    }
  }
}

/** @internal */
export const getFishCompletions = (self: Instruction): ReadonlyArray<string> => {
  switch (self._tag) {
    case "Empty": {
      return ReadonlyArray.empty()
    }
    case "Single": {
      const description = getShortDescription(self)
      return pipe(
        InternalPrimitive.getFishCompletions(
          self.primitiveType as InternalPrimitive.Instruction
        ),
        ReadonlyArray.appendAll(
          description.length === 0
            ? ReadonlyArray.empty()
            : ReadonlyArray.of(`-d '${description}'`)
        ),
        ReadonlyArray.join(" "),
        ReadonlyArray.of
      )
    }
    case "Both": {
      return pipe(
        getFishCompletions(self.left as Instruction),
        ReadonlyArray.appendAll(getFishCompletions(self.right as Instruction))
      )
    }
    case "Map":
    case "Variadic":
    case "WithDefault":
    case "WithFallbackConfig": {
      return getFishCompletions(self.args as Instruction)
    }
  }
}

interface ZshCompletionState {
  readonly multiple: boolean
  readonly optional: boolean
}

export const getZshCompletions = (
  self: Instruction,
  state: ZshCompletionState = { multiple: false, optional: false }
): ReadonlyArray<string> => {
  switch (self._tag) {
    case "Empty": {
      return ReadonlyArray.empty()
    }
    case "Single": {
      const multiple = state.multiple ? "*" : ""
      const optional = state.optional ? "::" : ":"
      const shortDescription = getShortDescription(self)
      const description = shortDescription.length > 0 ? ` -- ${shortDescription}` : ""
      const possibleValues = InternalPrimitive.getZshCompletions(
        self.primitiveType as InternalPrimitive.Instruction
      )
      return possibleValues.length === 0
        ? ReadonlyArray.empty()
        : ReadonlyArray.of(`${multiple}${optional}${self.name}${description}${possibleValues}`)
    }
    case "Map": {
      return getZshCompletions(self.args as Instruction, state)
    }
    case "Both": {
      const left = getZshCompletions(self.left as Instruction, state)
      const right = getZshCompletions(self.right as Instruction, state)
      return ReadonlyArray.appendAll(left, right)
    }
    case "Variadic": {
      return Option.isSome(self.max) && self.max.value > 1
        ? getZshCompletions(self.args as Instruction, { ...state, multiple: true })
        : getZshCompletions(self.args as Instruction, state)
    }
    case "WithDefault":
    case "WithFallbackConfig": {
      return getZshCompletions(self.args as Instruction, { ...state, optional: true })
    }
  }
}
