---
"effect": patch
---

Add a `helpOnError` option to `Command.run` and `Command.runWith`. When `false`, a parse failure renders only the errors and a one-line hint to use `--help`, instead of the full help.
