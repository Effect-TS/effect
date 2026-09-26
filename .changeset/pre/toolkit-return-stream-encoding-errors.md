---
"effect": patch
---

Expose `AiError` in the error type of streams returned by `Toolkit.handle` in return mode. Result-encoding failures already fail the stream at runtime; consumers that treated the extracted stream as infallible must handle or propagate that error.
