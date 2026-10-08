---
"effect": patch
---

Respect `NO_COLOR` in CLI prompts and the command wizard, suppressing color and style escapes while preserving cursor and redraw controls.

`Prompt.Theme` gains a `colors` field. `Prompt.makeTheme` detects it with the same rule as `CliOutput.defaultFormatter` (stdout is a TTY and `NO_COLOR` is unset or empty) unless `colors` is provided. Override it for every prompt with a `Prompt.Theme` layer, or for one prompt with `theme: { colors: false }`. The command wizard reads `colors` from `Prompt.Theme`, so providing `CliOutput.defaultFormatter({ colors: false })` alone does not disable wizard styling.

The default `Prompt.Theme` is created the first time it is read, so color detection runs once per process. Changing `NO_COLOR` after the first prompt does not affect the default theme.
