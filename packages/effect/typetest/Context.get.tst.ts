import { Context } from "effect"
import { expect, it } from "tstyche"

class Port extends Context.Service<Port, number>()("ContextGet/Port") {}
class Host extends Context.Service<Host, string>()("ContextGet/Host") {}

const portContext = Context.make(Port, 8080)
const both = Context.add(portContext, Host, "localhost")
const empty = Context.empty()
const hostOnly = Context.make(Host, "localhost")
const getPort = Context.get(Port)

it("saved getter accepts its service and a superset", () => {
  expect(portContext).type.toBe<Context.Context<Port>>()
  expect(both).type.toBe<Context.Context<Port | Host>>()
  expect(getPort).type.toBeCallableWith(portContext)
  expect(getPort).type.toBeCallableWith(both)
  expect(getPort(portContext)).type.toBe<number>()
  expect(getPort(both)).type.toBe<number>()
})

it("saved getter rejects contexts lacking the required service", () => {
  expect(getPort).type.not.toBeCallableWith(empty)
  expect(getPort).type.not.toBeCallableWith(hostOnly)
})

it("data-first and contextual immediate calls preserve values", () => {
  expect(Context.get(portContext, Port)).type.toBe<number>()
  expect(Context.get(both, Port)).type.toBe<number>()
  expect(portContext.pipe(Context.get(Port))).type.toBe<number>()
  expect(both.pipe(Context.get(Port))).type.toBe<number>()
  expect(Context.get).type.not.toBeCallableWith(empty, Port)
  expect(Context.get).type.not.toBeCallableWith(hostOnly, Port)
})

it("valid explicit three-argument curried calls remain supported", () => {
  const explicit = Context.get<Port, Port, number>(Port)
  const explicitBoth = Context.get<Port | Host, Port, number>(Port)
  expect(explicit).type.toBeCallableWith(portContext)
  expect(explicit).type.toBeCallableWith(both)
  expect(explicit(portContext)).type.toBe<number>()
  expect(explicitBoth(both)).type.toBe<number>()
  expect(explicit).type.not.toBeCallableWith(empty)
  expect(explicit).type.not.toBeCallableWith(hostOnly)
  expect(Context.get<Port, Port, number>(portContext, Port)).type.toBe<number>()
})

it("saved reference getter accepts every context", () => {
  const Ref = Context.Reference<number>("ContextGet/Ref", { defaultValue: () => 42 })
  const getRef = Context.get(Ref)
  expect(Ref).type.toBeAssignableTo<Context.Key<never, number>>()
  expect(getRef).type.toBeCallableWith(empty)
  expect(getRef).type.toBeCallableWith(portContext)
  expect(getRef).type.toBeCallableWith(hostOnly)
  expect(getRef).type.toBeCallableWith(both)
  expect(getRef(empty)).type.toBe<number>()
  expect(getRef(Context.add(portContext, Ref, 99))).type.toBe<number>()
  const explicit = Context.get<never, never, number>(Ref)
  expect(explicit(empty)).type.toBe<number>()
})
