---
"effect": patch
---

Fix interrupted workflow activity acquisition leaking its activity count and potentially blocking subsequent durable suspension. Preserve the wrapped operation's interruption behavior.
