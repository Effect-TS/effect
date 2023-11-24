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
export interface Persistance<A> {
  readonly get: (key: string) => Effect.Effect<never, PersistanceError, Option.Option<A>>
  readonly getMany: (key: Array<string>) => Effect.Effect<never, PersistanceError, Array<Option.Option<A>>>
  readonly set: (key: string, value: A) => Effect.Effect<never, PersistanceError, void>
  readonly remove: (key: string) => Effect.Effect<never, PersistanceError, void>
}

/**
 * @since 1.0.0
 */
export const Persistance = <A>(_: Persistance<A>) => _

/**
 * @since 1.0.0
 * @category errors
 */
export type PersistanceError = PersistanceSchemaError | PersistanceBackingError

/**
 * @since 1.0.0
 * @category errors
 */
export class PersistanceSchemaError extends Data.TaggedError("PersistanceSchemaError")<{
  readonly method: string
  readonly errors: ParseResult.ParseError["errors"]
}> {}

/**
 * @since 1.0.0
 * @category errors
 */
export class PersistanceBackingError extends Data.TaggedError("PersistanceBackingError")<{
  readonly method: string
  readonly error: unknown
}> {}

/**
 * @since 1.0.0
 * @category type ids
 */
export const BackingPersistanceTypeId = Symbol.for("@effect/experimental/BackingPersistance")

/**
 * @since 1.0.0
 * @category type ids
 */
export type BackingPersistanceTypeId = typeof BackingPersistanceTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface BackingPersistance {
  readonly [BackingPersistanceTypeId]: BackingPersistanceTypeId
  readonly make: (storeId: string) => Effect.Effect<never, never, Persistance<unknown>>
}

/**
 * @since 1.0.0
 * @category tags
 */
export const BackingPersistance: Context.Tag<BackingPersistance, BackingPersistance> = Context.Tag<BackingPersistance>(
  "@effect/experimental/BackingPersistance"
)

/**
 * @since 1.0.0
 * @category type ids
 */
export const SchemaPersistanceTypeId = Symbol.for("@effect/experimental/SchemaPersistance")

/**
 * @since 1.0.0
 * @category type ids
 */
export type SchemaPersistanceTypeId = typeof SchemaPersistanceTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface SchemaPersistance {
  readonly [SchemaPersistanceTypeId]: SchemaPersistanceTypeId
  readonly make: <I, A>(storeId: string, schema: Schema.Schema<I, A>) => Effect.Effect<never, never, Persistance<A>>
}

/**
 * @since 1.0.0
 * @category tags
 */
export const SchemaPersistance: Context.Tag<SchemaPersistance, SchemaPersistance> = Context.Tag<SchemaPersistance>(
  "@effect/experimental/SchemaPersistance"
)

/**
 * @since 1.0.0
 * @category layers
 */
export const layerSchema = Layer.effect(
  SchemaPersistance,
  Effect.gen(function*(_) {
    const backing = yield* _(BackingPersistance)
    return SchemaPersistance.of({
      [SchemaPersistanceTypeId]: SchemaPersistanceTypeId,
      make: <I, A>(storeId: string, schema: Schema.Schema<I, A>) =>
        Effect.gen(function*(_) {
          const storage = yield* _(backing.make(storeId))
          const parse_ = Schema.parse(schema)
          const parse = (method: string, value: unknown) =>
            Effect.mapError(parse_(value), (_) => new PersistanceSchemaError({ method, errors: _.errors }))

          const encode_ = Schema.encode(schema)
          const encode = (method: string, value: A) =>
            Effect.mapError(encode_(value), (_) => new PersistanceSchemaError({ method, errors: _.errors }))

          return Persistance<A>({
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
export const layerMemory: Layer.Layer<never, never, BackingPersistance> = Layer.succeed(
  BackingPersistance,
  BackingPersistance.of({
    [BackingPersistanceTypeId]: BackingPersistanceTypeId,
    make: (_storeId) =>
      Effect.sync(() => {
        const map = new Map<string, unknown>()
        return Persistance<unknown>({
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
export const layerSchemaMemory: Layer.Layer<never, never, SchemaPersistance> = layerSchema.pipe(Layer.use(layerMemory))
