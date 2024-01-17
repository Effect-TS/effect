import type * as FileSystem from "@effect/platform/FileSystem"
import type * as Path from "@effect/platform/Path"
import type * as Terminal from "@effect/platform/Terminal"
import * as Schema from "@effect/schema/Schema"
import * as TreeFormatter from "@effect/schema/TreeFormatter"
import type * as Config from "effect/Config"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { dual, pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import { pipeArguments } from "effect/Pipeable"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Ref from "effect/Ref"
import type * as Secret from "effect/Secret"
import type * as CliConfig from "../CliConfig.js"
import type * as HelpDoc from "../HelpDoc.js"
import type * as Options from "../Options.js"
import type * as Primitive from "../Primitive.js"
import type * as Usage from "../Usage.js"
import type * as ValidationError from "../ValidationError.js"
import * as InternalAutoCorrect from "./autoCorrect.js"
import * as InternalCliConfig from "./cliConfig.js"
import * as InternalFiles from "./files.js"
import * as InternalHelpDoc from "./helpDoc.js"
import * as InternalSpan from "./helpDoc/span.js"
import * as InternalPrimitive from "./primitive.js"
import * as InternalListPrompt from "./prompt/list.js"
import * as InternalNumberPrompt from "./prompt/number.js"
import * as InternalSelectPrompt from "./prompt/select.js"
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
  | WithFallbackConfig
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
    readonly f: (a: unknown) => Effect.Effect<
      FileSystem.FileSystem | Path.Path | Terminal.Terminal,
      ValidationError.ValidationError,
      unknown
    >
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
export interface WithFallbackConfig extends
  Op<"WithFallbackConfig", {
    readonly options: Options.Options<unknown>
    readonly config: Config.Config<unknown>
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
export const isInstruction = <_>(self: Options.Options<_>): self is Instruction => self as any

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

/** @internal */
export const isWithFallbackConfig = (self: Instruction): self is WithFallbackConfig =>
  self._tag === "WithFallbackConfig"

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
  options?: Options.Options.BooleanOptionsConfig
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
    return withDefault(
      orElse(option, negationOption),
      !ifPresent
    )
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
): Options.Options<C[number][1]> => makeSingle(name, ReadonlyArray.empty(), InternalPrimitive.choice(choices))

/** @internal */
export const date = (name: string): Options.Options<Date> =>
  makeSingle(name, ReadonlyArray.empty(), InternalPrimitive.date)

/** @internal */
export const directory = (
  name: string,
  config?: Options.Options.PathOptionsConfig
): Options.Options<string> =>
  makeSingle(
    name,
    ReadonlyArray.empty(),
    InternalPrimitive.path("directory", config?.exists ?? "either")
  )

/** @internal */
export const file = (
  name: string,
  config?: Options.Options.PathOptionsConfig
): Options.Options<string> =>
  makeSingle(
    name,
    ReadonlyArray.empty(),
    InternalPrimitive.path("file", config?.exists ?? "either")
  )

/** @internal */
export const fileContent = (
  name: string
): Options.Options<readonly [path: string, content: Uint8Array]> =>
  mapEffect(file(name, { exists: "yes" }), (path) =>
    Effect.mapError(
      InternalFiles.read(path),
      (msg) => InternalValidationError.invalidValue(InternalHelpDoc.p(msg))
    ))

/** @internal */
export const fileParse = (
  name: string,
  format?: "json" | "yaml" | "ini" | "toml"
): Options.Options<unknown> =>
  mapEffect(fileText(name), ([path, content]) =>
    Effect.mapError(
      InternalFiles.parse(path, content, format),
      (error) => InternalValidationError.invalidValue(InternalHelpDoc.p(error))
    ))

/** @internal */
export const fileSchema = <I, A>(
  name: string,
  schema: Schema.Schema<I, A>,
  format?: "json" | "yaml" | "ini" | "toml"
): Options.Options<A> => withSchema(fileParse(name, format), schema)

/** @internal */
export const fileText = (
  name: string
): Options.Options<readonly [path: string, content: string]> =>
  mapEffect(file(name, { exists: "yes" }), (path) =>
    Effect.mapError(
      InternalFiles.readString(path),
      (error) => InternalValidationError.invalidValue(InternalHelpDoc.p(error))
    ))

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
  mapEffect(self, (a) =>
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
export const secret = (name: string): Options.Options<Secret.Secret> =>
  makeSingle(name, ReadonlyArray.empty(), InternalPrimitive.secret)

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
export const getHelp = <A>(self: Options.Options<A>): HelpDoc.HelpDoc => getHelpInternal(self as Instruction)

/** @internal */
export const getIdentifier = <A>(self: Options.Options<A>): Option.Option<string> =>
  getIdentifierInternal(self as Instruction)

/** @internal */
export const getMinSize = <A>(self: Options.Options<A>): number => getMinSizeInternal(self as Instruction)

/** @internal */
export const getMaxSize = <A>(self: Options.Options<A>): number => getMaxSizeInternal(self as Instruction)

/** @internal */
export const getUsage = <A>(self: Options.Options<A>): Usage.Usage => getUsageInternal(self as Instruction)

/** @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => (self: Options.Options<A>) => Options.Options<B>,
  <A, B>(self: Options.Options<A>, f: (a: A) => B) => Options.Options<B>
>(2, (self, f) => makeMap(self, (a) => Either.right(f(a))))

/** @internal */
export const mapEffect = dual<
  <A, B>(
    f: (
      a: A
    ) => Effect.Effect<FileSystem.FileSystem | Path.Path | Terminal.Terminal, ValidationError.ValidationError, B>
  ) => (self: Options.Options<A>) => Options.Options<B>,
  <A, B>(
    self: Options.Options<A>,
    f: (
      a: A
    ) => Effect.Effect<FileSystem.FileSystem | Path.Path | Terminal.Terminal, ValidationError.ValidationError, B>
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
  mapEffect(self, (a) => {
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
export const processCommandLine = dual<
  (
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => <A>(
    self: Options.Options<A>
  ) => Effect.Effect<
    FileSystem.FileSystem | Path.Path | Terminal.Terminal,
    ValidationError.ValidationError,
    [Option.Option<ValidationError.ValidationError>, ReadonlyArray<string>, A]
  >,
  <A>(
    self: Options.Options<A>,
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => Effect.Effect<
    FileSystem.FileSystem | Path.Path | Terminal.Terminal,
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
export const repeated = <A>(self: Options.Options<A>): Options.Options<ReadonlyArray<A>> =>
  makeVariadic(self, Option.none(), Option.none())

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
  <const B>(fallback: B) => <A>(self: Options.Options<A>) => Options.Options<A | B>,
  <A, const B>(self: Options.Options<A>, fallback: B) => Options.Options<A | B>
>(2, (self, fallback) => makeWithDefault(self, fallback))

/** @internal */
export const withFallbackConfig: {
  <B>(config: Config.Config<B>): <A>(self: Options.Options<A>) => Options.Options<B | A>
  <A, B>(self: Options.Options<A>, config: Config.Config<B>): Options.Options<A | B>
} = dual<
  <B>(config: Config.Config<B>) => <A>(self: Options.Options<A>) => Options.Options<A | B>,
  <A, B>(self: Options.Options<A>, config: Config.Config<B>) => Options.Options<A | B>
>(2, (self, config) => {
  if (isInstruction(self) && isWithDefault(self)) {
    return makeWithDefault(
      withFallbackConfig(self.options, config),
      self.fallback as any
    )
  }
  return makeWithFallbackConfig(self, config)
})

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
export const withSchema = dual<
  <A, I extends A, B>(schema: Schema.Schema<I, B>) => (self: Options.Options<A>) => Options.Options<B>,
  <A, I extends A, B>(self: Options.Options<A>, schema: Schema.Schema<I, B>) => Options.Options<B>
>(2, (self, schema) => {
  const decode = Schema.decode(schema)
  return mapEffect(self, (_) =>
    Effect.mapError(
      decode(_ as any),
      (error) => InternalValidationError.invalidValue(InternalHelpDoc.p(TreeFormatter.formatIssue(error.error)))
    ))
})

/** @internal */
export const wizard = dual<
  (config: CliConfig.CliConfig) => <A>(self: Options.Options<A>) => Effect.Effect<
    FileSystem.FileSystem | Path.Path | Terminal.Terminal,
    Terminal.QuitException | ValidationError.ValidationError,
    ReadonlyArray<string>
  >,
  <A>(self: Options.Options<A>, config: CliConfig.CliConfig) => Effect.Effect<
    FileSystem.FileSystem | Path.Path | Terminal.Terminal,
    Terminal.QuitException | ValidationError.ValidationError,
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
          const single = `${identifier} key1=value key2=value2`
          const multiple = `${identifier} key1=value ${identifier} key2=value2`
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
              onSome: () => InternalHelpDoc.p(`This setting is optional. Defaults to: ${self.fallback}`)
            })
            : InternalHelpDoc.p("This setting is optional.")
          return [span, InternalHelpDoc.sequence(block, optionalDescription)]
        }
      )
    }
    case "WithFallbackConfig": {
      return InternalHelpDoc.mapDescriptionList(
        getHelpInternal(self.options as Instruction),
        (span, block) => [
          span,
          InternalHelpDoc.sequence(
            block,
            InternalHelpDoc.p(
              "This option can be set from environment variables."
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
      return Option.some(self.fullName)
    }
    case "Both":
    case "OrElse": {
      const ids = ReadonlyArray.getSomes([
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
    case "WithFallbackConfig":
    case "WithDefault": {
      return getIdentifierInternal(self.options as Instruction)
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
    case "Map":
    case "WithDefault":
    case "WithFallbackConfig": {
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
      return InternalUsage.named(getNames(self), acceptedValues)
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
    case "WithDefault":
    case "WithFallbackConfig": {
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

const makeFullName = (str: string): [boolean, string] => str.length === 1 ? [true, `-${str}`] : [false, `--${str}`]

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
  f: (a: A) => Effect.Effect<FileSystem.FileSystem | Path.Path | Terminal.Terminal, ValidationError.ValidationError, B>
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
  op.placeholder = `${Option.getOrElse(pseudoName, () => InternalPrimitive.getTypeName(primitiveType))}`
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

const makeWithDefault = <A, const B>(
  options: Options.Options<A>,
  fallback: B
): Options.Options<A | B> => {
  const op = Object.create(proto)
  op._tag = "WithDefault"
  op.options = options
  op.fallback = fallback
  return op
}

const makeWithFallbackConfig = <A, B>(
  options: Options.Options<A>,
  config: Config.Config<B>
): Options.Options<A | B> => {
  const op = Object.create(proto)
  op._tag = "WithFallbackConfig"
  op.options = options
  op.config = config
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
    case "WithFallbackConfig": {
      return makeWithFallbackConfig(modifySingle(self.options as Instruction, f), self.config)
    }
  }
}

/** @internal */
export const getNames = (self: Instruction): ReadonlyArray<string> => {
  const loop = (self: Instruction): ReadonlyArray<string> => {
    switch (self._tag) {
      case "Empty": {
        return ReadonlyArray.empty()
      }
      case "Single": {
        return ReadonlyArray.prepend(self.aliases, self.name)
      }
      case "KeyValueMap":
      case "Variadic": {
        return loop(self.argumentOption as Instruction)
      }
      case "Map":
      case "WithDefault":
      case "WithFallbackConfig": {
        return loop(self.options as Instruction)
      }
      case "Both":
      case "OrElse": {
        const left = loop(self.left as Instruction)
        const right = loop(self.right as Instruction)
        return ReadonlyArray.appendAll(left, right)
      }
    }
  }
  const order = Order.mapInput(
    Order.boolean,
    (tuple: [boolean, string]) => !tuple[0]
  )
  return pipe(
    loop(self),
    ReadonlyArray.map((str) => makeFullName(str)),
    ReadonlyArray.sort(order),
    ReadonlyArray.map((tuple) => tuple[1])
  )
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
    case "WithDefault":
    case "WithFallbackConfig": {
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

const parseInternal = (
  self: Instruction,
  args: HashMap.HashMap<string, ReadonlyArray<string>>,
  config: CliConfig.CliConfig
): Effect.Effect<
  FileSystem.FileSystem | Path.Path | Terminal.Terminal,
  ValidationError.ValidationError,
  unknown
> => {
  switch (self._tag) {
    case "Empty": {
      return Effect.unit
    }
    case "Single": {
      const singleNames = ReadonlyArray.filterMap(getNames(self), (name) => HashMap.get(args, name))
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
    case "WithFallbackConfig": {
      return parseInternal(self.options as Instruction, args, config).pipe(
        Effect.catchTag(
          "MissingValue",
          (e) => Effect.mapError(self.config, () => e)
        )
      )
    }
  }
}

const wizardInternal = (self: Instruction, config: CliConfig.CliConfig): Effect.Effect<
  FileSystem.FileSystem | Path.Path | Terminal.Terminal,
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
        Effect.flatMap((input) => {
          // There will always be at least one name in names
          const args = ReadonlyArray.make(getNames(self)[0]!, input as string)
          return parseCommandLine(self, args, config).pipe(Effect.as(args))
        }),
        Effect.zipLeft(Console.log())
      )
    }
    case "KeyValueMap": {
      const message = InternalHelpDoc.p("Enter `key=value` pairs separated by spaces")
      return InternalListPrompt.list({
        message: InternalHelpDoc.toAnsiText(message).trim(),
        delimiter: " "
      }).pipe(
        Effect.flatMap((args) => {
          const identifier = Option.getOrElse(getIdentifierInternal(self), () => "")
          return parseInternal(self, HashMap.make([identifier, args]), config).pipe(
            Effect.as(ReadonlyArray.prepend(args, identifier))
          )
        }),
        Effect.zipLeft(Console.log())
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
        getHelpInternal(self),
        InternalHelpDoc.sequence(alternativeHelp)
      )
      const makeChoice = (title: string, value: Instruction) => ({ title, value })
      const choices = ReadonlyArray.getSomes([
        Option.map(
          getIdentifierInternal(self.left as Instruction),
          (title) => makeChoice(title, self.left as Instruction)
        ),
        Option.map(
          getIdentifierInternal(self.right as Instruction),
          (title) => makeChoice(title, self.right as Instruction)
        )
      ])
      return InternalSelectPrompt.select({
        message: InternalHelpDoc.toAnsiText(message).trimEnd(),
        choices
      }).pipe(Effect.flatMap((option) => wizardInternal(option, config)))
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
      if (isBoolInternal(self.options as Instruction)) {
        return wizardInternal(self.options as Instruction, config)
      }
      const defaultHelp = InternalHelpDoc.p(`This option is optional - use the default?`)
      const message = pipe(
        getHelpInternal(self.options as Instruction),
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
            : wizardInternal(self.options as Instruction, config)
        )
      )
    }
    case "WithFallbackConfig": {
      if (isBoolInternal(self.options as Instruction)) {
        return wizardInternal(self.options as Instruction, config)
      }
      const defaultHelp = InternalHelpDoc.p(`Try load this option from the environment?`)
      const message = pipe(
        getHelpInternal(self.options as Instruction),
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
            : wizardInternal(self.options as Instruction, config)
        )
      )
    }
  }
}

// =============================================================================
// Parsing Internals
// =============================================================================

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
> =>
  ReadonlyArray.matchLeft(options, {
    onEmpty: () => Effect.succeed([input, ReadonlyArray.empty(), HashMap.empty()]),
    onNonEmpty: (head, tail) =>
      parseCommandLine(head, input, config).pipe(
        Effect.flatMap(({ leftover, parsed }) =>
          Option.match(parsed, {
            onNone: () =>
              findOptions(leftover, tail, config).pipe(Effect.map(([nextArgs, nextOptions, map]) =>
                [nextArgs, ReadonlyArray.prepend(nextOptions, head), map] as [
                  ReadonlyArray<string>,
                  ReadonlyArray<ParseableInstruction>,
                  HashMap.HashMap<string, ReadonlyArray<string>>
                ]
              )),
            onSome: ({ name, values }) =>
              Effect.succeed([leftover, tail, HashMap.make([name, values])] as [
                ReadonlyArray<string>,
                ReadonlyArray<ParseableInstruction>,
                HashMap.HashMap<string, ReadonlyArray<string>>
              ])
          })
        ),
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
  })

interface ParsedCommandLine {
  readonly parsed: Option.Option<{
    readonly name: string
    readonly values: ReadonlyArray<string>
  }>
  readonly leftover: ReadonlyArray<string>
}

const CLUSTERED_REGEX = /^-{1}([^-]{2,}$)/
const FLAG_REGEX = /^(--[^=]+)(?:=(.+))?$/

/**
 * Normalizes the leading command-line argument by performing the following:
 *   1. If a clustered series of short command-line options is encountered,
 *      uncluster the options and return a `ValidationError.UnclusteredFlag`
 *      to be handled later on in the parsing algorithm
 *   2. If a long command-line option with a value is encountered, ensure that
 *      the option and it's value are separated (i.e. `--option=value` becomes
 *      ["--option", "value"])
 */
const processArgs = (
  args: ReadonlyArray<string>
): Effect.Effect<never, ValidationError.ValidationError, ReadonlyArray<string>> =>
  ReadonlyArray.matchLeft(args, {
    onEmpty: () => Effect.succeed(ReadonlyArray.empty()),
    onNonEmpty: (head, tail) => {
      const value = head.trim()
      // Attempt to match clustered short command-line arguments (i.e. `-abc`)
      if (CLUSTERED_REGEX.test(value)) {
        const unclustered = value.substring(1).split("").map((c) => `-${c}`)
        return Effect.fail(InternalValidationError.unclusteredFlag(
          InternalHelpDoc.empty,
          unclustered,
          tail
        ))
      }
      // Attempt to match a long command-line argument and ensure the option and
      // it's value have been separated and added back to the arguments
      if (FLAG_REGEX.test(value)) {
        const result = FLAG_REGEX.exec(value)
        if (result !== null && result[2] !== undefined) {
          return Effect.succeed<ReadonlyArray<string>>(
            ReadonlyArray.appendAll([result[1], result[2]], tail)
          )
        }
      }
      // Otherwise return the original command-line arguments
      return Effect.succeed(args)
    }
  })

/**
 * Processes the command-line arguments for a parseable option, returning the
 * parsed command line results, which inclue:
 *   - The name of the option and its associated value(s), if any
 *   - Any leftover command-line arguments
 */
const parseCommandLine = (
  self: ParseableInstruction,
  args: ReadonlyArray<string>,
  config: CliConfig.CliConfig
): Effect.Effect<
  never,
  ValidationError.ValidationError,
  ParsedCommandLine
> => {
  switch (self._tag) {
    case "Single": {
      return processArgs(args).pipe(Effect.flatMap((args) =>
        ReadonlyArray.matchLeft(args, {
          onEmpty: () => {
            const error = InternalHelpDoc.p(`Expected to find option: '${self.fullName}'`)
            return Effect.fail(InternalValidationError.missingFlag(error))
          },
          onNonEmpty: (head, tail) => {
            const normalize = (value: string) => InternalCliConfig.normalizeCase(config, value)
            const normalizedHead = normalize(head)
            const normalizedNames = ReadonlyArray.map(getNames(self), normalize)
            if (ReadonlyArray.contains(normalizedNames, normalizedHead)) {
              if (InternalPrimitive.isBool(self.primitiveType)) {
                return ReadonlyArray.matchLeft(tail, {
                  onEmpty: () => {
                    const parsed = Option.some({ name: head, values: ReadonlyArray.empty() })
                    return Effect.succeed({ parsed, leftover: tail })
                  },
                  onNonEmpty: (value, leftover) => {
                    if (InternalPrimitive.isTrueValue(value)) {
                      const parsed = Option.some({ name: head, values: ReadonlyArray.of("true") })
                      return Effect.succeed<ParsedCommandLine>({ parsed, leftover })
                    }
                    if (InternalPrimitive.isFalseValue(value)) {
                      const parsed = Option.some({ name: head, values: ReadonlyArray.of("false") })
                      return Effect.succeed<ParsedCommandLine>({ parsed, leftover })
                    }
                    const parsed = Option.some({ name: head, values: ReadonlyArray.empty() })
                    return Effect.succeed<ParsedCommandLine>({ parsed, leftover: tail })
                  }
                })
              }
              return ReadonlyArray.matchLeft(tail, {
                onEmpty: () => {
                  const error = InternalHelpDoc.p(
                    `Expected a value following option: '${self.fullName}'`
                  )
                  return Effect.fail(InternalValidationError.missingValue(error))
                },
                onNonEmpty: (value, leftover) => {
                  const parsed = Option.some({ name: head, values: ReadonlyArray.of(value) })
                  return Effect.succeed<ParsedCommandLine>({ parsed, leftover })
                }
              })
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
        })
      ))
    }
    case "KeyValueMap": {
      const singleNames = ReadonlyArray.map(
        getNames(self.argumentOption),
        (name) => InternalCliConfig.normalizeCase(config, name)
      )
      return ReadonlyArray.matchLeft(args, {
        onEmpty: () => Effect.succeed<ParsedCommandLine>({ parsed: Option.none(), leftover: args }),
        onNonEmpty: (head, tail) => {
          const loop = (
            args: ReadonlyArray<string>
          ): [ReadonlyArray<string>, ReadonlyArray<string>] => {
            let keyValues = ReadonlyArray.empty<string>()
            let leftover = args as ReadonlyArray<string>
            while (ReadonlyArray.isNonEmptyReadonlyArray(leftover)) {
              const name = leftover[0].trim()
              const normalizedName = InternalCliConfig.normalizeCase(config, name)
              // Can be in the form of "--flag key1=value1 --flag key2=value2"
              if (leftover.length >= 2 && ReadonlyArray.contains(singleNames, normalizedName)) {
                const keyValue = leftover[1].trim()
                const [key, value] = keyValue.split("=")
                if (key !== undefined && value !== undefined && value.length > 0) {
                  keyValues = ReadonlyArray.append(keyValues, keyValue)
                  leftover = leftover.slice(2)
                  continue
                }
              }
              // Can be in the form of "--flag key1=value1 key2=value2")
              if (name.includes("=")) {
                const [key, value] = name.split("=")
                if (key !== undefined && value !== undefined && value.length > 0) {
                  keyValues = ReadonlyArray.append(keyValues, name)
                  leftover = leftover.slice(1)
                  continue
                }
              }
              break
            }
            return [keyValues, leftover]
          }
          const name = InternalCliConfig.normalizeCase(config, head)
          if (ReadonlyArray.contains(singleNames, name)) {
            const [values, leftover] = loop(tail)
            return Effect.succeed({ parsed: Option.some({ name, values }), leftover })
          }
          return Effect.succeed<ParsedCommandLine>({ parsed: Option.none(), leftover: args })
        }
      })
    }
    case "Variadic": {
      const singleNames = ReadonlyArray.map(
        getNames(self.argumentOption),
        (name) => InternalCliConfig.normalizeCase(config, name)
      )
      let optionName: string | undefined = undefined
      let values = ReadonlyArray.empty<string>()
      let leftover = args as ReadonlyArray<string>
      while (ReadonlyArray.isNonEmptyReadonlyArray(leftover)) {
        const name = InternalCliConfig.normalizeCase(config, ReadonlyArray.headNonEmpty(leftover))
        if (leftover.length >= 2 && ReadonlyArray.contains(singleNames, name)) {
          if (optionName === undefined) {
            optionName = name
          }
          const value = leftover[1]
          if (value !== undefined && value.length > 0) {
            values = ReadonlyArray.append(values, value.trim())
            leftover = leftover.slice(2)
            continue
          }
          break
        }
      }
      const parsed = Option.fromNullable(optionName).pipe(
        Option.map((name) => ({ name, values }))
      )
      return Effect.succeed<ParsedCommandLine>({ parsed, leftover })
    }
  }
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

// =============================================================================
// Completion Internals
// =============================================================================

const escape = (string: string): string =>
  string
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "'\\''")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]")
    .replaceAll(":", "\\:")
    .replaceAll("$", "\\$")
    .replaceAll("`", "\\`")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")

const getShortDescription = (self: Instruction): string => {
  switch (self._tag) {
    case "Empty":
    case "Both":
    case "OrElse": {
      return ""
    }
    case "Single": {
      return InternalSpan.getText(InternalHelpDoc.getSpan(self.description))
    }
    case "KeyValueMap":
    case "Variadic": {
      return getShortDescription(self.argumentOption as Instruction)
    }
    case "Map":
    case "WithDefault":
    case "WithFallbackConfig": {
      return getShortDescription(self.options as Instruction)
    }
  }
}

/** @internal */
export const getBashCompletions = (self: Instruction): ReadonlyArray<string> => {
  switch (self._tag) {
    case "Empty": {
      return ReadonlyArray.empty()
    }
    case "Single": {
      const names = getNames(self)
      const cases = ReadonlyArray.join(names, "|")
      const compgen = InternalPrimitive.getBashCompletions(
        self.primitiveType as InternalPrimitive.Instruction
      )
      return ReadonlyArray.make(
        `${cases})`,
        `    COMPREPLY=( ${compgen} )`,
        `    return 0`,
        `    ;;`
      )
    }
    case "KeyValueMap":
    case "Variadic": {
      return getBashCompletions(self.argumentOption as Instruction)
    }
    case "Map":
    case "WithDefault":
    case "WithFallbackConfig": {
      return getBashCompletions(self.options as Instruction)
    }
    case "Both":
    case "OrElse": {
      const left = getBashCompletions(self.left as Instruction)
      const right = getBashCompletions(self.right as Instruction)
      return ReadonlyArray.appendAll(left, right)
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
      const order = Order.mapInput(Order.boolean, (tuple: readonly [boolean, string]) => !tuple[0])
      return pipe(
        ReadonlyArray.prepend(self.aliases, self.name),
        ReadonlyArray.map((name) => [name.length === 1, name] as const),
        ReadonlyArray.sort(order),
        ReadonlyArray.flatMap(([isShort, name]) => ReadonlyArray.make(isShort ? "-s" : "-l", name)),
        ReadonlyArray.appendAll(InternalPrimitive.getFishCompletions(
          self.primitiveType as InternalPrimitive.Instruction
        )),
        ReadonlyArray.appendAll(
          description.length === 0
            ? ReadonlyArray.empty()
            : ReadonlyArray.of(`-d '${description}'`)
        ),
        ReadonlyArray.join(" "),
        ReadonlyArray.of
      )
    }
    case "KeyValueMap":
    case "Variadic": {
      return getFishCompletions(self.argumentOption as Instruction)
    }
    case "Map":
    case "WithDefault":
    case "WithFallbackConfig": {
      return getFishCompletions(self.options as Instruction)
    }
    case "Both":
    case "OrElse": {
      return pipe(
        getFishCompletions(self.left as Instruction),
        ReadonlyArray.appendAll(getFishCompletions(self.right as Instruction))
      )
    }
  }
}

interface ZshCompletionState {
  readonly conflicts: ReadonlyArray<string>
  readonly multiple: boolean
}

/** @internal */
export const getZshCompletions = (
  self: Instruction,
  state: ZshCompletionState = { conflicts: ReadonlyArray.empty(), multiple: false }
): ReadonlyArray<string> => {
  switch (self._tag) {
    case "Empty": {
      return ReadonlyArray.empty()
    }
    case "Single": {
      const names = getNames(self)
      const description = getShortDescription(self)
      const possibleValues = InternalPrimitive.getZshCompletions(
        self.primitiveType as InternalPrimitive.Instruction
      )
      const multiple = state.multiple ? "*" : ""
      const conflicts = ReadonlyArray.isNonEmptyReadonlyArray(state.conflicts)
        ? `(${ReadonlyArray.join(state.conflicts, " ")})`
        : ""
      return ReadonlyArray.map(
        names,
        (name) => `${conflicts}${multiple}${name}[${escape(description)}]${possibleValues}`
      )
    }
    case "KeyValueMap": {
      return getZshCompletions(self.argumentOption as Instruction, { ...state, multiple: true })
    }
    case "Map":
    case "WithDefault":
    case "WithFallbackConfig": {
      return getZshCompletions(self.options as Instruction, state)
    }
    case "Both": {
      const left = getZshCompletions(self.left as Instruction, state)
      const right = getZshCompletions(self.right as Instruction, state)
      return ReadonlyArray.appendAll(left, right)
    }
    case "OrElse": {
      const leftNames = getNames(self.left as Instruction)
      const rightNames = getNames(self.right as Instruction)
      const left = getZshCompletions(
        self.left as Instruction,
        { ...state, conflicts: ReadonlyArray.appendAll(state.conflicts, rightNames) }
      )
      const right = getZshCompletions(
        self.right as Instruction,
        { ...state, conflicts: ReadonlyArray.appendAll(state.conflicts, leftNames) }
      )
      return ReadonlyArray.appendAll(left, right)
    }
    case "Variadic": {
      return Option.isSome(self.max) && self.max.value > 1
        ? getZshCompletions(self.argumentOption as Instruction, { ...state, multiple: true })
        : getZshCompletions(self.argumentOption as Instruction, state)
    }
  }
}
