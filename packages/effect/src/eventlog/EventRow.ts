/**
 * Mutable rows that converge across event-log replicas.
 *
 * Each row type has one event with `set`, `patch` and `remove` payloads, keyed
 * by a string field. Pass the result of `make` to `EventGroup.add` and write
 * its payloads with `EventLog.write` or `EventLog.writeMany`.
 *
 * `handler` resolves conflicts per top-level field and calls at most one
 * storage callback. Replicas converge to the result of applying entries in
 * id order.
 *
 * **Example** (Syncing grocery rows)
 *
 * ```ts
 * import { Effect, Schema } from "effect"
 * import { EventGroup, EventLog, EventRow } from "effect/eventlog"
 *
 * const Grocery = EventRow.make("grocery", {
 *   key: "id",
 *   schema: Schema.Struct({
 *     id: Schema.String,
 *     name: Schema.String,
 *     completed: Schema.Boolean
 *   })
 * })
 *
 * const Groceries = EventGroup.empty.add(Grocery)
 *
 * const store = new Map<string, typeof Grocery.schema.Type>()
 *
 * export const GroceriesLive = EventLog.group(Groceries, (handlers) =>
 *   handlers.handle(
 *     "grocery",
 *     EventRow.handler(Grocery, {
 *       set: (row) => Effect.sync(() => store.set(row.id, row)),
 *       patch: (id, fields) =>
 *         Effect.sync(() => {
 *           const row = store.get(id)
 *           if (row !== undefined) store.set(id, { ...row, ...fields })
 *         }),
 *       remove: (id) => Effect.sync(() => store.delete(id))
 *     })
 *   ))
 *
 * export const complete = Effect.fnUntraced(function*(id: string) {
 *   const log = yield* EventLog.EventLog
 *   yield* log.write({
 *     schema: EventLog.schema(Groceries),
 *     event: "grocery",
 *     payload: Grocery.patch(id, { completed: true })
 *   })
 * })
 * ```
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Effect from "../Effect.ts"
import * as SchemaBinary from "../encoding/SchemaBinary.ts"
import * as Schema from "../Schema.ts"
import * as SchemaGetter from "../SchemaGetter.ts"
import * as SchemaIssue from "../SchemaIssue.ts"
import * as SchemaParser from "../SchemaParser.ts"
import * as Struct from "../Struct.ts"
import type { Entry } from "./EventJournal.ts"
import type { StoreId } from "./EventLogMessage.ts"

/**
 * Required string fields eligible as a row key.
 *
 * @stability unstable
 * @category utility types
 * @since 4.0.6
 */
export type KeyField<Fields extends Schema.Struct.Fields> =
  & {
    [K in keyof Fields]: Fields[K] extends { readonly "~type.optionality": "optional" } ? never
      : Schema.Schema.Type<Fields[K]> extends string ? K
      : never
  }[keyof Fields]
  & string

/**
 * Optional non-key fields of a `patch` payload.
 *
 * @stability unstable
 * @category utility types
 * @since 4.0.6
 */
export type PatchFields<Fields extends Schema.Struct.Fields, Key extends keyof Fields> = {
  readonly [K in Exclude<keyof Fields, Key>]: Schema.optionalKey<Fields[K]>
}

/**
 * Schema of a row event's payload, derived from the row schema.
 *
 * **Details**
 *
 * - `set` carries the full row, validated by the row schema.
 * - `patch` carries the row key and the fields to write. An absent field is
 *   not written. The key itself cannot be patched.
 * - `remove` carries the row key.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type PayloadSchema<Fields extends Schema.Struct.Fields, Key extends keyof Fields> = Schema.Union<
  readonly [
    Schema.TaggedStruct<"set", { readonly row: Schema.Struct<Fields> }>,
    Schema.TaggedStruct<"patch", {
      readonly key: Fields[Key]
      readonly fields: Schema.Struct<PatchFields<Fields, Key>>
    }>,
    Schema.TaggedStruct<"remove", { readonly key: Fields[Key] }>
  ]
>

/**
 * Decoded payload of a row event.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type Payload<Fields extends Schema.Struct.Fields, Key extends keyof Fields> = Schema.Schema.Type<
  PayloadSchema<Fields, Key>
>

/**
 * A row type that syncs through an `EventLog`.
 *
 * **Details**
 *
 * Includes `EventGroup.add` options, the row schema, its key field and payload
 * constructors. The row key is the event primary key; success is `void`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface EventRow<
  out Tag extends string,
  in out Fields extends Schema.Struct.Fields,
  in out Key extends KeyField<Fields>,
  in out Error extends Schema.Top = typeof Schema.Never
> {
  readonly tag: Tag
  readonly key: Key
  readonly schema: Schema.Struct<Fields>
  readonly primaryKey: (payload: Payload<Fields, Key>) => string
  readonly payload: PayloadSchema<Fields, Key>
  readonly success: typeof Schema.Void
  readonly error: Error

  /**
   * Replaces the whole row, creating it if missing.
   */
  readonly set: (row: Schema.Struct<Fields>["Type"]) => Payload<Fields, Key>

  /**
   * Writes fields of an existing row.
   *
   * **Details**
   *
   * A patch on a missing row does nothing. To clear a value, use a nullable
   * field and write `null`.
   *
   * Absent fields stay unwritten, even with decoding defaults. Values whose
   * encoding omits the key, such as `Option.none()` for
   * `Schema.OptionFromOptionalKey`, fail encoding: replicas cannot distinguish
   * them from unwritten fields.
   */
  readonly patch: (
    key: Schema.Schema.Type<Fields[Key]>,
    fields: Schema.Struct<PatchFields<Fields, Key>>["Type"]
  ) => Payload<Fields, Key>

  /**
   * Deletes the row.
   */
  readonly remove: (key: Schema.Schema.Type<Fields[Key]>) => Payload<Fields, Key>
}

/**
 * Defines a row type as a single event.
 *
 * **Details**
 *
 * `key` must name a required string field. Composite keys are not supported.
 *
 * Last-writer-wins applies to top-level fields. Nested values are atomic, so
 * concurrent updates within one nested value do not merge.
 *
 * `error` is the error schema of the event. Handler callbacks can fail with it.
 *
 * **Gotchas**
 *
 * Do not use row events with `EventLog.groupCompaction` or
 * `EventLog.groupBatchCompaction`. Compaction runs before stored conflicts
 * are read, so collapsing row ops loses or misapplies writes.
 *
 * For multi-row operations, use `EventLog.writeMany` with one op per row.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const make = <
  const Tag extends string,
  Fields extends Schema.Struct.Fields,
  const Key extends KeyField<Fields>,
  Error extends Schema.Top = typeof Schema.Never
>(tag: Tag, options: {
  readonly key: Key
  readonly schema: Schema.Struct<Fields>
  readonly error?: Error | undefined
}): EventRow<Tag, Fields, Key, Error> => {
  const key = options.key
  const keySchema = options.schema.fields[key]
  const patchFields: Record<string, Schema.Constraint> = {}
  for (const name of Object.keys(options.schema.fields)) {
    if (name !== key) patchFields[name] = patchField(options.schema.fields[name])
  }
  const payload = Schema.Union([
    Schema.TaggedStruct("set", { row: options.schema }),
    Schema.TaggedStruct("patch", { key: keySchema, fields: Schema.Struct(patchFields) }),
    Schema.TaggedStruct("remove", { key: keySchema })
  ])
  return {
    tag,
    key,
    schema: options.schema,
    primaryKey: (payload: Op) => payload._tag === "set" ? payload.row[key] as string : payload.key as string,
    payload,
    success: Schema.Void,
    error: options.error ?? Schema.Never,
    set: (row: unknown) => ({ _tag: "set", row }),
    patch: (key: unknown, fields: unknown) => ({ _tag: "patch", key, fields }),
    remove: (key: unknown) => ({ _tag: "remove", key })
  } as any
}

/**
 * Builds the handler for a row event, to pass to `handlers.handle`.
 *
 * **Details**
 *
 * Resolves stored newer conflicts in id order and calls at most one callback.
 * Callbacks receive typed values, never conflicts.
 *
 * Newer writes take precedence per top-level field. Empty patches and entries
 * with nothing left to write skip the callback but are still journaled and synced.
 * A late `set` retains newer patches, including when the row is missing.
 *
 * Decodes stored entry bytes so local writes and replay pass the same values
 * to callbacks, stripping keys outside the schema at any depth. Requires the
 * payload schema's decoding services, plus any services the callbacks require.
 * Callbacks may fail with the event's error type; success is always `void`.
 *
 * **Gotchas**
 *
 * Convergence requires this callback contract:
 *
 * - `set` replaces the whole row, creating it if it is missing.
 * - `patch` updates an existing row and does nothing if the row is missing.
 *   Upserting can resurrect removed rows on only some replicas.
 * - `remove` is idempotent.
 *
 * @stability unstable
 * @category handlers
 * @since 4.0.6
 */
export const handler = <
  Tag extends string,
  Fields extends Schema.Struct.Fields,
  Key extends KeyField<Fields>,
  Error extends Schema.Top,
  RSet = never,
  RPatch = never,
  RRemove = never
>(
  row: EventRow<Tag, Fields, Key, Error>,
  callbacks: {
    readonly set: (row: Schema.Struct<Fields>["Type"]) => Effect.Effect<unknown, Error["Type"], RSet>
    readonly patch: (
      key: Schema.Schema.Type<Fields[Key]>,
      fields: Schema.Struct<PatchFields<Fields, Key>>["Type"]
    ) => Effect.Effect<unknown, Error["Type"], RPatch>
    readonly remove: (key: Schema.Schema.Type<Fields[Key]>) => Effect.Effect<unknown, Error["Type"], RRemove>
  }
): (options: {
  readonly storeId: StoreId
  readonly payload: Payload<Fields, Key>
  readonly entry: Entry
  readonly conflicts: ReadonlyArray<{
    readonly entry: Entry
    readonly payload: Payload<Fields, Key>
  }>
}) => Effect.Effect<
  void,
  Error["Type"],
  RSet | RPatch | RRemove | PayloadSchema<Fields, Key>["DecodingServices"]
> => {
  const decode = Schema.decodeUnknownEffect(SchemaBinary.toCodec(row.payload))
  return (options) =>
    Effect.flatMap(
      Effect.orDie(decode(options.entry.payload)),
      (payload): Effect.Effect<unknown, Error["Type"], RSet | RPatch | RRemove> => {
        const op = resolve(payload as Op, options.conflicts as ReadonlyArray<{ readonly payload: Op }>)
        if (op === undefined) return Effect.void
        switch (op._tag) {
          case "set":
            return callbacks.set(op.row as any)
          case "patch":
            return Object.keys(op.fields).length === 0 ? Effect.void : callbacks.patch(op.key as any, op.fields as any)
          case "remove":
            return callbacks.remove(op.key as any)
        }
      }
    ).pipe(Effect.asVoid)
}

// Run the field codec only for present keys, bypassing missing-key defaults.
const patchField = (field: Schema.Constraint): Schema.Constraint => {
  const decode = SchemaParser.decodeUnknownEffect(field)
  // The struct wrapper detects encodings that drop a written key.
  const encode = SchemaParser.encodeUnknownEffect(Schema.Struct({ value: field }))
  return Schema.optionalKey(Schema.toEncoded(field)).pipe(Schema.decodeTo(Schema.optionalKey(Schema.toType(field)), {
    decode: SchemaGetter.transformEffect(decode),
    encode: SchemaGetter.transformEffect((value, options) =>
      Effect.flatMap(encode({ value }, options), (encoded) =>
        Object.hasOwn(encoded, "value")
          ? Effect.succeed(encoded.value)
          : Effect.fail(
            new SchemaIssue.Forbidden({ message: "A patch cannot write a value whose encoding omits the key" }, value)
          ))
    )
  }))
}

type Op =
  | { readonly _tag: "set"; readonly row: Readonly<Record<string, unknown>> }
  | { readonly _tag: "patch"; readonly key: unknown; readonly fields: Readonly<Record<string, unknown>> }
  | { readonly _tag: "remove"; readonly key: unknown }

const compose = (x: Op, y: Op): Op => {
  if (y._tag !== "patch") return y
  switch (x._tag) {
    case "set":
      return { _tag: "set", row: { ...x.row, ...y.fields } }
    case "patch":
      return { _tag: "patch", key: y.key, fields: { ...x.fields, ...y.fields } }
    case "remove":
      return x
  }
}

const resolve = (entry: Op, conflicts: ReadonlyArray<{ readonly payload: Op }>): Op | undefined => {
  if (conflicts.length === 0) return entry
  let newer = conflicts[0].payload
  for (let i = 1; i < conflicts.length; i++) {
    newer = compose(newer, conflicts[i].payload)
  }
  if (newer._tag !== "patch") return undefined
  switch (entry._tag) {
    case "set":
      return { _tag: "set", row: { ...entry.row, ...newer.fields } }
    case "patch":
      return { _tag: "patch", key: entry.key, fields: Struct.omit(entry.fields, Object.keys(newer.fields)) }
    case "remove":
      return entry
  }
}
