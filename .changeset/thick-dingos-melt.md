---
"effect": minor
---

add Mailbox module, a queue which can have done or failure signals

```ts
import { Effect, Mailbox } from "effect"
import * as assert from "node:assert"

Effect.gen(function* () {
  const mailbox = yield* Mailbox.make<number, string>()

  // add messages to the mailbox
  yield* mailbox.offer(1)
  yield* mailbox.offer(2)
  yield* mailbox.offerAll([3, 4, 5])

  // take messages from the mailbox
  const [messages, done] = yield* mailbox.take
  assert.deepStrictEqual(messages, [1, 2, 3, 4, 5])
  assert.strictEqual(done, false)

  // signal that the mailbox is done
  yield* mailbox.done
  const [messages2, done2] = yield* mailbox.take
  assert.deepStrictEqual(messages2, [])
  assert.strictEqual(done2, true)

  // signal that the mailbox is failed
  yield* mailbox.fail("boom")
})
```
