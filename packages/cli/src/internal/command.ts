import type * as FileSystem from "@effect/platform/FileSystem"
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
import type * as Terminal from "../Terminal.js"
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
import * as InternalRegularLanguage from "./regularLanguage.js"
import * as InternalUsage from "./usage.js"
import * as InternalValidationError from "./validationError.js"

const CommandSymbolKey = "@effect/cli/Command"

/** @internal */
export const CommandTypeId: Command.CommandTypeId = Symbol.for(
  CommandSymbolKey
) as Command.CommandTypeId

const proto = {
  _A: (_: never) => _
}

/** @internal */
export class Standard<Name extends string, OptionsType, ArgsType>
  implements Command.Command<Command.Command.ParsedStandardCommand<Name, OptionsType, ArgsType>>
{
  readonly [CommandTypeId] = proto
  readonly _tag = "Standard"

  constructor(
    readonly name: Name,
    readonly description: HelpDoc.HelpDoc,
    readonly options: Options.Options<OptionsType>,
    readonly args: Args.Args<ArgsType>
  ) {}

  get names(): HashSet.HashSet<string> {
    return HashSet.make(this.name)
  }

  get subcommands(): HashMap.HashMap<string, Command.Command<unknown>> {
    return HashMap.make([this.name, this])
  }

  get help(): HelpDoc.HelpDoc {
    const header = InternalHelpDoc.isEmpty(this.description)
      ? InternalHelpDoc.empty
      : InternalHelpDoc.sequence(InternalHelpDoc.h1("DESCRIPTION"), this.description)
    const argsHelp = this.args.help
    const argsSection = InternalHelpDoc.isEmpty(argsHelp)
      ? InternalHelpDoc.empty
      : InternalHelpDoc.sequence(InternalHelpDoc.h1("ARGUMENTS"), argsHelp)
    const optionsHelp = this.options.help
    const optionsSection = InternalHelpDoc.isEmpty(optionsHelp)
      ? InternalHelpDoc.empty
      : InternalHelpDoc.sequence(InternalHelpDoc.h1("OPTIONS"), optionsHelp)
    return InternalHelpDoc.sequence(header, InternalHelpDoc.sequence(argsSection, optionsSection))
  }

  get usage(): Usage.Usage {
    return InternalUsage.concat(
      InternalUsage.named(ReadonlyArray.of(this.name), Option.none()),
      InternalUsage.concat(this.options.usage, this.args.usage)
    )
  }

  get shortDescription(): string {
    return InternalSpan.getText(InternalHelpDoc.getSpan(this.help))
  }

  parse(
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ): Effect.Effect<
    FileSystem.FileSystem,
    ValidationError.ValidationError,
    CommandDirective.CommandDirective<
      Command.Command.ParsedStandardCommand<Name, OptionsType, ArgsType>
    >
  > {
    const parseCommandLine = (
      args: ReadonlyArray<string>
    ): Effect.Effect<never, ValidationError.ValidationError, ReadonlyArray<string>> => {
      if (ReadonlyArray.isNonEmptyReadonlyArray(args)) {
        const head = ReadonlyArray.headNonEmpty(args)
        const tail = ReadonlyArray.tailNonEmpty(args)
        const normalizedArgv0 = InternalCliConfig.normalizeCase(config, head)
        const normalizedCommandName = InternalCliConfig.normalizeCase(config, this.name)
        return Effect.succeed(tail).pipe(
          Effect.when(() => normalizedArgv0 === normalizedCommandName),
          Effect.flatten,
          Effect.catchTag("NoSuchElementException", () => {
            const error = InternalHelpDoc.p(`Missing command name: '${this.name}'`)
            return Effect.fail(InternalValidationError.commandMismatch(error))
          })
        )
      }
      const error = InternalHelpDoc.p(`Missing command name: '${this.name}'`)
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
        const normalizedCommandName = InternalCliConfig.normalizeCase(config, this.name)
        if (normalizedArgv0 === normalizedCommandName) {
          const options = InternalBuiltInOptions.builtInOptions(this, this.usage, this.help)
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
      const error = InternalHelpDoc.p(`Missing command name: '${this.name}'`)
      return Effect.fail(InternalValidationError.commandMismatch(error))
    }
    const parseUserDefinedArgs = (
      args: ReadonlyArray<string>
    ): Effect.Effect<
      FileSystem.FileSystem,
      ValidationError.ValidationError,
      CommandDirective.CommandDirective<
        Command.Command.ParsedStandardCommand<Name, OptionsType, ArgsType>
      >
    > =>
      parseCommandLine(args).pipe(Effect.flatMap((commandOptionsAndArgs) => {
        const [optionsAndArgs, forcedCommandArgs] = splitForcedArgs(commandOptionsAndArgs)
        return InternalOptions.validate(this.options, optionsAndArgs, config).pipe(
          Effect.flatMap(([error, commandArgs, optionsType]) =>
            this.args.validate(ReadonlyArray.appendAll(commandArgs, forcedCommandArgs), config)
              .pipe(
                Effect.catchAll((e) =>
                  Option.match(error, {
                    onNone: () => Effect.fail(e),
                    onSome: (err) => Effect.fail(err)
                  })
                ),
                Effect.map(([argsLeftover, argsType]) =>
                  InternalCommandDirective.userDefined(argsLeftover, {
                    name: this.name,
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
        return parseBuiltInArgs(ReadonlyArray.make(this.name, "--help"))
      }
      if (ReadonlyArray.contains(args, "--wizard") || ReadonlyArray.contains(args, "-w")) {
        return parseBuiltInArgs(ReadonlyArray.make(this.name, "--wizard"))
      }
      const error = InternalHelpDoc.p(`Missing command name: '${this.name}'`)
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

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export class GetUserInput<Name extends string, ValueType>
  implements Command.Command<Command.Command.ParsedUserInputCommand<Name, ValueType>>
{
  readonly [CommandTypeId] = proto
  readonly _tag = "GetUserInput"

  constructor(
    readonly name: Name,
    readonly prompt: Prompt.Prompt<ValueType>
  ) {}

  get names(): HashSet.HashSet<string> {
    return HashSet.make(this.name)
  }

  get subcommands(): HashMap.HashMap<string, Command.Command<unknown>> {
    return HashMap.make([this.name, this])
  }

  get help(): HelpDoc.HelpDoc {
    const header = InternalHelpDoc.h1("DESCRIPTION")
    const content = InternalHelpDoc.p("This command will prompt the user for information")
    return InternalHelpDoc.sequence(header, content)
  }

  get usage(): Usage.Usage {
    return InternalUsage.named(ReadonlyArray.of(this.name), Option.none())
  }

  get shortDescription(): string {
    return ""
  }

  parse(
    args: ReadonlyArray<string>,
    _config: CliConfig.CliConfig
  ): Effect.Effect<
    Terminal.Terminal,
    ValidationError.ValidationError,
    CommandDirective.CommandDirective<Command.Command.ParsedUserInputCommand<Name, ValueType>>
  > {
    return Effect.map(
      InternalPrompt.run(this.prompt),
      (value) =>
        InternalCommandDirective.userDefined(ReadonlyArray.drop(args, 1), {
          name: this.name,
          value
        })
    )
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export class Map<A, B> implements Command.Command<B> {
  readonly [CommandTypeId] = proto
  readonly _tag = "Map"

  constructor(
    readonly command: Command.Command<A>,
    readonly f: (value: A) => B
  ) {}

  get names(): HashSet.HashSet<string> {
    return this.command.names
  }

  get subcommands(): HashMap.HashMap<string, Command.Command<unknown>> {
    return this.command.subcommands
  }

  get help(): HelpDoc.HelpDoc {
    return this.command.help
  }

  get usage(): Usage.Usage {
    return this.command.usage
  }

  get shortDescription(): string {
    return this.command.shortDescription
  }

  parse(
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ): Effect.Effect<
    FileSystem.FileSystem | Terminal.Terminal,
    ValidationError.ValidationError,
    CommandDirective.CommandDirective<B>
  > {
    return this.command.parse(args, config).pipe(
      Effect.map(InternalCommandDirective.map((a) => this.f(a)))
    )
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export class OrElse<A, B> implements Command.Command<A | B> {
  readonly [CommandTypeId] = proto
  readonly _tag = "OrElse"

  constructor(
    readonly left: Command.Command<A>,
    readonly right: Command.Command<B>
  ) {}

  get names(): HashSet.HashSet<string> {
    return HashSet.union(this.left.names, this.right.names)
  }

  get subcommands(): HashMap.HashMap<string, Command.Command<unknown>> {
    return HashMap.union(this.left.subcommands, this.right.subcommands)
  }

  get help(): HelpDoc.HelpDoc {
    return InternalHelpDoc.sequence(this.left.help, this.right.help)
  }

  get usage(): Usage.Usage {
    return InternalUsage.mixed
  }

  get shortDescription(): string {
    return ""
  }

  parse(
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ): Effect.Effect<
    FileSystem.FileSystem | Terminal.Terminal,
    ValidationError.ValidationError,
    CommandDirective.CommandDirective<A | B>
  > {
    return this.left.parse(args, config).pipe(
      Effect.catchSome((e) => {
        return InternalValidationError.isCommandMismatch(e)
          ? Option.some(this.right.parse(args, config))
          : Option.none()
      })
    )
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export class Subcommands<A extends Command.Command<any>, B extends Command.Command<any>>
  implements Command.Command<Command.Command.Subcommands<[A, B]>>
{
  readonly [CommandTypeId] = proto
  readonly _tag = "Subcommands"

  constructor(
    readonly parent: A,
    readonly child: B
  ) {}

  get names(): HashSet.HashSet<string> {
    return this.parent.names
  }

  get subcommands(): HashMap.HashMap<string, Command.Command<unknown>> {
    return this.child.subcommands
  }

  get help(): HelpDoc.HelpDoc {
    const getUsage = <A>(
      command: Command.Command<A>,
      preceding: ReadonlyArray<Span.Span>
    ): ReadonlyArray<[Span.Span, Span.Span]> => {
      if (isStandard(command)) {
        const usage = InternalHelpDoc.getSpan(InternalUsage.getHelp(command.usage))
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
        return ReadonlyArray.of([finalUsage, InternalHelpDoc.getSpan(command.description)])
      }
      // TODO: if (isPrompt(command)) {}
      if (isMap(command)) {
        return getUsage(command.command, preceding)
      }
      if (isOrElse(command)) {
        return ReadonlyArray.appendAll(
          getUsage(command.left, preceding),
          getUsage(command.right, preceding)
        )
      }
      if (isSubcommands(command)) {
        const parentUsage = getUsage(command.parent, preceding)
        if (ReadonlyArray.isNonEmptyReadonlyArray(parentUsage)) {
          const [usage] = ReadonlyArray.headNonEmpty(parentUsage)
          const childUsage = getUsage(command.child, ReadonlyArray.append(preceding, usage))
          return ReadonlyArray.appendAll(parentUsage, childUsage)
        }
        return getUsage(command.child, preceding)
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
      this.parent.help,
      InternalHelpDoc.sequence(
        InternalHelpDoc.h1("COMMANDS"),
        printSubcommands(getUsage(this.child, ReadonlyArray.empty()))
      )
    )
  }

  get usage(): Usage.Usage {
    return InternalUsage.concat(this.parent.usage, this.child.usage)
  }

  get shortDescription(): string {
    return this.parent.shortDescription
  }

  parse(
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ): Effect.Effect<
    FileSystem.FileSystem | Terminal.Terminal,
    ValidationError.ValidationError,
    CommandDirective.CommandDirective<Command.Command.Subcommands<[A, B]>>
  > {
    const helpDirectiveForParent = Effect.succeed(
      InternalCommandDirective.builtIn(InternalBuiltInOptions.showHelp(this.usage, this.help))
    )
    const helpDirectiveForChild = this.child.parse(args.slice(1), config).pipe(
      Effect.flatMap((directive) => {
        if (
          InternalCommandDirective.isBuiltIn(directive) &&
          InternalBuiltInOptions.isShowHelp(directive.option)
        ) {
          const parentName = Option.getOrElse(ReadonlyArray.head(Array.from(this.names)), () => "")
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
      InternalCommandDirective.builtIn(InternalBuiltInOptions.showWizard(this))
    )
    const wizardDirectiveForChild = this.child.parse(args.slice(1), config).pipe(
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
    const subcommands = this.subcommands
    const [parentArgs, childArgs] = ReadonlyArray.span(
      args,
      (name) => !HashMap.has(subcommands, name)
    )
    return this.parent.parse(parentArgs, config).pipe(
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
              return this.child.parse(args, config).pipe(Effect.mapBoth({
                onFailure: (err) => {
                  if (InternalValidationError.isCommandMismatch(err)) {
                    const parentName = Option.getOrElse(
                      ReadonlyArray.head(Array.from(this.names)),
                      () => ""
                    )
                    const subcommandNames = pipe(
                      ReadonlyArray.fromIterable(HashMap.keys(this.subcommands)),
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
                  ...directive.value,
                  subcommand: Option.some(subcommand)
                }))
              }))
            }
            return Effect.succeed(InternalCommandDirective.userDefined(directive.leftover, {
              ...directive.value,
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

  pipe() {
    return pipeArguments(this, arguments)
  }
}

// =============================================================================
// Refinements
// =============================================================================

/** @internal */
export const isCommand = (u: unknown): u is Command.Command<unknown> =>
  typeof u === "object" && u != null && CommandTypeId in u

/** @internal */
export const isStandard = (u: unknown): u is Standard<string, unknown, unknown> =>
  isCommand(u) && "_tag" in u && u._tag === "Standard"

/** @internal */
export const isGetUserInput = (u: unknown): u is GetUserInput<string, unknown> =>
  isCommand(u) && "_tag" in u && u._tag === "GetUserInput"

/** @internal */
export const isMap = (u: unknown): u is Map<unknown, unknown> =>
  isCommand(u) && "_tag" in u && u._tag === "Map"

/** @internal */
export const isOrElse = (u: unknown): u is OrElse<unknown, unknown> =>
  isCommand(u) && "_tag" in u && u._tag === "OrElse"

/** @internal */
export const isSubcommands = (u: unknown): u is Subcommands<any, any> =>
  isCommand(u) && "_tag" in u && u._tag === "Subcommands"

// =============================================================================
// Constructors
// =============================================================================

/** @internal */
export const prompt = <Name extends string, A>(
  name: Name,
  prompt: Prompt.Prompt<A>
): Command.Command<Command.Command.ParsedUserInputCommand<Name, A>> =>
  new GetUserInput(name, prompt)

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
  return new Standard(name, InternalHelpDoc.empty, options, args as any) as any
}

/** @internal */
export const subcommands = dual<
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
  if (ReadonlyArray.isNonEmptyReadonlyArray(subcommands)) {
    const head = ReadonlyArray.headNonEmpty<Command.Command<unknown>>(subcommands)
    const tail = ReadonlyArray.tailNonEmpty<Command.Command<unknown>>(subcommands)
    if (ReadonlyArray.isNonEmptyReadonlyArray(tail)) {
      const child = ReadonlyArray.reduce(
        ReadonlyArray.tailNonEmpty(tail),
        orElse(head, ReadonlyArray.headNonEmpty(tail)),
        orElse
      )
      return new Subcommands(self, child) as any
    }
    return new Subcommands(self, head) as any
  }
  throw new Error("[BUG]: Command.subcommands - received empty list of subcommands")
})

// =============================================================================
// Combinators
// =============================================================================

/** @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => (self: Command.Command<A>) => Command.Command<B>,
  <A, B>(self: Command.Command<A>, f: (a: A) => B) => Command.Command<B>
>(2, (self, f) => new Map(self, f))

/** @internal */
export const orElse = dual<
  <B>(that: Command.Command<B>) => <A>(self: Command.Command<A>) => Command.Command<A | B>,
  <A, B>(self: Command.Command<A>, that: Command.Command<B>) => Command.Command<A | B>
>(2, (self, that) => new OrElse(self, that))

/** @internal */
export const orElseEither = dual<
  <B>(
    that: Command.Command<B>
  ) => <A>(self: Command.Command<A>) => Command.Command<Either.Either<A, B>>,
  <A, B>(self: Command.Command<A>, that: Command.Command<B>) => Command.Command<Either.Either<A, B>>
>(2, (self, that) => orElse(map(self, Either.left), map(that, Either.right)))

/** @internal */
export const toRegularLanguage = dual<
  (allowAlias: boolean) => <A>(self: Command.Command<A>) => RegularLanguage.RegularLanguage,
  <A>(self: Command.Command<A>, allowAlias: boolean) => RegularLanguage.RegularLanguage
>(2, <A>(self: Command.Command<A>, allowAlias: boolean): RegularLanguage.RegularLanguage => {
  if (isStandard(self)) {
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
  if (isGetUserInput(self)) {
    throw Error()
  }
  if (isMap(self)) {
    return toRegularLanguage(self.command, allowAlias)
  }
  if (isOrElse(self)) {
    return InternalRegularLanguage.orElse(
      toRegularLanguage(self.left, allowAlias),
      toRegularLanguage(self.right, allowAlias)
    )
  }
  if (isSubcommands(self)) {
    return InternalRegularLanguage.concat(
      toRegularLanguage(self.parent, allowAlias),
      toRegularLanguage(self.child, false)
    )
  }
  throw new Error(
    "[BUG]: Command.toRegularLanguage - received unrecognized " +
      `command ${JSON.stringify(self)}`
  )
})

/** @internal */
export const withHelp = dual<
  (help: string | HelpDoc.HelpDoc) => <A>(self: Command.Command<A>) => Command.Command<A>,
  <A>(self: Command.Command<A>, help: string | HelpDoc.HelpDoc) => Command.Command<A>
>(2, <A>(self: Command.Command<A>, help: string | HelpDoc.HelpDoc): Command.Command<A> => {
  if (isStandard(self)) {
    const helpDoc = typeof help === "string" ? HelpDoc.p(help) : help
    return new Standard(self.name, helpDoc, self.options, self.args) as Command.Command<A>
  }
  // TODO: if (isPrompt(self)) {}
  if (isMap(self)) {
    return new Map(withHelp(self.command, help), self.f) as Command.Command<A>
  }
  if (isOrElse(self)) {
    // TODO: if both the left and right commands also have help defined, that
    // help will be overwritten by this method which may be undesirable
    return new OrElse(withHelp(self.left, help), withHelp(self.right, help)) as Command.Command<A>
  }
  if (isSubcommands(self)) {
    return new Subcommands(withHelp(self.parent, help), self.child) as Command.Command<A>
  }
  throw new Error(
    `[BUG]: Command.withHelp - received unknown command type: ${JSON.stringify(self)}`
  )
})

// =============================================================================
// Internals
// =============================================================================

const splitForcedArgs = (
  args: ReadonlyArray<string>
): readonly [ReadonlyArray<string>, ReadonlyArray<string>] => {
  const [remainingArgs, forcedArgs] = ReadonlyArray.span(args, (str) => str !== "--")
  return [remainingArgs, ReadonlyArray.drop(forcedArgs, 1)]
}
