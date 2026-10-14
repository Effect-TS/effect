/**
 * Writable atoms backed by a `KeyValueStore` entry.
 *
 * `kvs` reads and writes one store key through an `AtomRuntime` that provides
 * `KeyValueStore`. Sync mode exposes the decoded value. Async mode exposes an
 * `AsyncResult` of that value.
 *
 * @stability unstable
 * @since 4.0.0
 */
import type { LazyArg } from "../Function.ts"
import * as Option from "../Option.ts"
import * as KeyValueStore from "../persistence/KeyValueStore.ts"
import type * as Schema from "../Schema.ts"
import * as AsyncResult from "./AsyncResult.ts"
import { type AtomRuntime, type Writable, writable } from "./Atom.ts"

/**
 * Creates a writable atom backed by a `KeyValueStore` entry.
 *
 * **Details**
 *
 * Values are encoded and decoded with the supplied schema. In sync mode the atom
 * exposes the decoded value and writes the default value when the key is missing;
 * in async mode it exposes an `AsyncResult` of the decoded value.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const kvs = <S extends Schema.ConstraintCodec<any, any>, const Mode extends "sync" | "async" = never>(options: {
  readonly runtime: AtomRuntime<KeyValueStore.KeyValueStore, any>
  readonly key: string
  readonly schema: S
  readonly defaultValue: LazyArg<S["Type"]>
  readonly mode?: Mode | undefined
}): Writable<"async" extends Mode ? AsyncResult.AsyncResult<S["Type"]> : S["Type"], S["Type"]> => {
  const setAtom = options.runtime.fn(
    (value: S["Type"]) =>
      KeyValueStore.KeyValueStore.use((store) =>
        KeyValueStore.toSchemaStore(store, options.schema).set(options.key, value)
      )
  )
  const resultAtom = options.runtime.atom(
    KeyValueStore.KeyValueStore.use((store) => KeyValueStore.toSchemaStore(store, options.schema).get(options.key))
  )
  return writable(
    options.mode === "async" ?
      (get) => {
        get.mount(setAtom)
        const mapper = AsyncResult.map<Option.Option<S["Type"]>, S["Type"]>(
          Option.getOrElse(() => {
            const value = options.defaultValue()
            get.set(setAtom, value)
            return value
          })
        )
        get.subscribe(resultAtom, (result) => get.setSelf(mapper(result)))
        return mapper(get.once(resultAtom))
      } :
      (get) => {
        get.mount(setAtom)
        get.subscribe(resultAtom, (result) => {
          if (!AsyncResult.isSuccess(result)) return
          if (Option.isSome(result.value)) {
            get.setSelf(result.value.value)
          } else {
            const value = Option.getOrElse(get.self<S["Type"]>(), options.defaultValue)
            get.setSelf(value)
            get.set(setAtom, value)
          }
        }, { immediate: true })
        return Option.getOrElse(get.self<S["Type"]>(), options.defaultValue)
      },
    (ctx, value: S["Type"]) => {
      ctx.set(setAtom, value as any)
      ctx.setSelf(options.mode === "async" ? AsyncResult.success(value) : value)
    }
  ) as any
}
