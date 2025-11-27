import * as Command from "@effect/cli/Command"
import * as Prompt from "@effect/cli/Prompt"
import * as NodeContext from "@effect/platform-node/NodeContext"
import * as Runtime from "@effect/platform-node/NodeRuntime"
import * as Effect from "effect/Effect"

const colorPrompt = Prompt.select({
  message: "Pick your favorite color",
  choices: [
    {
      title: "Red",
      value: "#ff0000",
      description: "This option has a description"
    },
    { title: "Green", value: "#00ff00", description: "So does this one" },
    { title: "Blue", value: "#0000ff", disabled: true }
  ]
})

const confirmPrompt = Prompt.confirm({
  message: "Can you please confirm?"
})

const datePrompt = Prompt.date({
  message: "What's your birth day?",
  dateMask: "\"Year:\" YYYY, \"Month:\" MM, \"Day:\" DD \\\\\\\\||// \\Hour: HH, \\Minute: mm, \"Seconds:\" ss",
  validate: (date) =>
    date.getTime() > Date.now()
      ? Effect.fail("Your birth day can't be in the future")
      : Effect.succeed(date)
})

const numberPrompt = Prompt.float({
  message: `What is your favorite number?`,
  validate: (n) => n > 0 ? Effect.succeed(n) : Effect.fail("must be greater than 0")
})

const passwordPrompt = Prompt.password({
  message: "Enter your password: ",
  validate: (value) =>
    value.length === 0
      ? Effect.fail("Password cannot be empty")
      : Effect.succeed(value)
})

const togglePrompt = Prompt.toggle({
  message: "Yes or no?",
  active: "yes",
  inactive: "no"
})

const prompt = Prompt.all([
  colorPrompt,
  confirmPrompt,
  datePrompt,
  numberPrompt,
  passwordPrompt,
  togglePrompt
])

const command = Command.prompt("favorites", prompt, Effect.log)

const cli = Command.run(command, {
  name: "Prompt Examples",
  version: "0.0.1"
})

Effect.suspend(() => cli(process.argv)).pipe(
  Effect.provide(NodeContext.layer),
  Runtime.runMain
)
