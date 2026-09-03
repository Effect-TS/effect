import { Context, Option } from "effect"
import { expect, it } from "tstyche"

it("does not type a service removed with addOrOmit as present", () => {
  const Service = Context.Service<{ readonly value: number }>("TestService")
  const context = Context.make(Service, { value: 1 }).pipe(Context.addOrOmit(Service, Option.none()))
  const dataFirst = Context.addOrOmit(Context.make(Service, { value: 1 }), Service, Option.none())

  expect(Context.get).type.not.toBeCallableWith(context, Service)
  expect(Context.get).type.not.toBeCallableWith(dataFirst, Service)
})

it("infers services for a saved curried getter", () => {
  const Port = Context.Service<{ readonly PORT: number }>("Port")
  const Host = Context.Service<{ readonly HOST: string }>("Host")
  const portContext = Context.make(Port, { PORT: 8080 })
  const both = Context.add(portContext, Host, { HOST: "localhost" })
  const getPort = Context.get(Port)

  expect(getPort).type.toBeCallableWith(portContext)
  expect(getPort).type.toBeCallableWith(both)
  expect(getPort(portContext)).type.toBe<{ readonly PORT: number }>()
  expect(getPort).type.not.toBeCallableWith(Context.empty())
  expect(getPort).type.not.toBeCallableWith(Context.make(Host, { HOST: "localhost" }))
})
