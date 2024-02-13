# Effect CLI

- [Effect CLI](#effect-cli)
  - [Installation](#installation)
  - [Built-In Options](#built-in-options)
  - [API Reference](#api-reference)
  - [Tutorial](#tutorial)
    - [Creating the Command-Line Application](#creating-the-command-line-application)
      - [Our First Command](#our-first-command)
      - [Creating Subcommands](#creating-subcommands)
      - [Creating the CLI Application](#creating-the-cli-application)
      - [Running the CLI Application](#running-the-cli-application)
        - [Executing Built-In Options](#executing-built-in-options)
        - [Executing User-Defined Commands](#executing-user-defined-commands)
    - [Accessing Parent Arguments in Subcommands](#accessing-parent-arguments-in-subcommands)
    - [Conclusion](#conclusion)
  - [FAQ](#faq)
    - [Command-Line Argument Parsing Specification](#command-line-argument-parsing-specification)


## Installation

You can install `@effect/cli` using your preferred package manager:

```sh
npm install @effect/cli
# or
pnpm add @effect/cli
# or
yarn add @effect/cli
```

You will also need to install one of the platform-specific `@effect/platform` packages based on where you intend to run your command-line application.

This is because `@effect/cli` must interact with many platform-specific services to function, such as the file system and the terminal.

For example, if your command-line application will run in a NodeJS environment:

```sh
npm install @effect/platform-node
# or
pnpm add @effect/platform-node
# or
yarn add @effect/platform-node
```

You can then provide the `NodeContext.layer` exported from `@effect/platform-node` to your command-line application to ensure that `@effect/cli` has access to all the platform-specific services that it needs.

For a more detailed walkthrough, take a read through the [Tutorial](#tutorial) below.

## Built-In Options

All Effect CLI programs ship with several built-in options:

  - `[--completions (bash | sh | fish | zsh)]` - automatically generates and displays a shell completion script for your CLI application
  - `[-h | --help]` - automatically generates and displays a help documentation for your CLI application
  - `[--version]` - automatically displays the version of the CLI application
  - `[--wizard]` - starts the Wizard Mode for your CLI application which guides a user through constructing a command for your the CLI application

## API Reference

- https://effect-ts.github.io/effect/docs/cli

## Tutorial

In this quick start guide, we are going to attempt to replicate a small part of the Git Distributed Version Control System command-line interface (CLI) using `@effect/cli`.

Specifically, our goal will be to build a CLI application which replicates the following subset of the `git` CLI which we will call `minigit`:

```
minigit       [-v | --version] [-h | --help] [-c <name>=<value>]
minigit add   [-v | --verbose] [--] [<pathspec>...]
minigit clone [--depth <depth>] [--] <repository> [<directory>]
```

**NOTE**: During this quick start guide, we will focus on building the components of the CLI application that will allow us to parse the above commands into structured data. However, implementing the *functionality* of these commands is out of the scope of this quick start guide.

The CLI application that will be built during this tutorial is also available in the [examples](./examples/minigit.ts).

### Creating the Command-Line Application

For our `minigit` CLI, we have three commands that we would like to model. Let's start by using `@effect/cli` to create a basic `Command` to represent our top-level `minigit` command.

The `Command.make` constructor creates a `Command` from a name, a `Command` `Config` object, and a `Command` handler, which is a function that receives the parsed `Config` and actually executes the `Command`. Each of these parameters is also reflected in the type signature of `Command`:

`Command<Name extends string, R, E, A>` has four type arguments:
  - `Name extends string`: the name of the command
  - `R`: the environment required by the `Command`'s handler
  - `E`: the expected errors returned by the `Command`'s handler
  - `A`: the parsed `Config` object provided to the `Command`'s handler

Let's take a look at each of parameter in more detail:

**Command Name**

The first parameter to `Command.make` is the name of the `Command`. This is the name that will be used to parse the `Command` from the command-line arguments.

For example, if we have a CLI application called `my-cli-app` with a single subcommand named `foo`, then executing the following command will run the `foo` `Command` in your CLI application:

```sh
my-cli-app foo
```

**Command Configuration**

The second parameter to `Command.make` is the `Command` `Config`. The `Config` is an object of key/value pairs where the keys are just identifiers and the values are the `Options` and `Args` that the `Command` may receive. The `Config` object can have nested `Config` objects or arrays of `Config` objects.

When the CLI application is actually executed, the `Command` `Config` is parsed from the command-line options and arguments following the `Command` name.

**Command Handler**

The `Command` handler is an effectful function that receives the parsed `Config` and returns an `Effect`. This allows the user to execute the code associated with their `Command` with the full power of Effect.

#### Our First Command

Returning to our `minigit` CLI application, let's use what we've learned about `Command.make` to create the top-level `minigit` `Command`:

```ts
import { Command, Options } from "@effect/cli"
import { Console, Effect, Option } from "effect"

// minigit [--version] [-h | --help] [-c <name>=<value>]
const configs = Options.keyValueMap("c").pipe(Options.optional)
const minigit = Command.make("minigit", { configs }, ({ configs }) =>
  Option.match(configs, {
    onNone: () => Console.log("Running 'minigit'"),
    onSome: (configs) => {
      const keyValuePairs = Array.from(configs)
        .map(([key, value]) => `${key}=${value}`)
        .join(", ")
      return Console.log(`Running 'minigit' with the following configs: ${keyValuePairs}`)
    }
  }))
```

Some things to note in the above example:
  1. We've imported the `Command` and `Options` modules from `@effect/cli`
  2. We've also imported the `Console` and `Option` modules from the core `effect` package
  3. We've created an `Options` object which will allow us to parse `key=value` pairs with the `-c` flag
  4. We've made our `-c` flag an optional option using the `Options.optional` combinator
  5. We've created a `Command` named `minigit` and passed `configs` `Options` to the `minigit` command `Config`
  6. We've utilized the parsed `Command` `Config` for `minigit` to execute code based upon whether the optional `-c` flag was provided

An astute observer may have also noticed that in the snippet above we did not specify `Options` for version and help.

This is because Effect CLI has several built-in options (see [Built-In Options](#built-in-options) for more information) which are available automatically for all CLI applications built with `@effect/cli`.

#### Creating Subcommands

Let's continue with our `minigit` example and and create the `add` and `clone` subcommands:

```ts
import { Args, Command, Options } from "@effect/cli"
import { Console, Option, ReadonlyArray } from "effect"

// minigit [--version] [-h | --help] [-c <name>=<value>]
const configs = Options.keyValueMap("c").pipe(Options.optional)
const minigit = Command.make("minigit", { configs }, ({ configs }) =>
  Option.match(configs, {
    onNone: () => Console.log("Running 'minigit'"),
    onSome: (configs) => {
      const keyValuePairs = Array.from(configs)
        .map(([key, value]) => `${key}=${value}`)
        .join(", ")
      return Console.log(`Running 'minigit' with the following configs: ${keyValuePairs}`)
    }
  }))

// minigit add [-v | --verbose] [--] [<pathspec>...]
const pathspec = Args.text({ name: "pathspec" }).pipe(Args.repeated)
const verbose = Options.boolean("verbose").pipe(Options.withAlias("v"))
const minigitAdd = Command.make("add", { pathspec, verbose }, ({ pathspec, verbose }) => {
  const paths = ReadonlyArray.match(pathspec, {
    onEmpty: () => "",
    onNonEmpty: (paths) => ` ${ReadonlyArray.join(paths, " ")}`
  })
  return Console.log(`Running 'minigit add${paths}' with '--verbose ${verbose}'`)
})

// minigit clone [--depth <depth>] [--] <repository> [<directory>]
const repository = Args.text({ name: 'repository' })
const directory = Args.text({ name: 'directory' }).pipe(Args.optional)
const depth = Options.integer('depth').pipe(Options.optional)
const minigitClone = Command.make("clone", { repository, directory, depth }, (config) => {
  const depth = Option.map(config.depth, (depth) => `--depth ${depth}`)
  const repository = Option.some(config.repository)
  const optionsAndArgs = ReadonlyArray.getSomes([depth, repository, config.directory])
  return Console.log(
    "Running 'minigit clone' with the following options and arguments: " +
      `'${ReadonlyArray.join(optionsAndArgs, ", ")}'`
  )
})
```

Some things to note in the above example:
  1. We've additionally imported the `Args` module from `@effect/cli` and the `ReadonlyArray` module from `effect`
  2. We've used the `Args` module to specify some positional arguments for our `add` and `clone` subcommands
  3. We've used `Options.withAlias` to give the `--verbose` flag an alias of `-v` for our `add` subcommand


#### Creating the CLI Application

Now that we've specified all the `Command`s our application can handle, let's compose them together so that we can actually run the CLI application.

For the purposes of this example, we will assume that our CLI application is running in a NodeJS environment and that we have previously installed `@effect/platform-node` (see [Installation](#installation)).

Our final CLI application is as follows:

```ts
import { Args, Command, Options } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect, Option, ReadonlyArray } from "effect"

// minigit [--version] [-h | --help] [-c <name>=<value>]
const configs = Options.keyValueMap("c").pipe(Options.optional)
const minigit = Command.make("minigit", { configs }, ({ configs }) =>
  Option.match(configs, {
    onNone: () => Console.log("Running 'minigit'"),
    onSome: (configs) => {
      const keyValuePairs = Array.from(configs)
        .map(([key, value]) => `${key}=${value}`)
        .join(", ")
      return Console.log(`Running 'minigit' with the following configs: ${keyValuePairs}`)
    }
  }))

// minigit add [-v | --verbose] [--] [<pathspec>...]
const pathspec = Args.text({ name: "pathspec" }).pipe(Args.repeated)
const verbose = Options.boolean("verbose").pipe(Options.withAlias("v"))
const minigitAdd = Command.make("add", { pathspec, verbose }, ({ pathspec, verbose }) => {
  const paths = ReadonlyArray.match(pathspec, {
    onEmpty: () => "",
    onNonEmpty: (paths) => ` ${ReadonlyArray.join(paths, " ")}`
  })
  return Console.log(`Running 'minigit add${paths}' with '--verbose ${verbose}'`)
})

// minigit clone [--depth <depth>] [--] <repository> [<directory>]
const repository = Args.text({ name: 'repository' })
const directory = Args.text({ name: 'directory' }).pipe(Args.optional)
const depth = Options.integer('depth').pipe(Options.optional)
const minigitClone = Command.make("clone", { repository, directory, depth }, (config) => {
  const depth = Option.map(config.depth, (depth) => `--depth ${depth}`)
  const repository = Option.some(config.repository)
  const optionsAndArgs = ReadonlyArray.getSomes([depth, repository, config.directory])
  return Console.log(
    "Running 'minigit clone' with the following options and arguments: " +
      `'${ReadonlyArray.join(optionsAndArgs, ", ")}'`
  )
})

const command = minigit.pipe(Command.withSubcommands([minigitAdd, minigitClone]))

const cli = Command.run(command, {
  name: "Minigit Distributed Version Control",
  version: "v1.0.0"
})

Effect.suspend(() => cli(process.argv)).pipe(
  Effect.provide(NodeContext.layer),
  NodeRuntime.runMain
)
```

Some things to note in the above example:
  1. We've additionally imported the `Effect` module from `effect`
  2. We've also imported the `NodeRuntime` and `NodeContext` modules from `@effect/platform-node`
  3. We've used `Command.withSubcommands` to add our `add` and `clone` commands as subcommands of `minigit`
  4. We've used `Command.run` to create a `CliApp` with a `name` and a `version`
  5. We've used `Effect.suspend` to lazily evaluate `process.argv`

#### Running the CLI Application

At this point, we're ready to run our CLI application!

Let's assume that we've bundled our CLI into a single file called `minigit.js`. However, if you are following along using the `minigit` [example](./examples/minigit.ts) in this repository, you can run the same commands with `pnpm tsx ./examples/minigit.ts ...`.

##### Executing Built-In Options

Let's start by getting the version of our CLi application using the built-in `--version` option.

```
> node ./minigit.js --version
v1.0.0
```

We can also print out help documentation for each of our application's commands using the `-h | --help` built-in option.

For example, running the top-level command with `--help` produces the following output:

```
> node ./minigit.js --help
Minigit Distributed Version Control v1.0.0

USAGE

$ minigit [-c text]

OPTIONS

-c text

  A user-defined piece of text.

  This setting is a property argument which:

    - May be specified a single time:  '-c key1=value key2=value2'

    - May be specified multiple times: '-c key1=value -c key2=value2'

  This setting is optional.

COMMANDS

  - add [(-v, --verbose)] <pathspec>...

  - clone [--depth integer] <repository> [<directory>]
```

Running the `add` subcommand with `--help` produces the following output:

```
> node ./minigit.js add --help
Minigit Distributed Version Control v1.0.0

USAGE

$ add [(-v, --verbose)] <pathspec>...

ARGUMENTS

<pathspec>...

  A user-defined piece of text.

  This argument may be repeated zero or more times.

OPTIONS

(-v, --verbose)

  A true or false value.

  This setting is optional.
```

##### Executing User-Defined Commands

We can also experiment with executing our own commands:

```
> node ./minigit.js add .
Running 'minigit add .' with '--verbose false'
```

```
> node ./minigit.js add --verbose .
Running 'minigit add .' with '--verbose true'
```

```
> node ./minigit.js clone --depth 1 https://github.com/Effect-TS/cli.git
Running 'minigit clone' with the following options and arguments: '--depth 1, https://github.com/Effect-TS/cli.git'
```

### Accessing Parent Arguments in Subcommands

In certain scenarios, you may want your subcommands to have access to `Options` / `Args` passed to their parent commands.

Because `Command` is also a subtype of `Effect`, you can directly `Effect.map`, `Effect.flatMap` a parent command in a subcommand's handler to extract it's `Config`.

For example, let's say that our `minigit clone` subcommand needs access to the configuration parameters that can be passed to the parent `minigit` command via `minigit -c key=value`. We can accomplish this by adjusting our `clone` `Command` handler to `Effect.flatMap` the parent `minigit`:

```ts
const repository = Args.text({ name: "repository" })
const directory = Args.directory().pipe(Args.optional)
const depth = Options.integer("depth").pipe(Options.optional)
const minigitClone = Command.make("clone", { repository, directory, depth }, (subcommandConfig) =>
  // By using `Effect.flatMap` on the parent command, we get access to it's parsed config
  Effect.flatMap(minigit, (parentConfig) => {
    const depth = Option.map(subcommandConfig.depth, (depth) => `--depth ${depth}`)
    const repository = Option.some(subcommandConfig.repository)
    const optionsAndArgs = ReadonlyArray.getSomes([depth, repository, subcommandConfig.directory])
    const configs = Option.match(parentConfig.configs, {
      onNone: () => "",
      onSome: (map) => Array.from(map).map(([key, value]) => `${key}=${value}`).join(", ")
    })
    return Console.log(
      "Running 'minigit clone' with the following options and arguments: " +
        `'${ReadonlyArray.join(optionsAndArgs, ", ")}'\n` +
        `and the following configuration parameters: ${configs}`
    )
  })
)
```

In addition, accessing a parent command in the handler of a subcommand will add the parent `Command` to the environment of the subcommand.

We can directly observe this by inspecting the type of `minigitClone` after accessing the parent command:

```ts
const minigitClone: Command.Command<
  "clone",
  // The parent `minigit` command has been added to the environment required by
  // the subcommand's handler
  Command.Command.Context<"minigit">,
  never,
  {
    readonly repository: string;
    readonly directory: Option.Option<string>;
    readonly depth: Option.Option<number>;
  }
>
```

The parent command will be "erased" from the subcommand's environment when using `Command.withSubcommands`:

```ts
const command = minigit.pipe(Command.withSubcommands([minigitClone]))
//    ^? Command<"minigit", never, ..., ...>
```

We can run the command with some configuration parameters to see the final result:

```
> node ./minigit.js -c key1=value1 clone --depth 1 https://github.com/Effect-TS/cli.git
Running 'minigit clone' with the following options and arguments: '--depth 1, https://github.com/Effect-TS/cli.git'
and the following configuration parameters: key1=value1
```

### Conclusion

At this point, we've completed our tutorial!

We hope that you enjoyed learning a little bit about Effect CLI, but this tutorial has only scratched surface!

We encourage you to continue exploring Effect CLI and all the features it provides!

Happy Hacking!

## FAQ

### Command-Line Argument Parsing Specification

The internal command-line argument parser operates under the following specifications:

  1. By default, the `Options` / `Args` of a command are only recognized _before_ subcommands

      ```sh
      # -v is an option for program
      program -v subcommand
      # -v is an option for subcommand
      program subcommand -v
      ```

  2. The `Options` for a `Command` are _always_ parsed before positional `Args`
      ```sh
      # valid
      program --option arg
      # invalid
      program arg --option
      ```

  3. Excess arguments after the command-line is fully processed results in a `ValidationError`
