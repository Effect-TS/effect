---
"effect": patch
---

Add a `TerminalCapabilities` reference and layer to `effect/cli`; built-in `Command` help, version, and error output now follows it, so `FORCE_COLOR` enables color off a TTY and `TERM=dumb` disables it.
