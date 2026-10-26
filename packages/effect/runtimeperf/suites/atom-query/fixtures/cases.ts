import * as Effect from "effect/Effect"
import * as AsyncResult from "effect/reactivity/AsyncResult"
import * as Atom from "effect/reactivity/Atom"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import * as Hydration from "effect/reactivity/Hydration"
import * as Schema from "effect/Schema"
import assert from "node:assert/strict"

const retained = () => {
  const source = Atom.make(21).pipe(Atom.keepAlive)
  const atom = Atom.map(source, (value) => value * 2).pipe(Atom.keepAlive)
  const registry = AtomRegistry.make()
  registry.get(atom)
  return { atom, registry }
}

export const retainedRead = () => {
  const { atom, registry } = retained()
  return {
    run: () => registry.get(atom),
    validate: (result: unknown) => assert.equal(result, 42)
  }
}

export const retainedMount = () => {
  const { atom, registry } = retained()
  return {
    run: () => {
      const unmount = registry.mount(atom)
      const value = registry.get(atom)
      unmount()
      return value
    },
    validate: (result: unknown) => assert.equal(result, 42)
  }
}

export const freshHydratedActivation = () => {
  const tasks = Array.from({ length: 4 }, (_, id) => ({ id, title: `Task ${id}` }))
  const schema = AsyncResult.Schema({
    success: Schema.Array(Schema.Struct({ id: Schema.Number, title: Schema.String }))
  })
  const seed = AsyncResult.success(tasks)
  const serialization = { key: "runtimeperf/tasks", schema }
  let requests = 0
  const load = Effect.sync(() => {
    requests++
    return tasks
  })

  // The same fixture can compare revisions from before the query constructor.
  const query = Reflect.get(Atom, "query") as
    | ((
      effect: typeof load,
      options: { readonly staleTime: "1 hour" }
    ) => Atom.Atom<AsyncResult.AsyncResult<typeof tasks>>)
    | undefined
  const atom = (query
    ? query(load, { staleTime: "1 hour" })
    : Atom.make(load).pipe(Atom.keepAlive, Atom.swr({ staleTime: "1 hour" }))).pipe(
      Atom.keepAlive,
      Atom.serializable({ ...serialization, skipInitialRun: query === undefined })
    )
  const server = AtomRegistry.make()
  let snapshot: Array<Hydration.DehydratedAtom>
  try {
    server.mount(
      Atom.make<AsyncResult.AsyncResult<typeof tasks>>(seed).pipe(Atom.keepAlive, Atom.serializable(serialization))
    )
    snapshot = Hydration.dehydrate(server)
  } finally {
    server.dispose()
  }

  return {
    run: () => {
      const registry = AtomRegistry.make()
      try {
        Hydration.hydrate(registry, snapshot)
        registry.mount(atom)
        return registry.get(atom)
      } finally {
        registry.dispose()
      }
    },
    validate: (result: unknown) => {
      assert.deepEqual(result, seed)
      assert.equal(requests, 0)
    }
  }
}
