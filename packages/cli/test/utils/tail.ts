import * as Args from "@effect/cli/Args"
import * as Command from "@effect/cli/Command"
import * as Options from "@effect/cli/Options"

export const options: Options.Options<number> = Options.integer("n")

export const args: Args.Args<string> = Args.text({ name: "file" })

export const command: Command.Command<{
  readonly name: "tail"
  readonly options: number
  readonly args: string
}> = Command.make("tail", { options, args })
