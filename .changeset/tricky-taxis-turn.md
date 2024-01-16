---
"@effect/cli": minor
---

adds optional `executable` parameter to `CliApp.make`

**NOTE**: This means that users are no longer required to manually remove the executable from the CLI arguments (i.e. `process.argv.slice(2)`). The executable is stripped from the CLI arguments internally within `CliApp.make`, so all command-line arguments can be provided directly to the CLI application.
