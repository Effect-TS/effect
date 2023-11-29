/**
 * @since 1.0.0
 */
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"

/**
 * @since 1.0.0
 * @category models
 */
export interface Persistence<A> {
  readonly get: (key: string) => Effect.Effect<never, PersistenceError, Option.Option<A>>
  readonly getMany: (key: Array<string>) => Effect.Effect<never, PersistenceError, Array<Option.Option<A>>>
  readonly set: (key: string, value: A) => Effect.Effect<never, PersistenceError, void>
  readonly remove: (key: string) => Effect.Effect<never, PersistenceError, void>
}

/**
 * @since 1.0.0
 */
export const Persistence = <A>(_: Persistence<A>) => _

/**
 * @since 1.0.0
 * @category errors
 */
export type PersistenceError = PersistenceSchemaError | PersistenceBackingError

/**
 * @since 1.0.0
 * @category errors
 */
export class PersistenceSchemaError extends Data.TaggedError("PersistenceSchemaError")<{
  readonly method: string
  readonly errors: ParseResult.ParseError["errors"]
}> {}

/**
 * @since 1.0.0
 * @category errors
 */
export class PersistenceBackingError extends Data.TaggedError("PersistenceBackingError")<{
  readonly method: string
  readonly error: unknown
}> {}

/**
 * @since 1.0.0
 * @category type ids
 */
export const BackingPersistenceTypeId = Symbol.for("@effect/experimental/BackingPersistence")

/**
 * @since 1.0.0
 * @category type ids
 */
export type BackingPersistenceTypeId = typeof BackingPersistenceTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface BackingPersistence {
  readonly [BackingPersistenceTypeId]: BackingPersistenceTypeId
  readonly make: (storeId: string) => Effect.Effect<never, never, Persistence<unknown>>
}

/**
 * @since 1.0.0
 * @category tags
 */
export const BackingPersistence: Context.Tag<BackingPersistence, BackingPersistence> = Context.Tag<BackingPersistence>(
  BackingPersistenceTypeId
)

/**
 * @since 1.0.0
 * @category type ids
 */
export const SchemaPersistenceTypeId = Symbol.for("@effect/experimental/SchemaPersistence")

/**
 * @since 1.0.0
 * @category type ids
 */
export type SchemaPersistenceTypeId = typeof SchemaPersistenceTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface SchemaPersistence {
  readonly [SchemaPersistenceTypeId]: SchemaPersistenceTypeId
  readonly make: <I, A>(storeId: string, schema: Schema.Schema<I, A>) => Effect.Effect<never, never, Persistence<A>>
}

/**
 * @since 1.0.0
 * @category tags
 */
export const SchemaPersistence: Context.Tag<SchemaPersistence, SchemaPersistence> = Context.Tag<SchemaPersistence>(
  SchemaPersistenceTypeId
)

/**
 * @since 1.0.0
 * @category layers
 */
export const layerSchema = Layer.effect(
  SchemaPersistence,
  Effect.gen(function*(_) {
    const backing = yield* _(BackingPersistence)
    return SchemaPersistence.of({
      [SchemaPersistenceTypeId]: SchemaPersistenceTypeId,
      make: <I, A>(storeId: string, schema: Schema.Schema<I, A>) =>
        Effect.gen(function*(_) {
          const storage = yield* _(backing.make(storeId))
          const parse_ = Schema.parse(schema)
          const parse = (method: string, value: unknown) =>
            Effect.mapError(parse_(value), (_) => new PersistenceSchemaError({ method, errors: _.errors }))

          const encode_ = Schema.encode(schema)
          const encode = (method: string, value: A) =>
            Effect.mapError(encode_(value), (_) => new PersistenceSchemaError({ method, errors: _.errors }))

          return Persistence<A>({
            get: (key) =>
              Effect.flatMap(
                storage.get(key),
                Option.match({
                  onNone: () => Effect.succeedNone,
                  onSome: (_) => Effect.asSome(parse("get", _))
                })
              ),
            getMany: (keys) =>
              Effect.flatMap(
                storage.getMany(keys),
                Effect.forEach((result, i) =>
                  Option.match(result, {
                    onNone: () => Effect.succeedNone,
                    onSome: (_) =>
                      parse("getMany", _).pipe(
                        Effect.tapError((_) => storage.remove(keys[i])),
                        Effect.option
                      )
                  })
                )
              ),
            set: (key, value) =>
              encode("set", value).pipe(
                Effect.flatMap((_) => storage.set(key, _))
              ),
            remove: storage.remove
          })
        })
    })
  })
)

/**
 * @since 1.0.0
 * @category layers
 */
export const layerMemory: Layer.Layer<never, never, BackingPersistence> = Layer.succeed(
  BackingPersistence,
  BackingPersistence.of({
    [BackingPersistenceTypeId]: BackingPersistenceTypeId,
    make: (_storeId) =>
      Effect.sync(() => {
        const map = new Map<string, unknown>()
        return Persistence<unknown>({
          get: (key) => Effect.sync(() => Option.fromNullable(map.get(key))),
          getMany: (keys) => Effect.sync(() => keys.map((key) => Option.fromNullable(map.get(key)))),
          set: (key, value) => Effect.sync(() => map.set(key, value)),
          remove: (key) => Effect.sync(() => map.delete(key))
        })
      })
  })
)

/**
 * @since 1.0.0
 * @category layers
 */
export const layerSchemaMemory: Layer.Layer<never, never, SchemaPersistence> = layerSchema.pipe(Layer.use(layerMemory))
