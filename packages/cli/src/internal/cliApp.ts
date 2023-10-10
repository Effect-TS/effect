import * as Console from "effect/Console"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual, pipe } from "effect/Function"
import * as Option from "effect/Option"
import type * as BuiltInOption from "../BuiltInOption"
import type * as CliApp from "../CliApp"
import type * as Command from "../Command"
import type * as HelpDoc from "../HelpDoc"
import type * as Span from "../HelpDoc/Span"
import type * as ValidationError from "../ValidationError"
import * as cliConfig from "./cliConfig"
import * as command from "./command"
import * as commandDirective from "./commandDirective"
import * as doc from "./helpDoc"
import * as span from "./helpDoc/span"
import * as terminal from "./terminal"
import * as _usage from "./usage"
import * as validationError from "./validationError"

const defaultConfig = {
  summary: span.empty,
  footer: doc.empty
}

/** @internal */
export const make = <A>(config: {
  name: string
  version: string
  command: Command.Command<A>
  summary?: Span.Span
  footer?: HelpDoc.HelpDoc
}): CliApp.CliApp<A> => Object.assign({}, defaultConfig, config)

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
>(3, (self, args, f) =>
  Effect.contextWithEffect((context: Context.Context<never>) => {
    const config = Option.getOrElse(Context.getOption(context, cliConfig.Tag), () => cliConfig.defaultConfig)
    return Effect.matchEffect(
      command.parse(self.command, [...prefixCommand(self.command), ...args], config),
      {
        onFailure: (error) => Effect.zipRight(printDocs(error), Effect.fail(error)),
        onSuccess: (directive) =>
          commandDirective.isUserDefined(directive)
            ? f(directive.value)
            : Effect.catchSome(
              runBuiltIn(directive.option, self),
              (error) =>
                validationError.isValidationError(error) ?
                  Option.some(Effect.zipRight(printDocs(error), Effect.fail(error))) :
                  Option.none()
            )
      }
    )
  }).pipe(Effect.provide(terminal.layer)))

const prefixCommandMap: {
  [K in command.Instruction["_tag"]]: (self: Extract<command.Instruction, { _tag: K }>) => ReadonlyArray<string>
} = {
  Single: (self) => [self.name],
  Map: (self) => prefixCommandMap[self.command._tag](self.command as any),
  OrElse: () => [],
  Subcommands: (self) => prefixCommandMap[self.parent._tag](self.parent as any)
}

const prefixCommand = <A>(self: Command.Command<A>): ReadonlyArray<string> =>
  prefixCommandMap[(self as command.Instruction)._tag](self as any)

const runBuiltInMap: {
  [K in BuiltInOption.BuiltInOption["_tag"]]: (
    self: Extract<BuiltInOption.BuiltInOption, { _tag: K }>,
    cliApp: CliApp.CliApp<any>
  ) => Effect.Effect<never, never, void>
} = {
  ShowCompletions: () =>
    //   case ShowCompletions(index, _) =>
    //     envs.flatMap { envMap =>
    //       val compWords = envMap.collect {
    //         case (idx, word) if idx.startsWith("COMP_WORD_") =>
    //           (idx.drop("COMP_WORD_".length).toInt, word)
    //       }.toList.sortBy(_._1).map(_._2)

    //       Completion
    //         .complete(compWords, index, self.command, self.config)
    //         .flatMap { completions =>
    //           ZIO.foreachDiscard(completions)(word => printLine(word))
    //         }
    //     }
    Console.log("Showing Completions"),
  ShowCompletionScript: () =>
    //   case ShowCompletionScript(path, shellType) =>
    //     printLine(
    //       CompletionScript(path, if (self.command.names.nonEmpty) self.command.names else Set(self.name), shellType)
    //     )
    Console.log("Showing Completion Script"),
  ShowHelp: (self, cliApp) => {
    const banner = doc.h1(span.code(cliApp.name))
    const header = doc.p(span.concat(span.text(`${cliApp.name} v${cliApp.version} -- `), cliApp.summary))
    const usage = doc.sequence(
      doc.h1("USAGE"),
      doc.p(span.concat(span.text("$ "), doc.getSpan(_usage.helpDoc(self.usage))))
    )
    // TODO: add rendering of built-in options such as help
    const helpDoc = pipe(
      banner,
      doc.sequence(header),
      doc.sequence(usage),
      doc.sequence(self.helpDoc),
      doc.sequence(cliApp.footer)
    )
    const helpText = doc.toAnsiText(helpDoc)
    return Console.log(helpText)
  },
  Wizard: () =>
    //     val subcommands = command.getSubcommands
    //     for {
    //       subcommandName <- if (subcommands.size == 1) ZIO.succeed(subcommands.keys.head)
    //                         else
    //                           (print("Command" + subcommands.keys.mkString("(", "|", "): ")) *> readLine).orDie
    //       subcommand <-
    //         ZIO
    //           .fromOption(subcommands.get(subcommandName))
    //           .orElseFail(ValidationError(ValidationErrorType.InvalidValue, HelpDoc.p("Invalid subcommand")))
    //       args   <- subcommand.generateArgs
    //       _      <- Console.printLine(s"Executing command: ${(prefix(self.command) ++ args).mkString(" ")}")
    //       result <- self.run(args)
    //     } yield result
    Console.log("Running Wizard")
}

const runBuiltIn = <A>(
  self: BuiltInOption.BuiltInOption,
  cliApp: CliApp.CliApp<A>
): Effect.Effect<never, never, void> => runBuiltInMap[self._tag](self as any, cliApp)

const printDocs = (error: ValidationError.ValidationError) => Console.log(doc.toAnsiText(error.error))
