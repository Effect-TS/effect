import * as Context from "@effect/data/Context"
import { pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as FileSystem from "@effect/platform/FileSystem"
import type * as KeyValueStore from "@effect/platform/KeyValueStore"
import * as Path from "@effect/platform/Path"

/** @internal */
export const TypeId: KeyValueStore.TypeId = Symbol.for(
  "@effect/platform/KeyValueStore"
) as KeyValueStore.TypeId

/** @internal */
export const tag = Context.Tag<KeyValueStore.KeyValueStore>(TypeId)

/** @internal */
export const make: (
  impl:
    & Omit<KeyValueStore.KeyValueStore, KeyValueStore.TypeId | "has" | "modify" | "isEmpty">
    & Partial<KeyValueStore.KeyValueStore>
) => KeyValueStore.KeyValueStore = (impl) =>
  tag.of({
    [TypeId]: TypeId,
    has: (key) => Effect.map(impl.get(key), Option.isSome),
    isEmpty: Effect.map(impl.size, (size) => size === 0),
    modify: (key, f) =>
      Effect.flatMap(
        impl.get(key),
        (o) => {
          if (Option.isNone(o)) {
            return Effect.succeedNone
          }
          const newValue = f(o.value)
          return Effect.as(
            impl.set(key, newValue),
            Option.some(newValue)
          )
        }
      ),
    ...impl
  })

/** @internal */
export const layerMemory = Layer.sync(tag, () => {
  const store = new Map<string, string>()

  return make({
    get: (key: string) => Effect.sync(() => Option.fromNullable(store.get(key))),
    set: (key: string, value: string) => Effect.sync(() => store.set(key, value)),
    remove: (key: string) => Effect.sync(() => store.delete(key)),
    clear: Effect.sync(() => store.clear()),
    size: Effect.sync(() => store.size)
  })
})

/** @internal */
export const layerFileSystem = (directory: string) =>
  Layer.effect(
    tag,
    Effect.gen(function*(_) {
      const fs = yield* _(FileSystem.FileSystem)
      const path = yield* _(Path.Path)
      const keyPath = (key: string) => path.join(directory, encodeURIComponent(key))

      if (!(yield* _(fs.exists(directory)))) {
        yield* _(fs.makeDirectory(directory, { recursive: true }))
      }

      return make({
        get: (key: string) =>
          pipe(
            Effect.map(fs.readFileString(keyPath(key)), Option.some),
            Effect.catchTag(
              "SystemError",
              (sysError) => sysError.reason === "NotFound" ? Effect.succeed(Option.none()) : Effect.fail(sysError)
            )
          ),
        set: (key: string, value: string) => fs.writeFileString(keyPath(key), value),
        remove: (key: string) => fs.remove(keyPath(key)),
        has: (key: string) => fs.exists(keyPath(key)),
        clear: Effect.zipRight(
          fs.remove(directory, { recursive: true }),
          fs.makeDirectory(directory, { recursive: true })
        ),
        size: Effect.map(
          fs.readDirectory(directory),
          (files) => files.length
        )
      })
    })
  )
