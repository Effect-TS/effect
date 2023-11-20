import type * as FileSystem from "@effect/platform/FileSystem"
import type * as Terminal from "@effect/platform/Terminal"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { absurd, dual, pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import { pipeArguments } from "effect/Pipeable"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Ref from "effect/Ref"
import type * as CliConfig from "../CliConfig.js"
import type * as HelpDoc from "../HelpDoc.js"
import type * as Options from "../Options.js"
import type * as Primitive from "../Primitive.js"
import type * as RegularLanguage from "../RegularLanguage.js"
import type * as Usage from "../Usage.js"
import type * as ValidationError from "../ValidationError.js"
import * as InternalAutoCorrect from "./autoCorrect.js"
import * as InternalCliConfig from "./cliConfig.js"
import * as InternalHelpDoc from "./helpDoc.js"
import * as InternalSpan from "./helpDoc/span.js"
import * as InternalPrimitive from "./primitive.js"
import * as InternalListPrompt from "./prompt/list.js"
import * as InternalNumberPrompt from "./prompt/number.js"
import * as InternalSelectPrompt from "./prompt/select.js"
import * as InternalRegularLanguage from "./regularLanguage.js"
import * as InternalUsage from "./usage.js"
import * as InternalValidationError from "./validationError.js"

const OptionsSymbolKey = "@effect/cli/Options"

/** @internal */
export const OptionsTypeId: Options.OptionsTypeId = Symbol.for(
  OptionsSymbolKey
) as Options.OptionsTypeId

/** @internal */
export type Op<Tag extends string, Body = {}> = Options.Options<never> & Body & {
  readonly _tag: Tag
}

const proto = {
  [OptionsTypeId]: {
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
  | KeyValueMap
  | Map
  | Both
  | OrElse
  | Variadic
  | WithDefault

/** @internal */
export type ParseableInstruction = Single | KeyValueMap | Variadic

/** @internal */
export interface Empty extends Op<"Empty", {}> {}

/** @internal */
export interface Single extends
  Op<"Single", {
    readonly name: string
    readonly fullName: string
    readonly placeholder: string
    readonly aliases: ReadonlyArray<string>
    readonly primitiveType: Primitive.Primitive<unknown>
    readonly description: HelpDoc.HelpDoc
    readonly pseudoName: Option.Option<string>
  }>
{}

/** @internal */
export interface KeyValueMap extends
  Op<"KeyValueMap", {
    readonly argumentOption: Single
  }>
{}

/** @internal */
export interface Map extends
  Op<"Map", {
    readonly options: Options.Options<unknown>
    readonly f: (a: unknown) => Either.Either<ValidationError.ValidationError, unknown>
  }>
{}

/** @internal */
export interface Both extends
  Op<"Both", {
    readonly left: Options.Options<unknown>
    readonly right: Options.Options<unknown>
  }>
{}

/** @internal */
export interface OrElse extends
  Op<"OrElse", {
    readonly left: Options.Options<unknown>
    readonly right: Options.Options<unknown>
  }>
{}

/** @internal */
export interface Variadic extends
  Op<"Variadic", {
    readonly argumentOption: Single
    readonly min: Option.Option<number>
    readonly max: Option.Option<number>
  }>
{}

/** @internal */
export interface WithDefault extends
  Op<"WithDefault", {
    readonly options: Options.Options<unknown>
    readonly fallback: unknown
  }>
{}

// =============================================================================
// Refinements
// =============================================================================

/** @internal */
export const isOptions = (u: unknown): u is Options.Options<unknown> =>
  typeof u === "object" && u != null && OptionsTypeId in u

/** @internal */
export const isEmpty = (self: Instruction): self is Empty => self._tag === "Empty"

/** @internal */
export const isSingle = (self: Instruction): self is Single => self._tag === "Single"

/** @internal */
export const isKeyValueMap = (self: Instruction): self is KeyValueMap => self._tag === "KeyValueMap"

/** @internal */
export const isMap = (self: Instruction): self is Map => self._tag === "Map"

/** @internal */
export const isBoth = (self: Instruction): self is Both => self._tag === "Both"

/** @internal */
export const isOrElse = (self: Instruction): self is OrElse => self._tag === "OrElse"

/** @internal */
export const isWithDefault = (self: Instruction): self is WithDefault => self._tag === "WithDefault"

// =============================================================================
// Constructors
// =============================================================================

/** @internal */
export const all: <
  const Arg extends Iterable<Options.Options<any>> | Record<string, Options.Options<any>>
>(arg: Arg) => Options.All.Return<Arg> = function() {
  if (arguments.length === 1) {
    if (isOptions(arguments[0])) {
      return map(arguments[0], (x) => [x]) as any
    } else if (Array.isArray(arguments[0])) {
      return allTupled(arguments[0]) as any
    } else {
      const entries = Object.entries(
        arguments[0] as Readonly<{ [K: string]: Options.Options<any> }>
      )
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

const defaultBooleanOptions = {
  ifPresent: true,
  negationNames: [],
  aliases: []
}

/** @internal */
export const boolean = (
  name: string,
  options: Options.Options.BooleanOptionsConfig = {}
): Options.Options<boolean> => {
  const { aliases, ifPresent, negationNames } = { ...defaultBooleanOptions, ...options }
  const option = makeSingle(
    name,
    aliases,
    InternalPrimitive.boolean(Option.some(ifPresent))
  )
  if (ReadonlyArray.isNonEmptyReadonlyArray(negationNames)) {
    const head = ReadonlyArray.headNonEmpty(negationNames)
    const tail = ReadonlyArray.tailNonEmpty(negationNames)
    const negationOption = makeSingle(
      head,
      tail,
      InternalPrimitive.boolean(Option.some(!ifPresent))
    )
    return withDefault(orElse(option, negationOption), !ifPresent)
  }
  return withDefault(option, !ifPresent)
}

/** @internal */
export const choice = <A extends string, C extends ReadonlyArray.NonEmptyReadonlyArray<A>>(
  name: string,
  choices: C
): Options.Options<C[number]> => {
  const primitive = InternalPrimitive.choice(
    ReadonlyArray.map(choices, (choice) => [choice, choice])
  )
  return makeSingle(name, ReadonlyArray.empty(), primitive)
}

/** @internal */
export const choiceWithValue = <const C extends ReadonlyArray.NonEmptyReadonlyArray<[string, any]>>(
  name: string,
  choices: C
): Options.Options<C[number][1]> =>
  makeSingle(name, ReadonlyArray.empty(), InternalPrimitive.choice(choices))

/** @internal */
export const date = (name: string): Options.Options<Date> =>
  makeSingle(name, ReadonlyArray.empty(), InternalPrimitive.date)

/** @internal */
export const directory = (
  name: string,
  config: Options.Options.PathOptionsConfig = {}
): Options.Options<string> =>
  makeSingle(
    name,
    ReadonlyArray.empty(),
    InternalPrimitive.path("directory", config.exists || "either")
  )

/** @internal */
export const file = (
  name: string,
  config: Options.Options.PathOptionsConfig = {}
): Options.Options<string> =>
  makeSingle(
    name,
    ReadonlyArray.empty(),
    InternalPrimitive.path("file", config.exists || "either")
  )

/** @internal */
export const filterMap = dual<
  <A, B>(
    f: (a: A) => Option.Option<B>,
    message: string
  ) => (self: Options.Options<A>) => Options.Options<B>,
  <A, B>(
    self: Options.Options<A>,
    f: (a: A) => Option.Option<B>,
    message: string
  ) => Options.Options<B>
>(3, (self, f, message) =>
  mapOrFail(self, (a) =>
    Option.match(f(a), {
      onNone: () => Either.left(InternalValidationError.invalidValue(InternalHelpDoc.p(message))),
      onSome: Either.right
    })))

/** @internal */
export const float = (name: string): Options.Options<number> =>
  makeSingle(name, ReadonlyArray.empty(), InternalPrimitive.float)

/** @internal */
export const integer = (name: string): Options.Options<number> =>
  makeSingle(name, ReadonlyArray.empty(), InternalPrimitive.integer)

/** @internal */
export const keyValueMap = (
  option: string | Options.Options<string>
): Options.Options<HashMap.HashMap<string, string>> => {
  if (typeof option === "string") {
    const single = makeSingle(option, ReadonlyArray.empty(), InternalPrimitive.text)
    return makeKeyValueMap(single as Single)
  }
  if (!isSingle(option as Instruction)) {
    throw new Error("InvalidArgumentException: only single options can be key/value maps")
  } else {
    return makeKeyValueMap(option as Single)
  }
}

/** @internal */
export const none: Options.Options<void> = (() => {
  const op = Object.create(proto)
  op._tag = "Empty"
  return op
})()

/** @internal */
export const text = (name: string): Options.Options<string> =>
  makeSingle(name, ReadonlyArray.empty(), InternalPrimitive.text)

// =============================================================================
// Combinators
// =============================================================================

/** @internal */
export const atLeast = dual<
  {
    (times: 0): <A>(self: Options.Options<A>) => Options.Options<ReadonlyArray<A>>
    (
      times: number
    ): <A>(self: Options.Options<A>) => Options.Options<ReadonlyArray.NonEmptyReadonlyArray<A>>
  },
  {
    <A>(self: Options.Options<A>, times: 0): Options.Options<ReadonlyArray<A>>
    <A>(
      self: Options.Options<A>,
      times: number
    ): Options.Options<ReadonlyArray.NonEmptyReadonlyArray<A>>
  }
>(2, (self, times) => makeVariadic(self, Option.some(times), Option.none()) as any)

/** @internal */
export const atMost = dual<
  (times: number) => <A>(self: Options.Options<A>) => Options.Options<ReadonlyArray<A>>,
  <A>(self: Options.Options<A>, times: number) => Options.Options<ReadonlyArray<A>>
>(2, (self, times) => makeVariadic(self, Option.none(), Option.some(times)) as any)

/** @internal */
export const between = dual<
  {
    (min: 0, max: number): <A>(self: Options.Options<A>) => Options.Options<ReadonlyArray<A>>
    (
      min: number,
      max: number
    ): <A>(self: Options.Options<A>) => Options.Options<ReadonlyArray.NonEmptyReadonlyArray<A>>
  },
  {
    <A>(self: Options.Options<A>, min: 0, max: number): Options.Options<ReadonlyArray<A>>
    <A>(
      self: Options.Options<A>,
      min: number,
      max: number
    ): Options.Options<ReadonlyArray.NonEmptyReadonlyArray<A>>
  }
>(3, (self, min, max) => makeVariadic(self, Option.some(min), Option.some(max)) as any)

/** @internal */
export const isBool = <A>(self: Options.Options<A>): boolean => isBoolInternal(self as Instruction)

/** @internal */
export const getHelp = <A>(self: Options.Options<A>): HelpDoc.HelpDoc =>
  getHelpInternal(self as Instruction)

/** @internal */
export const getIdentifier = <A>(self: Options.Options<A>): Option.Option<string> =>
  getIdentifierInternal(self as Instruction)

/** @internal */
export const getMinSize = <A>(self: Options.Options<A>): number =>
  getMinSizeInternal(self as Instruction)

/** @internal */
export const getMaxSize = <A>(self: Options.Options<A>): number =>
  getMaxSizeInternal(self as Instruction)

/** @internal */
export const getUsage = <A>(self: Options.Options<A>): Usage.Usage =>
  getUsageInternal(self as Instruction)

/** @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => (self: Options.Options<A>) => Options.Options<B>,
  <A, B>(self: Options.Options<A>, f: (a: A) => B) => Options.Options<B>
>(2, (self, f) => makeMap(self, (a) => Either.right(f(a))))

/** @internal */
export const mapOrFail = dual<
  <A, B>(
    f: (a: A) => Either.Either<ValidationError.ValidationError, B>
  ) => (self: Options.Options<A>) => Options.Options<B>,
  <A, B>(
    self: Options.Options<A>,
    f: (a: A) => Either.Either<ValidationError.ValidationError, B>
  ) => Options.Options<B>
>(2, (self, f) => makeMap(self, f))

/** @internal */
export const mapTryCatch = dual<
  <A, B>(
    f: (a: A) => B,
    onError: (e: unknown) => HelpDoc.HelpDoc
  ) => (self: Options.Options<A>) => Options.Options<B>,
  <A, B>(
    self: Options.Options<A>,
    f: (a: A) => B,
    onError: (e: unknown) => HelpDoc.HelpDoc
  ) => Options.Options<B>
>(3, (self, f, onError) =>
  mapOrFail(self, (a) => {
    try {
      return Either.right(f(a))
    } catch (e) {
      return Either.left(InternalValidationError.invalidValue(onError(e)))
    }
  }))

/** @internal */
export const optional = <A>(self: Options.Options<A>): Options.Options<Option.Option<A>> =>
  withDefault(map(self, Option.some), Option.none())

/** @internal */
export const orElse = dual<
  <B>(that: Options.Options<B>) => <A>(self: Options.Options<A>) => Options.Options<A | B>,
  <A, B>(self: Options.Options<A>, that: Options.Options<B>) => Options.Options<A | B>
>(2, (self, that) => orElseEither(self, that).pipe(map(Either.merge)))

/** @internal */
export const orElseEither = dual<
  <B>(
    that: Options.Options<B>
  ) => <A>(self: Options.Options<A>) => Options.Options<Either.Either<A, B>>,
  <A, B>(self: Options.Options<A>, that: Options.Options<B>) => Options.Options<Either.Either<A, B>>
>(2, (self, that) => makeOrElse(self, that))

/** @internal */
export const parse = dual<
  (
    args: HashMap.HashMap<string, ReadonlyArray<string>>,
    config: CliConfig.CliConfig
  ) => <A>(
    self: Options.Options<A>
  ) => Effect.Effect<FileSystem.FileSystem, ValidationError.ValidationError, A>,
  <A>(
    self: Options.Options<A>,
    args: HashMap.HashMap<string, ReadonlyArray<string>>,
    config: CliConfig.CliConfig
  ) => Effect.Effect<FileSystem.FileSystem, ValidationError.ValidationError, A>
>(3, (self, args, config) => parseInternal(self as Instruction, args, config) as any)

/** @internal */
export const repeated = <A>(self: Options.Options<A>): Options.Options<ReadonlyArray<A>> =>
  makeVariadic(self, Option.none(), Option.none())

/** @internal */
export const toRegularLanguage = <A>(self: Options.Options<A>): RegularLanguage.RegularLanguage =>
  toRegularLanguageInternal(self as Instruction)

/** @internal */
export const validate = dual<
  (
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => <A>(
    self: Options.Options<A>
  ) => Effect.Effect<
    FileSystem.FileSystem,
    ValidationError.ValidationError,
    [Option.Option<ValidationError.ValidationError>, ReadonlyArray<string>, A]
  >,
  <A>(
    self: Options.Options<A>,
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => Effect.Effect<
    FileSystem.FileSystem,
    ValidationError.ValidationError,
    [Option.Option<ValidationError.ValidationError>, ReadonlyArray<string>, A]
  >
>(
  3,
  (self, args, config) =>
    matchOptions(args, toParseableInstruction(self as Instruction), config).pipe(
      Effect.flatMap(([error, commandArgs, matchedOptions]) =>
        parseInternal(self as Instruction, matchedOptions, config).pipe(
          Effect.catchAll((e) =>
            Option.match(error, {
              onNone: () => Effect.fail(e),
              onSome: (err) => Effect.fail(err)
            })
          ),
          Effect.map((a) => [error, commandArgs, a as any])
        )
      )
    )
)

/** @internal */
export const withAlias = dual<
  (alias: string) => <A>(self: Options.Options<A>) => Options.Options<A>,
  <A>(self: Options.Options<A>, alias: string) => Options.Options<A>
>(2, (self, alias) =>
  modifySingle(self as Instruction, (single) => {
    const aliases = ReadonlyArray.append(single.aliases, alias)
    return makeSingle(
      single.name,
      aliases,
      single.primitiveType,
      single.description,
      single.pseudoName
    ) as Single
  }))

/** @internal */
export const withDefault = dual<
  <A>(fallback: A) => (self: Options.Options<A>) => Options.Options<A>,
  <A>(self: Options.Options<A>, fallback: A) => Options.Options<A>
>(2, (self, fallback) => makeWithDefault(self, fallback))

/** @internal */
export const withDescription = dual<
  (description: string) => <A>(self: Options.Options<A>) => Options.Options<A>,
  <A>(self: Options.Options<A>, description: string) => Options.Options<A>
>(2, (self, desc) =>
  modifySingle(self as Instruction, (single) => {
    const description = InternalHelpDoc.sequence(single.description, InternalHelpDoc.p(desc))
    return makeSingle(
      single.name,
      single.aliases,
      single.primitiveType,
      description,
      single.pseudoName
    ) as Single
  }))

/** @internal */
export const withPseudoName = dual<
  (pseudoName: string) => <A>(self: Options.Options<A>) => Options.Options<A>,
  <A>(self: Options.Options<A>, pseudoName: string) => Options.Options<A>
>(2, (self, pseudoName) =>
  modifySingle(self as Instruction, (single) =>
    makeSingle(
      single.name,
      single.aliases,
      single.primitiveType,
      single.description,
      Option.some(pseudoName)
    ) as Single))

/** @internal */
export const wizard = dual<
  (config: CliConfig.CliConfig) => <A>(self: Options.Options<A>) => Effect.Effect<
    FileSystem.FileSystem | Terminal.Terminal,
    ValidationError.ValidationError,
    ReadonlyArray<string>
  >,
  <A>(self: Options.Options<A>, config: CliConfig.CliConfig) => Effect.Effect<
    FileSystem.FileSystem | Terminal.Terminal,
    ValidationError.ValidationError,
    ReadonlyArray<string>
  >
>(2, (self, config) => wizardInternal(self as Instruction, config))

// =============================================================================
// Internals
// =============================================================================

const allTupled = <const T extends ArrayLike<Options.Options<any>>>(arg: T): Options.Options<
  {
    [K in keyof T]: [T[K]] extends [Options.Options<infer A>] ? A : never
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
      return InternalHelpDoc.descriptionList(ReadonlyArray.of([
        InternalHelpDoc.getSpan(InternalUsage.getHelp(getUsageInternal(self))),
        InternalHelpDoc.sequence(
          InternalHelpDoc.p(InternalPrimitive.getHelp(self.primitiveType)),
          self.description
        )
      ]))
    }
    case "KeyValueMap": {
      // Single options always have an identifier, so we can safely `getOrThrow`
      const identifier = Option.getOrThrow(
        getIdentifierInternal(self.argumentOption as Instruction)
      )
      return InternalHelpDoc.mapDescriptionList(
        getHelpInternal(self.argumentOption as Instruction),
        (span, oldBlock) => {
          const header = InternalHelpDoc.p("This setting is a property argument which:")
          const single = `${identifier} key1=value key2=value2'`
          const multiple = `${identifier} key1=value ${identifier} key2=value2'`
          const description = InternalHelpDoc.enumeration([
            InternalHelpDoc.p(`May be specified a single time:  '${single}'`),
            InternalHelpDoc.p(`May be specified multiple times: '${multiple}'`)
          ])
          const newBlock = pipe(
            oldBlock,
            InternalHelpDoc.sequence(header),
            InternalHelpDoc.sequence(description)
          )
          return [span, newBlock]
        }
      )
    }
    case "Map": {
      return getHelpInternal(self.options as Instruction)
    }
    case "Both":
    case "OrElse": {
      return InternalHelpDoc.sequence(
        getHelpInternal(self.left as Instruction),
        getHelpInternal(self.right as Instruction)
      )
    }
    case "Variadic": {
      const help = getHelpInternal(self.argumentOption as Instruction)
      return InternalHelpDoc.mapDescriptionList(help, (oldSpan, oldBlock) => {
        const min = getMinSizeInternal(self as Instruction)
        const max = getMaxSizeInternal(self as Instruction)
        const newSpan = InternalSpan.text(
          Option.isSome(self.max) ? ` ${min} - ${max}` : min === 0 ? "..." : ` ${min}+`
        )
        const newBlock = InternalHelpDoc.p(
          Option.isSome(self.max)
            ? `This option must be repeated at least ${min} times and may be repeated up to ${max} times.`
            : min === 0
            ? "This option may be repeated zero or more times."
            : `This option must be repeated at least ${min} times.`
        )
        return [InternalSpan.concat(oldSpan, newSpan), InternalHelpDoc.sequence(oldBlock, newBlock)]
      })
    }
    case "WithDefault": {
      return InternalHelpDoc.mapDescriptionList(
        getHelpInternal(self.options as Instruction),
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
  }
}

const getIdentifierInternal = (self: Instruction): Option.Option<string> => {
  switch (self._tag) {
    case "Empty": {
      return Option.none()
    }
    case "Single": {
      return Option.some(self.fullName)
    }
    case "Both":
    case "OrElse": {
      const ids = ReadonlyArray.compact([
        getIdentifierInternal(self.left as Instruction),
        getIdentifierInternal(self.right as Instruction)
      ])
      return ReadonlyArray.match(ids, {
        onEmpty: () => Option.none(),
        onNonEmpty: (ids) => Option.some(ReadonlyArray.join(ids, ", "))
      })
    }
    case "KeyValueMap":
    case "Variadic": {
      return getIdentifierInternal(self.argumentOption as Instruction)
    }
    case "Map":
    case "WithDefault": {
      return getIdentifierInternal(self.options as Instruction)
    }
  }
}

const getMinSizeInternal = (self: Instruction): number => {
  switch (self._tag) {
    case "Empty":
    case "WithDefault": {
      return 0
    }
    case "Single":
    case "KeyValueMap": {
      return 1
    }
    case "Map": {
      return getMinSizeInternal(self.options as Instruction)
    }
    case "Both": {
      const leftMinSize = getMinSizeInternal(self.left as Instruction)
      const rightMinSize = getMinSizeInternal(self.right as Instruction)
      return leftMinSize + rightMinSize
    }
    case "OrElse": {
      const leftMinSize = getMinSizeInternal(self.left as Instruction)
      const rightMinSize = getMinSizeInternal(self.right as Instruction)
      return Math.min(leftMinSize, rightMinSize)
    }
    case "Variadic": {
      const selfMinSize = Option.getOrElse(self.min, () => 0)
      const argumentOptionMinSize = getMinSizeInternal(self.argumentOption as Instruction)
      return selfMinSize * argumentOptionMinSize
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
    case "KeyValueMap": {
      return Number.MAX_SAFE_INTEGER
    }
    case "Map": {
      return getMaxSizeInternal(self.options as Instruction)
    }
    case "Both": {
      const leftMaxSize = getMaxSizeInternal(self.left as Instruction)
      const rightMaxSize = getMaxSizeInternal(self.right as Instruction)
      return leftMaxSize + rightMaxSize
    }
    case "OrElse": {
      const leftMin = getMaxSizeInternal(self.left as Instruction)
      const rightMin = getMaxSizeInternal(self.right as Instruction)
      return Math.min(leftMin, rightMin)
    }
    case "Variadic": {
      const selfMaxSize = Option.getOrElse(self.max, () => Number.MAX_SAFE_INTEGER / 2)
      const optionsMaxSize = getMaxSizeInternal(self.argumentOption as Instruction)
      return Math.floor(selfMaxSize * optionsMaxSize)
    }
    case "WithDefault": {
      return getMaxSizeInternal(self.options as Instruction)
    }
  }
}

const getUsageInternal = (self: Instruction): Usage.Usage => {
  switch (self._tag) {
    case "Empty": {
      return InternalUsage.empty
    }
    case "Single": {
      const acceptedValues = InternalPrimitive.isBool(self.primitiveType)
        ? Option.none()
        : Option.orElse(
          InternalPrimitive.getChoices(self.primitiveType),
          () => Option.some(self.placeholder)
        )
      return InternalUsage.named(names(self), acceptedValues)
    }
    case "KeyValueMap": {
      return getUsageInternal(self.argumentOption as Instruction)
    }
    case "Map": {
      return getUsageInternal(self.options as Instruction)
    }
    case "Both": {
      return InternalUsage.concat(
        getUsageInternal(self.left as Instruction),
        getUsageInternal(self.right as Instruction)
      )
    }
    case "OrElse": {
      return InternalUsage.alternation(
        getUsageInternal(self.left as Instruction),
        getUsageInternal(self.right as Instruction)
      )
    }
    case "Variadic": {
      return InternalUsage.repeated(getUsageInternal(self.argumentOption as Instruction))
    }
    case "WithDefault": {
      return InternalUsage.optional(getUsageInternal(self.options as Instruction))
    }
  }
}

const isBoolInternal = (self: Instruction): boolean => {
  switch (self._tag) {
    case "Single": {
      return InternalPrimitive.isBool(self.primitiveType)
    }
    case "Map": {
      return isBoolInternal(self.options as Instruction)
    }
    case "WithDefault": {
      return isBoolInternal(self.options as Instruction)
    }
    default: {
      return false
    }
  }
}

const makeBoth = <A, B>(
  left: Options.Options<A>,
  right: Options.Options<B>
): Options.Options<[A, B]> => {
  const op = Object.create(proto)
  op._tag = "Both"
  op.left = left
  op.right = right
  return op
}

const makeFullName = (str: string): [boolean, string] =>
  str.length === 1 ? [true, `-${str}`] : [false, `--${str}`]

const makeKeyValueMap = (
  argumentOption: Single
): Options.Options<HashMap.HashMap<string, string>> => {
  const op = Object.create(proto)
  op._tag = "KeyValueMap"
  op.argumentOption = argumentOption
  return op
}

const makeMap = <A, B>(
  options: Options.Options<A>,
  f: (a: A) => Either.Either<ValidationError.ValidationError, B>
): Options.Options<B> => {
  const op = Object.create(proto)
  op._tag = "Map"
  op.options = options
  op.f = f
  return op
}

const makeOrElse = <A, B>(
  left: Options.Options<A>,
  right: Options.Options<B>
): Options.Options<Either.Either<A, B>> => {
  const op = Object.create(proto)
  op._tag = "OrElse"
  op.left = left
  op.right = right
  return op
}

const makeSingle = <A>(
  name: string,
  aliases: ReadonlyArray<string>,
  primitiveType: Primitive.Primitive<A>,
  description: HelpDoc.HelpDoc = InternalHelpDoc.empty,
  pseudoName: Option.Option<string> = Option.none()
): Options.Options<A> => {
  const op = Object.create(proto)
  op._tag = "Single"
  op.name = name
  op.fullName = makeFullName(name)[1]
  op.placeholder = `${
    Option.getOrElse(pseudoName, () => InternalPrimitive.getTypeName(primitiveType))
  }`
  op.aliases = aliases
  op.primitiveType = primitiveType
  op.description = description
  op.pseudoName = pseudoName
  return op
}

const makeVariadic = <A>(
  argumentOption: Options.Options<A>,
  min: Option.Option<number>,
  max: Option.Option<number>
): Options.Options<ReadonlyArray<A>> => {
  if (!isSingle(argumentOption as Instruction)) {
    throw new Error("InvalidArgumentException: only single options can be variadic")
  }
  const op = Object.create(proto)
  op._tag = "Variadic"
  op.argumentOption = argumentOption
  op.min = min
  op.max = max
  return op
}

const makeWithDefault = <A>(options: Options.Options<A>, fallback: A): Options.Options<A> => {
  const op = Object.create(proto)
  op._tag = "WithDefault"
  op.options = options
  op.fallback = fallback
  return op
}

const modifySingle = (self: Instruction, f: (single: Single) => Single): Options.Options<any> => {
  switch (self._tag) {
    case "Empty": {
      return none
    }
    case "Single": {
      return f(self)
    }
    case "KeyValueMap": {
      return makeKeyValueMap(f(self.argumentOption))
    }
    case "Map": {
      return makeMap(modifySingle(self.options as Instruction, f), self.f)
    }
    case "Both": {
      return makeBoth(
        modifySingle(self.left as Instruction, f),
        modifySingle(self.right as Instruction, f)
      )
    }
    case "OrElse": {
      return makeOrElse(
        modifySingle(self.left as Instruction, f),
        modifySingle(self.right as Instruction, f)
      )
    }
    case "Variadic": {
      return makeVariadic(f(self.argumentOption), self.min, self.max)
    }
    case "WithDefault": {
      return makeWithDefault(modifySingle(self.options as Instruction, f), self.fallback)
    }
  }
}

const names = (self: Single): ReadonlyArray<string> => {
  const order = Order.mapInput(Order.boolean, (tuple: [boolean, string]) => !tuple[0])
  return pipe(
    ReadonlyArray.prepend(self.aliases, self.name),
    ReadonlyArray.map((str) => makeFullName(str)),
    ReadonlyArray.sortNonEmpty(order),
    ReadonlyArray.map((tuple) => tuple[1])
  )
}

const parseOptions = (
  self: ParseableInstruction,
  args: ReadonlyArray<string>,
  config: CliConfig.CliConfig
): Effect.Effect<
  never,
  ValidationError.ValidationError,
  [ReadonlyArray<string>, ReadonlyArray<string>]
> => {
  switch (self._tag) {
    case "Single": {
      return processArgs(args).pipe(
        Effect.flatMap((args) => {
          if (ReadonlyArray.isNonEmptyReadonlyArray(args)) {
            const head = ReadonlyArray.headNonEmpty(args)
            const tail = ReadonlyArray.tailNonEmpty(args)
            const normalizedArgv0 = InternalCliConfig.normalizeCase(config, head)
            const normalizedNames = ReadonlyArray.map(
              names(self),
              (name) => InternalCliConfig.normalizeCase(config, name)
            )
            if (ReadonlyArray.contains(normalizedNames, normalizedArgv0)) {
              if (InternalPrimitive.isBool(self.primitiveType)) {
                if (ReadonlyArray.isNonEmptyReadonlyArray(tail) && tail[0] === "true") {
                  return Effect.succeed([
                    ReadonlyArray.make(head, "true"),
                    ReadonlyArray.drop(tail, 1)
                  ])
                }
                if (ReadonlyArray.isNonEmptyReadonlyArray(tail) && tail[0] === "false") {
                  return Effect.succeed([
                    ReadonlyArray.make(head, "false"),
                    ReadonlyArray.drop(tail, 1)
                  ])
                }
                return Effect.succeed([ReadonlyArray.of(head), tail])
              }
              if (ReadonlyArray.isNonEmptyReadonlyArray(tail)) {
                return Effect.succeed([
                  ReadonlyArray.make(head, tail[0]),
                  ReadonlyArray.drop(tail, 1)
                ])
              }
              const error = InternalHelpDoc.p(
                `Expected a value following option: '${self.fullName}'`
              )
              return Effect.fail(InternalValidationError.missingValue(error))
            }
            if (
              self.name.length > config.autoCorrectLimit + 1 &&
              InternalAutoCorrect.levensteinDistance(head, self.fullName, config) <=
                config.autoCorrectLimit
            ) {
              const error = InternalHelpDoc.p(
                `The flag '${head}' is not recognized. Did you mean '${self.fullName}'?`
              )
              return Effect.fail(InternalValidationError.correctedFlag(error))
            }
            const error = InternalHelpDoc.p(`Expected to find option: '${self.fullName}'`)
            return Effect.fail(InternalValidationError.missingFlag(error))
          }
          const error = InternalHelpDoc.p(`Expected to find option: '${self.fullName}'`)
          return Effect.fail(InternalValidationError.missingFlag(error))
        })
      )
    }
    case "KeyValueMap": {
      const singleNames = ReadonlyArray.map(
        names(self.argumentOption),
        (name) => InternalCliConfig.normalizeCase(config, name)
      )
      if (ReadonlyArray.isNonEmptyReadonlyArray(args)) {
        let currentIndex = 0
        let inKeyValueOption = false
        let keyValues = ReadonlyArray.empty<string>()
        let leftover = args as ReadonlyArray<string>
        while (currentIndex < leftover.length) {
          const name = leftover[currentIndex].trim()
          const normalizedName = InternalCliConfig.normalizeCase(config, name)
          // Can be in the form of "--flag key1=value1 --flag key2=value2"
          if (leftover.length >= 2 && ReadonlyArray.contains(singleNames, normalizedName)) {
            // Attempt to parse the key/value
            const currentValue = leftover[currentIndex + 1]
            if (currentValue !== undefined) {
              const keyValue = currentValue.trim()
              const [key, value] = keyValue.split("=")
              if (key !== undefined && value !== undefined) {
                if (ReadonlyArray.isEmptyReadonlyArray(keyValues)) {
                  // Add the name to the head of the array on first value found
                  keyValues = ReadonlyArray.appendAll(keyValues, [name, keyValue])
                } else {
                  // Otherwise just add the value
                  keyValues = ReadonlyArray.append(keyValues, keyValue)
                }
                leftover = ReadonlyArray.appendAll(
                  // Take everything from the start of leftover to the current index
                  ReadonlyArray.take(leftover, currentIndex),
                  // Drop the current argument and its key/value from the leftover
                  ReadonlyArray.takeRight(leftover, leftover.length - (currentIndex + 2))
                )
                inKeyValueOption = true
              }
            } else {
              currentIndex = currentIndex + 1
            }
          } // The prior steps will parse out the name of the flag and the first
          // key/value pair - this step is to parse out variadic repetitions of
          // key/value pairs that may occcur after the initial flag (i.e. in the
          // form "--flag key1=value1 key2=value2")
          else if (inKeyValueOption && name.includes("=")) {
            const [key, value] = name.split("=")
            if (key !== undefined && value !== undefined) {
              // The flag name should have already been added by this point, so
              // no need to perform the check from the prior step
              keyValues = ReadonlyArray.append(keyValues, name)
              leftover = ReadonlyArray.appendAll(
                // Take everything from the start of leftover to the current index
                ReadonlyArray.take(leftover, currentIndex),
                // Drop the current key/value from the leftover
                ReadonlyArray.takeRight(leftover, leftover.length - (currentIndex + 1))
              )
            }
          } else {
            inKeyValueOption = false
            currentIndex = currentIndex + 1
          }
          console.dir({ keyValues, currentIndex, leftover })
        }
        return Effect.succeed([keyValues, leftover])
      }
      return Effect.succeed([ReadonlyArray.empty(), args])
    }
    case "Variadic": {
      const singleNames = ReadonlyArray.map(
        names(self.argumentOption),
        (name) => InternalCliConfig.normalizeCase(config, name)
      )
      if (ReadonlyArray.isNonEmptyReadonlyArray(args)) {
        let currentIndex = 0
        let values = ReadonlyArray.empty<string>()
        let leftover = args as ReadonlyArray<string>
        while (currentIndex < leftover.length) {
          const name = leftover[currentIndex].trim()
          const normalizedName = InternalCliConfig.normalizeCase(config, name)
          if (leftover.length >= 2 && ReadonlyArray.contains(singleNames, normalizedName)) {
            const currentValue = leftover[currentIndex + 1]
            if (currentValue !== undefined) {
              const value = leftover[currentIndex + 1].trim()
              if (ReadonlyArray.isEmptyReadonlyArray(values)) {
                // Add the name to the head of the array on first value found
                values = ReadonlyArray.appendAll(values, [name, value])
              } else {
                // Otherwise just add the value
                values = ReadonlyArray.append(values, value)
              }
              leftover = ReadonlyArray.appendAll(
                // Take everything from the start of leftover to the current index
                ReadonlyArray.take(leftover, currentIndex),
                // Drop the current argument and its value from the leftover
                ReadonlyArray.takeRight(leftover, leftover.length - (currentIndex + 2))
              )
            } else {
              currentIndex = currentIndex + 1
            }
          } else {
            currentIndex = currentIndex + 1
          }
        }
        return Effect.succeed([values, leftover])
      }
      return Effect.succeed([ReadonlyArray.empty(), args])
    }
    default: {
      return absurd(self)
    }
  }
}

const toParseableInstruction = (self: Instruction): ReadonlyArray<ParseableInstruction> => {
  switch (self._tag) {
    case "Empty": {
      return ReadonlyArray.empty()
    }
    case "Single":
    case "KeyValueMap":
    case "Variadic": {
      return ReadonlyArray.of(self)
    }
    case "Map":
    case "WithDefault": {
      return toParseableInstruction(self.options as Instruction)
    }
    case "Both":
    case "OrElse": {
      return ReadonlyArray.appendAll(
        toParseableInstruction(self.left as Instruction),
        toParseableInstruction(self.right as Instruction)
      )
    }
  }
}

const toRegularLanguageInternal = (self: Instruction): RegularLanguage.RegularLanguage => {
  switch (self._tag) {
    case "Empty": {
      return InternalRegularLanguage.epsilon
    }
    case "Single": {
      const singleNames = ReadonlyArray.reduce(
        names(self),
        InternalRegularLanguage.empty,
        (lang, name) => InternalRegularLanguage.orElse(lang, InternalRegularLanguage.string(name))
      )
      if (InternalPrimitive.isBoolType(self.primitiveType as InternalPrimitive.Instruction)) {
        return singleNames
      }
      return InternalRegularLanguage.concat(
        singleNames,
        InternalRegularLanguage.primitive(self.primitiveType)
      )
    }
    case "KeyValueMap": {
      const optionGrammar = toRegularLanguageInternal(self.argumentOption)
      return InternalRegularLanguage.permutation([optionGrammar])
    }
    case "Map": {
      return toRegularLanguageInternal(self.options as Instruction)
    }
    case "Both": {
      const leftLanguage = toRegularLanguageInternal(self.left as Instruction)
      const rightLanguage = toRegularLanguageInternal(self.right as Instruction)
      // Deforestation
      if (
        InternalRegularLanguage.isPermutation(leftLanguage) &&
        InternalRegularLanguage.isPermutation(rightLanguage)
      ) {
        return InternalRegularLanguage.permutation(
          ReadonlyArray.appendAll(leftLanguage.values, rightLanguage.values)
        )
      }
      if (InternalRegularLanguage.isPermutation(leftLanguage)) {
        return InternalRegularLanguage.permutation(
          ReadonlyArray.append(leftLanguage.values, rightLanguage)
        )
      }
      if (InternalRegularLanguage.isPermutation(rightLanguage)) {
        return InternalRegularLanguage.permutation(
          ReadonlyArray.append(rightLanguage.values, leftLanguage)
        )
      }
      return InternalRegularLanguage.permutation([leftLanguage, rightLanguage])
    }
    case "OrElse": {
      return InternalRegularLanguage.orElse(
        toRegularLanguageInternal(self.left as Instruction),
        toRegularLanguageInternal(self.right as Instruction)
      )
    }
    case "Variadic": {
      const language = toRegularLanguageInternal(self.argumentOption as Instruction)
      return InternalRegularLanguage.repeated(language, {
        min: Option.getOrUndefined(self.min),
        max: Option.getOrUndefined(self.max)
      })
    }
    case "WithDefault": {
      return InternalRegularLanguage.optional(
        toRegularLanguageInternal(self.options as Instruction)
      )
    }
  }
}

const parseInternal = (
  self: Instruction,
  args: HashMap.HashMap<string, ReadonlyArray<string>>,
  config: CliConfig.CliConfig
): Effect.Effect<FileSystem.FileSystem, ValidationError.ValidationError, unknown> => {
  switch (self._tag) {
    case "Empty": {
      return Effect.unit
    }
    case "Single": {
      const singleNames = ReadonlyArray.filterMap(names(self), (name) => HashMap.get(args, name))
      if (ReadonlyArray.isNonEmptyReadonlyArray(singleNames)) {
        const head = ReadonlyArray.headNonEmpty(singleNames)
        const tail = ReadonlyArray.tailNonEmpty(singleNames)
        if (ReadonlyArray.isEmptyReadonlyArray(tail)) {
          if (ReadonlyArray.isEmptyReadonlyArray(head)) {
            return InternalPrimitive.validate(self.primitiveType, Option.none(), config).pipe(
              Effect.mapError((e) => InternalValidationError.invalidValue(InternalHelpDoc.p(e)))
            )
          }
          if (
            ReadonlyArray.isNonEmptyReadonlyArray(head) &&
            ReadonlyArray.isEmptyReadonlyArray(ReadonlyArray.tailNonEmpty(head))
          ) {
            const value = ReadonlyArray.headNonEmpty(head)
            return InternalPrimitive.validate(self.primitiveType, Option.some(value), config).pipe(
              Effect.mapError((e) => InternalValidationError.invalidValue(InternalHelpDoc.p(e)))
            )
          }
          return Effect.fail(
            InternalValidationError.multipleValuesDetected(InternalHelpDoc.empty, head)
          )
        }
        const error = InternalHelpDoc.p(
          `More than one reference to option '${self.fullName}' detected`
        )
        return Effect.fail(InternalValidationError.invalidValue(error))
      }
      const error = InternalHelpDoc.p(`Expected to find option: '${self.fullName}'`)
      return Effect.fail(InternalValidationError.missingValue(error))
    }
    case "KeyValueMap": {
      const extractKeyValue = (
        value: string
      ): Effect.Effect<never, ValidationError.ValidationError, [string, string]> => {
        const split = value.trim().split("=")
        if (ReadonlyArray.isNonEmptyReadonlyArray(split) && split.length === 2 && split[1] !== "") {
          return Effect.succeed(split as unknown as [string, string])
        }
        const error = InternalHelpDoc.p(`Expected a key/value pair but received '${value}'`)
        return Effect.fail(InternalValidationError.invalidArgument(error))
      }
      return parseInternal(self.argumentOption, args, config).pipe(Effect.matchEffect({
        onFailure: (e) =>
          InternalValidationError.isMultipleValuesDetected(e)
            ? Effect.forEach(e.values, (kv) => extractKeyValue(kv)).pipe(
              Effect.map(HashMap.fromIterable)
            )
            : Effect.fail(e),
        onSuccess: (kv) => extractKeyValue(kv as string).pipe(Effect.map(HashMap.make))
      }))
    }
    case "Map": {
      return parseInternal(self.options as Instruction, args, config).pipe(
        Effect.flatMap((a) => self.f(a))
      )
    }
    case "Both": {
      return parseInternal(self.left as Instruction, args, config).pipe(
        Effect.catchAll((err1) =>
          parseInternal(self.right as Instruction, args, config).pipe(Effect.matchEffect({
            onFailure: (err2) => {
              const error = InternalHelpDoc.sequence(err1.error, err2.error)
              return Effect.fail(InternalValidationError.missingValue(error))
            },
            onSuccess: () => Effect.fail(err1)
          }))
        ),
        Effect.zip(parseInternal(self.right as Instruction, args, config))
      )
    }
    case "OrElse": {
      return parseInternal(self.left as Instruction, args, config).pipe(
        Effect.matchEffect({
          onFailure: (err1) =>
            parseInternal(self.right as Instruction, args, config).pipe(
              Effect.mapBoth({
                onFailure: (err2) =>
                  // orElse option is only missing in case neither option was given
                  InternalValidationError.isMissingValue(err1) &&
                    InternalValidationError.isMissingValue(err2)
                    ? InternalValidationError.missingValue(
                      InternalHelpDoc.sequence(err1.error, err2.error)
                    )
                    : InternalValidationError.invalidValue(
                      InternalHelpDoc.sequence(err1.error, err2.error)
                    ),
                onSuccess: (b) => Either.right(b)
              })
            ),
          onSuccess: (a) =>
            parseInternal(self.right as Instruction, args, config).pipe(Effect.matchEffect({
              onFailure: () => Effect.succeed(Either.left(a)),
              onSuccess: () => {
                // The `identifier` will only be `None` for `Options.Empty`, which
                // means the user would have had to purposefully compose
                // `Options.Empty | otherArgument`
                const leftUid = Option.getOrElse(
                  getIdentifierInternal(self.left as Instruction),
                  () => "???"
                )
                const rightUid = Option.getOrElse(
                  getIdentifierInternal(self.right as Instruction),
                  () => "???"
                )
                const error = InternalHelpDoc.p(
                  "Collision between two options detected - you can only specify " +
                    `one of either: ['${leftUid}', '${rightUid}']`
                )
                return Effect.fail(InternalValidationError.invalidValue(error))
              }
            }))
        })
      )
    }
    case "Variadic": {
      const min = Option.getOrElse(self.min, () => 0)
      const max = Option.getOrElse(self.max, () => Number.MAX_SAFE_INTEGER)
      const validateMinMax = (values: ReadonlyArray<string>) => {
        if (values.length < min) {
          const name = self.argumentOption.fullName
          const error = `Expected at least ${min} value(s) for option: '${name}'`
          return Effect.fail(InternalValidationError.invalidValue(InternalHelpDoc.p(error)))
        }
        if (values.length > max) {
          const name = self.argumentOption.fullName
          const error = `Expected at most ${max} value(s) for option: '${name}'`
          return Effect.fail(InternalValidationError.invalidValue(InternalHelpDoc.p(error)))
        }
        const primitive = self.argumentOption.primitiveType
        const validatePrimitive = (value: string) =>
          InternalPrimitive.validate(primitive, Option.some(value), config).pipe(
            Effect.mapError((e) => InternalValidationError.invalidValue(InternalHelpDoc.p(e)))
          )
        return Effect.forEach(values, (value) => validatePrimitive(value))
      }
      return parseInternal(self.argumentOption, args, config).pipe(Effect.matchEffect({
        onFailure: (error) =>
          InternalValidationError.isMultipleValuesDetected(error)
            ? validateMinMax(error.values)
            : Effect.fail(error),
        onSuccess: (value) => validateMinMax(ReadonlyArray.of(value as string))
      }))
    }
    case "WithDefault": {
      return parseInternal(self.options as Instruction, args, config).pipe(
        Effect.catchTag("MissingValue", () => Effect.succeed(self.fallback))
      )
    }
  }
}

const wizardHeader = InternalHelpDoc.p("OPTIONS WIZARD")

const wizardInternal = (self: Instruction, config: CliConfig.CliConfig): Effect.Effect<
  FileSystem.FileSystem | Terminal.Terminal,
  ValidationError.ValidationError,
  ReadonlyArray<string>
> => {
  switch (self._tag) {
    case "Empty": {
      return Effect.succeed(ReadonlyArray.empty())
    }
    case "Single": {
      const help = InternalHelpDoc.sequence(wizardHeader, getHelpInternal(self))
      return Console.log().pipe(
        Effect.zipRight(
          InternalPrimitive.wizard(self.primitiveType, help).pipe(Effect.flatMap((input) => {
            // There will always be at least one name in names
            const args = ReadonlyArray.make(names(self)[0]!, input as string)
            return parseOptions(self, args, config).pipe(Effect.as(args))
          }))
        )
      )
    }
    case "KeyValueMap": {
      const optionHelp = InternalHelpDoc.p("Enter `key=value` pairs separated by spaces")
      const message = InternalHelpDoc.sequence(wizardHeader, optionHelp)
      return Console.log().pipe(
        Effect.zipRight(InternalListPrompt.list({
          message: InternalHelpDoc.toAnsiText(message).trim(),
          delimiter: " "
        })),
        Effect.flatMap((args) => {
          const identifier = Option.getOrElse(getIdentifierInternal(self), () => "")
          return parseInternal(self, HashMap.make([identifier, args]), config).pipe(
            Effect.as(ReadonlyArray.prepend(args, identifier))
          )
        })
      )
    }
    case "Map": {
      return wizardInternal(self.options as Instruction, config)
    }
    case "Both": {
      return Effect.zipWith(
        wizardInternal(self.left as Instruction, config),
        wizardInternal(self.right as Instruction, config),
        (left, right) => ReadonlyArray.appendAll(left, right)
      )
    }
    case "OrElse": {
      const alternativeHelp = InternalHelpDoc.p("Select which option you would like to use")
      const message = pipe(
        wizardHeader,
        InternalHelpDoc.sequence(getHelpInternal(self)),
        InternalHelpDoc.sequence(alternativeHelp)
      )
      const makeChoice = (title: string, value: Instruction) => ({ title, value })
      const choices = ReadonlyArray.compact([
        Option.map(
          getIdentifierInternal(self.left as Instruction),
          (title) => makeChoice(title, self.left as Instruction)
        ),
        Option.map(
          getIdentifierInternal(self.right as Instruction),
          (title) => makeChoice(title, self.right as Instruction)
        )
      ])
      return Console.log().pipe(Effect.zipRight(
        InternalSelectPrompt.select({
          message: InternalHelpDoc.toAnsiText(message).trimEnd(),
          choices
        }).pipe(Effect.flatMap((option) => wizardInternal(option, config)))
      ))
    }
    case "Variadic": {
      const repeatHelp = InternalHelpDoc.p(
        "How many times should this argument should be repeated?"
      )
      const message = pipe(
        wizardHeader,
        InternalHelpDoc.sequence(getHelpInternal(self)),
        InternalHelpDoc.sequence(repeatHelp)
      )
      return Console.log().pipe(
        Effect.zipRight(InternalNumberPrompt.integer({
          message: InternalHelpDoc.toAnsiText(message).trimEnd(),
          min: getMinSizeInternal(self),
          max: getMaxSizeInternal(self)
        })),
        Effect.flatMap((n) =>
          Ref.make(ReadonlyArray.empty<string>()).pipe(
            Effect.flatMap((ref) =>
              wizardInternal(self.argumentOption as Instruction, config).pipe(
                Effect.flatMap((args) => Ref.update(ref, ReadonlyArray.appendAll(args))),
                Effect.repeatN(n - 1),
                Effect.zipRight(Ref.get(ref))
              )
            )
          )
        )
      )
    }
    case "WithDefault": {
      const defaultHelp = InternalHelpDoc.p(`This option is optional - use the default?`)
      const message = pipe(
        wizardHeader,
        InternalHelpDoc.sequence(getHelpInternal(self.options as Instruction)),
        InternalHelpDoc.sequence(defaultHelp)
      )
      return Console.log().pipe(
        Effect.zipRight(
          InternalSelectPrompt.select({
            message: InternalHelpDoc.toAnsiText(message).trimEnd(),
            choices: [
              { title: `Default ['${JSON.stringify(self.fallback)}']`, value: true },
              { title: "Custom", value: false }
            ]
          })
        ),
        Effect.flatMap((useFallback) =>
          useFallback
            ? Effect.succeed(ReadonlyArray.empty())
            : wizardInternal(self.options as Instruction, config)
        )
      )
    }
  }
}

// =============================================================================
// Parsing Internals
// =============================================================================

const CLUSTERED_REGEX = /^-{1}([^-]{2,}$)/
const FLAG_REGEX = /^(--[^=]+)(?:=(.+))?$/

const processArgs = (
  args: ReadonlyArray<string>
): Effect.Effect<never, ValidationError.ValidationError, ReadonlyArray<string>> => {
  if (ReadonlyArray.isNonEmptyReadonlyArray(args)) {
    const head = ReadonlyArray.headNonEmpty(args)
    const tail = ReadonlyArray.tailNonEmpty(args)
    if (CLUSTERED_REGEX.test(head.trim())) {
      const unclustered = head.substring(1).split("").map((c) => `-${c}`)
      return Effect.fail(
        InternalValidationError.unclusteredFlag(InternalHelpDoc.empty, unclustered, tail)
      )
    }
    if (head.startsWith("--")) {
      const result = FLAG_REGEX.exec(head)
      if (result !== null && result[2] !== undefined) {
        return Effect.succeed(ReadonlyArray.prependAll(tail, [result[1], result[2]]))
      }
    }
    return Effect.succeed(args)
  }
  return Effect.succeed(ReadonlyArray.empty())
}

/**
 * Returns a possible `ValidationError` when parsing the commands, leftover
 * arguments from `input` and a mapping between each flag and its values.
 */
const matchOptions = (
  input: ReadonlyArray<string>,
  options: ReadonlyArray<ParseableInstruction>,
  config: CliConfig.CliConfig
): Effect.Effect<
  never,
  never,
  [
    Option.Option<ValidationError.ValidationError>,
    ReadonlyArray<string>,
    HashMap.HashMap<string, ReadonlyArray<string>>
  ]
> => {
  if (
    ReadonlyArray.isNonEmptyReadonlyArray(input)
    && ReadonlyArray.isNonEmptyReadonlyArray(options)
  ) {
    return findOptions(input, options, config).pipe(
      Effect.flatMap(([otherArgs, otherOptions, map1]) => {
        if (HashMap.isEmpty(map1)) {
          return Effect.succeed([Option.none(), input, map1] as [
            Option.Option<ValidationError.ValidationError>,
            ReadonlyArray<string>,
            HashMap.HashMap<string, ReadonlyArray<string>>
          ])
        }
        return matchOptions(otherArgs, otherOptions, config).pipe(
          Effect.map(([error, otherArgs, map2]) =>
            [error, otherArgs, merge(map1, ReadonlyArray.fromIterable(map2))] as [
              Option.Option<ValidationError.ValidationError>,
              ReadonlyArray<string>,
              HashMap.HashMap<string, ReadonlyArray<string>>
            ]
          )
        )
      }),
      Effect.catchAll((e) =>
        Effect.succeed([Option.some(e), input, HashMap.empty()] as [
          Option.Option<ValidationError.ValidationError>,
          ReadonlyArray<string>,
          HashMap.HashMap<string, ReadonlyArray<string>>
        ])
      )
    )
  }
  return ReadonlyArray.isEmptyReadonlyArray(input)
    ? Effect.succeed([Option.none(), ReadonlyArray.empty(), HashMap.empty()] as [
      Option.Option<ValidationError.ValidationError>,
      ReadonlyArray<string>,
      HashMap.HashMap<string, ReadonlyArray<string>>
    ])
    : Effect.succeed([Option.none(), input, HashMap.empty()] as [
      Option.Option<ValidationError.ValidationError>,
      ReadonlyArray<string>,
      HashMap.HashMap<string, ReadonlyArray<string>>
    ])
}

/**
 * Returns the leftover arguments, leftover options, and a mapping between the
 * first argument with its values if it corresponds to an option flag.
 */
const findOptions = (
  input: ReadonlyArray<string>,
  options: ReadonlyArray<ParseableInstruction>,
  config: CliConfig.CliConfig
): Effect.Effect<
  never,
  ValidationError.ValidationError,
  [
    ReadonlyArray<string>,
    ReadonlyArray<ParseableInstruction>,
    HashMap.HashMap<string, ReadonlyArray<string>>
  ]
> => {
  if (ReadonlyArray.isNonEmptyReadonlyArray(options)) {
    const head = ReadonlyArray.headNonEmpty(options)
    const tail = ReadonlyArray.tailNonEmpty(options)
    return parseOptions(head, input, config).pipe(
      Effect.flatMap(([nameValues, leftover]) => {
        if (ReadonlyArray.isNonEmptyReadonlyArray(nameValues)) {
          const name = ReadonlyArray.headNonEmpty(nameValues)
          const values: ReadonlyArray<unknown> = ReadonlyArray.tailNonEmpty(nameValues)
          return Effect.succeed([leftover, tail, HashMap.make([name, values])] as [
            ReadonlyArray<string>,
            ReadonlyArray<ParseableInstruction>,
            HashMap.HashMap<string, ReadonlyArray<string>>
          ])
        }
        return findOptions(leftover, tail, config).pipe(
          Effect.map(([otherArgs, otherOptions, map]) =>
            [otherArgs, ReadonlyArray.prepend(otherOptions, head), map] as [
              ReadonlyArray<string>,
              ReadonlyArray<ParseableInstruction>,
              HashMap.HashMap<string, ReadonlyArray<string>>
            ]
          )
        )
      }),
      Effect.catchTags({
        CorrectedFlag: (e) =>
          findOptions(input, tail, config).pipe(
            Effect.catchSome(() => Option.some(Effect.fail(e))),
            Effect.flatMap(([otherArgs, otherOptions, map]) =>
              Effect.fail(e).pipe(
                Effect.when(() => HashMap.isEmpty(map)),
                Effect.as([otherArgs, ReadonlyArray.prepend(otherOptions, head), map] as [
                  ReadonlyArray<string>,
                  ReadonlyArray<ParseableInstruction>,
                  HashMap.HashMap<string, ReadonlyArray<string>>
                ])
              )
            )
          ),
        MissingFlag: () =>
          findOptions(input, tail, config).pipe(
            Effect.map(([otherArgs, otherOptions, map]) =>
              [otherArgs, ReadonlyArray.prepend(otherOptions, head), map] as [
                ReadonlyArray<string>,
                ReadonlyArray<ParseableInstruction>,
                HashMap.HashMap<string, ReadonlyArray<string>>
              ]
            )
          ),
        UnclusteredFlag: (e) =>
          matchUnclustered(e.unclustered, e.rest, options, config).pipe(
            Effect.catchAll(() => Effect.fail(e))
          )
      })
    )
  }
  return Effect.succeed([input, ReadonlyArray.empty(), HashMap.empty()])
}

const matchUnclustered = (
  input: ReadonlyArray<string>,
  tail: ReadonlyArray<string>,
  options: ReadonlyArray<ParseableInstruction>,
  config: CliConfig.CliConfig
): Effect.Effect<
  never,
  ValidationError.ValidationError,
  [
    ReadonlyArray<string>,
    ReadonlyArray<ParseableInstruction>,
    HashMap.HashMap<string, ReadonlyArray<string>>
  ]
> => {
  if (ReadonlyArray.isNonEmptyReadonlyArray(input)) {
    const flag = ReadonlyArray.headNonEmpty(input)
    const otherFlags = ReadonlyArray.tailNonEmpty(input)
    return findOptions(ReadonlyArray.of(flag), options, config).pipe(
      Effect.flatMap(([_, opts1, map1]) => {
        if (HashMap.isEmpty(map1)) {
          return Effect.fail(
            InternalValidationError.unclusteredFlag(
              InternalHelpDoc.empty,
              ReadonlyArray.empty(),
              tail
            )
          )
        }
        return matchUnclustered(otherFlags, tail, opts1, config).pipe(
          Effect.map((
            [_, opts2, map2]
          ) => [tail, opts2, merge(map1, ReadonlyArray.fromIterable(map2))])
        )
      })
    )
  }
  return Effect.succeed([tail, options, HashMap.empty()])
}

/**
 * Sums the list associated with the same key.
 */
const merge = (
  map1: HashMap.HashMap<string, ReadonlyArray<string>>,
  map2: ReadonlyArray<[string, ReadonlyArray<string>]>
): HashMap.HashMap<string, ReadonlyArray<string>> => {
  if (ReadonlyArray.isNonEmptyReadonlyArray(map2)) {
    const head = ReadonlyArray.headNonEmpty(map2)
    const tail = ReadonlyArray.tailNonEmpty(map2)
    const newMap = Option.match(HashMap.get(map1, head[0]), {
      onNone: () => HashMap.set(map1, head[0], head[1]),
      onSome: (elems) => HashMap.set(map1, head[0], ReadonlyArray.appendAll(elems, head[1]))
    })
    return merge(newMap, tail)
  }
  return map1
}
