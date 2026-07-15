import * as Console from "../../../Console.ts"
import * as Effect from "../../../Effect.ts"
import * as Option from "../../../Option.ts"
import * as Redacted from "../../../Redacted.ts"
import type * as Terminal from "../../../Terminal.ts"
import type * as CliError from "../CliError.ts"
import type * as Command from "../Command.ts"
import * as Param from "../Param.ts"
import * as Primitive from "../Primitive.ts"
import * as Prompt from "../Prompt.ts"
import * as Ansi from "./ansi.ts"
import { toImpl } from "./command.ts"

export interface Options {
  readonly commandPath?: ReadonlyArray<string> | undefined
  readonly prefix?: ReadonlyArray<string> | undefined
}

export const run: (
  command: Command.Command.Any,
  options?: Options
) => Effect.Effect<Array<string>, CliError.CliError | Terminal.QuitError, Command.Environment> = Effect.fnUntraced(
  function*(command, options) {
    const commandPath = options?.commandPath ?? [command.name]
    const selected = getCommandAtPath(command, commandPath)
    const commandLine = [...(options?.prefix ?? commandPath)]
    yield* logCurrentCommand(commandLine)
    yield* promptCommand(selected, commandLine)
    return commandLine
  }
)

const getCommandAtPath = (
  command: Command.Command.Any,
  commandPath: ReadonlyArray<string>
): Command.Command.Any => {
  let current = command
  for (const name of commandPath.slice(1)) {
    const child = current.subcommands
      .flatMap((group) => group.commands)
      .find((candidate) => candidate.name === name || candidate.alias === name)
    if (child === undefined) {
      break
    }
    current = child
  }
  return current
}

const promptCommand: (
  command: Command.Command.Any,
  commandLine: Array<string>
) => Effect.Effect<void, CliError.CliError | Terminal.QuitError, Command.Environment> = Effect.fnUntraced(
  function*(command, commandLine) {
    const impl = toImpl(command)
    const visibleSubcommands = command.subcommands.flatMap((group) => group.commands.filter((child) => !child.hidden))
    const config = visibleSubcommands.length === 0 ? impl.config : impl.contextConfig

    if (config.flags.length > 0) {
      yield* Console.log(renderSection("Options Wizard", command.name))
      for (const param of config.flags) {
        commandLine.push(...yield* promptParam(param))
      }
      yield* logCurrentCommand(commandLine)
    }

    if (config.arguments.length > 0) {
      yield* Console.log(renderSection("Args Wizard", command.name))
      for (const param of config.arguments) {
        commandLine.push(...yield* promptParam(param))
      }
      yield* logCurrentCommand(commandLine)
    }

    if (visibleSubcommands.length === 0) {
      return
    }

    const child = yield* runPrompt(Prompt.select({
      message: "Select which command you would like to execute",
      choices: visibleSubcommands.map((command) => ({
        title: command.name,
        value: command,
        ...(command.shortDescription !== undefined
          ? { description: command.shortDescription }
          : command.description !== undefined
          ? { description: command.description }
          : {})
      }))
    }))
    commandLine.push(child.name)
    yield* logCurrentCommand(commandLine)
    yield* promptCommand(child, commandLine)
  }
)

const promptParam: (
  param: Param.Any
) => Effect.Effect<Array<string>, CliError.CliError | Terminal.QuitError, Command.Environment> = Effect.fnUntraced(
  function*(param) {
    const single = Param.getUnderlyingSingleOrThrow(param)
    const metadata = Param.getParamMetadata(param)

    if (metadata.isOptional) {
      const include = yield* runPrompt(Prompt.confirm({
        message: `Provide ${formatName(single)}?`,
        initial: false
      }))
      if (!include) {
        return []
      }
    }

    const count = !metadata.isVariadic
      ? 1
      : yield* runPrompt(Prompt.integer({
        message: `How many values should be provided for ${formatName(single)}?`,
        default: Option.getOrElse(metadata.variadicMin, () => 0),
        min: Option.getOrElse(metadata.variadicMin, () => 0),
        ...(Option.isSome(metadata.variadicMax) ? { max: metadata.variadicMax.value } : {})
      }))
    const values: Array<string> = []
    for (let i = 0; i < count; i++) {
      values.push(yield* promptSingle(single))
    }

    const parsed = single.kind === Param.flagKind
      ? {
        flags: { [single.name]: values },
        arguments: []
      }
      : {
        flags: {},
        arguments: values
      }
    yield* param.parse(parsed)

    if (single.kind === Param.argumentKind) {
      return values
    }
    return values.flatMap((value) => [`--${single.name}`, value])
  }
)

const promptSingle = (
  single: Param.Single<Param.ParamKind, unknown>
): Effect.Effect<string, Terminal.QuitError, Command.Environment> => {
  const message = renderParamMessage(single)
  switch (single.primitiveType._tag) {
    case "Boolean":
      return Effect.map(runPrompt(Prompt.toggle({ message })), String)
    case "Choice": {
      const choices = Primitive.getChoiceKeys(single.primitiveType) ?? []
      return runPrompt(Prompt.select({
        message,
        choices: choices.map((choice) => ({ title: choice, value: choice }))
      }))
    }
    case "Date":
      return Effect.map(runPrompt(Prompt.date({ message })), (date) => date.toISOString())
    case "Float":
      return Effect.map(runPrompt(Prompt.float({ message })), String)
    case "Integer":
      return Effect.map(runPrompt(Prompt.integer({ message })), String)
    case "Redacted":
      return Effect.map(runPrompt(Prompt.password({ message })), Redacted.value)
    default:
      return runPrompt(Prompt.text({ message }))
  }
}

const runPrompt = <A>(
  prompt: Prompt.Prompt<A>
): Effect.Effect<A, Terminal.QuitError, Command.Environment> => Prompt.run(prompt).pipe(Effect.tap(() => Console.log()))

const formatName = (single: Param.Single<Param.ParamKind, unknown>): string =>
  single.kind === Param.flagKind ? `--${single.name}` : single.name

const renderParamMessage = (single: Param.Single<Param.ParamKind, unknown>): string => {
  const name = Ansi.annotate(formatName(single), Ansi.bold, Ansi.white)
  const type = Ansi.annotate(single.typeName ?? Primitive.getTypeName(single.primitiveType), Ansi.blackBright)
  const description = Option.match(single.description, {
    onNone: () => "",
    onSome: (description) => `\n  ${description}`
  })
  return `${name} ${type}${description}\n${getPrimitiveInstruction(single.primitiveType)}`
}

const getPrimitiveInstruction = (primitive: Primitive.Primitive<unknown>): string => {
  switch (primitive._tag) {
    case "Boolean":
      return "Select true or false"
    case "Choice":
      return "Select one of the following choices"
    case "Date":
      return "Enter a date"
    case "Float":
      return "Enter a floating point value"
    case "Integer":
      return "Enter an integer"
    case "Path":
    case "FileText":
    case "FileParse":
    case "FileSchema":
      return "Select a file system path"
    case "Redacted":
      return "Enter some text (value will be redacted)"
    case "KeyValuePair":
      return "Enter a key=value pair"
    default:
      return "Enter some text"
  }
}

const logCurrentCommand = (commandLine: ReadonlyArray<string>): Effect.Effect<void> =>
  Console.log(
    `${Ansi.annotate("COMMAND:", Ansi.bold, Ansi.cyanBright)} ${Ansi.annotate(commandLine.join(" "), Ansi.magenta)}`
  )

const renderSection = (section: string, commandName: string): string =>
  `\n${Ansi.annotate(`${section} -`, Ansi.bold, Ansi.white)} ${Ansi.annotate(commandName, Ansi.magenta)}`

export const renderIntroduction = (name: string, version: string, summary: string | undefined): string => {
  const title = Ansi.annotate(`Wizard Mode for CLI Application: ${name} (${version})`, Ansi.bold, Ansi.white)
  const suffix = summary === undefined || summary.length === 0 ? "" : ` -- ${summary}`
  return [
    `${title}${suffix}`,
    "",
    Ansi.annotate("Instructions", Ansi.bold),
    `  The wizard mode will assist you with constructing commands for ${name} (${version}).`,
    "  Please answer all prompts provided by the wizard.",
    ""
  ].join("\n")
}

export const renderCompletion = (commandLine: ReadonlyArray<string>): string =>
  [
    "",
    Ansi.annotate("Wizard Mode Complete!", Ansi.bold, Ansi.white),
    "",
    "You may now execute your command directly with the following options and arguments:",
    "",
    `    ${Ansi.annotate(commandLine.join(" "), Ansi.cyanBright)}`
  ].join("\n")

export const renderQuit = (): string => `\n\n${Ansi.annotate("Quitting wizard mode...", Ansi.red)}`
