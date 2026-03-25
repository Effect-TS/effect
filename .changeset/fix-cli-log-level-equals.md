---
"@effect/cli": patch
---

Fix `--log-level=value` equals syntax incorrectly swallowing the next argument. Only skip the next arg when the previous arg is exactly `--log-level` (space-separated form).
