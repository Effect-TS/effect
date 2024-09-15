---
"effect": minor
---

`Dequeue<A>` and `Queue<A>` is subtype of `Effect<A>`. This means that now it can be used as an `Effect`, and when called, it will automatically extract and return an item from the queue, without having to explicitly use the `Queue.take` function.

```ts
Effect.gen(function* () {
  const queue = yield* Queue.unbounded<number>()
  yield* Queue.offer(queue, 1)
  yield* Queue.offer(queue, 2)
  const oldWay = yield* Queue.take(queue)
  const newWay = yield* queue
})
```
