---
"effect": minor
---

Add `Duration.parts` api

```ts
const parts = Duration.parts(Duration.sum("5 minutes", "20 seconds"))
assert.equal(parts.minutes, 5)
assert.equal(parts.seconds, 20)
```
