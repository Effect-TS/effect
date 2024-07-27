import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Option from "effect/Option"
import * as PlatformError from "../Error.js"
import type * as KeyValueStore from "../KeyValueStore.js"

/** @internal */
export const TypeId: KeyValueStore.TypeId = Symbol.for(
  "@effect/platform/KeyValueStore"
) as KeyValueStore.TypeId

/** @internal */
export const make: (
  impl:
    & Omit<
      typeof KeyValueStore.KeyValueStore.Service,
      typeof KeyValueStore.TypeId | "has" | "modify" | "isEmpty" | "forSchema"
    >
    & Partial<typeof KeyValueStore.KeyValueStore.Service>
) => typeof KeyValueStore.KeyValueStore.Service = (impl) => ({
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
  forSchema(schema) {
    return makeSchemaStore(this, schema)
  },
  ...impl
} as const)

/** @internal */
export const prefix = dual<
  (prefix: string) => <S extends KeyValueStore.KeyValueStore.AnyStore>(self: S) => S,
  <S extends KeyValueStore.KeyValueStore.AnyStore>(self: S, prefix: string) => S
>(
  2,
  ((self: typeof KeyValueStore.KeyValueStore.Service, prefix: string): typeof KeyValueStore.KeyValueStore.Service => ({
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
  store: typeof KeyValueStore.KeyValueStore.Service,
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
export const storageError = (props: Omit<Parameters<typeof PlatformError.SystemError>[0], "reason" | "module">) =>
  PlatformError.SystemError({
    reason: "PermissionDenied",
    module: "KeyValueStore",
    ...props
  })
