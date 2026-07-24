---
"effect": patch
---

Remove the default `import.meta.env` lookup from `ConfigProvider.fromEnv`, fixing module analysis failures in runtimes that do not support `import.meta`, closes #6358.
