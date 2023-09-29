import * as it from "effect-test/utils/extend"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Equal from "effect/Equal"
import * as Error from "effect/Error"

describe.concurrent("Error", () => {
  it.effect("Tagged", () =>
    Effect.gen(function*(_) {
      class MyError extends Error.Tagged("MyError")<{
        readonly message: string
      }> {}
      const error = new MyError({ message: "foo" })
      const result = yield* _(Effect.either(error))
      assert(Either.isLeft(result))
      assert.equal(result.left._tag, "MyError")
      assert.equal(Equal.equals(result.left, new MyError({ message: "foo" })), true)
    }))
})
