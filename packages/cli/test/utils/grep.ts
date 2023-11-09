import * as Args from "@effect/cli/Args"
import * as Command from "@effect/cli/Command"
import * as Options from "@effect/cli/Options"

const afterFlag = Options.integer("after").pipe(Options.withAlias("A"))
const beforeFlag = Options.integer("before").pipe(Options.withAlias("B"))
export const options: Options.Options<readonly [number, number]> = Options.all([
  afterFlag,
  beforeFlag
])

export const args: Args.Args<string> = Args.text()

export const command: Command.Command<{
  readonly name: "grep"
  readonly options: readonly [number, number]
  readonly args: string
}> = Command.standard("grep", { options, args })
