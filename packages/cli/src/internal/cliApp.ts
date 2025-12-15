import * as Terminal from "@effect/platform/Terminal"
import * as Color from "@effect/printer-ansi/Color"
import * as Arr from "effect/Array"
import * as Console from "effect/Console"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual, pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Logger from "effect/Logger"
import * as Option from "effect/Option"
import { pipeArguments } from "effect/Pipeable"
import * as Unify from "effect/Unify"
import type * as BuiltInOptions from "../BuiltInOptions.js"
import type * as CliApp from "../CliApp.js"
import type * as CliConfig from "../CliConfig.js"
import type * as Command from "../CommandDescriptor.js"
import type * as HelpDoc from "../HelpDoc.js"
import type * as ValidationError from "../ValidationError.js"
import * as InternalBuiltInOptions from "./builtInOptions.js"
import * as InternalCliConfig from "./cliConfig.js"
import * as InternalCommand from "./commandDescriptor.js"
import * as InternalHelpDoc from "./helpDoc.js"
import * as InternalSpan from "./helpDoc/span.js"
import * as InternalTogglePrompt from "./prompt/toggle.js"
import * as InternalUsage from "./usage.js"
import * as InternalValidationError from "./validationError.js"

const proto = {
  pipe() {
    return pipeArguments(this, arguments)
  }
}

// =============================================================================
// Constructors
// =============================================================================

/** @internal */
export const make = <A>(config: CliApp.CliApp.ConstructorArgs<A>): CliApp.CliApp<A> => {
  const op = Object.create(proto)
  op.name = config.name
  op.version = config.version
  op.executable = config.executable
  op.command = config.command
  op.summary = config.summary || InternalSpan.empty
  op.footer = config.footer || InternalHelpDoc.empty
  return op
}

// =============================================================================
// Combinators
// =============================================================================

/** @internal */
export const run = dual<
  <R, E, A>(
    args: ReadonlyArray<string>,
    execute: (a: A) => Effect.Effect<void, E, R>
  ) => (
    self: CliApp.CliApp<A>
  ) => Effect.Effect<void, E | ValidationError.ValidationError, R | CliApp.CliApp.Environment>,
  <R, E, A>(
    self: CliApp.CliApp<A>,
    args: ReadonlyArray<string>,
    execute: (a: A) => Effect.Effect<void, E, R>
  ) => Effect.Effect<void, E | ValidationError.ValidationError, R | CliApp.CliApp.Environment>
>(3, <R, E, A>(
  self: CliApp.CliApp<A>,
  args: ReadonlyArray<string>,
  execute: (a: A) => Effect.Effect<void, E, R>
): Effect.Effect<void, E | ValidationError.ValidationError, R | CliApp.CliApp.Environment> =>
  Effect.contextWithEffect((context: Context.Context<CliApp.CliApp.Environment>) => {
    // Attempt to parse the CliConfig from the environment, falling back to the
    // default CliConfig if none was provided
    const config = Option.getOrElse(
      Context.getOption(context, InternalCliConfig.Tag),
      () => InternalCliConfig.defaultConfig
    )
    // Remove the executable from the command line arguments
    const [executable, filteredArgs] = splitExecutable(self, args)
    // Prefix the command name to the command line arguments
    const prefixedArgs = Arr.appendAll(prefixCommand(self.command), filteredArgs)
    // Handle the command
    return Effect.matchEffect(InternalCommand.parse(self.command, prefixedArgs, config), {
      onFailure: (e) => Effect.zipRight(printDocs(e.error), Effect.fail(e)),
      onSuccess: Unify.unify((directive) => {
        switch (directive._tag) {
          case "UserDefined": {
            return Arr.matchLeft(directive.leftover, {
              onEmpty: () =>
                execute(directive.value).pipe(
                  Effect.catchSome((e) =>
                    InternalValidationError.isValidationError(e) &&
                      InternalValidationError.isHelpRequested(e)
                      ? Option.some(
                        handleBuiltInOption(
                          self,
                          executable,
                          filteredArgs,
                          InternalBuiltInOptions.showHelp(
                            InternalCommand.getUsage(e.command),
                            InternalCommand.getHelp(e.command, config)
                          ),
                          execute,
                          config,
                          args
                        )
                      )
                      : Option.none()
                  )
                ),
              onNonEmpty: (head) => {
                const error = InternalHelpDoc.p(`Received unknown argument: '${head}'`)
                return Effect.zipRight(printDocs(error), Effect.fail(InternalValidationError.invalidValue(error)))
              }
            })
          }
          case "BuiltIn": {
            return handleBuiltInOption(self, executable, filteredArgs, directive.option, execute, config, args).pipe(
              Effect.catchSome((e) =>
                InternalValidationError.isValidationError(e)
                  ? Option.some(Effect.zipRight(printDocs(e.error), Effect.fail(e)))
                  : Option.none()
              )
            )
          }
        }
      })
    })
  }))

// =============================================================================
// Internals
// =============================================================================

const splitExecutable = <A>(self: CliApp.CliApp<A>, args: ReadonlyArray<string>): [
  executable: string,
  args: ReadonlyArray<string>
] => {
  if (self.executable !== undefined) {
    return [self.executable, Arr.drop(args, 2)]
  }
  const [[runtime, script], optionsAndArgs] = Arr.splitAt(args, 2)
  return [`${runtime} ${script}`, optionsAndArgs]
}

const printDocs = (error: HelpDoc.HelpDoc): Effect.Effect<void> => Console.error(InternalHelpDoc.toAnsiText(error))

const handleBuiltInOption = <R, E, A>(
  self: CliApp.CliApp<A>,
  executable: string,
  args: ReadonlyArray<string>,
  builtIn: BuiltInOptions.BuiltInOptions,
  execute: (a: A) => Effect.Effect<void, E, R>,
  config: CliConfig.CliConfig,
  originalArgs: ReadonlyArray<string>
): Effect.Effect<
  void,
  E | ValidationError.ValidationError,
  R | CliApp.CliApp.Environment | Terminal.Terminal
> => {
  switch (builtIn._tag) {
    case "SetLogLevel": {
      // Use first 2 elements from originalArgs (runtime + script) to preserve paths with spaces
      // Filter out --log-level from args before re-executing
      const baseArgs = Arr.take(originalArgs, 2)
      const filteredArgs: Array<string> = []
      for (let i = 0; i < args.length; i++) {
        if (isLogLevelArg(args[i]) || isLogLevelArg(args[i - 1])) {
          continue
        }
        filteredArgs.push(args[i])
      }
      const nextArgs = Arr.appendAll(baseArgs, filteredArgs)
      return run(self, nextArgs, execute).pipe(
        Logger.withMinimumLogLevel(builtIn.level)
      )
    }
    case "ShowHelp": {
      const banner = InternalHelpDoc.h1(InternalSpan.code(self.name))
      const header = InternalHelpDoc.p(InternalSpan.spans([
        InternalSpan.text(`${self.name} ${self.version}`),
        InternalSpan.isEmpty(self.summary)
          ? InternalSpan.empty
          : InternalSpan.spans([
            InternalSpan.space,
            InternalSpan.text("--"),
            InternalSpan.space,
            self.summary
          ])
      ]))
      const usage = InternalHelpDoc.sequence(
        InternalHelpDoc.h1("USAGE"),
        pipe(
          InternalUsage.enumerate(builtIn.usage, config),
          Arr.map((span) => InternalHelpDoc.p(InternalSpan.concat(InternalSpan.text("$ "), span))),
          Arr.reduceRight(
            InternalHelpDoc.empty,
            (left, right) => InternalHelpDoc.sequence(left, right)
          )
        )
      )
      const helpDoc = pipe(
        banner,
        InternalHelpDoc.sequence(header),
        InternalHelpDoc.sequence(usage),
        InternalHelpDoc.sequence(builtIn.helpDoc),
        InternalHelpDoc.sequence(self.footer)
      )
      return Console.log(InternalHelpDoc.toAnsiText(helpDoc))
    }
    case "ShowCompletions": {
      const command = Arr.fromIterable(InternalCommand.getNames(self.command))[0]!
      switch (builtIn.shellType) {
        case "bash": {
          return InternalCommand.getBashCompletions(self.command, command).pipe(
            Effect.flatMap((completions) => Console.log(Arr.join(completions, "\n")))
          )
        }
        case "fish": {
          return InternalCommand.getFishCompletions(self.command, command).pipe(
            Effect.flatMap((completions) => Console.log(Arr.join(completions, "\n")))
          )
        }
        case "zsh":
          return InternalCommand.getZshCompletions(self.command, command).pipe(
            Effect.flatMap((completions) => Console.log(Arr.join(completions, "\n")))
          )
      }
    }
    case "ShowWizard": {
      const summary = InternalSpan.isEmpty(self.summary)
        ? InternalSpan.empty
        : InternalSpan.spans([
          InternalSpan.space,
          InternalSpan.text("--"),
          InternalSpan.space,
          self.summary
        ])
      const instructions = InternalHelpDoc.sequence(
        InternalHelpDoc.p(InternalSpan.spans([
          InternalSpan.text("The wizard mode will assist you with constructing commands for"),
          InternalSpan.space,
          InternalSpan.code(`${self.name} (${self.version})`),
          InternalSpan.text(".")
        ])),
        InternalHelpDoc.p("Please answer all prompts provided by the wizard.")
      )
      const description = InternalHelpDoc.descriptionList([[
        InternalSpan.text("Instructions"),
        instructions
      ]])
      const header = InternalHelpDoc.h1(
        InternalSpan.spans([
          InternalSpan.code("Wizard Mode for CLI Application:"),
          InternalSpan.space,
          InternalSpan.code(self.name),
          InternalSpan.space,
          InternalSpan.code(`(${self.version})`),
          summary
        ])
      )
      const help = InternalHelpDoc.sequence(header, description)
      const text = InternalHelpDoc.toAnsiText(help)
      const command = Arr.fromIterable(InternalCommand.getNames(self.command))[0]!
      const wizardPrefix = getWizardPrefix(builtIn, command, args)
      return Console.log(text).pipe(
        Effect.zipRight(InternalCommand.wizard(builtIn.command, wizardPrefix, config)),
        Effect.tap((args) => Console.log(InternalHelpDoc.toAnsiText(renderWizardArgs(args)))),
        Effect.flatMap((args) =>
          InternalTogglePrompt.toggle({
            message: "Would you like to run the command?",
            initial: true,
            active: "yes",
            inactive: "no"
          }).pipe(Effect.flatMap((shouldRunCommand) => {
            // Use first 2 elements from originalArgs (runtime + script) to preserve paths with spaces
            // This mimics executable.split() behavior but without breaking Windows paths
            const baseArgs = Arr.take(originalArgs, 2)
            const wizardArgs = Arr.drop(args, 1)
            const finalArgs = Arr.appendAll(baseArgs, wizardArgs)
            return shouldRunCommand
              ? Console.log().pipe(Effect.zipRight(run(self, finalArgs, execute)))
              : Effect.void
          }))
        ),
        Effect.catchAll((e) => {
          if (Terminal.isQuitException(e)) {
            const message = InternalHelpDoc.p(InternalSpan.error("\n\nQuitting wizard mode..."))
            return Console.log(InternalHelpDoc.toAnsiText(message))
          }
          return Effect.fail(e)
        })
      )
    }
    case "ShowVersion": {
      const help = InternalHelpDoc.p(self.version)
      return Console.log(InternalHelpDoc.toAnsiText(help))
    }
  }
}

const prefixCommand = <A>(self: Command.Command<A>): ReadonlyArray<string> => {
  let command: InternalCommand.Instruction | undefined = self as InternalCommand.Instruction
  let prefix: ReadonlyArray<string> = Arr.empty()
  while (command !== undefined) {
    switch (command._tag) {
      case "Standard": {
        prefix = Arr.of(command.name)
        command = undefined
        break
      }
      case "GetUserInput": {
        prefix = Arr.of(command.name)
        command = undefined
        break
      }
      case "Map": {
        command = command.command
        break
      }
      case "Subcommands": {
        command = command.parent
        break
      }
    }
  }
  return prefix
}

const getWizardPrefix = (
  builtIn: BuiltInOptions.ShowWizard,
  rootCommand: string,
  commandLineArgs: ReadonlyArray<string>
): ReadonlyArray<string> => {
  const subcommands = InternalCommand.getSubcommands(builtIn.command)
  const [parentArgs, childArgs] = Arr.span(
    commandLineArgs,
    (name) => !HashMap.has(subcommands, name)
  )
  const args = Arr.matchLeft(childArgs, {
    onEmpty: () => Arr.filter(parentArgs, (arg) => arg !== "--wizard"),
    onNonEmpty: (head) => Arr.append(parentArgs, head)
  })
  return Arr.appendAll(rootCommand.split(/\s+/), args)
}

const renderWizardArgs = (args: ReadonlyArray<string>) => {
  const params = pipe(
    Arr.filter(args, (param) => param.length > 0),
    Arr.join(" ")
  )
  const executeMsg = InternalSpan.text(
    "You may now execute your command directly with the following options and arguments:"
  )
  return InternalHelpDoc.blocks([
    InternalHelpDoc.p(InternalSpan.strong(InternalSpan.code("Wizard Mode Complete!"))),
    InternalHelpDoc.p(executeMsg),
    InternalHelpDoc.p(InternalSpan.concat(
      InternalSpan.text("    "),
      InternalSpan.highlight(params, Color.cyan)
    ))
  ])
}

const isLogLevelArg = (arg?: string) => {
  return arg && (arg === "--log-level" || arg.startsWith("--log-level="))
}
