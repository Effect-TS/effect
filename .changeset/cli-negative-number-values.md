---
"effect": patch
---

Fix the CLI lexer to treat negative numbers such as `-3.70` as values instead of short options, so `--lon -3.70` parses correctly
