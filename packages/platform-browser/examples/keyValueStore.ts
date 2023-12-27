import * as KeyValueStore from "@effect/platform-browser/KeyValueStore"
import * as Effect from "effect/Effect"

const program = KeyValueStore.KeyValueStore.pipe(
  Effect.flatMap((kv) => kv.set("foo", "bar")),
  Effect.provide(KeyValueStore.layerMemory)
)

Effect.runPromise(program)
