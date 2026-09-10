import { Context, Effect, Option } from "effect"
import { describe, expect, it } from "tstyche"

it("does not type a service removed with addOrOmit as present", () => {
  const Service = Context.Service<{ readonly value: number }>("TestService")
  const context = Context.make(Service, { value: 1 }).pipe(Context.addOrOmit(Service, Option.none()))
  const dataFirst = Context.addOrOmit(Context.make(Service, { value: 1 }), Service, Option.none())

  expect(Context.get).type.not.toBeCallableWith(context, Service)
  expect(Context.get).type.not.toBeCallableWith(dataFirst, Service)
})

it("infers services for a saved curried getter", () => {
  const Service = Context.Service<{ readonly value: number }>("TestService")
  const getService = Context.get(Service)

  expect(getService(Context.make(Service, { value: 1 }))).type.toBe<{ readonly value: number }>()
})

describe("Context.Mixin", () => {
  class Box {
    constructor(readonly value: number) {}
    double() {
      return this.value * 2
    }
  }

  class MyText extends Context.Mixin<MyText>("MyText")(Box) {}

  it("preserves constructor parameters", () => {
    expect<ConstructorParameters<typeof MyText>>().type.toBe<[value: number]>()
  })

  it("rejects unknown properties", () => {
    expect(new MyText(1)).type.not.toHaveProperty("typo")
  })

  it("instances are the wrapped class and the service shape", () => {
    expect(new MyText(1)).type.toBeAssignableTo<Box>()
    expect(Context.get(Context.make(MyText, new MyText(1)), MyText)).type.toBeAssignableTo<Box>()
  })

  it("propagates the wrapped instance through yield*", () => {
    const effect = Effect.gen(function*() {
      return yield* MyText
    })
    expect(effect).type.toBeAssignableTo<Effect.Effect<Box, never, unknown>>()
  })

  it("does not add a make constructor", () => {
    expect(MyText).type.not.toHaveProperty("make")
    expect(Context.Mixin<MyText>).type.not.toBeCallableWith("MyText", {
      make: Effect.succeed(new MyText(1))
    })
  })

  it("supports abstract base classes", () => {
    abstract class AbstractBox {
      constructor(readonly value: number) {}
      abstract double(): number
    }

    class ConcreteText extends Context.Mixin("ConcreteText")(AbstractBox) {
      double() {
        return this.value * 2
      }
    }

    expect<ConstructorParameters<typeof ConcreteText>>().type.toBe<[value: number]>()
    expect(new ConcreteText(1)).type.toBeAssignableTo<AbstractBox>()
    // @ts-expect-error does not implement inherited abstract member double
    class MissingDouble extends Context.Mixin("MissingDouble")(AbstractBox) {}
  })
})
