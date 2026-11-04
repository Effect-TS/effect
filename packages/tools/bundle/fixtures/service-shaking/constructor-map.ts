import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

interface Store {
  readOne(): string
  writeOne(): string
}
interface Dependency {
  read(): string
  describe(): string
  write(): string
}

// A provider built in an `Effect.map` callback. `describe` is shared by the
// removable `writeOne` and code that runs while constructing.
const Store = Context.Service<Store>("test/ConstructorMapStore")
const Dependency = Context.Service<Dependency>("test/ConstructorMapDependency")

const log: Array<string> = []

// Module-scope helpers, so the test can see which ones the bundle keeps.
const dependencyRead = () => "read"
const dependencyDescribe = () => "described"
const dependencyWrite = () => "write"
const constructorWriteHelper = (value: string) => `wrote ${value}`

const DependencyLayer = Layer.succeed(Dependency, {
  read: dependencyRead,
  describe: dependencyDescribe,
  write: dependencyWrite
})

const StoreLayer = Layer.effect(
  Store,
  Effect.map(Dependency, (dependency) => {
    const describe = (label: string) => `${label}:${dependency.describe()}`
    // Runs while constructing, so `describe` and `dependency.describe` stay live.
    log.push(describe("init"))
    const readOne = () => dependency.read()
    const writeOne = () => constructorWriteHelper(`${describe("write")}:${dependency.write()}`)
    return Store.of({ readOne, writeOne })
  })
)

const main = () =>
  Effect.runPromise(
    Effect.provide(Store.useSync((store) => store.readOne()), StoreLayer.pipe(Layer.provide(DependencyLayer)))
  ).then((result) => [result, ...log].join(","))

// A closed program: it exports nothing and prints its result.
main().then((output) => console.log(output))
