---
"effect": patch
---

Preserve `Prompt.FilePart` byte and URL data when chat history is exported or persisted as JSON. Encoding now produces tagged `{ _tag: "Uint8Array", base64 }` and `{ _tag: "URL", href }` objects that decode back to their original types, and `Chat.Persistence` reports undecodable stored history as a `PersistenceError` instead of a defect.
