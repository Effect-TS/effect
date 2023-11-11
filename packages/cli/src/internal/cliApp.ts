import type * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import * as Console from "effect/Console"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual, pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as ReadonlyRecord from "effect/ReadonlyRecord"
import { unify } from "effect/Unify"
import type * as BuiltInOptions from "../BuiltInOptions.js"
import type * as CliApp from "../CliApp.js"
import type * as CliConfig from "../CliConfig.js"
import type * as Command from "../Command.js"
import type * as Compgen from "../Compgen.js"
import type * as HelpDoc from "../HelpDoc.js"
import type * as Span from "../HelpDoc/Span.js"
import type * as ValidationError from "../ValidationError.js"
import * as InternalCliConfig from "./cliConfig.js"
import * as InternalCommand from "./command.js"
import * as InternalCompgen from "./compgen.js"
import * as InternalCompletion from "./completion.js"
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

const MainLive = Layer.merge(InternalTerminal.LiveTerminal, InternalCompgen.LiveCompgen)

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
    return Effect.matchEffect(self.command.parse(prefixedArgs, config), {
      onFailure: (e) => Effect.zipRight(printDocs(e.error), Effect.fail(e)),
      onSuccess: unify((directive) => {
        switch (directive._tag) {
          case "UserDefined": {
            return execute(directive.value)
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
      })
    })
  }).pipe(Effect.provide(MainLive)))

// =============================================================================
// Internals
// =============================================================================

const printDocs = (error: HelpDoc.HelpDoc): Effect.Effect<never, never, void> =>
  Console.log(InternalHelpDoc.toAnsiText(error))

const handleBuiltInOption = <A>(
  self: CliApp.CliApp<A>,
  builtIn: BuiltInOptions.BuiltInOptions,
  config: CliConfig.CliConfig
): Effect.Effect<
  Compgen.Compgen | FileSystem.FileSystem | Path.Path,
  ValidationError.ValidationError,
  void
> =>
  Effect.gen(function*(_) {
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
        return yield* _(Console.log(InternalHelpDoc.toAnsiText(helpDoc)))
      }
      case "ShowCompletionScript": {
        const path = yield* _(Path.Path)
        const commandNames = ReadonlyArray.fromIterable(self.command.names)
        const programNames = ReadonlyArray.isNonEmptyReadonlyArray(commandNames)
          ? commandNames
          : ReadonlyArray.of(self.name)
        const script = InternalCompletion.getCompletionScript(
          builtIn.pathToExecutable,
          programNames,
          builtIn.shellType,
          path
        )
        return yield* _(Console.log(script))
      }
      case "ShowCompletions": {
        const compgen = yield* _(InternalCompgen.Tag)
        const env = yield* _(Effect.sync(() => process.env))
        const tupleOrder = Order.mapInput(Order.number, (tuple: [number, string]) => tuple[0])
        const compWords = pipe(
          ReadonlyRecord.collect(
            env,
            (key, value) =>
              key.startsWith("COMP_WORD_") && value !== undefined
                ? Option.some<[number, string]>([key.replace("COMP_WORD_", "").length, value])
                : Option.none()
          ),
          ReadonlyArray.compact,
          ReadonlyArray.sortBy(tupleOrder),
          ReadonlyArray.map(([, value]) => value)
        )
        const completions = yield* _(InternalCompletion.getCompletions(
          compWords,
          builtIn.index,
          self.command,
          config,
          compgen
        ))
        return Effect.forEach(completions, (word) => Console.log(word), { discard: true })
      }
      case "ShowWizard": {
        return yield* _(Console.log("Showing the wizard"))
      }
    }
  })

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
