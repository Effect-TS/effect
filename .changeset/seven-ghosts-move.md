---
"effect": minor
---

add `replayCapacity` option to PubSub constructors

This option adds a replay buffer in front of the given PubSub. The buffer will
replay the last `n` messages to any new subscriber.

```ts
Effect.gen(function*() {
  const messages = [1, 2, 3, 4, 5]
  const pubsub = yield* PubSub.unbounded<number>({ replayCapacity: 3 })
  yield* PubSub.publishAll(pubsub, messages)
  const sub = yield* PubSub.subscribe(pubsub)
  assert.deepStrictEqual(Chunk.toReadonlyArray(yield* Queue.takeAll(sub)), [3, 4, 5])
}))
```
