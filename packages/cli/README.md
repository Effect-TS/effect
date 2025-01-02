# Installation

Installing `@effect/cli` is straightforward and can be done using any of the popular package managers. Follow the steps below to get started with setting up `@effect/cli` on your system.

### Step 1: Install `@effect/cli`

Choose your preferred package manager and run one of the following commands in your terminal:

- **Using npm:**

  ```sh
  npm install @effect/cli
  ```

- **Using pnpm:**

  ```sh
  pnpm add @effect/cli
  ```

- **Using yarn:**
  ```sh
  yarn add @effect/cli
  ```

### Step 2: Install Platform-Specific Packages

`@effect/cli` interacts directly with various platform-specific services like the file system and the terminal. Depending on the environment where you'll run your command-line application, you need to install the appropriate `@effect/platform` package.

#### For Node.js Environments

If your application will run in a Node.js environment, you'll need to install `@effect/platform-node`. This package ensures that `@effect/cli` can effectively interact with Node.js-specific functionalities.

Run one of the following commands based on your package manager:

- **Using npm:**

  ```sh
  npm install @effect/platform-node
  ```

- **Using pnpm:**

  ```sh
  pnpm add @effect/platform-node
  ```

- **Using yarn:**
  ```sh
  yarn add @effect/platform-node
  ```

### Step 3: Configure Your Application

After installing the necessary packages, you must configure your application to use the `NodeContext.layer` from `@effect/platform-node`. This step is crucial as it grants `@effect/cli` access to all necessary Node.js services and APIs, ensuring your CLI tool functions correctly within the Node.js environment.

Here's how you can incorporate `NodeContext.layer` into your application:

```ts
import { NodeContext, NodeRuntime } from "@effect/platform-node"
// Your application's setup code here
```

This configuration will make sure that your CLI application is fully integrated with the Node.js runtime, allowing it to perform optimally with access to system resources and services.

For a more detailed walkthrough, take a read through the [Tutorial](#tutorial) below.

# Built-In Options

`@effect/cli` comes equipped with several powerful built-in options that enhance the functionality of your CLI applications without the need for additional coding. These options are ready to use immediately after installation and are designed to simplify common tasks and improve the user experience.

### Overview of Built-In Options

Here's a breakdown of the key built-in options available in `@effect/cli`:

- **Log Level (`[--log-level]`)**:

  - **Description**: Sets the **minimum** log level for a `Command`'s handler method
  - **Usage**: `--log-level (all | trace | debug | info | warning | error | fatal | none)`
  - **Functionality**: Allows you to specify the **minimum** log level for a `Command`'s handler method. By setting this option, you can control the verbosity of the log output, ensuring that only logs of a certain priority or higher are output by your program.

- **Shell Completions (`[--completions]`)**:

  - **Description**: Automatically generates shell completion scripts to enhance user experience. Shell completions suggest possible command options when you type a command and hit the tab key.
  - **Usage**: `--completions (bash | sh | fish | zsh)`
  - **Functionality**: Depending on your shell environment (bash, sh, fish, or zsh), this option generates a script that, when sourced, provides tab completions for your CLI commands.

- **Help (`[-h | --help]`)**:

  - **Description**: Instantly generates and displays helpful documentation about your CLI application's commands and options.
  - **Usage**: `-h` or `--help`
  - **Functionality**: When this option is used, it displays all available commands and options along with descriptions, usage patterns, and examples if available. This is crucial for new users or when you need a quick reminder about the tool's capabilities.

- **Version (`[--version]`)**:

  - **Description**: Displays the current version number of your CLI application.
  - **Usage**: `--version`
  - **Functionality**: This is particularly useful for debugging and ensuring compatibility, as it lets you confirm the version of the CLI tool you are currently using.

- **Wizard Mode (`[--wizard]`)**:
  - **Description**: Activates a guided interface to help users construct commands.
  - **Usage**: `--wizard`
  - **Functionality**: This interactive mode takes users step-by-step through the process of building a command, making it ideal for newcomers or complex commands. It asks questions and uses the responses to form the correct command syntax, which can then be executed or edited further.

### Practical Applications

These built-in options are designed to make the CLI user-friendly and more accessible, especially for those who are new to command-line interfaces. They reduce the learning curve and provide immediate assistance, enhancing productivity and user engagement.

For instance, a new user can type the following to get a list of all commands and options:

```sh
your-cli-app --help
```

Or, to quickly add command completion to their shell, they might use:

```sh
source <(your-cli-app --completions bash)
```

# Overview

`@effect/cli` is a powerful framework designed to simplify the development of command-line applications in TypeScript. It employs a modular architecture that allows developers to create scalable and maintainable CLI tools. Below is a table highlighting its key features:

| Feature                       | Description                                                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Command Structure             | Supports a hierarchical command structure with a top-level command and potentially multiple nested subcommands.                                    |
| Parsing Arguments             | Built-in support for parsing command-line arguments efficiently.                                                                                   |
| Generating Help Text          | Automatically generates and displays help documentation for each command.                                                                          |
| Handling Subcommands          | Facilitates the management and execution of nested subcommands.                                                                                    |
| Built-in Options              | Includes built-in options such as `--help`, `--version`, and shell completions for enhanced usability.                                             |
| Wizard Mode                   | Offers a Wizard Mode that guides users through constructing commands interactively.                                                                |
| Platform-Specific Integration | Integrates with platform-specific services via `@effect/platform` packages, ensuring compatibility with diverse environments like Node.js. and Bun |

## Command Structure

Every command-line application built with `@effect/cli` consists of one or more commands (`Command`). There is always a top-level command representing the application itself, and potentially multiple nested subcommands:

- **Top-Level Command**: This is the main command that represents your application. It's always of type `Command`.
- **Subcommands**: These are nested commands under the top-level command. Each subcommand is also of type `Command`, allowing you to organize functionality into distinct actions.
- **Options**: Commands can have zero or more options (such as `--help` or `--version`). These are specified using `Options` and can be either required or optional. Options can be boolean flags or can accept values from user input.
- **Arguments**: Commands can also have zero or more arguments (such as `<directory>`). These are specified using `Args` and represent the data that users need to provide to commands.
- **Command Handler**: Each command has a command handler, which is a function responsible for the actual execution of the command. This is where you define what the command does when it runs.

This structure allows you to build complex CLI tools that are easy to extend and maintain. Whether you are adding new options to existing commands, creating new subcommands, or handling user inputs, `@effect/cli` provides a structured and intuitive way to scale your application.

# Getting Started with Your First CLI Application

## Creating a Simple "Hello World" CLI

Starting with a basic "Hello World" application is a great way to get familiar with the `@effect/cli`. Below is a step-by-step guide to creating your first command-line interface (CLI) application.

### 1. Set Up Your Project

Begin by creating a new file for your project:

- **File Name**: `hello-world.ts`
- **Purpose**: This file will hold all the necessary code for your CLI application.

### 2. Write the CLI Code

Now, let's write the code for your CLI. Open your `hello-world.ts` file in your favorite code editor and insert the following TypeScript code:

```ts
// Import necessary modules from the libraries
import { Command } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"

// Define the top-level command
const command = Command.make("hello-world", {}, () =>
  Console.log("Hello World")
)

// Set up the CLI application
const cli = Command.run(command, {
  name: "Hello World CLI",
  version: "v1.0.0"
})

// Prepare and run the CLI application
cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain)
```

**Explanation of Code:**

- **Import Statements**:

  - `Command` from `@effect/cli` allows you to define commands and subcommands.
  - `NodeContext` and `NodeRuntime` from `@effect/platform-node` enable your CLI to interact and integrate seamlessly with the Node.js runtime environment. This setup is crucial for running your CLI on Node.js, as it ensures that all Node-specific APIs and functionalities are accessible.
  - `Console` and `Effect` from `effect` provide utilities for logging and managing effects, which are essential for handling asynchronous operations and side effects in your CLI.

- **Command Definition**:

  - The `Command.make` function creates a new command named "hello-world". This command is configured to print "Hello World" when executed, serving as the basic functionality of your CLI.

- **CLI Configuration**:

  - The `Command.run` function initializes your CLI application with a specific name and version, preparing it for execution.

- **Execution Setup**:
  - The `cli(process.argv)` call processes the command-line arguments.
  - It uses `Effect.provide` to inject the `NodeContext.layer`, which integrates the CLI with the Node.js environment, allowing your application to utilize Node-specific features and settings.
  - `NodeRuntime.runMain` ensures that your application is executed within the Node.js main runtime, handling any asynchronous tasks and managing the lifecycle of your CLI.

### 3. Run Your CLI

After saving your `hello-world.ts` file, you can run your CLI application directly from your terminal to see it in action. Here's how:

```sh
npx tsx hello-world.ts
# Expected Output: Hello World
```

**Explanation of the Command:**

- **`tsx`**: This is a command-line tool that enables direct execution of TypeScript files. It simplifies the development process by eliminating the need to manually compile TypeScript (`*.ts`) files into JavaScript (`*.js`) before running them. `tsx` automatically compiles the TypeScript code on-the-fly and executes it, leveraging the Node.js environment.

- **`npx`**: Part of the npm (Node Package Manager) suite, `npx` is used to execute packages. When you run `npx tsx`, it temporarily installs `tsx` if it isn't already present in your project's local `node_modules` folder or globally on your machine. Then, `npx` executes `tsx` with the specified TypeScript file as its argument.

- **Usage in Your CLI**: By using `npx tsx hello-world.ts`, you're instructing `npx` to execute your TypeScript file using `tsx`. This command is especially useful for quick testing and development purposes, as it allows you to run your code directly without setting up a full TypeScript compilation workflow beforehand.

## Exploring CLI Features

Your new CLI comes with a variety of built-in features designed to enhance usability and help you manage your application effectively:

### Check the Version

You can display the version of your CLI by using the `--version` option:

```sh
npx tsx hello-world.ts --version
# Output: v1.0.0
```

### Access Help Information

Your CLI automatically generates help documentation that describes available commands and options. This feature is useful when you need guidance on how the CLI operates or when you want to learn more about its capabilities.

```sh
npx tsx hello-world.ts --help # or -h
```

When you request help, the CLI will display information like this:

```
Hello World CLI

Hello World CLI v1.0.0

USAGE

$ hello-world

OPTIONS

--completions sh | bash | fish | zsh

  One of the following: sh, bash, fish, zsh

  Generate a completion script for a specific shell

  This setting is optional.

(-h, --help)

  A true or false value.

  Show the help documentation for a command

  This setting is optional.

--wizard

  A true or false value.

  Start wizard mode for a command

  This setting is optional.

--version

  A true or false value.

  Show the version of the application

  This setting is optional.
```

### Using the Wizard Mode

The `--wizard` option activates the Wizard Mode in your CLI application, which provides a guided process for constructing commands. This is especially helpful for users who are new to your CLI or need assistance in building the correct command syntax.

To initiate the Wizard Mode, run your CLI application with the `--wizard` option like this:

```sh
npx tsx hello-world.ts --wizard
```

When you start the Wizard Mode, the CLI will interactively guide you through the process of setting up a command. Here's what the interaction might look like:

```
Wizard Mode for CLI Application: Hello World CLI (v1.0.0)

Instructions

  The wizard mode will assist you with constructing commands for Hello World CLI (v1.0.0).

  Please answer all prompts provided by the wizard.

COMMAND: hello-world

Wizard Mode Complete!

You may now execute your command directly with the following options and arguments:

    hello-world

✔ Would you like to run the command? … yes / no
```

# Basic Usage

## Adding Arguments to Commands

Adding arguments to your commands allows your CLI applications to accept and process user input dynamically. Let's create a simple `echo` CLI that echoes back whatever text you pass to it.

### Setting Up Your CLI

Begin by creating a new TypeScript file named `echo.ts`. This file will contain all the code necessary to define a command that accepts user input as an argument.

```ts
// Import the necessary modules from the Effect libraries
import { Args, Command } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"

// Define a text argument
const text = Args.text({ name: "text" })

// Create a command that logs the provided text argument to the console
const command = Command.make("echo", { text }, ({ text }) => Console.log(text))

// Configure and initialize the CLI application
const cli = Command.run(command, {
  name: "Echo CLI",
  version: "v0.0.1"
})

// Prepare and run the CLI application, providing necessary context and runtime
cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain)
```

**Understanding the Code:**

- **Arguments**: The `text` declaration creates an input parameter that users need to provide when they run your CLI.
- **Command Definition**: The `Command.make` function sets up your CLI command. It's designed to take the `text` argument and display it using `Console.log`.
- **Command Execution:** By using `Command.run`, the CLI application is formally structured with a specified name and version, and is ready to execute based on the defined command structure.
- **Execution Setup**: The `cli(process.argv)` call processes the command-line arguments and runs the CLI application. The `Effect.provide(NodeContext.layer)` injects the necessary Node.js context, and `NodeRuntime.runMain` ensures proper execution within the Node.js environment.

### Running the CLI

With your `echo.ts` script ready, you can run it to interact with the argument you've set up.

**Run Without Arguments**

If you try running the CLI without specifying any arguments, it will remind you to provide the required text:

```sh
npx tsx echo.ts
# Output: Missing argument <text>
```

**Run With Arguments**

To pass the text argument correctly, wrap your input in quotes to treat it as a single string:

```sh
npx tsx echo.ts "This is a test"
# Output: This is a test
```

**Common Mistake**

Forgetting to use quotes can cause issues since each word might be interpreted as a separate argument:

```sh
npx tsx echo.ts This is a test
# Output: Received unknown argument: 'is'
```

## Adding Options to Commands

Let's enhance the `echo` CLI we built earlier by introducing an option that allows text to be displayed in bold. This tutorial will guide you on adding a `--bold` option, abbreviated as `-b`, to your command.

### Modify Your TypeScript File

First, open the TypeScript file (`echo.ts`) where your `echo` command is defined. We will add a new option that enables users to choose whether their text output should be bold.

### Update the Code

Below is the updated version of your code with the bold option included:

```ts
import { Args, Command, Options } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"

const text = Args.text({ name: "text" })

// Define the 'bold' option with an alias '-b'
const bold = Options.boolean("bold").pipe(Options.withAlias("b"))

// Create the command that outputs the text with bold formatting if the bold option is used
const command = Command.make("echo", { text, bold }, ({ bold, text }) =>
  Console.log(bold ? `\x1b[1m${text}\x1b[0m` : text)
)

const cli = Command.run(command, {
  name: "Echo CLI",
  version: "v0.0.2"
})

cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain)
```

### Explanation of the Changes

- **Bold Option**: The `bold` declaration creates a boolean option that users can toggle. Using `Options.withAlias("b")` allows the option to be invoked with a shorter `-b` flag. This makes the command easier to type and remember.

- **Command Functionality**: Within the function of the command, there's a check to see if the `bold` option is true. If it is, the text is formatted with ANSI escape codes (`\x1b[1m` and `\x1b[0m`) to appear bold in the terminal. This formatting adds visual emphasis and can help distinguish output in complex console applications.

### Running the Updated CLI

With the command updated, you can now see the effect of the `--bold` or `-b` option by running:

```sh
npx tsx echo.ts --bold "This is a test"
```

or

```sh
npx tsx echo.ts -b "This is a test"
```

**Expected Output:**

Both commands will display "This is a test" in bold text, assuming your terminal supports ANSI escape codes.

## Important Note on Argument Order

When using your CLI, it's crucial to understand the order in which you specify options and arguments. By default, the `@effect/cli` parses `Options` and `Args` **before** any subcommands. This means that options need to be placed directly after the main command, and before any subcommands or additional arguments.

For example, the command:

```sh
npx tsx echo.ts "This is a test" -b
```

**would not work** because the `-b` option appears after the text argument `"This is a test"`. The parser expects options to be specified before any standalone arguments or subcommands. This ensures that the options are correctly associated with the main command and not misinterpreted as arguments for a subcommand or additional text.

## Adding Valued Options to Commands

In this section, we will continue to improve our `echo` CLI by introducing options to customize the color of the output text. This enhancement not only adds visual customization but also demonstrates how to use valued options to modify the behavior of commands.

### Update Your TypeScript File

Start by opening the TypeScript file where your `echo` command is defined. We will add new functionalities that allow for text coloring and optional bold formatting.

### Code Implementation

Below is the modified version of your code, now including options for text color:

```ts
import { Args, Command, Options } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect, Option } from "effect"

// Define a text argument
const text = Args.text({ name: "text" })

// Define the 'bold' option with an alias '-b'
const bold = Options.boolean("bold").pipe(Options.withAlias("b"))

// Color codes for ANSI escape sequences
const colorToAnsiSequence = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  blue: "\x1b[34m"
} as const
const resetCode = "\x1b[0m"

type SupportedColor = keyof typeof colorToAnsiSequence
const supportedColors = Object.keys(colorToAnsiSequence) as SupportedColor[]

// Define the 'color' option with choices and an alias '-c'
const color = Options.choice("color", supportedColors).pipe(
  Options.withAlias("c"),
  Options.optional
)

// Function to apply ANSI color codes based on user input
const applyColor = (
  text: string,
  color: Option.Option<SupportedColor>
): string =>
  Option.match(color, {
    onNone: () => text,
    onSome: (color) => `${colorToAnsiSequence[color]}${text}${resetCode}`
  })

// Create the command that outputs formatted text
const command = Command.make(
  "echo",
  { text, bold, color },
  ({ bold, color, text }) => {
    let formattedText = applyColor(text, color)
    if (bold) {
      formattedText = `\x1b[1m${formattedText}\x1b[0m`
    }
    return Console.log(formattedText)
  }
)

const cli = Command.run(command, {
  name: "Echo CLI",
  version: "v0.0.3"
})

cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain)
```

### Explanation of the Changes

- **Color Options**: The `color` option enables users to specify the text color as "red", "green", or "blue", enhancing the visual aspect of the output. This option uses `Options.choice` to provide a list of possible values.

- **applyColor Function**: This function applies the chosen ANSI color code to the text. If no color is selected, the text remains unchanged. This allows for dynamic customization of the output based on user preference.

### Running the Enhanced CLI

With the new color and bold options, you can now run the CLI and see colored text output. Here's how to use these options:

```sh
npx tsx echo.ts --bold --color red "This is a test"
npx tsx echo.ts -b -c green "Another test"
```

**Expected Output:**

These commands will print "This is a test" in bold red and "Another test" in bold green, provided your terminal supports ANSI colors.

## Adding Subcommands

Let's enhance the functionality of your `echo` CLI by adding a new subcommand called `repeat`. This subcommand will allow users to repeat a specified message multiple times, providing a practical example of how to extend a CLI application.

### Update Your TypeScript File

Open the TypeScript file where your `echo` command is defined. We'll incorporate the `repeat` subcommand into this setup.

### Implementing the `Repeat` Subcommand

Here is how you can update your code to include the `repeat` subcommand:

```ts
import { Args, Command, Options } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect, Option } from "effect"

const text = Args.text({ name: "text" })

const bold = Options.boolean("bold").pipe(Options.withAlias("b"))

const colorToAnsiSequence = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  blue: "\x1b[34m"
} as const
const resetCode = "\x1b[0m"

type SupportedColor = keyof typeof colorToAnsiSequence
const supportedColors = Object.keys(colorToAnsiSequence) as SupportedColor[]

const color = Options.choice("color", supportedColors).pipe(
  Options.withAlias("c"),
  Options.optional
)

const applyColor = (
  text: string,
  color: Option.Option<SupportedColor>
): string =>
  Option.match(color, {
    onNone: () => text,
    onSome: (color) => `${colorToAnsiSequence[color]}${text}${resetCode}`
  })

// Argument for the number of repetitions
const count = Args.integer().pipe(Args.withDefault(1))

// Creating the repeat subcommand
const repeat = Command.make("repeat", { count }, ({ count }) =>
  echo.pipe(
    Effect.andThen((config) => Effect.repeatN(echo.handler(config), count - 1))
  )
)

// Main echo command
const echo = Command.make(
  "echo",
  { text, bold, color },
  ({ bold, color, text }) => {
    let formattedText = applyColor(text, color)
    if (bold) {
      formattedText = `\x1b[1m${formattedText}\x1b[0m`
    }
    return Console.log(formattedText)
  }
)

// Combining commands
const command = echo.pipe(Command.withSubcommands([repeat]))

const cli = Command.run(command, {
  name: "Echo CLI",
  version: "v0.0.4"
})

cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain)
```

### Explanation of the Changes

- **Count Argument**: We introduced a new argument named `count`. This argument specifies the number of times the echo message will be repeated.
- **Repeat Command**: This new subcommand leverages the `count` argument to repeat the message the specified number of times.
- **Integration with Main Command**: We integrated the `repeat` subcommand into the existing `echo` command structure. This means users can activate this feature by simply appending the `repeat` keyword followed by the desired count after their message in the command line. For example, `echo "Hello" repeat 5` would output "Hello" five times.

> [!NOTE]
> Since `Command` is a subtype of `Effect`, you can use `Effect.andThen` within a subcommand's handler to directly access and utilize the `Config` from a parent command, and subsequently apply its handler.

### Running the `Repeat` Subcommand

With the `repeat` subcommand added, you can now use it to repeat messages:

```sh
npx tsx echo.ts -b -c red "This is a test" repeat 3
```

**Expected Output:**

This command will output "This is a test" in bold red text three times, demonstrating both the color and repeat functionalities.

# Tutorial: Building Your Own Git-Style CLI

In this tutorial, we will create a basic version of a Git-like command-line interface (CLI) called `minigit` using the powerful `@effect/cli` library. Our goal is to replicate a small set of Git commands to demonstrate how you can build structured CLI tools:

```
minigit       [-v | --version] [-h | --help] [-c <name>=<value>]
minigit add   [-v | --verbose] [--] [<pathspec>...]
minigit clone [--depth <depth>] [--] <repository> [<directory>]
```

> [!NOTE]
> This guide focuses on the setup and parsing of commands. Implementing the actual functionality of these commands is beyond the scope of this tutorial but can be developed further based on the patterns shown here.

The full code for this CLI application can be found in our [examples directory](./examples/minigit.ts).

## Creating the Command-Line Application

Begin by creating a TypeScript file named `minigit.ts`. This file will host all your CLI application code. We will structure our CLI with three main commands, demonstrating the powerful features of the `@effect/cli` library.

### Setting Up the Main Command

Let's start by setting up the primary command for our CLI, named `minigit`. To do this, we use the `Command.make` constructor which is pivotal for structuring commands in the `@effect/cli` framework.

```ts
import { Command } from "@effect/cli"
import { Effect } from "effect"

// Define the main 'minigit' command
const minigit = Command.make(
  "minigit",
  // Configuration object for the command
  {},
  // Handler function that executes the command
  (config) => Effect.succeed("Welcome to Minigit!")
)
```

#### Breakdown of Key Components

- **`Command.make` Function:** This function constructs a new `Command`. It requires three parameters:
  - **Name:** This is the command name, like 'minigit', which you use to call the command from the command line.
  - **Configuration:** This object specifies the options (`Options`) and arguments (`Args`) that the command can accept.
  - **Handler:** This function is executed when the command is called. It receives the parsed configuration and carries out the command's core functionalities.

#### Understanding the Command Type Signature

The `Command` interface in `@effect/cli` is structured as follows:

```ts
export interface Command<Name extends string, R, E, A> {
  readonly handler: (_: A) => Effect<void, E, R>
  // Additional properties and methods...
}
```

- **`Name` (`Name extends string`):** A unique string that identifies the command.
- **`R` (Environment):** Defines the dependencies or the environment needed by the command's handler.
- **`E` (Expected Errors):** Specifies the types of errors the command might expect during its execution.
- **`A` (Arguments/Configuration):** Represents the configuration object the handler receives.

### Detailed Explanation of Parameters

**Command Name:**

The `name` parameter in `Command.make` designates the command's identifier. This name is crucial as it is used to invoke the command from the command line. For example, if we have a CLI application called `my-cli-app` with a single subcommand named `foo`, then executing the following command will run the `foo` command in your CLI application:

```sh
my-cli-app foo
```

**Command Configuration:**

The configuration parameter allows you to define what options and arguments the command can accept. This setup includes both simple flags and more complex objects. The `Config` is an object of key/value pairs where the keys are just identifiers and the values are the `Options` and `Args` that the `Command` may receive. The `Config` object can have nested `Config` objects or arrays of `Config` objects. When the CLI application is actually executed, the command `Config` is parsed from the command-line options and arguments following the command name.

**Command Handler:**

This function is where the action happens. It takes the parsed configuration and executes the core functionality of the command, utilizing the full capabilities of the `Effect` framework for managing effects and asynchronous operations.

### Our First Command

Let's apply what we've learned from using the `Command.make` method by defining the primary command for our `minigit` CLI application. This command will include configurations that handle various options like version, help, and custom key-value pairs.

```ts
import { Command, Options } from "@effect/cli"
import { Console, Option } from "effect"

// minigit [--version] [-h | --help] [-c <name>=<value>]
const configs = Options.keyValueMap("c").pipe(Options.optional)

// Define the main 'minigit' command
const minigit = Command.make(
  "minigit",
  // Configuration object for the command
  { configs },
  // Handler function that executes the command
  ({ configs }) =>
    Option.match(configs, {
      onNone: () => Console.log("Running 'minigit'"),
      onSome: (configs) => {
        const keyValuePairs = Array.from(
          configs,
          ([key, value]) => `${key}=${value}`
        ).join(", ")
        return Console.log(
          `Running 'minigit' with the following configs: ${keyValuePairs}`
        )
      }
    })
)
```

#### Key Aspects of the Code:

- **Options Configuration:**

  - **`Options.keyValueMap("c")`:** This line sets up an option that accepts key-value pairs, allowing the user to input configurations in the format `-c key=value`.
  - **`Options.optional`:** By chaining this combinator, the `-c` option becomes optional, meaning the CLI will operate correctly whether or not this option is provided.

- **Command Execution:**
  - The command handler utilizes the `Option.match` function to determine how to respond based on whether the user has provided any key-value configurations.
  - If no configurations are provided (`onNone`), it simply logs "Running 'minigit'."
  - If configurations are provided (`onSome`), it logs these configurations in a readable string format, enhancing user feedback and interaction.

#### Built-In Options:

You may have noticed the lack of explicit version and help options in our command setup. This is due to `@effect/cli`'s design, which includes several built-in options such as `--version` and `--help` (see [Built-In Options](#built-in-options). These are automatically available and do not need to be manually configured, simplifying the setup of common CLI functionalities.

### Expanding the `minigit` CLI with Subcommands

Building on our basic `minigit` CLI, we'll now introduce two key subcommands: `add` and `clone`. These subcommands will demonstrate how to handle more complex command structures and multiple parameters using the `@effect/cli` library.

#### Adding Subcommands

We'll continue our `minigit` CLI development by incorporating `add` and `clone` subcommands to handle specific actions, much like the original Git commands.

```ts
import { Args, Command, Options } from "@effect/cli"
import { Console, Option, Array } from "effect"

// minigit [--version] [-h | --help] [-c <name>=<value>]
const configs = Options.keyValueMap("c").pipe(Options.optional)

const minigit = Command.make("minigit", { configs }, ({ configs }) =>
  Option.match(configs, {
    onNone: () => Console.log("Running 'minigit'"),
    onSome: (configs) => {
      const keyValuePairs = Array.fromIterable(configs)
        .map(([key, value]) => `${key}=${value}`)
        .join(", ")
      return Console.log(
        `Running 'minigit' with the following configs: ${keyValuePairs}`
      )
    }
  })
)

// minigit add [-v | --verbose] [--] [<pathspec>...]
const pathspec = Args.text({ name: "pathspec" }).pipe(Args.repeated)
const verbose = Options.boolean("verbose").pipe(Options.withAlias("v"))
const minigitAdd = Command.make(
  "add",
  { pathspec, verbose },
  ({ pathspec, verbose }) => {
    const paths = Array.match(pathspec, {
      onEmpty: () => "",
      onNonEmpty: (paths) => ` ${Array.join(paths, " ")}`
    })
    return Console.log(
      `Running 'minigit add${paths}' with '--verbose ${verbose}'`
    )
  }
)

// minigit clone [--depth <depth>] [--] <repository> [<directory>]
const repository = Args.text({ name: "repository" })
const directory = Args.text({ name: "directory" }).pipe(Args.optional)
const depth = Options.integer("depth").pipe(Options.optional)
const minigitClone = Command.make(
  "clone",
  { repository, directory, depth },
  (config) => {
    const depth = Option.map(config.depth, (depth) => `--depth ${depth}`)
    const repository = Option.some(config.repository)
    const optionsAndArgs = Array.getSomes([depth, repository, config.directory])
    return Console.log(
      "Running 'minigit clone' with the following options and arguments: " +
        `'${Array.join(optionsAndArgs, ", ")}'`
    )
  }
)
```

#### Key Points to Note:

1. **Importing Modules:**

   - The `Args` module from `@effect/cli` is utilized to define positional arguments for both `add` and `clone` subcommands.
   - The `Array` module from `effect` is used to handle arrays and provide utility functions like `Array.match` and `Array.join`.

2. **Configuring Commands:**

   - Both subcommands utilize options and arguments that allow for detailed configuration, reflecting common use cases in command-line interfaces.
   - The `Options.withAlias` method simplifies command usage by providing shorthand aliases like `-v` for `--verbose`.

3. **Command Handlers:**
   - Each subcommand has a handler that logs execution details, which helps in understanding the flow and actions of the CLI commands.

### Assembling Your CLI Application

Now that you've defined all the necessary commands for your CLI application, it's time to assemble them into a fully functional command-line interface. This section will guide you through setting up the CLI to run within a NodeJS environment, assuming that you've already installed `@effect/platform-node` as described in the [Installation](#installation) guide.

Let's put together the `minigit` CLI:

```ts
import { Args, Command, Options } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect, Option, Array } from "effect"

// minigit [--version] [-h | --help] [-c <name>=<value>]
const configs = Options.keyValueMap("c").pipe(Options.optional)
const minigit = Command.make("minigit", { configs }, ({ configs }) =>
  Option.match(configs, {
    onNone: () => Console.log("Running 'minigit'"),
    onSome: (configs) => {
      const keyValuePairs = Array.fromIterable(configs)
        .map(([key, value]) => `${key}=${value}`)
        .join(", ")
      return Console.log(
        `Running 'minigit' with the following configs: ${keyValuePairs}`
      )
    }
  })
)

// minigit add [-v | --verbose] [--] [<pathspec>...]
const pathspec = Args.text({ name: "pathspec" }).pipe(Args.repeated)
const verbose = Options.boolean("verbose").pipe(Options.withAlias("v"))
const minigitAdd = Command.make(
  "add",
  { pathspec, verbose },
  ({ pathspec, verbose }) => {
    const paths = Array.match(pathspec, {
      onEmpty: () => "",
      onNonEmpty: (paths) => ` ${Array.join(paths, " ")}`
    })
    return Console.log(
      `Running 'minigit add${paths}' with '--verbose ${verbose}'`
    )
  }
)

// minigit clone [--depth <depth>] [--] <repository> [<directory>]
const repository = Args.text({ name: "repository" })
const directory = Args.text({ name: "directory" }).pipe(Args.optional)
const depth = Options.integer("depth").pipe(Options.optional)
const minigitClone = Command.make(
  "clone",
  { repository, directory, depth },
  (config) => {
    const depth = Option.map(config.depth, (depth) => `--depth ${depth}`)
    const repository = Option.some(config.repository)
    const optionsAndArgs = Array.getSomes([depth, repository, config.directory])
    return Console.log(
      "Running 'minigit clone' with the following options and arguments: " +
        `'${Array.join(optionsAndArgs, ", ")}'`
    )
  }
)

// Combine all commands into the main 'minigit' command
const command = minigit.pipe(
  Command.withSubcommands([minigitAdd, minigitClone])
)

// Initialize and run the CLI application
const cli = Command.run(command, {
  name: "Minigit Distributed Version Control",
  version: "v1.0.0"
})

cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain)
```

#### Key Features and Configuration:

- **Command Integration:** The `minigit` command integrates both `add` and `clone` as subcommands, enabling a structured approach to handle different functionalities within the same CLI application.
- **Environment Setup:** We've imported `NodeContext` and `NodeRuntime` to ensure that our CLI application correctly interacts with NodeJS's runtime environment, making full use of Node-specific features.
- **Command Execution:** By using `Command.run`, the CLI application is formally structured with a specified name and version, and is ready to execute based on the defined command structure.
- **Execution Setup**: The `cli(process.argv)` call processes the command-line arguments and runs the CLI application. The `Effect.provide(NodeContext.layer)` injects the necessary Node.js context, and `NodeRuntime.runMain` ensures proper execution within the Node.js environment.

### Running the CLI Application

Now that your CLI application, `minigit`, is fully assembled and prepared, it's time to see it in action! This section will guide you through running `minigit` directly from the command line, using the example file `minigit.ts`. If you are experimenting using the `minigit` example from the provided [repository](./examples/minigit.ts), the same instructions apply, just replace the command file name with `npx tsx ./examples/minigit.ts`.

#### Executing Built-In Options

First, let’s test out the built-in options to understand the core functionalities of our CLI application.

Run the following command to display the current version of your CLI application:

```sh
npx tsx minigit.ts --version
# Output: v1.0.0
```

To view the help documentation and understand the usage of each command within `minigit`, use the `-h` or `--help` option:

```sh
npx tsx minigit.ts --help
```

Output:

```
Minigit Distributed Version Control

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

--completions sh | bash | fish | zsh

  One of the following: sh, bash, fish, zsh

  Generate a completion script for a specific shell

  This setting is optional.

(-h, --help)

  A true or false value.

  Show the help documentation for a command

  This setting is optional.

--wizard

  A true or false value.

  Start wizard mode for a command

  This setting is optional.

--version

  A true or false value.

  Show the version of the application

  This setting is optional.

COMMANDS

  - add [(-v, --verbose)] <pathspec>...

  - clone [--depth integer] <repository> [<directory>]
```

This output provides a breakdown of all available commands and options, helping users navigate through the functionalities offered by `minigit`.

To get more detailed help on subcommands like `add`, simply append `--help` after the subcommand:

```sh
npx tsx minigit.ts add --help
```

Output:

```
Minigit Distributed Version Control

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

--completions sh | bash | fish | zsh

  One of the following: sh, bash, fish, zsh

  Generate a completion script for a specific shell

  This setting is optional.

(-h, --help)

  A true or false value.

  Show the help documentation for a command

  This setting is optional.

--wizard

  A true or false value.

  Start wizard mode for a command

  This setting is optional.

--version

  A true or false value.

  Show the version of the application

  This setting is optional.
```

#### Executing User-Defined Commands

Beyond viewing documentation, `minigit` allows you to execute commands with specific options to tailor its behavior.

Here's how you can add files with the verbose option enabled or disabled:

```sh
npx tsx minigit.ts add .
# Output: Running 'minigit add .' with '--verbose false'
```

```sh
npx tsx minigit.ts add --verbose .
# Output: Running 'minigit add .' with '--verbose true'
```

```sh
npx tsx minigit.ts clone --depth 1 https://github.com/Effect-TS/cli.git
# Output: Running 'minigit clone' with the following options and arguments: '--depth 1, https://github.com/Effect-TS/cli.git'
```

## Accessing Parent Arguments in Subcommands

In certain scenarios, you may want your subcommands to have access to the `Options` and `Args` passed to their parent commands.

Since `Command` is a subtype of `Effect`, you can use `Effect.flatMap` within a subcommand's handler to extract the `Config` from a parent command. This technique allows subcommands to utilize the configuration parameters specified at higher levels in the command hierarchy.

For example, let's say our `minigit clone` subcommand needs access to the configuration parameters passed to the parent `minigit` command via `minigit -c key=value`. We can accomplish this by modifying the `clone` command's handler to use `Effect.flatMap` with the parent `minigit` command:

```ts
const repository = Args.text({ name: "repository" })
const directory = Args.directory().pipe(Args.optional)
const depth = Options.integer("depth").pipe(Options.optional)
const minigitClone = Command.make(
  "clone",
  { repository, directory, depth },
  (subcommandConfig) =>
    // By using `Effect.flatMap` on the parent command, we get access to its parsed config
    Effect.flatMap(minigit, (parentConfig) => {
      const depth = Option.map(
        subcommandConfig.depth,
        (depth) => `--depth ${depth}`
      )
      const repository = Option.some(subcommandConfig.repository)
      const optionsAndArgs = Array.getSomes([
        depth,
        repository,
        subcommandConfig.directory
      ])
      const configs = Option.match(parentConfig.configs, {
        onNone: () => "",
        onSome: (map) =>
          Array.fromIterable(map)
            .map(([key, value]) => `${key}=${value}`)
            .join(", ")
      })
      return Console.log(
        "Running 'minigit clone' with the following options and arguments: " +
          `'${Array.join(optionsAndArgs, ", ")}'\n` +
          `and the following configuration parameters: ${configs}`
      )
    })
)
```

By examining the type of `minigitClone` after incorporating the parent command, you can see the added context:

```ts
const minigitClone: Command.Command<
  "clone",
  // The parent `minigit` command has been added to the environment required by
  // the subcommand's handler
  Command.Command.Context<"minigit">,
  never,
  {
    readonly repository: string
    readonly directory: Option.Option<string>
    readonly depth: Option.Option<number>
  }
>
```

The parent command's context will be "erased" from the subcommand's environment when using `Command.withSubcommands`:

```ts
const command = minigit.pipe(Command.withSubcommands([minigitClone]))
//    ^? Command<"minigit", never, ..., ...>
```

Finally, run the command with some configuration parameters to see the result:

```sh
npx tsx minigit.ts -c key1=value1 clone --depth 1 https://github.com/Effect-TS/cli.git
# Running 'minigit clone' with the following options and arguments: '--depth 1, https://github.com/Effect-TS/cli.git'
# and the following configuration parameters: key1=value1
```

# Frequently Asked Questions (FAQ)

## Command-Line Argument Parsing Specification

Understanding how command-line arguments are parsed in your applications is crucial for designing effective and user-friendly command interfaces. Here are the key rules that the internal command-line argument parser follows:

### 1. Order of Options and Subcommands

Options and arguments (collectively referred to as `Options` / `Args`) associated with a command must be specified **before** any subcommands. This rule helps the parser determine which command the options apply to.

**Examples:**

- **Correct Usage**:

  ```sh
  program -v subcommand
  ```

  In this example, the `-v` option applies to the main program before the subcommand is processed.

- **Incorrect Usage**:
  ```sh
  program subcommand -v
  ```
  Here, placing `-v` after the subcommand causes confusion as to whether `-v` applies to the main program or the subcommand.

### 2. Parsing Options Before Positional Arguments

The parser is designed to recognize options before any positional arguments. This ordering ensures clarity and prevents confusion between options and regular arguments.

**Examples:**

- **Valid Command**:

  ```sh
  program --option arg
  ```

  This command correctly places the `--option` before the positional argument `arg`.

- **Invalid Command**:
  ```sh
  program arg --option
  ```
  Placing an argument before an option is not allowed and can lead to errors in command processing.

### 3. Handling Excess Arguments

If there are excess arguments that do not fit the expected structure of the command, the parser will return a `ValidationError`. This safeguard prevents the execution of malformed or potentially harmful commands.

# API Reference

- https://effect-ts.github.io/effect/docs/cli
