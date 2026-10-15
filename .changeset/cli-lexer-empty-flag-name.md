---
"effect": patch
---

Fix the CLI treating `--=value` as a flag with an empty name. The argument is now passed through unchanged as a plain value, so it no longer fails with `Unrecognized flag: --`.
