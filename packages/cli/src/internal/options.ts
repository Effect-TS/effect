import type * as FileSystem from "@effect/platform/FileSystem"
import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { dual, pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import { pipeArguments } from "effect/Pipeable"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as CliConfig from "../CliConfig.js"
import type * as HelpDoc from "../HelpDoc.js"
import type * as Options from "../Options.js"
import type * as Parameter from "../Parameter.js"
import type * as Primitive from "../Primitive.js"
import type * as RegularLanguage from "../RegularLanguage.js"
import type * as Usage from "../Usage.js"
import type * as ValidationError from "../ValidationError.js"
import * as InternalAutoCorrect from "./autoCorrect.js"
import * as InternalCliConfig from "./cliConfig.js"
import * as InternalHelpDoc from "./helpDoc.js"
import * as InternalSpan from "./helpDoc/span.js"
import * as InternalPrimitive from "./primitive.js"
import * as InternalRegularLanguage from "./regularLanguage.js"
import * as InternalUsage from "./usage.js"
import * as InternalValidationError from "./validationError.js"

const OptionsSymbolKey = "@effect/cli/Options"

/** @internal */
export const OptionsTypeId: Options.OptionsTypeId = Symbol.for(
  OptionsSymbolKey
) as Options.OptionsTypeId

const proto = {
  _A: (_: never) => _
}

/** @internal */
export class Empty implements Options.Options<void> {
  readonly [OptionsTypeId] = proto
  readonly _tag = "Empty"

  get identifier(): Option.Option<string> {
    return Option.none()
  }

  get flattened(): ReadonlyArray<Parameter.Input> {
    return ReadonlyArray.empty()
  }

  get help(): HelpDoc.HelpDoc {
    return InternalHelpDoc.empty
  }

  get usage(): Usage.Usage {
    return InternalUsage.empty
  }

  get shortDescription(): string {
    return ""
  }

  modifySingle(_f: <_>(single: Single<_>) => Single<_>): Options.Options<void> {
    return new Empty()
  }

  validate(
    _args: HashMap.HashMap<string, ReadonlyArray<string>>,
    _config: CliConfig.CliConfig
  ): Effect.Effect<never, ValidationError.ValidationError, void> {
    return Effect.unit
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export class Single<A> implements Options.Options<A>, Parameter.Input {
  readonly [OptionsTypeId] = proto
  readonly _tag = "Single"

  constructor(
    readonly name: string,
    readonly aliases: ReadonlyArray<string>,
    readonly primitiveType: Primitive.Primitive<A>,
    readonly description: HelpDoc.HelpDoc = InternalHelpDoc.empty,
    readonly pseudoName: Option.Option<string> = Option.none()
  ) {}

  get identifier(): Option.Option<string> {
    return Option.some(this.fullName)
  }

  get flattened(): ReadonlyArray<Parameter.Input> {
    return ReadonlyArray.of(this)
  }

  get help(): HelpDoc.HelpDoc {
    return InternalHelpDoc.descriptionList(ReadonlyArray.of([
      InternalHelpDoc.getSpan(InternalUsage.getHelp(this.usage)),
      InternalHelpDoc.sequence(InternalHelpDoc.p(this.primitiveType.help), this.description)
    ]))
  }

  get usage(): Usage.Usage {
    const acceptedValues = InternalPrimitive.isBool(this.primitiveType)
      ? Option.none()
      : Option.orElse(this.primitiveType.choices, () => Option.some(this.placeholder))
    return InternalUsage.named(this.names, acceptedValues)
  }

  get names(): ReadonlyArray<string> {
    return pipe(
      ReadonlyArray.prepend(this.aliases, this.name),
      ReadonlyArray.map((str) => this.makeFullName(str)),
      ReadonlyArray.sort(
        Order.mapInput(Order.boolean, (tuple: readonly [boolean, string]) => !tuple[0])
      ),
      ReadonlyArray.map((tuple) => tuple[1])
    )
  }

  get shortDescription(): string {
    return `Option ${this.name}. ${InternalSpan.getText(InternalHelpDoc.getSpan(this.description))}`
  }

  modifySingle(f: <_>(single: Single<_>) => Single<_>): Options.Options<A> {
    return f(this)
  }

  isValid(
    input: string,
    config: CliConfig.CliConfig
  ): Effect.Effect<never, ValidationError.ValidationError, ReadonlyArray<string>> {
    // There will always be at least one name in names
    const args = ReadonlyArray.make(this.names[0]!, input)
    return this.parse(args, config).pipe(Effect.as(args))
  }

  parse(
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ): Effect.Effect<
    never,
    ValidationError.ValidationError,
    readonly [ReadonlyArray<string>, ReadonlyArray<string>]
  > {
    return processArgs(args).pipe(
      Effect.flatMap((args) => {
        if (ReadonlyArray.isNonEmptyReadonlyArray(args)) {
          const head = ReadonlyArray.headNonEmpty(args)
          const tail = ReadonlyArray.tailNonEmpty(args)
          const normalizedArgv0 = InternalCliConfig.normalizeCase(config, head)
          const normalizedNames = ReadonlyArray.map(
            this.names,
            (name) => InternalCliConfig.normalizeCase(config, name)
          )
          if (ReadonlyArray.contains(normalizedNames, normalizedArgv0)) {
            if (InternalPrimitive.isBool(this.primitiveType)) {
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
            const error = InternalHelpDoc.p(`Expected a value following option: '${this.fullName}'`)
            return Effect.fail(InternalValidationError.missingValue(error))
          }
          const fullName = this.fullName
          if (
            this.name.length > config.autoCorrectLimit + 1 &&
            InternalAutoCorrect.levensteinDistance(head, fullName, config) <=
              config.autoCorrectLimit
          ) {
            const error = InternalHelpDoc.p(
              `The flag '${head}' is not recognized. Did you mean '${fullName}'?`
            )
            return Effect.fail(InternalValidationError.correctedFlag(error))
          }
          const error = InternalHelpDoc.p(`Expected to find option: '${fullName}'`)
          return Effect.fail(InternalValidationError.missingFlag(error))
        }
        const error = InternalHelpDoc.p(`Expected to find option: '${this.fullName}'`)
        return Effect.fail(InternalValidationError.missingFlag(error))
      })
    )
  }

  validate(
    args: HashMap.HashMap<string, ReadonlyArray<string>>,
    config: CliConfig.CliConfig
  ): Effect.Effect<FileSystem.FileSystem, ValidationError.ValidationError, A> {
    const names = ReadonlyArray.filterMap(this.names, (name) => HashMap.get(args, name))
    if (ReadonlyArray.isNonEmptyReadonlyArray(names)) {
      const head = ReadonlyArray.headNonEmpty(names)
      const tail = ReadonlyArray.tailNonEmpty(names)
      if (ReadonlyArray.isEmptyReadonlyArray(tail)) {
        if (ReadonlyArray.isEmptyReadonlyArray(head)) {
          return this.primitiveType.validate(Option.none(), config).pipe(
            Effect.mapError((e) => InternalValidationError.invalidValue(InternalHelpDoc.p(e)))
          )
        }
        if (
          ReadonlyArray.isNonEmptyReadonlyArray(head) &&
          ReadonlyArray.isEmptyReadonlyArray(ReadonlyArray.tailNonEmpty(head))
        ) {
          const value = ReadonlyArray.headNonEmpty(head)
          return this.primitiveType.validate(Option.some(value), config).pipe(
            Effect.mapError((e) => InternalValidationError.invalidValue(InternalHelpDoc.p(e)))
          )
        }
        return Effect.fail(InternalValidationError.keyValuesDetected(InternalHelpDoc.empty, head))
      }
      const error = InternalHelpDoc.p(
        `More than one reference to option '${this.fullName}' detected`
      )
      return Effect.fail(InternalValidationError.invalidValue(error))
    }
    const error = InternalHelpDoc.p(`Expected to find option: '${this.fullName}'`)
    return Effect.fail(InternalValidationError.missingValue(error))
  }

  pipe() {
    return pipeArguments(this, arguments)
  }

  private get placeholder(): string {
    const pseudoName = Option.getOrElse(this.pseudoName, () => this.primitiveType.typeName)
    return `<${pseudoName}>`
  }

  private get fullName(): string {
    return this.makeFullName(this.name)[1]
  }

  private makeFullName(str: string): readonly [boolean, string] {
    return str.length === 1 ? [true, `-${str}`] : [false, `--${str}`]
  }
}

/** @internal */
export class Map<A, B> implements Options.Options<B> {
  readonly [OptionsTypeId] = proto
  readonly _tag = "Map"

  constructor(
    readonly options: Options.Options<A>,
    readonly f: (a: A) => Either.Either<ValidationError.ValidationError, B>
  ) {}

  get identifier(): Option.Option<string> {
    return this.options.identifier
  }

  get flattened(): ReadonlyArray<Parameter.Input> {
    return this.options.flattened
  }

  get help(): HelpDoc.HelpDoc {
    return this.options.help
  }

  get usage(): Usage.Usage {
    return this.options.usage
  }

  get shortDescription(): string {
    return this.options.shortDescription
  }

  modifySingle(f: <_>(single: Single<_>) => Single<_>): Options.Options<B> {
    return new Map(this.options.modifySingle(f), this.f)
  }

  validate(
    args: HashMap.HashMap<string, ReadonlyArray<string>>,
    config: CliConfig.CliConfig
  ): Effect.Effect<FileSystem.FileSystem, ValidationError.ValidationError, B> {
    return this.options.validate(args, config).pipe(Effect.flatMap((a) => this.f(a)))
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export class OrElse<A, B> implements Options.Options<Either.Either<A, B>> {
  readonly [OptionsTypeId] = proto
  readonly _tag = "OrElse"

  constructor(
    readonly left: Options.Options<A>,
    readonly right: Options.Options<B>
  ) {}

  get identifier(): Option.Option<string> {
    const ids = ReadonlyArray.compact([this.left.identifier, this.right.identifier])
    return ReadonlyArray.match(ids, {
      onEmpty: () => Option.none(),
      onNonEmpty: (ids) => Option.some(ReadonlyArray.join(ids, ", "))
    })
  }

  get flattened(): ReadonlyArray<Parameter.Input> {
    return ReadonlyArray.appendAll(this.left.flattened, this.right.flattened)
  }

  get help(): HelpDoc.HelpDoc {
    return InternalHelpDoc.sequence(this.left.help, this.right.help)
  }

  get usage(): Usage.Usage {
    return InternalUsage.alternation(this.left.usage, this.right.usage)
  }

  get shortDescription(): string {
    return ""
  }

  modifySingle(f: <_>(single: Single<_>) => Single<_>): Options.Options<Either.Either<A, B>> {
    return new OrElse(this.left.modifySingle(f), this.right.modifySingle(f))
  }

  validate(
    args: HashMap.HashMap<string, ReadonlyArray<string>>,
    config: CliConfig.CliConfig
  ): Effect.Effect<FileSystem.FileSystem, ValidationError.ValidationError, Either.Either<A, B>> {
    return this.left.validate(args, config).pipe(
      Effect.matchEffect({
        onFailure: (err1) =>
          this.right.validate(args, config).pipe(
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
          this.right.validate(args, config).pipe(Effect.matchEffect({
            onFailure: () => Effect.succeed(Either.left(a)),
            onSuccess: () => {
              // The `identifier` will only be `None` for `Options.Empty`, which
              // means the user would have had to purposefully compose
              // `Options.Empty | otherArgument`
              const leftUid = Option.getOrElse(this.left.identifier, () => "???")
              const rightUid = Option.getOrElse(this.right.identifier, () => "???")
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

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export class Both<A, B> implements Options.Options<readonly [A, B]> {
  readonly [OptionsTypeId] = proto
  readonly _tag = "Both"

  constructor(
    readonly left: Options.Options<A>,
    readonly right: Options.Options<B>
  ) {}

  get identifier(): Option.Option<string> {
    const ids = ReadonlyArray.compact([this.left.identifier, this.right.identifier])
    return ReadonlyArray.match(ids, {
      onEmpty: () => Option.none(),
      onNonEmpty: (ids) => Option.some(ReadonlyArray.join(ids, ", "))
    })
  }

  get flattened(): ReadonlyArray<Parameter.Input> {
    return ReadonlyArray.appendAll(this.left.flattened, this.right.flattened)
  }

  get help(): HelpDoc.HelpDoc {
    return InternalHelpDoc.sequence(this.left.help, this.right.help)
  }

  get usage(): Usage.Usage {
    return InternalUsage.concat(this.left.usage, this.right.usage)
  }

  get shortDescription(): string {
    return ""
  }

  modifySingle(f: <_>(single: Single<_>) => Single<_>): Options.Options<readonly [A, B]> {
    return new Both(this.left.modifySingle(f), this.right.modifySingle(f))
  }

  validate(
    args: HashMap.HashMap<string, ReadonlyArray<string>>,
    config: CliConfig.CliConfig
  ): Effect.Effect<FileSystem.FileSystem, ValidationError.ValidationError, readonly [A, B]> {
    return this.left.validate(args, config).pipe(
      Effect.catchAll((err1) =>
        this.right.validate(args, config).pipe(Effect.matchEffect({
          onFailure: (err2) => {
            const error = InternalHelpDoc.sequence(err1.error, err2.error)
            return Effect.fail(InternalValidationError.missingValue(error))
          },
          onSuccess: () => Effect.fail(err1)
        }))
      ),
      Effect.zip(this.right.validate(args, config))
    )
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export class WithDefault<A> implements Options.Options<A>, Parameter.Input {
  readonly [OptionsTypeId] = proto
  readonly _tag = "WithDefault"

  constructor(
    readonly options: Options.Options<A>,
    readonly fallback: A
  ) {}

  get identifier(): Option.Option<string> {
    return this.options.identifier
  }

  get flattened(): ReadonlyArray<Parameter.Input> {
    return this.options.flattened
  }

  get help(): HelpDoc.HelpDoc {
    return InternalHelpDoc.mapDescriptionList(this.options.help, (span, block) => {
      const optionalDescription = Option.isOption(this.fallback)
        ? Option.match(this.fallback, {
          onNone: () => InternalHelpDoc.p("This setting is optional."),
          onSome: () => InternalHelpDoc.p(`This setting is optional. Defaults to: ${this.fallback}`)
        })
        : InternalHelpDoc.p("This setting is optional.")
      return [span, InternalHelpDoc.sequence(block, optionalDescription)] as const
    })
  }

  get usage(): Usage.Usage {
    return InternalUsage.optional(this.options.usage)
  }

  get shortDescription(): string {
    return this.options.shortDescription
  }

  modifySingle(f: <_>(single: Single<_>) => Single<_>): Options.Options<A> {
    return new WithDefault(this.options.modifySingle(f), this.fallback)
  }

  isValid(
    input: string,
    _config: CliConfig.CliConfig
  ): Effect.Effect<never, ValidationError.ValidationError, ReadonlyArray<string>> {
    return Effect.sync(() => {
      if (isBool(this.options)) {
        if (Schema.is(InternalPrimitive.trueValues)(input)) {
          const identifier = Option.getOrElse(this.options.identifier, () => "")
          return ReadonlyArray.of(identifier)
        }
        return ReadonlyArray.empty()
      }
      if (input.length === 0) {
        return ReadonlyArray.empty()
      }
      const identifier = Option.getOrElse(this.options.identifier, () => "")
      return ReadonlyArray.make(identifier, input)
    })
  }

  parse(
    _args: ReadonlyArray<string>,
    _config: CliConfig.CliConfig
  ): Effect.Effect<
    never,
    ValidationError.ValidationError,
    readonly [ReadonlyArray<string>, ReadonlyArray<string>]
  > {
    const error = InternalHelpDoc.p("Encountered an error in command design while parsing")
    return Effect.fail(InternalValidationError.commandMismatch(error))
  }

  validate(
    args: HashMap.HashMap<string, ReadonlyArray<string>>,
    config: CliConfig.CliConfig
  ): Effect.Effect<FileSystem.FileSystem, ValidationError.ValidationError, A> {
    return this.options.validate(args, config).pipe(
      Effect.catchTag("MissingValue", () => Effect.succeed(this.fallback))
    )
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export class KeyValueMap
  implements Options.Options<HashMap.HashMap<string, string>>, Parameter.Input
{
  readonly [OptionsTypeId] = proto
  readonly _tag = "KeyValueMap"

  constructor(readonly argumentOption: Single<string>) {}

  get identifier(): Option.Option<string> {
    return this.argumentOption.identifier
  }

  get flattened(): ReadonlyArray<Parameter.Input> {
    return ReadonlyArray.of(this)
  }

  get help(): HelpDoc.HelpDoc {
    return this.argumentOption.help
  }

  get usage(): Usage.Usage {
    return this.argumentOption.usage
  }

  get shortDescription(): string {
    return this.argumentOption.shortDescription
  }

  modifySingle(
    f: <_>(single: Single<_>) => Single<_>
  ): Options.Options<HashMap.HashMap<string, string>> {
    return new KeyValueMap(f(this.argumentOption))
  }

  isValid(
    input: string,
    config: CliConfig.CliConfig
  ): Effect.Effect<FileSystem.FileSystem, ValidationError.ValidationError, ReadonlyArray<string>> {
    const identifier = Option.getOrElse(this.identifier, () => "")
    const args = input.split(" ")
    return this.validate(HashMap.make([identifier, args]), config).pipe(
      Effect.as(ReadonlyArray.prepend(args, identifier))
    )
  }

  parse(
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ): Effect.Effect<
    never,
    ValidationError.ValidationError,
    readonly [ReadonlyArray<string>, ReadonlyArray<string>]
  > {
    const names = ReadonlyArray.map(
      this.argumentOption.names,
      (name) => InternalCliConfig.normalizeCase(config, name)
    )
    if (ReadonlyArray.isNonEmptyReadonlyArray(args)) {
      const head = ReadonlyArray.headNonEmpty(args)
      const tail = ReadonlyArray.tailNonEmpty(args)
      if (ReadonlyArray.contains(names, head)) {
        let keyValues: ReadonlyArray<string> = ReadonlyArray.empty()
        let leftover: ReadonlyArray<string> = tail
        while (ReadonlyArray.isNonEmptyReadonlyArray(leftover)) {
          // Will either be the flag or a key/value pair
          const flagOrKeyValue = ReadonlyArray.headNonEmpty(leftover).trim()
          // The input can be in the form of "-d key1=value1 -d key2=value2"
          if (
            leftover.length >= 2 && ReadonlyArray.contains(
              names,
              InternalCliConfig.normalizeCase(config, flagOrKeyValue)
            )
          ) {
            const keyValueString = leftover[1]!.trim()
            const split = keyValueString.split("=")
            if (split.length < 2 || split[1] === "" || split[1] === "=") {
              break
            } else {
              keyValues = ReadonlyArray.prepend(keyValues, keyValueString)
              leftover = leftover.slice(2)
            }
            // Or, it can be in the form of "-d key1=value1 key2=value2"
          } else {
            const split = flagOrKeyValue.split("=")
            if (split.length < 2 || split[1] === "" || split[1] === "=") {
              break
            } else {
              keyValues = ReadonlyArray.prepend(keyValues, flagOrKeyValue)
              leftover = leftover.slice(1)
              continue
            }
          }
        }
        return ReadonlyArray.isEmptyReadonlyArray(keyValues)
          ? Effect.succeed([ReadonlyArray.empty(), args])
          : Effect.succeed([ReadonlyArray.prepend(keyValues, head), leftover])
      }
    }
    return Effect.succeed([ReadonlyArray.empty(), args])
  }

  validate(
    args: HashMap.HashMap<string, ReadonlyArray<string>>,
    config: CliConfig.CliConfig
  ): Effect.Effect<
    FileSystem.FileSystem,
    ValidationError.ValidationError,
    HashMap.HashMap<string, string>
  > {
    const extractKeyValue = (
      keyValue: string
    ): Effect.Effect<never, ValidationError.ValidationError, readonly [string, string]> => {
      const split = keyValue.trim().split("=")
      if (ReadonlyArray.isNonEmptyReadonlyArray(split) && split.length === 2 && split[1] !== "") {
        return Effect.succeed(split as unknown as readonly [string, string])
      }
      const error = InternalHelpDoc.p(`Expected a key/value pair but received '${keyValue}'`)
      return Effect.fail(InternalValidationError.invalidArgument(error))
    }
    return this.argumentOption.validate(args, config).pipe(Effect.matchEffect({
      onFailure: (e) =>
        InternalValidationError.isKeyValuesDetected(e)
          ? Effect.forEach(e.keyValues, (kv) => extractKeyValue(kv)).pipe(
            Effect.map(HashMap.fromIterable)
          )
          : Effect.fail(e),
      onSuccess: (kv) => extractKeyValue(kv as string).pipe(Effect.map(HashMap.make))
    }))
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

// =============================================================================
// Refinements
// =============================================================================

/** @internal */
export const isOptions = (u: unknown): u is Options.Options<unknown> =>
  typeof u === "object" && u != null && OptionsTypeId in u

/** @internal */
export const isEmpty = (u: unknown): u is Empty => isOptions(u) && "_tag" in u && u._tag === "Empty"

/** @internal */
export const isSingle = (u: unknown): u is Single<unknown> =>
  isOptions(u) && "_tag" in u && u._tag === "Single"

/** @internal */
export const isMap = (u: unknown): u is Map<unknown, unknown> =>
  isOptions(u) && "_tag" in u && u._tag === "Map"

/** @internal */
export const isOrElse = (u: unknown): u is OrElse<unknown, unknown> =>
  isOptions(u) && "_tag" in u && u._tag === "OrElse"

/** @internal */
export const isBoth = (u: unknown): u is Both<unknown, unknown> =>
  isOptions(u) && "_tag" in u && u._tag === "Both"

/** @internal */
export const isWithDefault = (u: unknown): u is WithDefault<unknown> =>
  isOptions(u) && "_tag" in u && u._tag === "WithDefault"

/** @internal */
export const isKeyValueMap = (u: unknown): u is KeyValueMap =>
  isOptions(u) && "_tag" in u && u._tag === "KeyValueMap"

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
        result = map(new Both(result, options), ([record, value]) => ({
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
  const option = new Single(
    name,
    aliases,
    InternalPrimitive.boolean(Option.some(ifPresent))
  )
  if (ReadonlyArray.isNonEmptyReadonlyArray(negationNames)) {
    const head = ReadonlyArray.headNonEmpty(negationNames)
    const tail = ReadonlyArray.tailNonEmpty(negationNames)
    const negationOption = new Single(
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
  return new Single(name, ReadonlyArray.empty(), primitive)
}

/** @internal */
export const choiceWithValue = <C extends ReadonlyArray.NonEmptyReadonlyArray<[string, any]>>(
  name: string,
  choices: C
): Options.Options<C[number][1]> =>
  new Single(name, ReadonlyArray.empty(), InternalPrimitive.choice(choices))

/** @internal */
export const date = (name: string): Options.Options<Date> =>
  new Single(name, ReadonlyArray.empty(), InternalPrimitive.date)

/** @internal */
export const directory = (
  name: string,
  config: Options.Options.PathOptionsConfig
): Options.Options<string> =>
  new Single(
    name,
    ReadonlyArray.empty(),
    InternalPrimitive.path("directory", config.exists || "either")
  )

/** @internal */
export const file = (
  name: string,
  config: Options.Options.PathOptionsConfig
): Options.Options<string> =>
  new Single(
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
  new Single(name, ReadonlyArray.empty(), InternalPrimitive.float)

/** @internal */
export const integer = (name: string): Options.Options<number> =>
  new Single(name, ReadonlyArray.empty(), InternalPrimitive.integer)

/** @internal */
export const keyValueMap = (
  option: string | Options.Options<string>
): Options.Options<HashMap.HashMap<string, string>> => {
  if (typeof option === "string") {
    const single = new Single(option, ReadonlyArray.empty(), InternalPrimitive.text)
    return new KeyValueMap(single)
  }
  if (!isSingle(option)) {
    throw new Error("InvalidArgumentException: the provided option must be a single option")
  } else {
    return new KeyValueMap(option as Single<string>)
  }
}

/** @internal */
export const none: Options.Options<void> = new Empty()

/** @internal */
export const text = (name: string): Options.Options<string> =>
  new Single(name, ReadonlyArray.empty(), InternalPrimitive.text)

// =============================================================================
// Combinators
// =============================================================================

/** @internal */
export const isBool = <A>(self: Options.Options<A>): boolean => {
  if (isEmpty(self)) {
    return false
  }
  if (isWithDefault(self)) {
    return isBool(self.options)
  }
  if (isSingle(self)) {
    return InternalPrimitive.isBool(self.primitiveType)
  }
  if (isMap(self)) {
    return isBool(self.options)
  }
  return false
}

/** @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => (self: Options.Options<A>) => Options.Options<B>,
  <A, B>(self: Options.Options<A>, f: (a: A) => B) => Options.Options<B>
>(2, (self, f) => new Map(self, (a) => Either.right(f(a))))

/** @internal */
export const mapOrFail = dual<
  <A, B>(
    f: (a: A) => Either.Either<ValidationError.ValidationError, B>
  ) => (self: Options.Options<A>) => Options.Options<B>,
  <A, B>(
    self: Options.Options<A>,
    f: (a: A) => Either.Either<ValidationError.ValidationError, B>
  ) => Options.Options<B>
>(2, (self, f) => new Map(self, f))

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
>(2, (self, that) => new OrElse(self, that))

/** @internal */
export const toRegularLanguage = <A>(
  self: Options.Options<A>
): RegularLanguage.RegularLanguage => {
  if (isEmpty(self)) {
    return InternalRegularLanguage.epsilon
  }
  if (isSingle(self)) {
    const names = ReadonlyArray.reduce(
      self.names,
      InternalRegularLanguage.empty,
      (lang, name) => InternalRegularLanguage.orElse(lang, InternalRegularLanguage.string(name))
    )
    if (InternalPrimitive.isBoolType(self.primitiveType)) {
      return names
    }
    return InternalRegularLanguage.concat(
      names,
      InternalRegularLanguage.primitive(self.primitiveType)
    )
  }
  if (isMap(self)) {
    return toRegularLanguage(self.options)
  }
  if (isBoth(self)) {
    const leftLanguage = toRegularLanguage(self.left)
    const rightLanguage = toRegularLanguage(self.right)
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
  if (isOrElse(self)) {
    return InternalRegularLanguage.orElse(
      toRegularLanguage(self.left),
      toRegularLanguage(self.right)
    )
  }
  if (isKeyValueMap(self)) {
    const optionGrammar = toRegularLanguage(self.argumentOption)
    return InternalRegularLanguage.permutation([optionGrammar])
  }
  if (isWithDefault(self)) {
    return InternalRegularLanguage.optional(toRegularLanguage(self.options))
  }
  throw new Error(
    "[BUG]: Options.toRegularLanguage - received unrecognized " +
      `options type ${JSON.stringify(self)}`
  )
}

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
    readonly [Option.Option<ValidationError.ValidationError>, ReadonlyArray<string>, A]
  >,
  <A>(
    self: Options.Options<A>,
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => Effect.Effect<
    FileSystem.FileSystem,
    ValidationError.ValidationError,
    readonly [Option.Option<ValidationError.ValidationError>, ReadonlyArray<string>, A]
  >
>(3, (self, args, config) =>
  matchOptions(args, self.flattened, config).pipe(
    Effect.flatMap(([error, commandArgs, matchedOptions]) =>
      self.validate(matchedOptions, config).pipe(
        Effect.catchAll((e) =>
          Option.match(error, {
            onNone: () => Effect.fail(e),
            onSome: (err) => Effect.fail(err)
          })
        ),
        Effect.map((a) => [error, commandArgs, a] as const)
      )
    )
  ))

/** @internal */
export const withAlias = dual<
  (alias: string) => <A>(self: Options.Options<A>) => Options.Options<A>,
  <A>(self: Options.Options<A>, alias: string) => Options.Options<A>
>(2, (self, alias) =>
  self.modifySingle((single) => {
    const aliases = ReadonlyArray.append(single.aliases, alias)
    return new Single(
      single.name,
      aliases,
      single.primitiveType,
      single.description,
      single.pseudoName
    )
  }))

/** @internal */
export const withDefault = dual<
  <A>(fallback: A) => (self: Options.Options<A>) => Options.Options<A>,
  <A>(self: Options.Options<A>, fallback: A) => Options.Options<A>
>(2, (self, fallback) => new WithDefault(self, fallback))

/** @internal */
export const withDescription = dual<
  (description: string) => <A>(self: Options.Options<A>) => Options.Options<A>,
  <A>(self: Options.Options<A>, description: string) => Options.Options<A>
>(2, (self, desc) =>
  self.modifySingle((single) => {
    const description = InternalHelpDoc.sequence(single.description, InternalHelpDoc.p(desc))
    return new Single(
      single.name,
      single.aliases,
      single.primitiveType,
      description,
      single.pseudoName
    )
  }))

/** @internal */
export const withPseudoName = dual<
  (pseudoName: string) => <A>(self: Options.Options<A>) => Options.Options<A>,
  <A>(self: Options.Options<A>, pseudoName: string) => Options.Options<A>
>(2, (self, pseudoName) =>
  self.modifySingle((single) =>
    new Single(
      single.name,
      single.aliases,
      single.primitiveType,
      single.description,
      Option.some(pseudoName)
    )
  ))

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
    result = map(new Both(result, curr), ([a, b]) => [...a, b])
  }
  return result as any
}

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
  options: ReadonlyArray<Parameter.Input>,
  config: CliConfig.CliConfig
): Effect.Effect<
  never,
  never,
  readonly [
    Option.Option<ValidationError.ValidationError>,
    ReadonlyArray<string>,
    HashMap.HashMap<string, ReadonlyArray<string>>
  ]
> => {
  if (
    ReadonlyArray.isNonEmptyReadonlyArray(input) && ReadonlyArray.isNonEmptyReadonlyArray(options)
  ) {
    return findOptions(input, options, config).pipe(
      Effect.flatMap(([otherArgs, otherOptions, map1]) => {
        if (HashMap.isEmpty(map1)) {
          return Effect.succeed([Option.none(), input, map1] as const)
        }
        return matchOptions(otherArgs, otherOptions, config).pipe(
          Effect.map(([error, otherArgs, map2]) =>
            [error, otherArgs, merge(map1, ReadonlyArray.fromIterable(map2))] as const
          )
        )
      }),
      Effect.catchAll((e) => Effect.succeed([Option.some(e), input, HashMap.empty()] as const))
    )
  }
  return ReadonlyArray.isEmptyReadonlyArray(input)
    ? Effect.succeed([Option.none(), ReadonlyArray.empty(), HashMap.empty()])
    : Effect.succeed([Option.none(), input, HashMap.empty()])
}

/**
 * Returns the leftover arguments, leftover options, and a mapping between the
 * first argument with its values if it corresponds to an option flag.
 */
const findOptions = (
  input: ReadonlyArray<string>,
  options: ReadonlyArray<Parameter.Input>,
  config: CliConfig.CliConfig
): Effect.Effect<
  never,
  ValidationError.ValidationError,
  readonly [
    ReadonlyArray<string>,
    ReadonlyArray<Parameter.Input>,
    HashMap.HashMap<string, ReadonlyArray<string>>
  ]
> => {
  if (ReadonlyArray.isNonEmptyReadonlyArray(options)) {
    const head = ReadonlyArray.headNonEmpty(options)
    const tail = ReadonlyArray.tailNonEmpty(options)
    return head.parse(input, config).pipe(
      Effect.flatMap(([nameValues, leftover]) => {
        if (ReadonlyArray.isNonEmptyReadonlyArray(nameValues)) {
          const name = ReadonlyArray.headNonEmpty(nameValues)
          const values: ReadonlyArray<string> = ReadonlyArray.tailNonEmpty(nameValues)
          return Effect.succeed([leftover, tail, HashMap.make([name, values])] as const)
        }
        return findOptions(leftover, tail, config).pipe(
          Effect.map(([otherArgs, otherOptions, map]) =>
            [otherArgs, ReadonlyArray.prepend(otherOptions, head), map] as const
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
                Effect.as([otherArgs, ReadonlyArray.prepend(otherOptions, head), map] as const)
              )
            )
          ),
        MissingFlag: () =>
          findOptions(input, tail, config).pipe(
            Effect.map(([otherArgs, otherOptions, map]) =>
              [otherArgs, ReadonlyArray.prepend(otherOptions, head), map] as const
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
  options: ReadonlyArray<Parameter.Input>,
  config: CliConfig.CliConfig
): Effect.Effect<
  never,
  ValidationError.ValidationError,
  readonly [
    ReadonlyArray<string>,
    ReadonlyArray<Parameter.Input>,
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
  map2: ReadonlyArray<readonly [string, ReadonlyArray<string>]>
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
