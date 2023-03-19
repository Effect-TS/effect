import * as Args from "@effect/cli/Args"
import * as Command from "@effect/cli/Command"
import * as Options from "@effect/cli/Options"

const afterFlag = Options.alias(Options.integer("after"), "A")
const beforeFlag = Options.alias(Options.integer("before"), "B")
export const options: Options.Options<readonly [number, number]> = Options.zip(afterFlag, beforeFlag)

export const args: Args.Args<string> = Args.text()

export const command: Command.Command<{
  readonly name: "grep"
  readonly options: readonly [number, number]
  readonly args: string
}> = Command.make("grep", { options, args })
