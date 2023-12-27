import type * as Terminal from "@effect/platform/Terminal"
import * as Color from "@effect/printer-ansi/Color"
import * as Console from "effect/Console"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual, pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Option from "effect/Option"
import { pipeArguments } from "effect/Pipeable"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as BuiltInOptions from "../BuiltInOptions.js"
import type * as CliApp from "../CliApp.js"
import type * as CliConfig from "../CliConfig.js"
import type * as Command from "../CommandDescriptor.js"
import type * as HelpDoc from "../HelpDoc.js"
import type * as Span from "../HelpDoc/Span.js"
import type * as ValidationError from "../ValidationError.js"
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
export const make = <A>(config: {
  name: string
  version: string
  command: Command.Command<A>
  summary?: Span.Span
  footer?: HelpDoc.HelpDoc
}): CliApp.CliApp<A> => {
  const op = Object.create(proto)
  op.name = config.name
  op.version = config.version
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
    execute: (a: A) => Effect.Effect<R, E, void>
  ) => (
    self: CliApp.CliApp<A>
  ) => Effect.Effect<R | CliApp.CliApp.Environment, E | ValidationError.ValidationError, void>,
  <R, E, A>(
    self: CliApp.CliApp<A>,
    args: ReadonlyArray<string>,
    execute: (a: A) => Effect.Effect<R, E, void>
  ) => Effect.Effect<R | CliApp.CliApp.Environment, E | ValidationError.ValidationError, void>
>(3, <R, E, A>(
  self: CliApp.CliApp<A>,
  args: ReadonlyArray<string>,
  execute: (a: A) => Effect.Effect<R, E, void>
): Effect.Effect<R | CliApp.CliApp.Environment, E | ValidationError.ValidationError, void> =>
  Effect.contextWithEffect((context: Context.Context<CliApp.CliApp.Environment>) => {
    // Attempt to parse the CliConfig from the environment, falling back to the
    // default CliConfig if none was provided
    const config = Option.getOrElse(
      Context.getOption(context, InternalCliConfig.Tag),
      () => InternalCliConfig.defaultConfig
    )
    // Prefix the command name to the command line arguments
    const prefixedArgs = ReadonlyArray.appendAll(prefixCommand(self.command), args)
    // Handle the command
    return Effect.matchEffect(InternalCommand.parse(self.command, prefixedArgs, config), {
      onFailure: (e) => Effect.zipRight(printDocs(e.error), Effect.fail(e)),
      onSuccess: Effect.unifiedFn((directive) => {
        switch (directive._tag) {
          case "UserDefined": {
            return ReadonlyArray.matchLeft(directive.leftover, {
              onEmpty: () =>
                execute(directive.value).pipe(
                  Effect.catchSome((e) =>
                    InternalValidationError.isValidationError(e) &&
                      InternalValidationError.isHelpRequested(e)
                      ? Option.some(handleBuiltInOption(self, args, e.showHelp, execute, config))
                      : Option.none()
                  )
                ),
              onNonEmpty: (head) => {
                const error = InternalHelpDoc.p(`Received unknown argument: '${head}'`)
                return Effect.fail(InternalValidationError.invalidValue(error))
              }
            })
          }
          case "BuiltIn": {
            return handleBuiltInOption(self, args, directive.option, execute, config).pipe(
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

const printDocs = (error: HelpDoc.HelpDoc): Effect.Effect<never, never, void> =>
  Console.log(InternalHelpDoc.toAnsiText(error))

// TODO: move to `/platform`
const isQuitException = (u: unknown): u is Terminal.QuitException =>
  typeof u === "object" && u != null && "_tag" in u && u._tag === "QuitException"

const handleBuiltInOption = <R, E, A>(
  self: CliApp.CliApp<A>,
  args: ReadonlyArray<string>,
  builtIn: BuiltInOptions.BuiltInOptions,
  execute: (a: A) => Effect.Effect<R, E, void>,
  config: CliConfig.CliConfig
): Effect.Effect<
  R | CliApp.CliApp.Environment | Terminal.Terminal,
  E | ValidationError.ValidationError,
  void
> => {
  switch (builtIn._tag) {
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
          ReadonlyArray.map((span) => InternalHelpDoc.p(InternalSpan.concat(InternalSpan.text("$ "), span))),
          ReadonlyArray.reduceRight(
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
      const commandNames = ReadonlyArray.fromIterable(InternalCommand.getNames(self.command))
      if (ReadonlyArray.isNonEmptyReadonlyArray(commandNames)) {
        const programName = ReadonlyArray.headNonEmpty(commandNames)
        switch (builtIn.shellType) {
          case "bash": {
            return InternalCommand.getBashCompletions(self.command, programName).pipe(
              Effect.flatMap((completions) => Console.log(ReadonlyArray.join(completions, "\n")))
            )
          }
          case "fish": {
            return InternalCommand.getFishCompletions(self.command, programName).pipe(
              Effect.flatMap((completions) => Console.log(ReadonlyArray.join(completions, "\n")))
            )
          }
          case "zsh":
            return InternalCommand.getZshCompletions(self.command, programName).pipe(
              Effect.flatMap((completions) => Console.log(ReadonlyArray.join(completions, "\n")))
            )
        }
      }
      throw new Error(
        "[BUG]: BuiltInOptions.showCompletions - received empty list of command names"
      )
    }
    case "ShowWizard": {
      const commandNames = ReadonlyArray.fromIterable(InternalCommand.getNames(self.command))
      if (ReadonlyArray.isNonEmptyReadonlyArray(commandNames)) {
        const programName = ReadonlyArray.headNonEmpty(commandNames)
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
        const wizardPrefix = getWizardPrefix(builtIn, programName, args)
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
              return shouldRunCommand
                ? Console.log().pipe(
                  Effect.zipRight(run(self, ReadonlyArray.drop(args, 1), execute))
                )
                : Effect.unit
            }))
          ),
          Effect.catchAll((e) => {
            if (isQuitException(e)) {
              const message = InternalHelpDoc.p(InternalSpan.error("\n\nQuitting wizard mode..."))
              return Console.log(InternalHelpDoc.toAnsiText(message))
            }
            return Effect.fail(e)
          })
        )
      }
      throw new Error(
        "[BUG]: BuiltInOptions.showWizard - received empty list of command names"
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
  let prefix: ReadonlyArray<string> = ReadonlyArray.empty()
  while (command !== undefined) {
    switch (command._tag) {
      case "Standard": {
        prefix = ReadonlyArray.of(command.name)
        command = undefined
        break
      }
      case "GetUserInput": {
        prefix = ReadonlyArray.of(command.name)
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
  const [parentArgs, childArgs] = ReadonlyArray.span(
    commandLineArgs,
    (name) => !HashMap.has(subcommands, name)
  )
  const args = ReadonlyArray.matchLeft(childArgs, {
    onEmpty: () => ReadonlyArray.filter(parentArgs, (arg) => arg !== "--wizard"),
    onNonEmpty: (head) => ReadonlyArray.append(parentArgs, head)
  })
  return ReadonlyArray.prepend(args, rootCommand)
}

const renderWizardArgs = (args: ReadonlyArray<string>) => {
  const params = pipe(
    ReadonlyArray.filter(args, (param) => param.length > 0),
    ReadonlyArray.join(" ")
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
