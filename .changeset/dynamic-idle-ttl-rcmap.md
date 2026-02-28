---
"effect": minor
---

RcMap: support dynamic `idleTimeToLive` values per key

The `idleTimeToLive` option can now be a function that receives the key and returns a duration, allowing different TTL values for different resources.

```ts
const map = yield* RcMap.make({
  lookup: (key: string) => acquireResource(key),
  idleTimeToLive: (key: string) => {
    if (key.startsWith("premium:")) return Duration.minutes(10)
    return Duration.minutes(1)
  }
})
```
