---
"effect": patch
---

Fix the CLI lexer treating a short option cluster with an inline value, such as `-vn=3`, as one unknown flag instead of `-v -n=3`. A single dash followed by a multi-character name, such as `-num=3`, is now also split into separate flags; use `--num=3` instead.
