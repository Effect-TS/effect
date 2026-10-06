---
"effect": patch
---

Fix `ConfigProvider.fromDotEnv` and `fromDotEnvContents` with `expandVariables` scanning expanded text again. Self references such as `PATH=$PATH:/opt/bin` no longer overflow the stack, a reference followed by expanded text (`${HOME_DIR}_logs`, `$USER${SUFFIX:-_v1}`) keeps its value, an escaped `\$NAME` stays literal, and a default applies when the referenced variable expands to an empty value.
