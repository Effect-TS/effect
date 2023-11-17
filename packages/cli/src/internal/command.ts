import type * as FileSystem from "@effect/platform/FileSystem"
import type * as Terminal from "@effect/platform/Terminal"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { dual, pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as Option from "effect/Option"
import { pipeArguments } from "effect/Pipeable"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as Args from "../Args.js"
import type * as CliConfig from "../CliConfig.js"
import type * as Command from "../Command.js"
import type * as CommandDirective from "../CommandDirective.js"
import * as HelpDoc from "../HelpDoc.js"
import type * as Span from "../HelpDoc/Span.js"
import type * as Options from "../Options.js"
import type * as Prompt from "../Prompt.js"
import type * as RegularLanguage from "../RegularLanguage.js"
import type * as Usage from "../Usage.js"
import type * as ValidationError from "../ValidationError.js"
import * as InternalArgs from "./args.js"
import * as InternalBuiltInOptions from "./builtInOptions.js"
import * as InternalCliConfig from "./cliConfig.js"
import * as InternalCommandDirective from "./commandDirective.js"
import * as InternalHelpDoc from "./helpDoc.js"
import * as InternalSpan from "./helpDoc/span.js"
import * as InternalOptions from "./options.js"
import * as InternalPrompt from "./prompt.js"
import * as InternalSelectPrompt from "./prompt/select.js"
import * as InternalRegularLanguage from "./regularLanguage.js"
import * as InternalUsage from "./usage.js"
import * as InternalValidationError from "./validationError.js"

const CommandSymbolKey = "@effect/cli/Command"

/** @internal */
export const CommandTypeId: Command.CommandTypeId = Symbol.for(
  CommandSymbolKey
) as Command.CommandTypeId

/** @internal */
export type Op<Tag extends string, Body = {}> = Command.Command<never> & Body & {
  readonly _tag: Tag
}

const proto = {
  [CommandTypeId]: {
    _A: (_: never) => _
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export type Instruction =
  | Standard
  | GetUserInput
  | Map
  | OrElse
  | Subcommands

/** @internal */
export interface Standard extends
  Op<"Standard", {
    readonly name: string
    readonly description: HelpDoc.HelpDoc
    readonly options: Options.Options<unknown>
    readonly args: Args.Args<unknown>
  }>
{}

/** @internal */
export interface GetUserInput extends
  Op<"GetUserInput", {
    readonly name: string
    readonly prompt: Prompt.Prompt<unknown>
  }>
{}

/** @internal */
export interface Map extends
  Op<"Map", {
    readonly command: Command.Command<unknown>
    readonly f: (value: unknown) => Either.Either<ValidationError.ValidationError, unknown>
  }>
{}

/** @internal */
export interface OrElse extends
  Op<"OrElse", {
    readonly left: Command.Command<unknown>
    readonly right: Command.Command<unknown>
  }>
{}

/** @internal */
export interface Subcommands extends
  Op<"Subcommands", {
    readonly parent: Command.Command<unknown>
    readonly child: Command.Command<unknown>
  }>
{}

// =============================================================================
// Refinements
// =============================================================================

/** @internal */
export const isCommand = (u: unknown): u is Command.Command<unknown> =>
  typeof u === "object" && u != null && CommandTypeId in u

/** @internal */
export const isStandard = (self: Instruction): self is Standard => self._tag === "Standard"

/** @internal */
export const isGetUserInput = (self: Instruction): self is GetUserInput =>
  self._tag === "GetUserInput"

/** @internal */
export const isMap = (self: Instruction): self is Map => self._tag === "Map"

/** @internal */
export const isOrElse = (self: Instruction): self is OrElse => self._tag === "OrElse"

/** @internal */
export const isSubcommands = (self: Instruction): self is Subcommands => self._tag === "Subcommands"

// =============================================================================
// Constructors
// =============================================================================

const defaultConstructorConfig = {
  options: InternalOptions.none,
  args: InternalArgs.none
}

/** @internal */
export const standard = <Name extends string, OptionsType = void, ArgsType = void>(
  name: Name,
  config: Command.Command.ConstructorConfig<OptionsType, ArgsType> = defaultConstructorConfig as any
): Command.Command<Command.Command.ParsedStandardCommand<Name, OptionsType, ArgsType>> => {
  const { args, options } = { ...defaultConstructorConfig, ...config }
  const op = Object.create(proto)
  op._tag = "Standard"
  op.name = name
  op.description = InternalHelpDoc.empty
  op.options = options
  op.args = args
  return op
}

/** @internal */
export const prompt = <Name extends string, A>(
  name: Name,
  prompt: Prompt.Prompt<A>
): Command.Command<Command.Command.ParsedUserInputCommand<Name, A>> => {
  const op = Object.create(proto)
  op._tag = "GetUserInput"
  op.name = name
  op.prompt = prompt
  return op
}

// =============================================================================
// Combinators
// =============================================================================

/** @internal */
export const getHelp = <A>(self: Command.Command<A>): HelpDoc.HelpDoc =>
  getHelpInternal(self as Instruction)

/** @internal */
export const getNames = <A>(self: Command.Command<A>): HashSet.HashSet<string> =>
  getNamesInternal(self as Instruction)

/** @internal */
export const getSubcommands = <A>(
  self: Command.Command<A>
): HashMap.HashMap<string, Command.Command<unknown>> => getSubcommandsInternal(self as Instruction)

/** @internal */
export const getUsage = <A>(self: Command.Command<A>): Usage.Usage =>
  getUsageInternal(self as Instruction)

/** @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => (self: Command.Command<A>) => Command.Command<B>,
  <A, B>(self: Command.Command<A>, f: (a: A) => B) => Command.Command<B>
>(2, (self, f) => mapOrFail(self, (a) => Either.right(f(a))))

/** @internal */
export const mapOrFail = dual<
  <A, B>(
    f: (a: A) => Either.Either<ValidationError.ValidationError, B>
  ) => (self: Command.Command<A>) => Command.Command<B>,
  <A, B>(
    self: Command.Command<A>,
    f: (a: A) => Either.Either<ValidationError.ValidationError, B>
  ) => Command.Command<B>
>(2, (self, f) => {
  const op = Object.create(proto)
  op._tag = "Map"
  op.command = self
  op.f = f
  return op
})

/** @internal */
export const orElse = dual<
  <B>(that: Command.Command<B>) => <A>(self: Command.Command<A>) => Command.Command<A | B>,
  <A, B>(self: Command.Command<A>, that: Command.Command<B>) => Command.Command<A | B>
>(2, (self, that) => {
  const op = Object.create(proto)
  op._tag = "OrElse"
  op.left = self
  op.right = that
  return op
})

/** @internal */
export const orElseEither = dual<
  <B>(
    that: Command.Command<B>
  ) => <A>(self: Command.Command<A>) => Command.Command<Either.Either<A, B>>,
  <A, B>(self: Command.Command<A>, that: Command.Command<B>) => Command.Command<Either.Either<A, B>>
>(2, (self, that) => orElse(map(self, Either.left), map(that, Either.right)))

/** @internal */
export const parse = dual<
  (
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => <A>(self: Command.Command<A>) => Effect.Effect<
    FileSystem.FileSystem | Terminal.Terminal,
    ValidationError.ValidationError,
    CommandDirective.CommandDirective<A>
  >,
  <A>(
    self: Command.Command<A>,
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => Effect.Effect<
    FileSystem.FileSystem | Terminal.Terminal,
    ValidationError.ValidationError,
    CommandDirective.CommandDirective<A>
  >
>(3, (self, args, config) => parseInternal(self as Instruction, args, config))

/** @internal */
export const toRegularLanguage = dual<
  (allowAlias: boolean) => <A>(self: Command.Command<A>) => RegularLanguage.RegularLanguage,
  <A>(self: Command.Command<A>, allowAlias: boolean) => RegularLanguage.RegularLanguage
>(2, (self, allowAlias) => toRegularLanguageInternal(self as Instruction, allowAlias))

/** @internal */
export const withDescription = dual<
  (help: string | HelpDoc.HelpDoc) => <A>(self: Command.Command<A>) => Command.Command<A>,
  <A>(self: Command.Command<A>, help: string | HelpDoc.HelpDoc) => Command.Command<A>
>(2, (self, help) => withDescriptionInternal(self as Instruction, help))

/** @internal */
export const withSubcommands = dual<
  <Subcommands extends ReadonlyArray.NonEmptyReadonlyArray<Command.Command<any>>>(
    subcommands: [...Subcommands]
  ) => <A>(
    self: Command.Command<A>
  ) => Command.Command<
    Command.Command.ComputeParsedType<
      A & Readonly<{ subcommand: Option.Option<Command.Command.Subcommands<Subcommands>> }>
    >
  >,
  <A, Subcommands extends ReadonlyArray.NonEmptyReadonlyArray<Command.Command<any>>>(
    self: Command.Command<A>,
    subcommands: [...Subcommands]
  ) => Command.Command<
    Command.Command.ComputeParsedType<
      A & Readonly<{ subcommand: Option.Option<Command.Command.Subcommands<Subcommands>> }>
    >
  >
>(2, (self, subcommands) => {
  const op = Object.create(proto)
  op._tag = "Subcommands"
  op.parent = self
  if (ReadonlyArray.isNonEmptyReadonlyArray(subcommands)) {
    const head = ReadonlyArray.headNonEmpty<Command.Command<unknown>>(subcommands)
    const tail = ReadonlyArray.tailNonEmpty<Command.Command<unknown>>(subcommands)
    if (ReadonlyArray.isNonEmptyReadonlyArray(tail)) {
      const child = ReadonlyArray.reduce(
        ReadonlyArray.tailNonEmpty(tail),
        orElse(head, ReadonlyArray.headNonEmpty(tail)),
        orElse
      )
      op.child = child
      return op
    }
    op.child = head
    return op
  }
  throw new Error("[BUG]: Command.subcommands - received empty list of subcommands")
})

/** @internal */
export const wizard = dual<
  (config: CliConfig.CliConfig) => <A>(self: Command.Command<A>) => Effect.Effect<
    FileSystem.FileSystem | Terminal.Terminal,
    ValidationError.ValidationError,
    ReadonlyArray<string>
  >,
  <A>(self: Command.Command<A>, config: CliConfig.CliConfig) => Effect.Effect<
    FileSystem.FileSystem | Terminal.Terminal,
    ValidationError.ValidationError,
    ReadonlyArray<string>
  >
>(2, (self, config) => wizardInternal(self as Instruction, config))

// =============================================================================
// Internals
// =============================================================================

const getHelpInternal = (self: Instruction): HelpDoc.HelpDoc => {
  switch (self._tag) {
    case "Standard": {
      const header = InternalHelpDoc.isEmpty(self.description)
        ? InternalHelpDoc.empty
        : InternalHelpDoc.sequence(InternalHelpDoc.h1("DESCRIPTION"), self.description)
      const argsHelp = InternalArgs.getHelp(self.args)
      const argsSection = InternalHelpDoc.isEmpty(argsHelp)
        ? InternalHelpDoc.empty
        : InternalHelpDoc.sequence(InternalHelpDoc.h1("ARGUMENTS"), argsHelp)
      const optionsHelp = InternalOptions.getHelp(self.options)
      const optionsSection = InternalHelpDoc.isEmpty(optionsHelp)
        ? InternalHelpDoc.empty
        : InternalHelpDoc.sequence(InternalHelpDoc.h1("OPTIONS"), optionsHelp)
      return InternalHelpDoc.sequence(header, InternalHelpDoc.sequence(argsSection, optionsSection))
    }
    case "GetUserInput": {
      const header = InternalHelpDoc.h1("DESCRIPTION")
      const content = InternalHelpDoc.p("This command will prompt the user for information")
      return InternalHelpDoc.sequence(header, content)
    }
    case "Map": {
      return getHelpInternal(self.command as Instruction)
    }
    case "OrElse": {
      return InternalHelpDoc.sequence(
        getHelpInternal(self.left as Instruction),
        getHelpInternal(self.right as Instruction)
      )
    }
    case "Subcommands": {
      const getUsage = (
        command: Instruction,
        preceding: ReadonlyArray<Span.Span>
      ): ReadonlyArray<[Span.Span, Span.Span]> => {
        if (isStandard(command) || isGetUserInput(command)) {
          const usage = InternalHelpDoc.getSpan(InternalUsage.getHelp(getUsageInternal(command)))
          const usages = ReadonlyArray.append(preceding, usage)
          const finalUsage = ReadonlyArray.reduceRight(
            usages,
            InternalSpan.empty,
            (acc, next) =>
              InternalSpan.isText(acc) && acc.value === ""
                ? next
                : InternalSpan.isText(next) && next.value === ""
                ? acc
                : InternalSpan.concat(acc, InternalSpan.concat(InternalSpan.space, next))
          )
          const description = isStandard(command)
            ? InternalHelpDoc.getSpan(command.description)
            : InternalSpan.empty
          return ReadonlyArray.of([finalUsage, description])
        }
        if (isMap(command)) {
          return getUsage(command.command as Instruction, preceding)
        }
        if (isOrElse(command)) {
          return ReadonlyArray.appendAll(
            getUsage(command.left as Instruction, preceding),
            getUsage(command.right as Instruction, preceding)
          )
        }
        if (isSubcommands(command)) {
          const parentUsage = getUsage(command.parent as Instruction, preceding)
          if (ReadonlyArray.isNonEmptyReadonlyArray(parentUsage)) {
            const [usage] = ReadonlyArray.headNonEmpty(parentUsage)
            const childUsage = getUsage(
              command.child as Instruction,
              ReadonlyArray.append(preceding, usage)
            )
            return ReadonlyArray.appendAll(parentUsage, childUsage)
          }
          return getUsage(command.child as Instruction, preceding)
        }
        throw new Error(
          `[BUG]: Subcommands.usage - unhandled command type: ${JSON.stringify(command)}`
        )
      }
      const printSubcommands = (
        subcommands: ReadonlyArray<[Span.Span, Span.Span]>
      ): HelpDoc.HelpDoc => {
        const maxUsageLength = ReadonlyArray.reduceRight(
          subcommands,
          0,
          (max, [usage]) => Math.max(InternalSpan.size(usage), max)
        )
        const documents = ReadonlyArray.map(subcommands, ([usage, desc]) =>
          InternalHelpDoc.p(
            InternalSpan.spans([
              usage,
              InternalSpan.text(" ".repeat(maxUsageLength - InternalSpan.size(usage) + 2)),
              desc
            ])
          ))
        if (ReadonlyArray.isNonEmptyReadonlyArray(documents)) {
          return InternalHelpDoc.enumeration(documents)
        }
        throw new Error("[BUG]: Subcommands.usage - received empty list of subcommands to print")
      }
      return InternalHelpDoc.sequence(
        getHelpInternal(self.parent as Instruction),
        InternalHelpDoc.sequence(
          InternalHelpDoc.h1("COMMANDS"),
          printSubcommands(getUsage(self.child as Instruction, ReadonlyArray.empty()))
        )
      )
    }
  }
}

const getNamesInternal = (self: Instruction): HashSet.HashSet<string> => {
  switch (self._tag) {
    case "Standard":
    case "GetUserInput": {
      return HashSet.make(self.name)
    }
    case "Map": {
      return getNamesInternal(self.command as Instruction)
    }
    case "OrElse": {
      return HashSet.union(
        getNamesInternal(self.right as Instruction),
        getNamesInternal(self.left as Instruction)
      )
    }
    case "Subcommands": {
      return getNamesInternal(self.parent as Instruction)
    }
  }
}

const getSubcommandsInternal = (
  self: Instruction
): HashMap.HashMap<string, Command.Command<unknown>> => {
  switch (self._tag) {
    case "Standard":
    case "GetUserInput": {
      return HashMap.make([self.name, self])
    }
    case "Map": {
      return getSubcommandsInternal(self.command as Instruction)
    }
    case "OrElse": {
      return HashMap.union(
        getSubcommandsInternal(self.left as Instruction),
        getSubcommandsInternal(self.right as Instruction)
      )
    }
    case "Subcommands": {
      return getSubcommandsInternal(self.child as Instruction)
    }
  }
}

const getUsageInternal = (self: Instruction): Usage.Usage => {
  switch (self._tag) {
    case "Standard": {
      return InternalUsage.concat(
        InternalUsage.named(ReadonlyArray.of(self.name), Option.none()),
        InternalUsage.concat(
          InternalOptions.getUsage(self.options),
          InternalArgs.getUsage(self.args)
        )
      )
    }
    case "GetUserInput": {
      return InternalUsage.named(ReadonlyArray.of(self.name), Option.none())
    }
    case "Map": {
      return getUsageInternal(self.command as Instruction)
    }
    case "OrElse": {
      return InternalUsage.mixed
    }
    case "Subcommands": {
      return InternalUsage.concat(
        getUsageInternal(self.parent as Instruction),
        getUsageInternal(self.child as Instruction)
      )
    }
  }
}

const parseInternal = (
  self: Instruction,
  args: ReadonlyArray<string>,
  config: CliConfig.CliConfig
): Effect.Effect<
  FileSystem.FileSystem | Terminal.Terminal,
  ValidationError.ValidationError,
  CommandDirective.CommandDirective<any>
> => {
  switch (self._tag) {
    case "Standard": {
      const parseCommandLine = (
        args: ReadonlyArray<string>
      ): Effect.Effect<never, ValidationError.ValidationError, ReadonlyArray<string>> => {
        if (ReadonlyArray.isNonEmptyReadonlyArray(args)) {
          const head = ReadonlyArray.headNonEmpty(args)
          const tail = ReadonlyArray.tailNonEmpty(args)
          const normalizedArgv0 = InternalCliConfig.normalizeCase(config, head)
          const normalizedCommandName = InternalCliConfig.normalizeCase(config, self.name)
          return Effect.succeed(tail).pipe(
            Effect.when(() => normalizedArgv0 === normalizedCommandName),
            Effect.flatten,
            Effect.catchTag("NoSuchElementException", () => {
              const error = InternalHelpDoc.p(`Missing command name: '${self.name}'`)
              return Effect.fail(InternalValidationError.commandMismatch(error))
            })
          )
        }
        const error = InternalHelpDoc.p(`Missing command name: '${self.name}'`)
        return Effect.fail(InternalValidationError.commandMismatch(error))
      }
      const parseBuiltInArgs = (
        args: ReadonlyArray<string>
      ): Effect.Effect<
        FileSystem.FileSystem,
        ValidationError.ValidationError,
        CommandDirective.CommandDirective<never>
      > => {
        if (ReadonlyArray.isNonEmptyReadonlyArray(args)) {
          const argv0 = ReadonlyArray.headNonEmpty(args)
          const normalizedArgv0 = InternalCliConfig.normalizeCase(config, argv0)
          const normalizedCommandName = InternalCliConfig.normalizeCase(config, self.name)
          if (normalizedArgv0 === normalizedCommandName) {
            const help = getHelpInternal(self)
            const usage = getUsageInternal(self)
            const options = InternalBuiltInOptions.builtInOptions(self, usage, help)
            return InternalOptions.validate(options, ReadonlyArray.drop(args, 1), config).pipe(
              Effect.flatMap((tuple) => tuple[2]),
              Effect.catchTag("NoSuchElementException", () => {
                const error = InternalHelpDoc.p("No built-in option was matched")
                return Effect.fail(InternalValidationError.noBuiltInMatch(error))
              }),
              Effect.map(InternalCommandDirective.builtIn)
            )
          }
        }
        const error = InternalHelpDoc.p(`Missing command name: '${self.name}'`)
        return Effect.fail(InternalValidationError.commandMismatch(error))
      }
      const parseUserDefinedArgs = (
        args: ReadonlyArray<string>
      ): Effect.Effect<
        FileSystem.FileSystem,
        ValidationError.ValidationError,
        CommandDirective.CommandDirective<unknown>
      > =>
        parseCommandLine(args).pipe(Effect.flatMap((commandOptionsAndArgs) => {
          const [optionsAndArgs, forcedCommandArgs] = splitForcedArgs(commandOptionsAndArgs)
          return InternalOptions.validate(self.options, optionsAndArgs, config).pipe(
            Effect.flatMap(([error, commandArgs, optionsType]) =>
              InternalArgs.validate(
                self.args,
                ReadonlyArray.appendAll(commandArgs, forcedCommandArgs),
                config
              ).pipe(
                Effect.catchAll((e) =>
                  Option.match(error, {
                    onNone: () => Effect.fail(e),
                    onSome: (err) => Effect.fail(err)
                  })
                ),
                Effect.map(([argsLeftover, argsType]) =>
                  InternalCommandDirective.userDefined(argsLeftover, {
                    name: self.name,
                    options: optionsType,
                    args: argsType
                  })
                )
              )
            )
          )
        }))
      const exhaustiveSearch = (
        args: ReadonlyArray<string>
      ): Effect.Effect<
        FileSystem.FileSystem,
        ValidationError.ValidationError,
        CommandDirective.CommandDirective<never>
      > => {
        if (ReadonlyArray.contains(args, "--help") || ReadonlyArray.contains(args, "-h")) {
          return parseBuiltInArgs(ReadonlyArray.make(self.name, "--help"))
        }
        if (ReadonlyArray.contains(args, "--wizard")) {
          return parseBuiltInArgs(ReadonlyArray.make(self.name, "--wizard"))
        }
        const error = InternalHelpDoc.p(`Missing command name: '${self.name}'`)
        return Effect.fail(InternalValidationError.commandMismatch(error))
      }
      return parseBuiltInArgs(args).pipe(
        Effect.orElse(() => parseUserDefinedArgs(args)),
        Effect.catchSome((e) => {
          if (InternalValidationError.isValidationError(e)) {
            if (config.finalCheckBuiltIn) {
              return Option.some(
                exhaustiveSearch(args).pipe(
                  Effect.catchSome((_) =>
                    InternalValidationError.isValidationError(_)
                      ? Option.some(Effect.fail(e))
                      : Option.none()
                  )
                )
              )
            }
            return Option.some(Effect.fail(e))
          }
          return Option.none()
        })
      )
    }
    case "GetUserInput": {
      return InternalPrompt.run(self.prompt).pipe(
        Effect.map((value) =>
          InternalCommandDirective.userDefined(ReadonlyArray.drop(args, 1), {
            name: self.name,
            value
          })
        )
      )
    }
    case "Map": {
      return parseInternal(self.command as Instruction, args, config).pipe(
        Effect.flatMap((directive) => {
          if (InternalCommandDirective.isUserDefined(directive)) {
            const either = self.f(directive.value)
            return Either.isLeft(either)
              ? Effect.fail(either.left)
              : Effect.succeed(InternalCommandDirective.userDefined(
                directive.leftover,
                either.right
              ))
          }
          return Effect.succeed(directive)
        })
      )
    }
    case "OrElse": {
      return parseInternal(self.left as Instruction, args, config).pipe(
        Effect.catchSome((e) => {
          return InternalValidationError.isCommandMismatch(e)
            ? Option.some(parseInternal(self.right as Instruction, args, config))
            : Option.none()
        })
      )
    }
    case "Subcommands": {
      const names = Array.from(getNamesInternal(self))
      const subcommands = getSubcommandsInternal(self)
      const [parentArgs, childArgs] = ReadonlyArray.span(
        args,
        (name) => !HashMap.has(subcommands, name)
      )
      const helpDirectiveForParent = Effect.succeed(
        InternalCommandDirective.builtIn(InternalBuiltInOptions.showHelp(
          getUsageInternal(self),
          getHelpInternal(self)
        ))
      )
      const helpDirectiveForChild = parseInternal(
        self.child as Instruction,
        childArgs,
        config
      ).pipe(
        Effect.flatMap((directive) => {
          if (
            InternalCommandDirective.isBuiltIn(directive) &&
            InternalBuiltInOptions.isShowHelp(directive.option)
          ) {
            const parentName = Option.getOrElse(ReadonlyArray.head(names), () => "")
            const newDirective = InternalCommandDirective.builtIn(InternalBuiltInOptions.showHelp(
              InternalUsage.concat(
                InternalUsage.named(ReadonlyArray.of(parentName), Option.none()),
                directive.option.usage
              ),
              directive.option.helpDoc
            ))
            return Effect.succeed(newDirective)
          }
          return Effect.fail(InternalValidationError.invalidArgument(InternalHelpDoc.empty))
        })
      )
      const wizardDirectiveForParent = Effect.succeed(
        InternalCommandDirective.builtIn(InternalBuiltInOptions.showWizard(self))
      )
      const wizardDirectiveForChild = parseInternal(
        self.child as Instruction,
        childArgs,
        config
      ).pipe(
        Effect.flatMap((directive) => {
          if (
            InternalCommandDirective.isBuiltIn(directive) &&
            InternalBuiltInOptions.isShowWizard(directive.option)
          ) {
            return Effect.succeed(directive)
          }
          return Effect.fail(InternalValidationError.invalidArgument(InternalHelpDoc.empty))
        })
      )
      return parseInternal(self.parent as Instruction, parentArgs, config).pipe(
        Effect.flatMap((directive) => {
          switch (directive._tag) {
            case "BuiltIn": {
              if (InternalBuiltInOptions.isShowHelp(directive.option)) {
                return Effect.orElse(helpDirectiveForChild, () => helpDirectiveForParent)
              }
              if (InternalBuiltInOptions.isShowWizard(directive.option)) {
                return Effect.orElse(wizardDirectiveForChild, () => wizardDirectiveForParent)
              }
              return Effect.succeed(directive)
            }
            case "UserDefined": {
              const args = ReadonlyArray.appendAll(directive.leftover, childArgs)
              if (ReadonlyArray.isNonEmptyReadonlyArray(args)) {
                return parseInternal(self.child as Instruction, args, config).pipe(Effect.mapBoth({
                  onFailure: (err) => {
                    if (InternalValidationError.isCommandMismatch(err)) {
                      const parentName = Option.getOrElse(ReadonlyArray.head(names), () => "")
                      const subcommandNames = pipe(
                        ReadonlyArray.fromIterable(HashMap.keys(subcommands)),
                        ReadonlyArray.map((name) => `'${name}'`)
                      )
                      const oneOf = subcommandNames.length === 1 ? "" : " one of"
                      const error = InternalHelpDoc.p(
                        `Invalid subcommand for ${parentName} - use${oneOf} ${
                          ReadonlyArray.join(subcommandNames, ", ")
                        }`
                      )
                      return InternalValidationError.commandMismatch(error)
                    }
                    return err
                  },
                  onSuccess: InternalCommandDirective.map((subcommand) => ({
                    ...directive.value as any,
                    subcommand: Option.some(subcommand)
                  }))
                }))
              }
              return Effect.succeed(InternalCommandDirective.userDefined(directive.leftover, {
                ...directive.value as any,
                subcommand: Option.none()
              }))
            }
          }
        }),
        Effect.catchSome(() =>
          ReadonlyArray.isEmptyReadonlyArray(args)
            ? Option.some(helpDirectiveForParent) :
            Option.none()
        )
      )
    }
  }
}

const toRegularLanguageInternal = (
  self: Instruction,
  allowAlias: boolean
): RegularLanguage.RegularLanguage => {
  switch (self._tag) {
    case "Standard": {
      const commandNameToken = allowAlias
        ? InternalRegularLanguage.anyString :
        InternalRegularLanguage.string(self.name)
      return InternalRegularLanguage.concat(
        commandNameToken,
        InternalRegularLanguage.concat(
          InternalOptions.toRegularLanguage(self.options),
          InternalArgs.toRegularLanguage(self.args)
        )
      )
    }
    case "GetUserInput": {
      return InternalRegularLanguage.string(self.name)
    }
    case "Map": {
      return toRegularLanguageInternal(self.command as Instruction, allowAlias)
    }
    case "OrElse": {
      return InternalRegularLanguage.orElse(
        toRegularLanguageInternal(self.left as Instruction, allowAlias),
        toRegularLanguageInternal(self.right as Instruction, allowAlias)
      )
    }
    case "Subcommands": {
      return InternalRegularLanguage.concat(
        toRegularLanguageInternal(self.parent as Instruction, allowAlias),
        toRegularLanguageInternal(self.child as Instruction, false)
      )
    }
  }
}

const splitForcedArgs = (
  args: ReadonlyArray<string>
): [ReadonlyArray<string>, ReadonlyArray<string>] => {
  const [remainingArgs, forcedArgs] = ReadonlyArray.span(args, (str) => str !== "--")
  return [remainingArgs, ReadonlyArray.drop(forcedArgs, 1)]
}

const withDescriptionInternal = (
  self: Instruction,
  description: string | HelpDoc.HelpDoc
): Command.Command<any> => {
  switch (self._tag) {
    case "Standard": {
      const helpDoc = typeof description === "string" ? HelpDoc.p(description) : description
      const op = Object.create(proto)
      op._tag = "Standard"
      op.name = self.name
      op.description = helpDoc
      op.options = self.options
      op.args = self.args
      return op
    }
    case "GetUserInput": {
      const helpDoc = typeof description === "string" ? HelpDoc.p(description) : description
      const op = Object.create(proto)
      op._tag = "GetUserInput"
      op.name = self.name
      op.description = helpDoc
      return op
    }
    case "Map": {
      return map(withDescriptionInternal(self.command as Instruction, description), self.f)
    }
    case "OrElse": {
      // TODO: if both the left and right commands also have help defined, that
      // help will be overwritten by this method which may be undesirable
      return orElse(
        withDescriptionInternal(self.left as Instruction, description),
        withDescriptionInternal(self.right as Instruction, description)
      )
    }
    case "Subcommands": {
      const op = Object.create(proto)
      op._tag = "Subcommands"
      op.parent = withDescriptionInternal(self.parent as Instruction, description)
      op.child = self.child
      return op
    }
  }
}

const wizardInternal = (self: Instruction, config: CliConfig.CliConfig): Effect.Effect<
  FileSystem.FileSystem | Terminal.Terminal,
  ValidationError.ValidationError,
  ReadonlyArray<string>
> => {
  switch (self._tag) {
    case "Standard": {
      const message = InternalHelpDoc.p(pipe(
        InternalSpan.text("\n\n"),
        InternalSpan.concat(InternalSpan.strong(InternalSpan.code("COMMAND:"))),
        InternalSpan.concat(InternalSpan.space),
        InternalSpan.concat(InternalSpan.code(self.name))
      ))
      return Console.log(InternalHelpDoc.toAnsiText(message)).pipe(Effect.zipRight(Effect.zipWith(
        InternalOptions.wizard(self.options, config),
        InternalArgs.wizard(self.args, config),
        (options, args) => ReadonlyArray.prepend(ReadonlyArray.appendAll(options, args), self.name)
      )))
    }
    case "GetUserInput": {
      return Effect.succeed(ReadonlyArray.empty())
    }
    case "Map": {
      return wizardInternal(self.command as Instruction, config)
    }
    case "OrElse": {
      const description = InternalHelpDoc.p("Select which command you would like to execute")
      const makeChoice = (title: string, value: Instruction) => ({
        title,
        value: [title, value] as const
      })
      const choices = ReadonlyArray.compact([
        Option.map(
          ReadonlyArray.head(Array.from(getNamesInternal(self.left as Instruction))),
          (title) => makeChoice(title, self.left as Instruction)
        ),
        Option.map(
          ReadonlyArray.head(Array.from(getNamesInternal(self.right as Instruction))),
          (title) => makeChoice(title, self.right as Instruction)
        )
      ])
      const message = InternalHelpDoc.toAnsiText(description).trimEnd()
      return Console.log().pipe(
        Effect.zipRight(InternalSelectPrompt.select({ message, choices })),
        Effect.flatMap(([name, command]) =>
          wizardInternal(command, config).pipe(Effect.map(ReadonlyArray.prepend(name)))
        )
      )
    }
    case "Subcommands": {
      const description = InternalHelpDoc.p("Select which command you would like to execute")
      const makeChoice = (title: string, value: Instruction) => ({ title, value })
      const parentName = Option.getOrElse(
        ReadonlyArray.head(Array.from(getNamesInternal(self))),
        () => "<anonymous>"
      )
      const parentChoice = makeChoice(parentName, self.parent as Instruction)
      const childChoices = ReadonlyArray.map(
        Array.from(getSubcommandsInternal(self)),
        ([name, command]) => makeChoice(name, command as Instruction)
      )
      const choices = ReadonlyArray.prepend(childChoices, parentChoice)
      const message = InternalHelpDoc.toAnsiText(description).trimEnd()
      return Console.log().pipe(
        Effect.zipRight(InternalSelectPrompt.select({ message, choices })),
        Effect.flatMap((command) => wizardInternal(command, config))
      )
    }
  }
}
