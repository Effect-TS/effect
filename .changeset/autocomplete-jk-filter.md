---
"effect": patch
---

Fix `Prompt.autoComplete` swallowing `j` and `k` while typing a filter query. Closes [#7392](https://github.com/Effect-TS/effect/issues/7392).

The key dispatch bound bare `j`/`k` to cursor down/up before the filter input saw them, so any query containing either letter was silently corrupted — typing `jira` filtered on `ira`, `worktree` on `wortree` — and a single `j` could submit the wrong choice with no error. Every printable character now reaches the filter. Navigation moves to `Ctrl+P` / `Ctrl+N` (as in `readline` and `fzf`), with `Ctrl+K` also moving up; the arrow keys, `tab`, and `Ctrl+U` are unchanged. `Prompt.select` and `Prompt.multiSelect`, which have no text input, keep their vi-style `j`/`k` bindings.
