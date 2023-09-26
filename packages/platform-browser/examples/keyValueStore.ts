import * as Effect from "@effect/io/Effect"
import * as KeyValueStore from "@effect/platform-browser/KeyValueStore"

const program = KeyValueStore.KeyValueStore.pipe(
  Effect.flatMap((kv) => kv.set("foo", "bar")),
  Effect.provide(KeyValueStore.layerMemory)
)

Effect.runPromise(program)
