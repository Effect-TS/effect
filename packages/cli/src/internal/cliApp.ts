import * as Console from "effect/Console"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as BuiltInOptions from "../BuiltInOptions.js"
import type * as CliApp from "../CliApp.js"
import type * as CliConfig from "../CliConfig.js"
import type * as Command from "../Command.js"
import type * as HelpDoc from "../HelpDoc.js"
import type * as Span from "../HelpDoc/Span.js"
import type * as ValidationError from "../ValidationError.js"
import * as InternalCliConfig from "./cliConfig.js"
import * as InternalCommand from "./command.js"
import * as InternalHelpDoc from "./helpDoc.js"
import * as InternalSpan from "./helpDoc/span.js"
import * as InternalTerminal from "./terminal.js"
import * as InternalUsage from "./usage.js"
import * as InternalValidationError from "./validationError.js"

// =============================================================================
// Constructors
// =============================================================================

const defaultConfig = {
  summary: InternalSpan.empty,
  footer: InternalHelpDoc.empty
}

/** @internal */
export const make = <A>(config: {
  name: string
  version: string
  command: Command.Command<A>
  summary?: Span.Span
  footer?: HelpDoc.HelpDoc
}): CliApp.CliApp<A> => Object.assign({}, defaultConfig, config)

// =============================================================================
// Combinators
// =============================================================================

/** @internal */
export const run = dual<
  <R, E, A>(
    args: ReadonlyArray<string>,
    f: (a: A) => Effect.Effect<R, E, void>
  ) => (self: CliApp.CliApp<A>) => Effect.Effect<R, E | ValidationError.ValidationError, void>,
  <R, E, A>(
    self: CliApp.CliApp<A>,
    args: ReadonlyArray<string>,
    f: (a: A) => Effect.Effect<R, E, void>
  ) => Effect.Effect<R, E | ValidationError.ValidationError, void>
>(3, <R, E, A>(
  self: CliApp.CliApp<A>,
  args: ReadonlyArray<string>,
  f: (a: A) => Effect.Effect<R, E, void>
): Effect.Effect<R, E | ValidationError.ValidationError, void> =>
  Effect.contextWithEffect((context: Context.Context<never>) => {
    const config = Option.getOrElse(
      Context.getOption(context, InternalCliConfig.Tag),
      () => InternalCliConfig.defaultConfig
    )
    const prefixedArgs = ReadonlyArray.appendAll(prefixCommand(self.command), args)
    return self.command.parse(prefixedArgs, config).pipe(Effect.matchEffect({
      onFailure: (e) => Effect.zipRight(printDocs(e.error), Effect.fail(e)),
      onSuccess: (directive): Effect.Effect<R, E | ValidationError.ValidationError, void> => {
        switch (directive._tag) {
          case "UserDefined": {
            return f(directive.value)
          }
          case "BuiltIn": {
            return handleBuiltInOption(self, directive.option, config).pipe(
              Effect.catchSome((e) =>
                InternalValidationError.isValidationError(e)
                  ? Option.some(Effect.zipRight(printDocs(e.error), Effect.fail(e)))
                  : Option.none()
              )
            )
          }
        }
      }
    }))
  }).pipe(Effect.provide(InternalTerminal.layer)))

// =============================================================================
// Internals
// =============================================================================

const printDocs = (error: HelpDoc.HelpDoc): Effect.Effect<never, never, void> =>
  Console.log(InternalHelpDoc.toAnsiText(error))

const handleBuiltInOption = <A>(
  self: CliApp.CliApp<A>,
  builtIn: BuiltInOptions.BuiltInOptions,
  config: CliConfig.CliConfig
): Effect.Effect<never, ValidationError.ValidationError, void> => {
  switch (builtIn._tag) {
    case "ShowHelp": {
      const banner = InternalHelpDoc.h1(InternalSpan.code(self.name))
      const header = InternalHelpDoc.p(InternalSpan.concat(
        InternalSpan.text(`${self.name} ${self.version} -- `),
        self.summary
      ))
      const usage = InternalHelpDoc.sequence(
        InternalHelpDoc.h1("USAGE"),
        pipe(
          InternalUsage.enumerate(builtIn.usage, config),
          ReadonlyArray.map((span) =>
            InternalHelpDoc.p(InternalSpan.concat(InternalSpan.text("$ "), span))
          ),
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
    case "ShowCompletionScript": {
      return Console.log("Showing completion script")
    }
    case "ShowCompletions": {
      return Console.log("Showing completions")
    }
    case "ShowWizard": {
      return Console.log("Showing the wizard")
    }
  }
}

const prefixCommand = <A>(self: Command.Command<A>): ReadonlyArray<string> => {
  let command: Command.Command<unknown> | undefined = self
  let prefix: ReadonlyArray<string> = ReadonlyArray.empty()
  while (command !== undefined) {
    if (InternalCommand.isStandard(command) || InternalCommand.isGetUserInput(command)) {
      prefix = ReadonlyArray.of(command.name)
      command = undefined
    }
    if (InternalCommand.isMap(command)) {
      command = command.command
    }
    if (InternalCommand.isOrElse(command)) {
      prefix = ReadonlyArray.empty()
      command = undefined
    }
    if (InternalCommand.isSubcommands(command)) {
      command = command.parent
    }
  }
  return prefix
}
