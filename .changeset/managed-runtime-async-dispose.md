---
"effect": patch
---

Add `Symbol.asyncDispose` to `ManagedRuntime` for `await using` syntax support.

This enables automatic resource disposal using JavaScript's explicit resource management:

```typescript
await using runtime = ManagedRuntime.make(MyLayer)
await runtime.runPromise(myEffect)
// runtime is automatically disposed when leaving scope
```
