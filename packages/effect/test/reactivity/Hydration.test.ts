import { assert, describe, it } from "@effect/vitest"
import { AsyncResult, Atom, AtomRegistry, Hydration } from "effect/reactivity"
import * as Schema from "effect/Schema"

describe("Hydration", () => {
  const atom = Atom.make<AsyncResult.AsyncResult<string>>(AsyncResult.initial()).pipe(
    Atom.serializable({ key: "profile", schema: AsyncResult.Schema({ success: Schema.String }) })
  )

  it.each([
    { serverTimestamp: 1000, expected: "client", expectedTimestamp: 2000 },
    { serverTimestamp: 3000, expected: "server", expectedTimestamp: 3000 }
  ])("compares result freshness on the next read (server timestamp: $serverTimestamp)", ({
    expected,
    expectedTimestamp,
    serverTimestamp
  }) => {
    const server = AtomRegistry.make()
    const client = AtomRegistry.make()
    try {
      server.set(atom, AsyncResult.success("server", { timestamp: serverTimestamp }))
      const state = JSON.parse(JSON.stringify(Hydration.dehydrate(server)))
      client.set(atom, AsyncResult.success("client", { timestamp: 2000 }))

      Hydration.hydrate(client, state)

      assert.deepStrictEqual(client.get(atom), AsyncResult.success(expected, { timestamp: expectedTimestamp }))
    } finally {
      server.dispose()
      client.dispose()
    }
  })

  it("ignores a streamed result older than the client value at resolution", async () => {
    const server = AtomRegistry.make()
    const client = AtomRegistry.make()
    try {
      server.mount(atom)
      const state = Hydration.dehydrate(server, { encodeInitialAs: "promise" })
      Hydration.hydrate(client, state)

      // The client finishes after hydration starts but before the server result arrives.
      client.set(atom, AsyncResult.success("client", { timestamp: 2000 }))
      server.set(atom, AsyncResult.success("server", { timestamp: 1000 }))
      await Hydration.toValues(state)[0].resultPromise

      assert.deepStrictEqual(client.get(atom), AsyncResult.success("client", { timestamp: 2000 }))
    } finally {
      server.dispose()
      client.dispose()
    }
  })
})
