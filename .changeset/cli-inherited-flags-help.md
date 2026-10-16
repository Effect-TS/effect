---
"effect": minor
---

Render inherited CLI flags in a separate `INHERITED FLAGS` section and add `"full"`, `"summary"`, and `"none"` modes for inherited and global flags in `CliOutput.defaultFormatter`. `HelpDoc` adds `inheritedFlags`, `commandPath`, and `globalFlagsScope` provenance so summaries can point to the appropriate help, with globals always listed on their declaring command. Custom formatters must read ancestor shared flags from `HelpDoc.inheritedFlags` instead of `HelpDoc.flags`.
