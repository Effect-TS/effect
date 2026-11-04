import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

interface Store {
  readOne(): string
  writeOne(): string
}
interface Dependency {
  read(): string
  prepare(): string
  write(): string
}
interface Audit {
  record(): string
}

// A provider built by a constructor: its methods are local consts, and only
// `writeOne` uses the audit service, the cache and the prepared value. The
// program never calls `writeOne`.
const Store = Context.Service<Store>("test/ConstructorGenStore")
const Dependency = Context.Service<Dependency>("test/ConstructorGenDependency")
const Audit = Context.Service<Audit>("test/ConstructorGenAudit")

const log: Array<string> = []

// Module-scope helpers, so the test can see which ones the bundle keeps.
const dependencyRead = () => "read"
const dependencyPrepare = () => {
  log.push("prepared")
  return "prepared"
}
const dependencyWrite = () => "write"
const auditRecord = () => "audited"
const constructorWriteHelper = (value: string) => `wrote ${value}`
const makeWriteCache = () => {
  log.push("cache made")
  return new Map<string, string>()
}

const DependencyLayer = Layer.succeed(Dependency, {
  read: dependencyRead,
  prepare: dependencyPrepare,
  write: dependencyWrite
})
const AuditLayer = Layer.effect(
  Audit,
  Effect.acquireRelease(
    Effect.sync(() => {
      log.push("audit acquired")
      return { record: auditRecord }
    }),
    () => Effect.sync(() => log.push("audit released"))
  )
)

const StoreLayer = Layer.effect(
  Store,
  Effect.gen(function*() {
    const dependency = yield* Dependency
    // Acquired while constructing, even though only `writeOne` uses it.
    const audit = yield* Audit
    yield* Effect.sync(() => log.push("constructed"))
    // Runs while constructing: `prepare` is called now, not inside `writeOne`.
    const prepared = dependency.prepare()
    const cache = makeWriteCache()
    const readOne = () => dependency.read()
    const writeOne = () => {
      cache.set(prepared, dependency.write())
      return constructorWriteHelper(audit.record())
    }
    return Store.of({ readOne, writeOne })
  })
)

const main = () =>
  Effect.runPromise(
    Effect.provide(
      Store.useSync((store) => store.readOne()),
      StoreLayer.pipe(Layer.provide(Layer.mergeAll(DependencyLayer, AuditLayer)))
    )
  ).then((result) => [result, ...log].join(","))

// A closed program: it exports nothing and prints its result.
main().then((output) => console.log(output))
