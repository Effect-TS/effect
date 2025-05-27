import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Encoding from "effect/Encoding"
import type { LazyArg } from "effect/Function"
import { dual, identity, pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as PlatformError from "../Error.js"
import * as FileSystem from "../FileSystem.js"
import type * as KeyValueStore from "../KeyValueStore.js"
import * as Path from "../Path.js"

/** @internal */
export const TypeId: KeyValueStore.TypeId = Symbol.for(
  "@effect/platform/KeyValueStore"
) as KeyValueStore.TypeId

/** @internal */
export const keyValueStoreTag = Context.GenericTag<KeyValueStore.KeyValueStore>("@effect/platform/KeyValueStore")

/** @internal */
export const make: (
  impl:
    & Omit<
      KeyValueStore.KeyValueStore,
      KeyValueStore.TypeId | "has" | "modify" | "modifyUint8Array" | "isEmpty" | "forSchema"
    >
    & Partial<KeyValueStore.KeyValueStore>
) => KeyValueStore.KeyValueStore = (impl) =>
  keyValueStoreTag.of({
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
    modifyUint8Array: (key, f) =>
      Effect.flatMap(
        impl.getUint8Array(key),
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
    forSchema(schema) {
      return makeSchemaStore(this, schema)
    },
    ...impl
  })

/** @internal */
export const makeStringOnly: (
  impl:
    & Pick<
      KeyValueStore.KeyValueStore,
      "get" | "remove" | "clear" | "size"
    >
    & Partial<Omit<KeyValueStore.KeyValueStore, "set">>
    & { readonly set: (key: string, value: string) => Effect.Effect<void, PlatformError.PlatformError> }
) => KeyValueStore.KeyValueStore = (impl) => {
  const encoder = new TextEncoder()
  return make({
    ...impl,
    getUint8Array: (key) =>
      impl.get(key).pipe(
        Effect.map(Option.map((value) =>
          Either.match(Encoding.decodeBase64(value), {
            onLeft: () => encoder.encode(value),
            onRight: identity
          })
        ))
      ),
    set: (key, value) =>
      typeof value === "string"
        ? impl.set(key, value)
        : Effect.suspend(() => impl.set(key, Encoding.encodeBase64(value)))
  })
}

/** @internal */
export const prefix = dual<
  (prefix: string) => <S extends KeyValueStore.KeyValueStore.AnyStore>(self: S) => S,
  <S extends KeyValueStore.KeyValueStore.AnyStore>(self: S, prefix: string) => S
>(
  2,
  ((self: KeyValueStore.KeyValueStore, prefix: string): KeyValueStore.KeyValueStore => ({
    ...self,
    get: (key) => self.get(`${prefix}${key}`),
    set: (key, value) => self.set(`${prefix}${key}`, value),
    remove: (key) => self.remove(`${prefix}${key}`),
    has: (key) => self.has(`${prefix}${key}`),
    modify: (key, f) => self.modify(`${prefix}${key}`, f)
  })) as any
)

/** @internal */
export const SchemaStoreTypeId: KeyValueStore.SchemaStoreTypeId = Symbol.for(
  "@effect/platform/KeyValueStore/SchemaStore"
) as KeyValueStore.SchemaStoreTypeId

/** @internal */
const makeSchemaStore = <A, I, R>(
  store: KeyValueStore.KeyValueStore,
  schema: Schema.Schema<A, I, R>
): KeyValueStore.SchemaStore<A, R> => {
  const jsonSchema = Schema.parseJson(schema)
  const parse = Schema.decodeUnknown(jsonSchema)
  const encode = Schema.encode(jsonSchema)

  const get = (key: string) =>
    Effect.flatMap(
      store.get(key),
      Option.match({
        onNone: () => Effect.succeedNone,
        onSome: (value) => Effect.asSome(parse(value))
      })
    )

  const set = (key: string, value: A) => Effect.flatMap(encode(value), (json) => store.set(key, json))

  const modify = (key: string, f: (value: A) => A) =>
    Effect.flatMap(
      get(key),
      (o) => {
        if (Option.isNone(o)) {
          return Effect.succeedNone
        }
        const newValue = f(o.value)
        return Effect.as(
          set(key, newValue),
          Option.some(newValue)
        )
      }
    )

  return {
    [SchemaStoreTypeId]: SchemaStoreTypeId,
    get,
    set,
    modify,
    remove: store.remove,
    clear: store.clear,
    size: store.size,
    has: store.has,
    isEmpty: store.isEmpty
  }
}

/** @internal */
export const layerMemory = Layer.sync(keyValueStoreTag, () => {
  const store = new Map<string, string | Uint8Array>()
  const encoder = new TextEncoder()

  return make({
    get: (key: string) =>
      Effect.sync(() =>
        Option.fromNullable(store.get(key)).pipe(
          Option.map((value) => typeof value === "string" ? value : Encoding.encodeBase64(value))
        )
      ),
    getUint8Array: (key: string) =>
      Effect.sync(() =>
        Option.fromNullable(store.get(key)).pipe(
          Option.map((value) => typeof value === "string" ? encoder.encode(value) : value)
        )
      ),
    set: (key: string, value: string | Uint8Array) => Effect.sync(() => store.set(key, value)),
    remove: (key: string) => Effect.sync(() => store.delete(key)),
    clear: Effect.sync(() => store.clear()),
    size: Effect.sync(() => store.size)
  })
})

/** @internal */
export const layerFileSystem = (directory: string) =>
  Layer.effect(
    keyValueStoreTag,
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const keyPath = (key: string) => path.join(directory, encodeURIComponent(key))

      if (!(yield* fs.exists(directory))) {
        yield* fs.makeDirectory(directory, { recursive: true })
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
        getUint8Array: (key: string) =>
          pipe(
            Effect.map(fs.readFile(keyPath(key)), Option.some),
            Effect.catchTag(
              "SystemError",
              (sysError) => sysError.reason === "NotFound" ? Effect.succeed(Option.none()) : Effect.fail(sysError)
            )
          ),
        set: (key: string, value: string | Uint8Array) =>
          typeof value === "string" ? fs.writeFileString(keyPath(key), value) : fs.writeFile(keyPath(key), value),
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

/** @internal */
export const layerSchema = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  tagIdentifier: string
) => {
  const tag = Context.GenericTag<KeyValueStore.SchemaStore<A, R>>(tagIdentifier)
  const layer = Layer.effect(tag, Effect.map(keyValueStoreTag, (store) => store.forSchema(schema)))
  return { tag, layer } as const
}

/** @internal */
const storageError = (props: Omit<ConstructorParameters<typeof PlatformError.SystemError>[0], "reason" | "module">) =>
  new PlatformError.SystemError({
    reason: "PermissionDenied",
    module: "KeyValueStore",
    ...props
  })

/** @internal */
export const layerStorage = (evaluate: LazyArg<Storage>) =>
  Layer.sync(keyValueStoreTag, () => {
    const storage = evaluate()
    return makeStringOnly({
      get: (key: string) =>
        Effect.try({
          try: () => Option.fromNullable(storage.getItem(key)),
          catch: () =>
            storageError({
              pathOrDescriptor: key,
              method: "get",
              description: `Unable to get item with key ${key}`
            })
        }),

      set: (key: string, value: string) =>
        Effect.try({
          try: () => storage.setItem(key, value),
          catch: () =>
            storageError({
              pathOrDescriptor: key,
              method: "set",
              description: `Unable to set item with key ${key}`
            })
        }),

      remove: (key: string) =>
        Effect.try({
          try: () => storage.removeItem(key),
          catch: () =>
            storageError({
              pathOrDescriptor: key,
              method: "remove",
              description: `Unable to remove item with key ${key}`
            })
        }),

      clear: Effect.try({
        try: () => storage.clear(),
        catch: () =>
          storageError({
            pathOrDescriptor: "clear",
            method: "clear",
            description: `Unable to clear storage`
          })
      }),

      size: Effect.try({
        try: () => storage.length,
        catch: () =>
          storageError({
            pathOrDescriptor: "size",
            method: "size",
            description: `Unable to get size`
          })
      })
    })
  })
