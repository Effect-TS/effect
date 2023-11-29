import * as Args from "@effect/cli/Args"
import * as Descriptor from "@effect/cli/CommandDescriptor"
import * as Options from "@effect/cli/Options"

export const options: Options.Options<number> = Options.integer("n").pipe(
  Options.withDefault(10)
)

export const args: Args.Args<string> = Args.file({ name: "file" })

export const command: Descriptor.Command<{
  readonly name: "tail"
  readonly options: number
  readonly args: string
}> = Descriptor.make("tail", options, args)
