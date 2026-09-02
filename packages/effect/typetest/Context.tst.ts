import { Context, Option } from "effect"
import { expect, it } from "tstyche"

it("addUnsafe2 preserves explicitly supplied service identifiers", () => {
  const ServiceA = Context.Service<{ readonly value: number }>("ServiceA")
  const ServiceB = Context.Service<{ readonly value: string }>("ServiceB")
  const context = Context.addUnsafe2<
    never,
    typeof ServiceA,
    { readonly value: number },
    typeof ServiceB,
    { readonly value: string }
  >(Context.empty(), ServiceA.key, { value: 1 }, ServiceB.key, { value: "value" })

  expect(context).type.toBe<Context.Context<typeof ServiceA | typeof ServiceB>>()
})

it("does not type a service removed with addOrOmit as present", () => {
  const Service = Context.Service<{ readonly value: number }>("TestService")
  const context = Context.make(Service, { value: 1 }).pipe(Context.addOrOmit(Service, Option.none()))
  const dataFirst = Context.addOrOmit(Context.make(Service, { value: 1 }), Service, Option.none())

  expect(Context.get).type.not.toBeCallableWith(context, Service)
  expect(Context.get).type.not.toBeCallableWith(dataFirst, Service)
})
