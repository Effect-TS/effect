---
"effect": minor
---

allow users to provide a custom name for Redacted values on creation

```ts
Redacted.make("1234567890", "API_KEY")
```

example logged output:

level=INFO msg="permission granted" user=Perry token=API_KEY
