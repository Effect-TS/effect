---
"effect": minor
---

Implement Effect.Service as a Tag and Layer with Opaque Type.

Namely the following is now possible:

```ts
class Prefix extends Effect.Service<Prefix>()("Prefix", {
  sync: () => ({
    prefix: "PRE"
  })
}) {}

class Postfix extends Effect.Service<Postfix>()("Postfix", {
  sync: () => ({
    postfix: "POST"
  })
}) {}

const messages: Array<string> = []

class Logger extends Effect.Service<Logger>()("Logger", {
  accessors: true,
  effect: Effect.gen(function* () {
    const { prefix } = yield* Prefix
    const { postfix } = yield* Postfix
    return {
      info: (message: string) =>
        Effect.sync(() => {
          messages.push(`[${prefix}][${message}][${postfix}]`)
        })
    }
  }),
  dependencies: [Prefix.Default, Postfix.Default]
}) {}

describe("Effect", () => {
  it.effect("Service correctly wires dependencies", () =>
    Effect.gen(function* () {
      const { _tag } = yield* Logger
      expect(_tag).toEqual("Logger")
      yield* Logger.info("Ok")
      expect(messages).toEqual(["[PRE][Ok][POST]"])
      const { prefix } = yield* Prefix
      expect(prefix).toEqual("PRE")
      const { postfix } = yield* Postfix
      expect(postfix).toEqual("POST")
    }).pipe(Effect.provide([Logger.Default, Prefix.Default, Postfix.Default]))
  )
})
```
