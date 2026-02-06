import type * as FileSystem from "@effect/platform/FileSystem"
import type * as Path from "@effect/platform/Path"
import type * as Terminal from "@effect/platform/Terminal"
import * as Color from "@effect/printer-ansi/Color"
import * as Arr from "effect/Array"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { dual, pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import { pipeArguments } from "effect/Pipeable"
import * as Ref from "effect/Ref"
import * as SynchronizedRef from "effect/SynchronizedRef"
import type * as Args from "../Args.js"
import type * as CliConfig from "../CliConfig.js"
import type * as Descriptor from "../CommandDescriptor.js"
import type * as Directive from "../CommandDirective.js"
import * as HelpDoc from "../HelpDoc.js"
import type * as Span from "../HelpDoc/Span.js"
import * as Options from "../Options.js"
import type * as Prompt from "../Prompt.js"
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
import * as InternalUsage from "./usage.js"
import * as InternalValidationError from "./validationError.js"

const CommandDescriptorSymbolKey = "@effect/cli/CommandDescriptor"

/** @internal */
export const TypeId: Descriptor.TypeId = Symbol.for(
  CommandDescriptorSymbolKey
) as Descriptor.TypeId

/** @internal */
export type Op<Tag extends string, Body = {}> = Descriptor.Command<never> & Body & {
  readonly _tag: Tag
}

const proto = {
  [TypeId]: {
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
    readonly description: HelpDoc.HelpDoc
    readonly prompt: Prompt.Prompt<unknown>
  }>
{}

/** @internal */
export interface Map extends
  Op<"Map", {
    readonly command: Instruction
    readonly f: (value: unknown) => Effect.Effect<
      unknown,
      ValidationError.ValidationError,
      FileSystem.FileSystem | Path.Path | Terminal.Terminal
    >
  }>
{}

/** @internal */
export interface Subcommands extends
  Op<"Subcommands", {
    readonly parent: Instruction
    readonly children: Arr.NonEmptyReadonlyArray<Instruction>
  }>
{}

// =============================================================================
// Refinements
// =============================================================================

/** @internal */
export const isCommand = (u: unknown): u is Descriptor.Command<unknown> =>
  typeof u === "object" && u != null && TypeId in u

/** @internal */
export const isStandard = (self: Instruction): self is Standard => self._tag === "Standard"

/** @internal */
export const isGetUserInput = (self: Instruction): self is GetUserInput => self._tag === "GetUserInput"

/** @internal */
export const isMap = (self: Instruction): self is Map => self._tag === "Map"

/** @internal */
export const isSubcommands = (self: Instruction): self is Subcommands => self._tag === "Subcommands"

// =============================================================================
// Constructors
// =============================================================================

/** @internal */
export const make = <Name extends string, OptionsType = void, ArgsType = void>(
  name: Name,
  options: Options.Options<OptionsType> = InternalOptions.none as any,
  args: Args.Args<ArgsType> = InternalArgs.none as any
): Descriptor.Command<
  Descriptor.Command.ParsedStandardCommand<Name, OptionsType, ArgsType>
> => {
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
): Descriptor.Command<Descriptor.Command.ParsedUserInputCommand<Name, A>> => {
  const op = Object.create(proto)
  op._tag = "GetUserInput"
  op.name = name
  op.description = InternalHelpDoc.empty
  op.prompt = prompt
  return op
}

// =============================================================================
// Combinators
// =============================================================================

/** @internal */
export const getHelp = <A>(
  self: Descriptor.Command<A>,
  config: CliConfig.CliConfig
): HelpDoc.HelpDoc => getHelpInternal(self as Instruction, config)

/** @internal */
export const getNames = <A>(self: Descriptor.Command<A>): HashSet.HashSet<string> =>
  HashSet.fromIterable(getNamesInternal(self as Instruction))

/** @internal */
export const getBashCompletions = <A>(
  self: Descriptor.Command<A>,
  executable: string
): Effect.Effect<Array<string>> => getBashCompletionsInternal(self as Instruction, executable)

/** @internal */
export const getFishCompletions = <A>(
  self: Descriptor.Command<A>,
  executable: string
): Effect.Effect<Array<string>> => getFishCompletionsInternal(self as Instruction, executable)

/** @internal */
export const getZshCompletions = <A>(
  self: Descriptor.Command<A>,
  executable: string
): Effect.Effect<Array<string>> => getZshCompletionsInternal(self as Instruction, executable)

/** @internal */
export const getSubcommands = <A>(
  self: Descriptor.Command<A>
): HashMap.HashMap<string, Descriptor.Command<unknown>> =>
  HashMap.fromIterable(getSubcommandsInternal(self as Instruction))

/** @internal */
export const getUsage = <A>(self: Descriptor.Command<A>): Usage.Usage => getUsageInternal(self as Instruction)

/** @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => (self: Descriptor.Command<A>) => Descriptor.Command<B>,
  <A, B>(self: Descriptor.Command<A>, f: (a: A) => B) => Descriptor.Command<B>
>(2, (self, f) => mapEffect(self, (a) => Either.right(f(a))))

/** @internal */
export const mapEffect = dual<
  <A, B>(
    f: (a: A) => Effect.Effect<
      B,
      ValidationError.ValidationError,
      FileSystem.FileSystem | Path.Path | Terminal.Terminal
    >
  ) => (self: Descriptor.Command<A>) => Descriptor.Command<B>,
  <A, B>(
    self: Descriptor.Command<A>,
    f: (a: A) => Effect.Effect<
      B,
      ValidationError.ValidationError,
      FileSystem.FileSystem | Path.Path | Terminal.Terminal
    >
  ) => Descriptor.Command<B>
>(2, (self, f) => {
  const op = Object.create(proto)
  op._tag = "Map"
  op.command = self
  op.f = f
  return op
})

/** @internal */
export const parse = dual<
  (
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => <A>(self: Descriptor.Command<A>) => Effect.Effect<
    Directive.CommandDirective<A>,
    ValidationError.ValidationError,
    FileSystem.FileSystem | Path.Path | Terminal.Terminal
  >,
  <A>(
    self: Descriptor.Command<A>,
    args: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => Effect.Effect<
    Directive.CommandDirective<A>,
    ValidationError.ValidationError,
    FileSystem.FileSystem | Path.Path | Terminal.Terminal
  >
>(3, (self, args, config) => parseInternal(self as Instruction, args, config))

/** @internal */
export const withDescription = dual<
  (
    help: string | HelpDoc.HelpDoc
  ) => <A>(self: Descriptor.Command<A>) => Descriptor.Command<A>,
  <A>(
    self: Descriptor.Command<A>,
    help: string | HelpDoc.HelpDoc
  ) => Descriptor.Command<A>
>(2, (self, help) => withDescriptionInternal(self as Instruction, help))

/** @internal */
export const withSubcommands = dual<
  <
    const Subcommands extends Arr.NonEmptyReadonlyArray<
      readonly [id: unknown, command: Descriptor.Command<any>]
    >
  >(
    subcommands: [...Subcommands]
  ) => <A>(
    self: Descriptor.Command<A>
  ) => Descriptor.Command<
    Descriptor.Command.ComputeParsedType<
      & A
      & Readonly<{ subcommand: Option.Option<Descriptor.Command.Subcommands<Subcommands>> }>
    >
  >,
  <
    A,
    const Subcommands extends Arr.NonEmptyReadonlyArray<
      readonly [id: unknown, command: Descriptor.Command<any>]
    >
  >(
    self: Descriptor.Command<A>,
    subcommands: [...Subcommands]
  ) => Descriptor.Command<
    Descriptor.Command.ComputeParsedType<
      & A
      & Readonly<{ subcommand: Option.Option<Descriptor.Command.Subcommands<Subcommands>> }>
    >
  >
>(2, (self, subcommands) => {
  const op = Object.create(proto)
  op._tag = "Subcommands"
  op.parent = self
  op.children = Arr.map(subcommands, ([id, command]) => map(command, (a) => [id, a]))
  return op
})

/** @internal */
export const wizard = dual<
  (
    prefix: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => <A>(self: Descriptor.Command<A>) => Effect.Effect<
    Array<string>,
    Terminal.QuitException | ValidationError.ValidationError,
    FileSystem.FileSystem | Path.Path | Terminal.Terminal
  >,
  <A>(
    self: Descriptor.Command<A>,
    prefix: ReadonlyArray<string>,
    config: CliConfig.CliConfig
  ) => Effect.Effect<
    Array<string>,
    Terminal.QuitException | ValidationError.ValidationError,
    FileSystem.FileSystem | Path.Path | Terminal.Terminal
  >
>(3, (self, prefix, config) => wizardInternal(self as Instruction, prefix, config))

// =============================================================================
// Internals
// =============================================================================

const getHelpInternal = (self: Instruction, config: CliConfig.CliConfig): HelpDoc.HelpDoc => {
  switch (self._tag) {
    case "Standard": {
      const header = InternalHelpDoc.isEmpty(self.description)
        ? InternalHelpDoc.empty
        : InternalHelpDoc.sequence(InternalHelpDoc.h1("DESCRIPTION"), self.description)
      const argsHelp = InternalArgs.getHelp(self.args)
      const argsSection = InternalHelpDoc.isEmpty(argsHelp)
        ? InternalHelpDoc.empty
        : InternalHelpDoc.sequence(InternalHelpDoc.h1("ARGUMENTS"), argsHelp)
      const options = config.showBuiltIns
        ? Options.all([self.options, InternalBuiltInOptions.builtIns])
        : self.options
      const optionsHelp = InternalOptions.getHelp(options)
      const optionsSection = InternalHelpDoc.isEmpty(optionsHelp)
        ? InternalHelpDoc.empty
        : InternalHelpDoc.sequence(InternalHelpDoc.h1("OPTIONS"), optionsHelp)
      return InternalHelpDoc.sequence(header, InternalHelpDoc.sequence(argsSection, optionsSection))
    }
    case "GetUserInput": {
      return InternalHelpDoc.isEmpty(self.description)
        ? InternalHelpDoc.empty
        : InternalHelpDoc.sequence(InternalHelpDoc.h1("DESCRIPTION"), self.description)
    }
    case "Map": {
      return getHelpInternal(self.command, config)
    }
    case "Subcommands": {
      const getUsage = (
        command: Instruction,
        preceding: ReadonlyArray<Span.Span>
      ): ReadonlyArray<[Span.Span, Span.Span]> => {
        switch (command._tag) {
          case "Standard":
          case "GetUserInput": {
            const usage = InternalHelpDoc.getSpan(InternalUsage.getHelp(getUsageInternal(command)))
            const usages = Arr.append(preceding, usage)
            const finalUsage = Arr.reduce(
              usages,
              InternalSpan.empty,
              (acc, next) =>
                InternalSpan.isText(acc) && acc.value === ""
                  ? next
                  : InternalSpan.isText(next) && next.value === ""
                  ? acc
                  : InternalSpan.spans([acc, InternalSpan.space, next])
            )
            const description = InternalHelpDoc.getSpan(command.description)
            return Arr.of([finalUsage, description])
          }
          case "Map": {
            return getUsage(command.command, preceding)
          }
          case "Subcommands": {
            const parentUsage = getUsage(command.parent, preceding)
            return Option.match(Arr.head(parentUsage), {
              onNone: () =>
                Arr.flatMap(
                  command.children,
                  (child) => getUsage(child, preceding)
                ),
              onSome: ([usage]) => {
                const childrenUsage = Arr.flatMap(
                  command.children,
                  (child) => getUsage(child, Arr.append(preceding, usage))
                )
                return Arr.appendAll(parentUsage, childrenUsage)
              }
            })
          }
        }
      }
      const printSubcommands = (
        subcommands: ReadonlyArray<[Span.Span, Span.Span]>
      ): HelpDoc.HelpDoc => {
        const maxUsageLength = Arr.reduceRight(
          subcommands,
          0,
          (max, [usage]) => Math.max(InternalSpan.size(usage), max)
        )
        const documents = Arr.map(subcommands, ([usage, desc]) =>
          InternalHelpDoc.p(
            InternalSpan.spans([
              usage,
              InternalSpan.text(" ".repeat(maxUsageLength - InternalSpan.size(usage) + 2)),
              desc
            ])
          ))
        if (Arr.isNonEmptyReadonlyArray(documents)) {
          return InternalHelpDoc.enumeration(documents)
        }
        throw new Error("[BUG]: Subcommands.usage - received empty list of subcommands to print")
      }
      return InternalHelpDoc.sequence(
        getHelpInternal(self.parent, config),
        InternalHelpDoc.sequence(
          InternalHelpDoc.h1("COMMANDS"),
          printSubcommands(Arr.flatMap(
            self.children,
            (child) => getUsage(child, Arr.empty())
          ))
        )
      )
    }
  }
}

const getNamesInternal = (self: Instruction): Array<string> => {
  switch (self._tag) {
    case "Standard":
    case "GetUserInput": {
      return Arr.of(self.name)
    }
    case "Map": {
      return getNamesInternal(self.command)
    }
    case "Subcommands": {
      return getNamesInternal(self.parent)
    }
  }
}

const getSubcommandsInternal = (
  self: Instruction
): Array<[string, GetUserInput | Standard]> => {
  const loop = (
    self: Instruction,
    isSubcommand: boolean
  ): Array<[string, GetUserInput | Standard]> => {
    switch (self._tag) {
      case "Standard":
      case "GetUserInput": {
        return Arr.of([self.name, self])
      }
      case "Map": {
        return loop(self.command, isSubcommand)
      }
      case "Subcommands": {
        // Ensure that we only traverse the subcommands one level deep from the
        // parent command
        return isSubcommand
          ? loop(self.parent, false)
          : Arr.flatMap(self.children, (child) => loop(child, true))
      }
    }
  }
  return loop(self, false)
}

const getUsageInternal = (self: Instruction): Usage.Usage => {
  switch (self._tag) {
    case "Standard": {
      return InternalUsage.concat(
        InternalUsage.named(Arr.of(self.name), Option.none()),
        InternalUsage.concat(
          InternalOptions.getUsage(self.options),
          InternalArgs.getUsage(self.args)
        )
      )
    }
    case "GetUserInput": {
      return InternalUsage.named(Arr.of(self.name), Option.none())
    }
    case "Map": {
      return getUsageInternal(self.command)
    }
    case "Subcommands": {
      return InternalUsage.concat(
        getUsageInternal(self.parent),
        InternalUsage.mixed
      )
    }
  }
}

const parseInternal = (
  self: Instruction,
  args: ReadonlyArray<string>,
  config: CliConfig.CliConfig
): Effect.Effect<
  Directive.CommandDirective<any>,
  ValidationError.ValidationError,
  FileSystem.FileSystem | Path.Path | Terminal.Terminal
> => {
  const parseCommandLine = (
    self: Standard | GetUserInput,
    args: ReadonlyArray<string>
  ): Effect.Effect<Array<string>, ValidationError.ValidationError> =>
    Arr.matchLeft(args, {
      onEmpty: () => {
        const error = InternalHelpDoc.p(`Missing command name: '${self.name}'`)
        return Effect.fail(InternalValidationError.commandMismatch(error))
      },
      onNonEmpty: (head, tail) => {
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
    })
  switch (self._tag) {
    case "Standard": {
      const parseBuiltInArgs = (
        args: ReadonlyArray<string>
      ): Effect.Effect<
        Directive.CommandDirective<never>,
        ValidationError.ValidationError,
        FileSystem.FileSystem | Path.Path | Terminal.Terminal
      > =>
        Arr.matchLeft(args, {
          onEmpty: () => {
            const error = InternalHelpDoc.p(`Missing command name: '${self.name}'`)
            return Effect.fail(InternalValidationError.commandMismatch(error))
          },
          onNonEmpty: (argv0) => {
            const normalizedArgv0 = InternalCliConfig.normalizeCase(config, argv0)
            const normalizedCommandName = InternalCliConfig.normalizeCase(config, self.name)
            if (normalizedArgv0 === normalizedCommandName) {
              const help = getHelpInternal(self, config)
              const usage = getUsageInternal(self)
              const options = InternalBuiltInOptions.builtInOptions(self, usage, help)
              const argsWithoutCommand = Arr.drop(args, 1)
              return InternalOptions.processCommandLine(options, argsWithoutCommand, config)
                .pipe(
                  Effect.flatMap((tuple) => tuple[2]),
                  Effect.catchTag("NoSuchElementException", () => {
                    const error = InternalHelpDoc.p("No built-in option was matched")
                    return Effect.fail(InternalValidationError.noBuiltInMatch(error))
                  }),
                  Effect.map(InternalCommandDirective.builtIn)
                )
            }
            const error = InternalHelpDoc.p(`Missing command name: '${self.name}'`)
            return Effect.fail(InternalValidationError.commandMismatch(error))
          }
        })
      const parseUserDefinedArgs = (
        args: ReadonlyArray<string>
      ): Effect.Effect<
        Directive.CommandDirective<unknown>,
        ValidationError.ValidationError,
        FileSystem.FileSystem | Path.Path | Terminal.Terminal
      > =>
        parseCommandLine(self, args).pipe(Effect.flatMap((commandOptionsAndArgs) => {
          const [optionsAndArgs, forcedCommandArgs] = splitForcedArgs(commandOptionsAndArgs)
          return InternalOptions.processCommandLine(self.options, optionsAndArgs, config).pipe(
            Effect.flatMap(([error, commandArgs, optionsType]) =>
              InternalArgs.validate(
                self.args,
                Arr.appendAll(commandArgs, forcedCommandArgs),
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
        Directive.CommandDirective<never>,
        ValidationError.ValidationError,
        FileSystem.FileSystem | Path.Path | Terminal.Terminal
      > => {
        if (Arr.contains(args, "--help") || Arr.contains(args, "-h")) {
          return parseBuiltInArgs(Arr.make(self.name, "--help"))
        }
        if (Arr.contains(args, "--wizard")) {
          return parseBuiltInArgs(Arr.make(self.name, "--wizard"))
        }
        if (Arr.contains(args, "--version")) {
          return parseBuiltInArgs(Arr.make(self.name, "--version"))
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
      return parseCommandLine(self, args).pipe(
        Effect.zipRight(InternalPrompt.run(self.prompt)),
        Effect.catchTag("QuitException", (e) => Effect.die(e)),
        Effect.map((value) =>
          InternalCommandDirective.userDefined(Arr.drop(args, 1), {
            name: self.name,
            value
          })
        )
      )
    }
    case "Map": {
      return parseInternal(self.command, args, config).pipe(
        Effect.flatMap((directive) => {
          if (InternalCommandDirective.isUserDefined(directive)) {
            return self.f(directive.value).pipe(Effect.map((value) =>
              InternalCommandDirective.userDefined(
                directive.leftover,
                value
              )
            ))
          }
          return Effect.succeed(directive)
        })
      )
    }
    case "Subcommands": {
      const names = getNamesInternal(self)
      const subcommands = getSubcommandsInternal(self)
      const [parentArgs, childArgs] = Arr.span(
        args,
        (arg) => !Arr.some(subcommands, ([name]) => name === arg)
      )
      const parseChildrenWith = (argsForChildren: ReadonlyArray<string>) =>
        Effect.suspend(() => {
          const iterator = self.children[Symbol.iterator]()
          const loop = (
            next: Instruction
          ): Effect.Effect<
            Directive.CommandDirective<any>,
            ValidationError.ValidationError,
            FileSystem.FileSystem | Path.Path | Terminal.Terminal
          > => {
            return parseInternal(next, argsForChildren, config).pipe(
              Effect.catchIf(InternalValidationError.isCommandMismatch, (e) => {
                const next = iterator.next()
                return next.done ? Effect.fail(e) : loop(next.value)
              })
            )
          }
          return loop(iterator.next().value!)
        })
      const parseChildren = parseChildrenWith(childArgs)
      const helpDirectiveForParent = Effect.sync(() => {
        return InternalCommandDirective.builtIn(InternalBuiltInOptions.showHelp(
          getUsageInternal(self),
          getHelpInternal(self, config)
        ))
      })
      const helpDirectiveForChild = parseChildren.pipe(
        Effect.flatMap((directive) => {
          if (
            InternalCommandDirective.isBuiltIn(directive) &&
            InternalBuiltInOptions.isShowHelp(directive.option)
          ) {
            const parentName = Option.getOrElse(Arr.head(names), () => "")
            const newDirective = InternalCommandDirective.builtIn(InternalBuiltInOptions.showHelp(
              InternalUsage.concat(
                InternalUsage.named(Arr.of(parentName), Option.none()),
                directive.option.usage
              ),
              directive.option.helpDoc
            ))
            return Effect.succeed(newDirective)
          }
          return Effect.fail(InternalValidationError.invalidArgument(InternalHelpDoc.empty))
        })
      )
      const wizardDirectiveForParent = Effect.sync(() =>
        InternalCommandDirective.builtIn(InternalBuiltInOptions.showWizard(self))
      )
      const wizardDirectiveForChild = parseChildren.pipe(
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
      return Effect.suspend(() =>
        parseInternal(self.parent, parentArgs, config).pipe(
          Effect.flatMap((directive) => {
            switch (directive._tag) {
              case "BuiltIn": {
                if (InternalBuiltInOptions.isShowHelp(directive.option)) {
                  // We do not want to display the child help docs if there are
                  // no arguments indicating the CLI command was for the child
                  return Arr.isNonEmptyReadonlyArray(childArgs)
                    ? Effect.orElse(helpDirectiveForChild, () => helpDirectiveForParent)
                    : helpDirectiveForParent
                }
                if (InternalBuiltInOptions.isShowWizard(directive.option)) {
                  return Effect.orElse(wizardDirectiveForChild, () => wizardDirectiveForParent)
                }
                return Effect.succeed(directive)
              }
              case "UserDefined": {
                const args = Arr.appendAll(directive.leftover, childArgs)
                if (Arr.isNonEmptyReadonlyArray(args)) {
                  return parseChildrenWith(args).pipe(
                    Effect.flatMap((childDirective) => {
                      if (!InternalCommandDirective.isUserDefined(childDirective)) {
                        return Effect.succeed(childDirective)
                      }
                      const childLeftover = childDirective.leftover
                      if (Arr.isEmptyReadonlyArray(childLeftover)) {
                        return Effect.succeed(InternalCommandDirective.userDefined(childLeftover, {
                          ...directive.value as any,
                          subcommand: Option.some(childDirective.value)
                        }))
                      }
                      const parentArgsWithLeftover = Arr.appendAll(parentArgs, childLeftover)
                      return parseInternal(self.parent, parentArgsWithLeftover, config).pipe(
                        Effect.flatMap((reParsedParentDirective) => {
                          if (!InternalCommandDirective.isUserDefined(reParsedParentDirective)) {
                            return Effect.succeed(InternalCommandDirective.userDefined(childLeftover, {
                              ...directive.value as any,
                              subcommand: Option.some(childDirective.value)
                            }))
                          }
                          return Effect.succeed(InternalCommandDirective.userDefined(
                            reParsedParentDirective.leftover as Array<string>,
                            {
                              ...reParsedParentDirective.value as any,
                              subcommand: Option.some(childDirective.value)
                            }
                          ))
                        }),
                        Effect.catchAll(() =>
                          Effect.succeed(InternalCommandDirective.userDefined(childLeftover, {
                            ...directive.value as any,
                            subcommand: Option.some(childDirective.value)
                          }))
                        )
                      )
                    }),
                    Effect.catchAll((err) => {
                      if (InternalValidationError.isCommandMismatch(err)) {
                        const parentName = Option.getOrElse(Arr.head(names), () => "")
                        const childNames = Arr.map(subcommands, ([name]) => `'${name}'`)
                        const oneOf = childNames.length === 1 ? "" : " one of"
                        const error = InternalHelpDoc.p(
                          `Invalid subcommand for ${parentName} - use${oneOf} ${Arr.join(childNames, ", ")}`
                        )
                        return Effect.fail(InternalValidationError.commandMismatch(error))
                      }
                      return Effect.fail(err)
                    })
                  )
                }
                return Effect.succeed(InternalCommandDirective.userDefined(directive.leftover, {
                  ...directive.value as any,
                  subcommand: Option.none()
                }))
              }
            }
          }),
          Effect.catchSome(() =>
            Arr.isEmptyReadonlyArray(args)
              ? Option.some(helpDirectiveForParent) :
              Option.none()
          )
        )
      )
    }
  }
}

const splitForcedArgs = (
  args: ReadonlyArray<string>
): [Array<string>, Array<string>] => {
  const [remainingArgs, forcedArgs] = Arr.span(args, (str) => str !== "--")
  return [remainingArgs, Arr.drop(forcedArgs, 1)]
}

const withDescriptionInternal = (
  self: Instruction,
  description: string | HelpDoc.HelpDoc
): Descriptor.Command<any> => {
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
      op.prompt = self.prompt
      return op
    }
    case "Map": {
      return mapEffect(withDescriptionInternal(self.command, description), self.f)
    }
    case "Subcommands": {
      const op = Object.create(proto)
      op._tag = "Subcommands"
      op.parent = withDescriptionInternal(self.parent, description)
      op.children = self.children.slice()
      return op
    }
  }
}

const argsWizardHeader = InternalSpan.code("Args Wizard - ")
const optionsWizardHeader = InternalSpan.code("Options Wizard - ")

const wizardInternal = (
  self: Instruction,
  prefix: ReadonlyArray<string>,
  config: CliConfig.CliConfig
): Effect.Effect<
  Array<string>,
  Terminal.QuitException | ValidationError.ValidationError,
  FileSystem.FileSystem | Path.Path | Terminal.Terminal
> => {
  const loop = (
    self: Instruction,
    commandLineRef: Ref.Ref<ReadonlyArray<string>>
  ): Effect.Effect<
    ReadonlyArray<string>,
    Terminal.QuitException | ValidationError.ValidationError,
    FileSystem.FileSystem | Path.Path | Terminal.Terminal
  > => {
    switch (self._tag) {
      case "GetUserInput":
      case "Standard": {
        return Effect.gen(function*() {
          const logCurrentCommand = Ref.get(commandLineRef).pipe(Effect.flatMap((commandLine) => {
            const currentCommand = InternalHelpDoc.p(pipe(
              InternalSpan.strong(InternalSpan.highlight("COMMAND:", Color.cyan)),
              InternalSpan.concat(InternalSpan.space),
              InternalSpan.concat(InternalSpan.highlight(
                Arr.join(commandLine, " "),
                Color.magenta
              ))
            ))
            return Console.log(InternalHelpDoc.toAnsiText(currentCommand))
          }))
          if (isStandard(self)) {
            // Log the current command line arguments
            yield* logCurrentCommand
            const commandName = InternalSpan.highlight(self.name, Color.magenta)
            // If the command has options, run the wizard for them
            if (!InternalOptions.isEmpty(self.options as InternalOptions.Instruction)) {
              const message = InternalHelpDoc.p(
                InternalSpan.concat(optionsWizardHeader, commandName)
              )
              yield* Console.log(InternalHelpDoc.toAnsiText(message))
              const options = yield* InternalOptions.wizard(self.options, config)
              yield* Ref.updateAndGet(commandLineRef, Arr.appendAll(options))
              yield* logCurrentCommand
            }
            // If the command has args, run the wizard for them
            if (!InternalArgs.isEmpty(self.args as InternalArgs.Instruction)) {
              const message = InternalHelpDoc.p(
                InternalSpan.concat(argsWizardHeader, commandName)
              )
              yield* Console.log(InternalHelpDoc.toAnsiText(message))
              const options = yield* InternalArgs.wizard(self.args, config)
              yield* Ref.updateAndGet(commandLineRef, Arr.appendAll(options))
              yield* logCurrentCommand
            }
          }
          return yield* Ref.get(commandLineRef)
        })
      }
      case "Map": {
        return loop(self.command, commandLineRef)
      }
      case "Subcommands": {
        const description = InternalHelpDoc.p("Select which command you would like to execute")
        const message = InternalHelpDoc.toAnsiText(description).trimEnd()
        const makeChoice = (title: string, index: number) => ({
          title,
          value: [title, index] as const
        })
        const choices = pipe(
          getSubcommandsInternal(self),
          Arr.map(([name], index) => makeChoice(name, index))
        )
        return loop(self.parent, commandLineRef).pipe(
          Effect.zipRight(
            InternalSelectPrompt.select({ message, choices }).pipe(
              Effect.tap(([name]) => Ref.update(commandLineRef, Arr.append(name))),
              Effect.zipLeft(Console.log()),
              Effect.flatMap(([, nextIndex]) => loop(self.children[nextIndex], commandLineRef))
            )
          )
        )
      }
    }
  }
  return Ref.make(prefix).pipe(
    Effect.flatMap((commandLineRef) =>
      loop(self, commandLineRef).pipe(
        Effect.zipRight(Ref.get(commandLineRef) as Effect.Effect<Array<string>>)
      )
    )
  )
}

// =============================================================================
// Completion Internals
// =============================================================================

const getShortDescription = (self: Instruction): string => {
  switch (self._tag) {
    case "Standard": {
      return InternalSpan.getText(InternalHelpDoc.getSpan(self.description))
    }
    case "GetUserInput": {
      return InternalSpan.getText(InternalHelpDoc.getSpan(self.description))
    }
    case "Map": {
      return getShortDescription(self.command)
    }
    case "Subcommands": {
      return ""
    }
  }
}

interface CommandInfo {
  readonly command: Standard | GetUserInput
  readonly parentCommands: ReadonlyArray<string>
  readonly subcommands: ReadonlyArray<[string, Standard | GetUserInput]>
  readonly level: number
}

/**
 * Allows for linear traversal of a `Command` data structure, accumulating state
 * based on information acquired from the command.
 */
const traverseCommand = <S>(
  self: Instruction,
  initialState: S,
  f: (state: S, info: CommandInfo) => Effect.Effect<S>
): Effect.Effect<S> =>
  SynchronizedRef.make(initialState).pipe(Effect.flatMap((ref) => {
    const loop = (
      self: Instruction,
      parentCommands: ReadonlyArray<string>,
      subcommands: ReadonlyArray<[string, Standard | GetUserInput]>,
      level: number
    ): Effect.Effect<void, never, never> => {
      switch (self._tag) {
        case "Standard": {
          const info: CommandInfo = {
            command: self,
            parentCommands,
            subcommands,
            level
          }
          return SynchronizedRef.updateEffect(ref, (state) => f(state, info))
        }
        case "GetUserInput": {
          const info: CommandInfo = {
            command: self,
            parentCommands,
            subcommands,
            level
          }
          return SynchronizedRef.updateEffect(ref, (state) => f(state, info))
        }
        case "Map": {
          return loop(self.command, parentCommands, subcommands, level)
        }
        case "Subcommands": {
          const parentNames = getNamesInternal(self.parent)
          const nextSubcommands = getSubcommandsInternal(self)
          const nextParentCommands = Arr.appendAll(parentCommands, parentNames)
          // Traverse the parent command using old parent names and next subcommands
          return loop(self.parent, parentCommands, nextSubcommands, level).pipe(
            Effect.zipRight(Effect.forEach(self.children, (child) =>
              // Traverse the child command using next parent names and old subcommands
              loop(child, nextParentCommands, subcommands, level + 1)))
          )
        }
      }
    }
    return Effect.suspend(() => loop(self, Arr.empty(), Arr.empty(), 0)).pipe(
      Effect.zipRight(SynchronizedRef.get(ref))
    )
  }))

const indentAll = dual<
  (indent: number) => (self: ReadonlyArray<string>) => Array<string>,
  (self: ReadonlyArray<string>, indent: number) => Array<string>
>(2, (self: ReadonlyArray<string>, indent: number): Array<string> => {
  const indentation = Arr.allocate(indent + 1).join(" ")
  return Arr.map(self, (line) => `${indentation}${line}`)
})

const getBashCompletionsInternal = (
  self: Instruction,
  executable: string
): Effect.Effect<Array<string>> =>
  traverseCommand(
    self,
    Arr.empty<[ReadonlyArray<string>, ReadonlyArray<string>]>(),
    (state, info) => {
      const options = isStandard(info.command)
        ? Options.all([info.command.options, InternalBuiltInOptions.builtIns])
        : InternalBuiltInOptions.builtIns
      const optionNames = InternalOptions.getNames(options as InternalOptions.Instruction)
      const optionCases = isStandard(info.command)
        ? InternalOptions.getBashCompletions(info.command.options as InternalOptions.Instruction)
        : Arr.empty()
      const subcommandNames = pipe(
        info.subcommands,
        Arr.map(([name]) => name),
        Arr.sort(Order.string)
      )
      const wordList = Arr.appendAll(optionNames, subcommandNames)
      const preformatted = Arr.isEmptyReadonlyArray(info.parentCommands)
        ? Arr.of(info.command.name)
        : pipe(
          info.parentCommands,
          Arr.append(info.command.name),
          Arr.map((command) => command.replace("-", "__"))
        )
      const caseName = Arr.join(preformatted, ",")
      const funcName = Arr.join(preformatted, "__")
      const funcLines = Arr.isEmptyReadonlyArray(info.parentCommands)
        ? Arr.empty()
        : [
          `${caseName})`,
          `    cmd="${funcName}"`,
          "    ;;"
        ]
      const cmdLines = [
        `${funcName})`,
        `    opts="${Arr.join(wordList, " ")}"`,
        `    if [[ \${cur} == -* || \${COMP_CWORD} -eq ${info.level + 1} ]] ; then`,
        "        COMPREPLY=( $(compgen -W \"${opts}\" -- \"${cur}\") )",
        "        return 0",
        "    fi",
        "    case \"${prev}\" in",
        ...indentAll(optionCases, 8),
        "    *)",
        "        COMPREPLY=()",
        "        ;;",
        "    esac",
        "    COMPREPLY=( $(compgen -W \"${opts}\" -- \"${cur}\") )",
        "    return 0",
        "    ;;"
      ]
      const lines = Arr.append(
        state,
        [funcLines, cmdLines] as [ReadonlyArray<string>, ReadonlyArray<string>]
      )
      return Effect.succeed(lines)
    }
  ).pipe(Effect.map((lines) => {
    const rootCommand = Arr.unsafeGet(getNamesInternal(self), 0)
    const scriptName = `_${rootCommand}_bash_completions`
    const funcCases = Arr.flatMap(lines, ([funcLines]) => funcLines)
    const cmdCases = Arr.flatMap(lines, ([, cmdLines]) => cmdLines)
    return [
      `function ${scriptName}() {`,
      "    local i cur prev opts cmd",
      "    COMPREPLY=()",
      "    cur=\"${COMP_WORDS[COMP_CWORD]}\"",
      "    prev=\"${COMP_WORDS[COMP_CWORD-1]}\"",
      "    cmd=\"\"",
      "    opts=\"\"",
      "    for i in \"${COMP_WORDS[@]}\"; do",
      "        case \"${cmd},${i}\" in",
      "            \",$1\")",
      `                cmd="${executable}"`,
      "                ;;",
      ...indentAll(funcCases, 12),
      "            *)",
      "                ;;",
      "        esac",
      "    done",
      "    case \"${cmd}\" in",
      ...indentAll(cmdCases, 8),
      "    esac",
      "}",
      `complete -F ${scriptName} -o nosort -o bashdefault -o default ${rootCommand}`
    ]
  }))

const getFishCompletionsInternal = (
  self: Instruction,
  executable: string
): Effect.Effect<Array<string>> =>
  traverseCommand(self, Arr.empty(), (state, info) => {
    const baseTemplate = Arr.make("complete", "-c", executable)
    const options = isStandard(info.command)
      ? InternalOptions.all([InternalBuiltInOptions.builtIns, info.command.options])
      : InternalBuiltInOptions.builtIns
    const optionsCompletions = InternalOptions.getFishCompletions(
      options as InternalOptions.Instruction
    )
    const argsCompletions = isStandard(info.command)
      ? InternalArgs.getFishCompletions(info.command.args as InternalArgs.Instruction)
      : Arr.empty()
    const rootCompletions = (conditionals: ReadonlyArray<string>) =>
      pipe(
        Arr.map(optionsCompletions, (option) =>
          pipe(
            baseTemplate,
            Arr.appendAll(conditionals),
            Arr.append(option),
            Arr.join(" ")
          )),
        Arr.appendAll(
          Arr.map(argsCompletions, (option) =>
            pipe(
              baseTemplate,
              Arr.appendAll(conditionals),
              Arr.append(option),
              Arr.join(" ")
            ))
        )
      )
    const subcommandCompletions = (conditionals: ReadonlyArray<string>) =>
      Arr.map(info.subcommands, ([name, subcommand]) => {
        const description = getShortDescription(subcommand)
        return pipe(
          baseTemplate,
          Arr.appendAll(conditionals),
          Arr.appendAll(Arr.make("-f", "-a", `"${name}"`)),
          Arr.appendAll(
            description.length === 0
              ? Arr.empty()
              : Arr.make("-d", `'${description}'`)
          ),
          Arr.join(" ")
        )
      })
    // If parent commands are empty, then the info is for the root command
    if (Arr.isEmptyReadonlyArray(info.parentCommands)) {
      const conditionals = Arr.make("-n", "\"__fish_use_subcommand\"")
      return Effect.succeed(pipe(
        state,
        Arr.appendAll(rootCompletions(conditionals)),
        Arr.appendAll(subcommandCompletions(conditionals))
      ))
    }
    // Otherwise the info is for a subcommand
    const parentConditionals = pipe(
      info.parentCommands,
      // Drop the root command name from the subcommand conditionals
      Arr.drop(1),
      Arr.append(info.command.name),
      Arr.map((command) => `__fish_seen_subcommand_from ${command}`)
    )
    const subcommandConditionals = Arr.map(
      info.subcommands,
      ([name]) => `not __fish_seen_subcommand_from ${name}`
    )
    const baseConditionals = pipe(
      Arr.appendAll(parentConditionals, subcommandConditionals),
      Arr.join("; and ")
    )
    const conditionals = Arr.make("-n", `"${baseConditionals}"`)
    return Effect.succeed(pipe(
      state,
      Arr.appendAll(rootCompletions(conditionals)),
      Arr.appendAll(subcommandCompletions(conditionals))
    ))
  })

const getZshCompletionsInternal = (
  self: Instruction,
  executable: string
): Effect.Effect<Array<string>> =>
  traverseCommand(self, Arr.empty<string>(), (state, info) => {
    const preformatted = Arr.isEmptyReadonlyArray(info.parentCommands)
      ? Arr.of(info.command.name)
      : pipe(
        info.parentCommands,
        Arr.append(info.command.name),
        Arr.map((command) => command.replace("-", "__"))
      )
    const underscoreName = Arr.join(preformatted, "__")
    const spaceName = Arr.join(preformatted, " ")
    const subcommands = pipe(
      info.subcommands,
      Arr.map(([name, subcommand]) => {
        const desc = getShortDescription(subcommand)
        return `'${name}:${desc}' \\`
      })
    )
    const commands = Arr.isEmptyReadonlyArray(subcommands)
      ? `commands=()`
      : `commands=(\n${Arr.join(indentAll(subcommands, 8), "\n")}\n    )`
    const handlerLines = [
      `(( $+functions[_${underscoreName}_commands] )) ||`,
      `_${underscoreName}_commands() {`,
      `    local commands; ${commands}`,
      `    _describe -t commands '${spaceName} commands' commands "$@"`,
      "}"
    ]
    return Effect.succeed(Arr.appendAll(state, handlerLines))
  }).pipe(Effect.map((handlers) => {
    const rootCommand = Arr.unsafeGet(getNamesInternal(self), 0)
    const cases = getZshSubcommandCases(self, Arr.empty(), Arr.empty())
    const scriptName = `_${rootCommand}_zsh_completions`
    return [
      `#compdef ${executable}`,
      "",
      "autoload -U is-at-least",
      "",
      `function ${scriptName}() {`,
      "    typeset -A opt_args",
      "    typeset -a _arguments_options",
      "    local ret=1",
      "",
      "    if is-at-least 5.2; then",
      "        _arguments_options=(-s -S -C)",
      "    else",
      "        _arguments_options=(-s -C)",
      "    fi",
      "",
      "    local context curcontext=\"$curcontext\" state line",
      ...indentAll(cases, 4),
      "}",
      "",
      ...handlers,
      "",
      `if [ "$funcstack[1]" = "${scriptName}" ]; then`,
      `    ${scriptName} "$@"`,
      "else",
      `    compdef ${scriptName} ${rootCommand}`,
      "fi"
    ]
  }))

const getZshSubcommandCases = (
  self: Instruction,
  parentCommands: ReadonlyArray<string>,
  subcommands: ReadonlyArray<[string, Standard | GetUserInput]>
): Array<string> => {
  switch (self._tag) {
    case "Standard":
    case "GetUserInput": {
      const options = isStandard(self)
        ? InternalOptions.all([InternalBuiltInOptions.builtIns, self.options])
        : InternalBuiltInOptions.builtIns
      const args = isStandard(self) ? self.args : InternalArgs.none
      const optionCompletions = pipe(
        InternalOptions.getZshCompletions(options as InternalOptions.Instruction),
        Arr.map((completion) => `'${completion}' \\`)
      )
      const argCompletions = pipe(
        InternalArgs.getZshCompletions(args as InternalArgs.Instruction),
        Arr.map((completion) => `'${completion}' \\`)
      )
      if (Arr.isEmptyReadonlyArray(parentCommands)) {
        return [
          "_arguments \"${_arguments_options[@]}\" \\",
          ...indentAll(optionCompletions, 4),
          ...indentAll(argCompletions, 4),
          `    ":: :_${self.name}_commands" \\`,
          `    "*::: :->${self.name}" \\`,
          "    && ret=0"
        ]
      }
      if (Arr.isEmptyReadonlyArray(subcommands)) {
        return [
          `(${self.name})`,
          "_arguments \"${_arguments_options[@]}\" \\",
          ...indentAll(optionCompletions, 4),
          ...indentAll(argCompletions, 4),
          "    && ret=0",
          ";;"
        ]
      }
      return [
        `(${self.name})`,
        "_arguments \"${_arguments_options[@]}\" \\",
        ...indentAll(optionCompletions, 4),
        ...indentAll(argCompletions, 4),
        `    ":: :_${Arr.append(parentCommands, self.name).join("__")}_commands" \\`,
        `    "*::: :->${self.name}" \\`,
        "    && ret=0"
      ]
    }
    case "Map": {
      return getZshSubcommandCases(self.command, parentCommands, subcommands)
    }
    case "Subcommands": {
      const nextSubcommands = getSubcommandsInternal(self)
      const parentNames = getNamesInternal(self.parent)
      const parentLines = getZshSubcommandCases(
        self.parent,
        parentCommands,
        Arr.appendAll(subcommands, nextSubcommands)
      )
      const childCases = pipe(
        self.children,
        Arr.flatMap((child) =>
          getZshSubcommandCases(
            child,
            Arr.appendAll(parentCommands, parentNames),
            subcommands
          )
        )
      )
      const hyphenName = pipe(
        Arr.appendAll(parentCommands, parentNames),
        Arr.join("-")
      )
      const childLines = pipe(
        parentNames,
        Arr.flatMap((parentName) => [
          "case $state in",
          `    (${parentName})`,
          `    words=($line[1] "\${words[@]}")`,
          "    (( CURRENT += 1 ))",
          `    curcontext="\${curcontext%:*:*}:${hyphenName}-command-$line[1]:"`,
          `    case $line[1] in`,
          ...indentAll(childCases, 8),
          "    esac",
          "    ;;",
          "esac"
        ]),
        Arr.appendAll(
          Arr.isEmptyReadonlyArray(parentCommands)
            ? Arr.empty()
            : Arr.of(";;")
        )
      )
      return Arr.appendAll(parentLines, childLines)
    }
  }
}

// Circular with ValidationError

/** @internal */
export const helpRequestedError = <A>(
  command: Descriptor.Command<A>
): ValidationError.ValidationError => {
  const op = Object.create(InternalValidationError.proto)
  op._tag = "HelpRequested"
  op.error = InternalHelpDoc.empty
  op.command = command
  return op
}
