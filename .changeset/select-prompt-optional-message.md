---
"effect": patch
---

`Prompt.Select` and `Prompt.MultiSelect` no longer require a `message`. When it is omitted the header line is skipped and only the choice list is rendered; submission, clearing and quitting behave as before. `Prompt.AutoComplete` still requires a message.
