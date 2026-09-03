import { Context, Effect, Layer } from "effect"
import { expect, it } from "tstyche"

it("accepts inherited methods as a partial effectful implementation", () => {
  const Api = Context.Service<{
    readonly count: number
    read(): Effect.Effect<number>
    unused(): Effect.Effect<void>
  }>("mock/inherited/Api")
  class Stub {
    readonly count = 42
    read() {
      return Effect.succeed(this.count)
    }
  }
  const implementation = new Stub()
  expect(implementation).type.toBeAssignableTo<Layer.PartialEffectful<Context.Service.Shape<typeof Api>>>()
  expect(Layer.mock(Api)).type.toBeCallableWith(implementation)
  expect(Layer.mock(Api, implementation)).type.toBe<Layer.Layer<Context.Service.Identifier<typeof Api>>>()
  // Non-effectful state remains required; only unused effectful members may be omitted.
  expect(Layer.mock(Api)).type.not.toBeCallableWith({ read: () => Effect.succeed(42) })
})
