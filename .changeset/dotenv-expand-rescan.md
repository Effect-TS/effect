---
"effect": patch
---

Fix `ConfigProvider.fromDotEnv` and `fromDotEnvContents` rescanning expanded values when `expandVariables` is enabled. Self and circular references no longer overflow the stack, escaped `\$NAME` stays literal, and defaults apply when a reference expands to an empty value.
