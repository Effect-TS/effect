import * as Args from "@effect/cli/Args"
import * as Descriptor from "@effect/cli/CommandDescriptor"
import * as Options from "@effect/cli/Options"

const bytesFlag = Options.boolean("c")
const linesFlag = Options.boolean("l")
const wordsFlag = Options.boolean("w")
const charFlag = Options.boolean("m", { ifPresent: false })
export const options: Options.Options<[boolean, boolean, boolean, boolean]> = Options.all([
  bytesFlag,
  linesFlag,
  wordsFlag,
  charFlag
])

export const args: Args.Args<ReadonlyArray<string>> = Args.repeated(Args.file({ name: "files" }))

export const command: Descriptor.Command<{
  readonly name: "wc"
  readonly options: [boolean, boolean, boolean, boolean]
  readonly args: ReadonlyArray<string>
}> = Descriptor.make("wc", options, args)
