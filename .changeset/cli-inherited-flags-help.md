---
"effect": patch
---

List flags inherited from ancestor commands under a separate `INHERITED FLAGS` help section, and add `inheritedFlags` / `globalFlags` options (`"full" | "summary" | "none"`) to `CliOutput.defaultFormatter` for collapsing inherited and global flags in subcommand help.

`HelpDoc` gains `inheritedFlags` and `commandPath`. Shared flags from ancestors are no longer included in `HelpDoc.flags`, so custom formatters should render `inheritedFlags` as well.
