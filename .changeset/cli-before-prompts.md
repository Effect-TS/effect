---
"effect": minor
---

Add `Command.beforePrompts` to the CLI. It runs an effect once per invocation, after the command line is parsed and before any `withFallbackPrompt` prompt, so a command can print an introduction before asking for missing values. Commands now parse and check every flag and argument before showing fallback prompts, so an invalid value is reported without prompting first.

`Command.Command` has two new trailing type parameters, `HookE` and `HookR`, that track the errors and requirements of `beforePrompts` hooks. They default to `never`, so existing annotations of commands without hooks are unchanged.
