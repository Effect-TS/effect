![npm version](https://img.shields.io/npm/v/effect)

# Effect Monorepo

> An ecosystem of tools to build robust applications in TypeScript

## Introduction

Welcome to Effect, a powerful TypeScript framework that provides a fully-fledged functional effect system with a rich standard library.

Effect consists of several packages that work together to help build robust TypeScript applications. The core package, `effect`, serves as the foundation of the framework, offering primitives for managing side effects, ensuring type safety, and supporting concurrency.

## Monorepo Structure

The Effect monorepo is organized into multiple packages, each extending the core functionality. Below is an overview of the packages included:

| Package                           | Description                                                                                 |                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `effect`                          | Core package                                                                                | [README](https://github.com/Effect-TS/effect/blob/main/packages/effect/README.md)                  |
| `@effect/ai`                      | AI utilities                                                                                | [README](https://github.com/Effect-TS/effect/blob/main/packages/ai/ai/README.md)                   |
| `@effect/ai-openai`               | OpenAI utilities                                                                            | [README](https://github.com/Effect-TS/effect/blob/main/packages/ai/openai/README.md)               |
| `@effect/ai-anthropic`            | Anthropic utilities                                                                         | [README](https://github.com/Effect-TS/effect/blob/main/packages/ai/anthropic/README.md)            |
| `@effect/ai-amazon-bedrock`       | Effect modules for working with Amazon Bedrock AI apis                                      | [README](https://github.com/Effect-TS/effect/blob/main/packages/ai/amazon-bedrock/README.md)       |
| `@effect/ai-google`               | Effect modules for working with Google AI apis                                              | [README](https://github.com/Effect-TS/effect/blob/main/packages/ai/google/README.md)               |
| `@effect/cli`                     | CLI utilities                                                                               | [README](https://github.com/Effect-TS/effect/blob/main/packages/cli/README.md)                     |
| `@effect/cluster`                 | Distributed computing tools                                                                 | [README](https://github.com/Effect-TS/effect/blob/main/packages/cluster/README.md)                 |
| `@effect/experimental`            | Experimental features and APIs                                                              | [README](https://github.com/Effect-TS/effect/blob/main/packages/experimental/README.md)            |
| `@effect/opentelemetry`           | [OpenTelemetry](https://opentelemetry.io/) integration                                      | [README](https://github.com/Effect-TS/effect/blob/main/packages/opentelemetry/README.md)           |
| `@effect/platform`                | Cross-platform runtime utilities                                                            | [README](https://github.com/Effect-TS/effect/blob/main/packages/platform/README.md)                |
| `@effect/platform-browser`        | Platform utilities for the browser                                                          | [README](https://github.com/Effect-TS/effect/blob/main/packages/platform-browser/README.md)        |
| `@effect/platform-bun`            | Platform utilities for [Bun](https://bun.sh/)                                               | [README](https://github.com/Effect-TS/effect/blob/main/packages/platform-bun/README.md)            |
| `@effect/platform-node`           | Platform utilities for [Node.js](https://nodejs.org)                                        | [README](https://github.com/Effect-TS/effect/blob/main/packages/platform-node/README.md)           |
| `@effect/platform-node-shared`    | Shared utilities for [Node.js](https://nodejs.org)                                          | [README](https://github.com/Effect-TS/effect/blob/main/packages/platform-node-shared/README.md)    |
| `@effect/printer`                 | General-purpose printing utilities                                                          | [README](https://github.com/Effect-TS/effect/blob/main/packages/printer/README.md)                 |
| `@effect/printer-ansi`            | ANSI-compatible printing utilities                                                          | [README](https://github.com/Effect-TS/effect/blob/main/packages/printer-ansi/README.md)            |
| `@effect/rpc`                     | Remote procedure call (RPC) utilities                                                       | [README](https://github.com/Effect-TS/effect/blob/main/packages/rpc/README.md)                     |
| `@effect/sql`                     | SQL database utilities                                                                      | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql/README.md)                     |
| `@effect/sql-clickhouse`          | An `@effect/sql` implementation for [ClickHouse](https://clickhouse.com/).                  | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-clickhouse/README.md)          |
| `@effect/sql-d1`                  | An `@effect/sql` implementation for [Cloudflare D1](https://developers.cloudflare.com/d1/). | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-d1/README.md)                  |
| `@effect/sql-drizzle`             | An `@effect/sql` implementation for [Drizzle](https://orm.drizzle.team/).                   | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-drizzle/README.md)             |
| `@effect/sql-kysely`              | An `@effect/sql` implementation for [Kysely](https://kysely.dev/).                          | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-kysely/README.md)              |
| `@effect/sql-libsql`              | An `@effect/sql` implementation using the `@libsql/client` library.                         | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-libsql/README.md)              |
| `@effect/sql-mssql`               | An `@effect/sql` implementation using the mssql `tedious` library.                          | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-mssql/README.md)               |
| `@effect/sql-mysql2`              | An `@effect/sql` implementation using the `mysql2` library.                                 | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-mysql2/README.md)              |
| `@effect/sql-pg`                  | An `@effect/sql` implementation using the `postgres.js` library.                            | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-pg/README.md)                  |
| `@effect/sql-sqlite-bun`          | An `@effect/sql` implementation using the `bun:sqlite` library.                             | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-sqlite-bun/README.md)          |
| `@effect/sql-sqlite-do`           | An `@effect/sql` implementation for Cloudflare Durable Objects sqlite storage.              | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-sqlite-do/README.md)           |
| `@effect/sql-sqlite-node`         | An `@effect/sql` implementation using the `better-sqlite3` library.                         | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-sqlite-node/README.md)         |
| `@effect/sql-sqlite-react-native` | An `@effect/sql` implementation using the `react-native-quick-sqlite` library.              | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-sqlite-react-native/README.md) |
| `@effect/sql-sqlite-wasm`         | An `@effect/sql` implementation using the `@sqlite.org/sqlite-wasm` library.                | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-sqlite-wasm/README.md)         |
| `@effect/typeclass`               | Functional programming type classes                                                         | [README](https://github.com/Effect-TS/effect/blob/main/packages/typeclass/README.md)               |
| `@effect/vitest`                  | Testing utilities for [Vitest](https://vitest.dev/)                                         | [README](https://github.com/Effect-TS/effect/blob/main/packages/vitest/README.md)                  |
| `@effect/workflow`                | Durable workflows for Effect                                                                | [README](https://github.com/Effect-TS/effect/blob/main/packages/workflow/README.md)                |

# Documentation

## Website

For detailed information and usage examples, visit the [Effect website](https://www.effect.website/).

## API Reference

For a complete API reference of the core package `effect`, see the [Effect API documentation](https://effect-ts.github.io/effect/).

## Introduction to Effect

Get started with Effect by watching our introductory video on YouTube. This video provides an overview of Effect and its key features:

[![Introduction to Effect](https://img.youtube.com/vi/ViSiXfBKElQ/maxresdefault.jpg)](https://youtu.be/ViSiXfBKElQ)

# Connect with Our Community

Join the Effect community on Discord to connect with other developers, ask questions, and share insights: [Join Effect's Discord Community](https://discord.gg/hdt7t7jpvn).

# Contributing via Pull Requests

We welcome contributions via pull requests! Here are some guidelines to help you get started:

## Setting Up Your Environment

Begin by forking the repository and clone it to your local machine.

Navigate into the cloned repository and create a new branch for your changes:

```bash
git checkout -b my-branch
```

Ensure all required dependencies are installed by running:

```bash
pnpm install  # Requires pnpm version 10.4.0
```

## Making Changes

### Implement Your Changes

Make the changes you propose to the codebase. If your changes impact functionality, please **add corresponding tests** to validate your updates.

### Validate Your Changes

Run the following commands to ensure your changes do not introduce any issues:

- `pnpm codegen` (optional): Re-generate the package entrypoints in case you have changed the structure of a package or introduced a new module.
- `pnpm check`: Confirm that the code compiles without errors.
- `pnpm test`: Execute all unit tests to ensure your changes haven't broken existing functionality.
- `pnpm circular`: Check for any circular dependencies in imports.
- `pnpm lint`: Ensure the code adheres to our coding standards.
  - If you encounter style issues, use `pnpm lint-fix` to automatically correct some of these.
- `pnpm test-types`: Run type-level tests. Tests are written using [tstyche](https://tstyche.org/).
- `pnpm docgen`: Ensure the documentation generates correctly and reflects any changes made.

### Document Your Changes

#### JSDoc Comments

When adding a new feature, it's important to document your code using JSDoc comments. This helps other developers understand the purpose and usage of your changes. Include at least the following in your JSDoc comments:

- **A Short Description**: Summarize the purpose and functionality of the feature.
- **Example**: Provide a usage example under the `@example` tag to demonstrate how to use the feature.
- **Since Version**: Use the `@since` tag to indicate the version in which the feature was introduced. If you're unsure about the version, please consult with a project maintainer.
- **Category (Optional)**: You can categorize the feature with the `@category` tag to help organize the documentation. If you're unsure about what category to assign, ask a project maintainer.

**Note**: A HTML utility file, [`code2jsdoc-example.html`](/scripts/jsdocs/code2jsdoc-example.html), has been added to assist with creating JSDoc `@example` comments. This web-based interface includes two text areas:

1. An input textarea for pasting example code.
2. An output textarea that dynamically generates formatted JSDoc `@example` comments.

This utility helps ensure consistent formatting and streamlines the process of documenting examples. See the following example of its usage:

Example Input:

```ts
import { Effect } from "effect"

console.log(Effect.runSyncExit(Effect.succeed(1)))
/*
Output:
{
  _id: "Exit",
  _tag: "Success",
  value: 1
}
*/
```

Output:

````
*
* @example
* ```ts
* import { Effect } from "effect"
*
* console.log(Effect.runSyncExit(Effect.succeed(1)))
* // Output:
* // {
* //   _id: "Exit",
* //   _tag: "Success",
* //   value: 1
* // }
* ```
*
````

By using this utility, you can save time and maintain consistency in your JSDoc comments, especially for complex examples.

#### Changeset Documentation

Before committing your changes, document them with a changeset. This process helps in tracking modifications and effectively communicating them to the project team and users:

```bash
pnpm changeset
```

During the changeset creation process, you will be prompted to select the appropriate level for your changes:

- **patch**: Opt for this if you are making small fixes or minor changes that do not affect the library's overall functionality.
- **minor**: Choose this for new features that enhance functionality but do not disrupt existing features.
- **major**: Select this for any changes that result in backward-incompatible modifications to the library.

## Finalizing Your Contribution

### Commit Your Changes

Once you have documented your changes with a changeset, it’s time to commit them to the repository. Use a clear and descriptive commit message, which could be the same message you used in your changeset:

```bash
git commit -am 'Add some feature'
```

#### Linking to Issues

If your commit addresses an open issue, reference the issue number directly in your commit message. This helps to link your contribution clearly to specific tasks or bug reports. Additionally, if your commit resolves the issue, you can indicate this by adding a phrase like `", closes #<issue-number>"`. For example:

```bash
git commit -am 'Add some feature, closes #123'
```

This practice not only helps in tracking the progress of issues but also automatically closes the issue when the commit is merged, streamlining project management.

### Push to Your Fork

Push the changes up to your GitHub fork:

```bash
git push origin my-branch
```

### Create a Pull Request

Open a pull request against the appropriate branch on the original repository:

- `main` branch: For minor patches or bug fixes.
- `next-minor` branch: For new features that are non-breaking.
- `next-major` branch: For changes that introduce breaking modifications.

Please be patient! We will do our best to review your pull request as soon as possible.
