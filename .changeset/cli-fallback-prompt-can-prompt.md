---
"effect": patch
---

Skip `Flag.withFallbackPrompt` and `Argument.withFallbackPrompt` fallbacks when `TerminalCapabilities.canPrompt` is `false`, failing with the original `MissingOption` or `MissingArgument` error instead of rendering a prompt or waiting for input.
