---
"@effect/ai-openai-compat": patch
---

Send PDF file parts as Chat Completions `file` content parts. A PDF given as a base64 string or a `data:` URL string was dropped, and a `Uint8Array`, URL or file id was flattened into the message text.
