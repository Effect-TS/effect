import * as CliApp from "@effect/cli/CliApp"
import * as Command from "@effect/cli/Command"
import * as Prompt from "@effect/cli/Prompt"
import { Effect } from "effect"

const colorPrompt = Prompt.select({
  message: "Pick your favorite color!",
  choices: [
    { title: "Red", value: "#ff0000", description: "This option has a description" },
    { title: "Green", value: "#00ff00" },
    { title: "Blue", value: "#0000ff" }
  ]
})

const numberPrompt = Prompt.float({
  message: `What is your favorite number?`
})

export const prompt = Prompt.all([colorPrompt, numberPrompt])

const cli = CliApp.make({
  name: "Your Favorite Things",
  version: "0.0.1",
  command: Command.prompt("favorites", prompt)
})

Effect.sync(() => process.argv.slice(2)).pipe(
  Effect.flatMap((args) => CliApp.run(cli, args, (input) => Effect.log(input))),
  Effect.runFork
)
