import { assert, it } from "@effect/vitest"
import { Context } from "effect"

class Port extends Context.Service<Port, number>()("ContextGet/Port") {}
class Host extends Context.Service<Host, string>()("ContextGet/Host") {}

it("saved and immediate service getters preserve values and source context", () => {
  const portContext = Context.make(Port, 8080)
  const both = Context.add(portContext, Host, "localhost")
  const getPort = Context.get(Port)
  assert.strictEqual(getPort(portContext), 8080)
  assert.strictEqual(getPort(both), 8080)
  assert.strictEqual(Context.get(Port)(portContext), 8080)
  assert.strictEqual(Context.get(portContext, Port), 8080)
  assert.strictEqual(Context.get(both, Host), "localhost")
  assert.strictEqual(Context.get<Port, Port, number>(Port)(portContext), 8080)
  assert.deepStrictEqual([...portContext.mapUnsafe], [[Port.key, 8080]])
})

it("reference getter uses defaults and overrides without changing source values", () => {
  const Ref = Context.Reference<number>("ContextGet/Ref", { defaultValue: () => 42 })
  const getRef = Context.get(Ref)
  const empty = Context.empty()
  const portContext = Context.make(Port, 8080)
  const hostOnly = Context.make(Host, "localhost")
  assert.strictEqual(getRef(empty), 42)
  assert.strictEqual(getRef(portContext), 42)
  assert.strictEqual(getRef(hostOnly), 42)
  assert.strictEqual(getRef(Context.add(portContext, Ref, 99)), 99)
  assert.strictEqual(getRef(portContext), 42)
  assert.strictEqual(empty.mapUnsafe.size, 0)
})
