import { Args, Command, Options } from "@effect/cli"
import { NodeContext, NodeKeyValueStore, NodeRuntime } from "@effect/platform-node"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as NavalFateStore from "./naval-fate/store.js"

const { createShip, moveShip, removeMine, setMine, shoot } = Effect.serviceFunctions(
  NavalFateStore.NavalFateStore
)

// naval_fate [-h | --help] [--version]
// naval_fate ship new <name>...
// naval_fate ship move [--speed=<kn>] <name> <x> <y>
// naval_fate ship shoot <x> <y>
// naval_fate mine set <x> <y> [--moored]
// naval_fate mine remove <x> <y> [--moored]

const nameArg = Args.text({ name: "name" }).pipe(Args.withDescription("The name of the ship"))
const xArg = Args.integer({ name: "x" }).pipe(Args.withDescription("The x coordinate"))
const yArg = Args.integer({ name: "y" }).pipe(Args.withDescription("The y coordinate"))
const coordinatesArg = { x: xArg, y: yArg }
const nameAndCoordinatesArg = { name: nameArg, ...coordinatesArg }

const mooredOption = Options.boolean("moored").pipe(
  Options.withDescription("Whether the mine is moored (anchored) or drifting")
)
const speedOption = Options.integer("speed").pipe(
  Options.withDescription("Speed in knots"),
  Options.withDefault(10)
)

const shipCommand = Command.make("ship", {
  verbose: Options.boolean("verbose")
}).pipe(Command.withDescription("Controls a ship in Naval Fate"))

const newShipCommand = Command.make("new", {
  name: nameArg
}, ({ name }) =>
  Effect.gen(function*(_) {
    const { verbose } = yield* _(shipCommand)
    yield* _(createShip(name))
    yield* _(Console.log(`Created ship: '${name}'`))
    if (verbose) {
      yield* _(Console.log(`Verbose mode enabled`))
    }
  })).pipe(Command.withDescription("Create a new ship"))

const moveShipCommand = Command.make("move", {
  ...nameAndCoordinatesArg,
  speed: speedOption
}, ({ name, speed, x, y }) =>
  Effect.gen(function*(_) {
    yield* _(moveShip(name, x, y))
    yield* _(Console.log(`Moving ship '${name}' to coordinates (${x}, ${y}) at ${speed} knots`))
  })).pipe(Command.withDescription("Move a ship"))

const shootShipCommand = Command.make(
  "shoot",
  { ...coordinatesArg },
  ({ x, y }) =>
    Effect.gen(function*(_) {
      yield* _(shoot(x, y))
      yield* _(Console.log(`Shot cannons at coordinates (${x}, ${y})`))
    })
).pipe(Command.withDescription("Shoot from a ship"))

const mineCommand = Command.make("mine").pipe(
  Command.withDescription("Controls mines in Naval Fate")
)

const setMineCommand = Command.make("set", {
  ...coordinatesArg,
  moored: mooredOption
}, ({ moored, x, y }) =>
  Effect.gen(function*(_) {
    yield* _(setMine(x, y))
    yield* _(
      Console.log(`Set ${moored ? "moored" : "drifting"} mine at coordinates (${x}, ${y})`)
    )
  })).pipe(Command.withDescription("Set a mine at specific coordinates"))

const removeMineCommand = Command.make("remove", {
  ...coordinatesArg
}, ({ x, y }) =>
  Effect.gen(function*(_) {
    yield* _(removeMine(x, y))
    yield* _(Console.log(`Removing mine at coordinates (${x}, ${y}), if present`))
  })).pipe(Command.withDescription("Remove a mine at specific coordinates"))

const command = Command.make("naval_fate").pipe(
  Command.withDescription("An implementation of the Naval Fate CLI application."),
  Command.withSubcommands([
    shipCommand.pipe(Command.withSubcommands([
      newShipCommand,
      moveShipCommand,
      shootShipCommand
    ])),
    mineCommand.pipe(Command.withSubcommands([
      setMineCommand,
      removeMineCommand
    ]))
  ])
)

const MainLayer = NavalFateStore.layer.pipe(
  Layer.provide(NodeKeyValueStore.layerFileSystem("naval-fate-store")),
  Layer.merge(NodeContext.layer)
)

const cli = Command.run(command, {
  name: "Naval Fate",
  version: "1.0.0"
})

Effect.suspend(() => cli(process.argv)).pipe(
  Effect.provide(MainLayer),
  Effect.tapErrorCause(Effect.logError),
  NodeRuntime.runMain
)
