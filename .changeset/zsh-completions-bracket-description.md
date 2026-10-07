---
"effect": patch
---

Escape `]` in flag descriptions in generated Zsh completions. A description such as `Log level [default: info]` made Zsh reject the whole `_arguments` spec, so completion stopped working for every flag of the command.
