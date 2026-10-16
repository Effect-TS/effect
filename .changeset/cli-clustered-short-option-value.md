---
"effect": patch
---

Fix the CLI lexer treating a clustered short option with an inline value, such as `-vn=3`, as one unknown flag instead of `-v -n=3`.
