---
"effect": patch
---

Restore `UnknownException` error message handling behavior, closes #4221.

1. Default to "An unknown error occurred" if no message is provided.
2. **Use the `message` property from the cause, if it exists and is a string**.
3. Prioritize a provided custom message over the inherited or default message.
