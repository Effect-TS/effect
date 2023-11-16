import * as CliApp from "@effect/cli/CliApp"
import * as Command from "@effect/cli/Command"
import * as Prompt from "@effect/cli/Prompt"
import * as NodeContext from "@effect/platform-node/NodeContext"
import * as Terminal from "@effect/platform-node/Terminal"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

// const colorPrompt = Prompt.select({
//   message: "Pick your favorite color",
//   choices: [
//     { title: "Red", value: "#ff0000", description: "This option has a description" },
//     { title: "Green", value: "#00ff00", description: "So does this one" },
//     { title: "Blue", value: "#0000ff", disabled: true }
//   ]
// })

// const confirmPrompt = Prompt.confirm({
//   message: "Can you please confirm?"
// })

// const datePrompt = Prompt.date({
//   message: "What's your birth day?",
//   dateMask:
//     "\"Year:\" YYYY, \"Month:\" MM, \"Day:\" DD \\\\\\\\||// \\Hour: HH, \\Minute: mm, \"Seconds:\" ss",
//   validate: (date) =>
//     date.getTime() > Date.now()
//       ? Effect.fail("Your birth day can't be in the future")
//       : Effect.succeed(date)
// })

// const numberPrompt = Prompt.float({
//   message: `What is your favorite number?`,
//   validate: (n) => n > 0 ? Effect.succeed(n) : Effect.fail("must be greater than 0")
// })

// const textPrompt = Prompt.text({
//   message: `Please answer the following question\nWhat is your favorite food?`,
//   type: "hidden",
//   validate: (value) =>
//     value.length === 0
//       ? Effect.fail("must be non-empty\nyou entered " + value)
//       : Effect.succeed(value)
// })

const togglePrompt = Prompt.toggle({
  message: "Can you confirm?",
  active: "yes",
  inactive: "no"
})

// const prompt = Prompt.all([colorPrompt, numberPrompt, textPrompt])

const cli = CliApp.make({
  name: "Your Favorite Things",
  version: "0.0.1",
  // command: Command.prompt("favorites", prompt)
  command: Command.prompt("favorites", togglePrompt)
})

const MainLive = Layer.merge(NodeContext.layer, Terminal.layer)

Effect.sync(() => process.argv.slice(2)).pipe(
  Effect.flatMap((args) => CliApp.run(cli, args, (input) => Effect.log(input))),
  Effect.provide(MainLive),
  Effect.runFork
)
