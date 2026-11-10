---
"@effect/ai-openai-compat": patch
---

Send PDF file parts as Chat Completions `file` content parts instead of dropping them or flattening them into message text. PDF URLs now fail with `InvalidUserInputError`; pass bytes, base64 or a file ID instead.
