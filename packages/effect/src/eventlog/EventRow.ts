/**
 * Mutable rows that converge across event-log replicas.
 *
 * Each row type has one event with `set`, `patch` and `remove` payloads, keyed
 * by a string built from one or more of its fields. Pass the result of `make`
 * to `EventGroup.add` and write its payloads with `EventLog.write` or
 * `EventLog.writeMany`.
 *
 * `handler` resolves conflicts per top-level field and calls at most one
 * storage callback. Replicas converge to the result of applying entries in
 * id order. `compaction` drops entries that newer ones shadow.
 *
 * **Details**
 *
 * Entries are stored as bytes and decoded with the current row schema
 * whenever they are replayed, including stored entries read as the conflicts
 * of a late entry. So the row schema must decode every encoding ever written:
 *
 * - Adding a field is safe when old entries decode without it. Give it a
 *   decoding default, such as `Schema.withDecodingDefaultKey`. A nullable
 *   field without one fails on old `set` entries. Patches never apply
 *   defaults.
 * - Removing a field is safe. Old entries decode without it.
 * - To change a field's type, keep its encoded type and change its decoded
 *   type with a transformation, such as `Schema.NumberFromString` for a field
 *   that used to be a string.
 * - Making a field required, renaming it, narrowing its type, changing its
 *   encoded type or changing the key breaks old entries. That includes
 *   widening a field to a union of its old and new types, because union
 *   encodings are tagged. A rename keeps old entries readable only if the
 *   field has an explicit `SchemaBinary.fieldId`.
 *
 * Conflicts are only resolved between entries for the same row, so removing
 * a parent row does not remove a child that another replica adds at the same
 * time. Keep a removed parent in storage as a marker instead of deleting it.
 * The child `set` and `patch` callbacks skip the write when the parent is
 * marked removed, and apply it when the parent has not arrived yet. The
 * parent `remove` callback marks the parent and deletes its children. If
 * removing a parent is final, so its key is never set again, and a child
 * never moves to another parent, every replica ends without the children of
 * removed parents, whatever the delivery order. Queries must filter out
 * marked parents, and markers stay until the app removes them with a cutoff
 * of its own.
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
 * **Example** (Evolving a row schema)
 *
 * ```ts import.meta.vitest
 * import { Effect, Schema } from "effect"
 * import { EventGroup, EventRow } from "effect/eventlog"
 *
 * const ItemV1 = EventRow.make("item", {
 *   key: "id",
 *   schema: Schema.Struct({ id: Schema.String, quantity: Schema.String })
 * })
 *
 * // Adds a nullable field and reads the old string quantity as a number.
 * const ItemV2 = EventRow.make("item", {
 *   key: "id",
 *   schema: Schema.Struct({
 *     id: Schema.String,
 *     quantity: Schema.NumberFromString,
 *     note: Schema.NullOr(Schema.String).pipe(
 *       Schema.withDecodingDefaultKey(Effect.succeed(null))
 *     )
 *   })
 * })
 *
 * const v1 = EventGroup.empty.add(ItemV1).events.item.payloadSchemaBinary
 * const v2 = EventGroup.empty.add(ItemV2).events.item.payloadSchemaBinary
 *
 * const written = Schema.encodeUnknownSync(v1)(ItemV1.set({ id: "a", quantity: "3" }))
 * const decoded = Schema.decodeUnknownSync(v2)(written)
 * decoded // => { _tag: "set", row: { id: "a", quantity: 3, note: null } }
 * ```
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as SchemaBinary from "../encoding/SchemaBinary.ts"
import * as Layer from "../Layer.ts"
import * as Result from "../Result.ts"
import * as Schema from "../Schema.ts"
import * as SchemaGetter from "../SchemaGetter.ts"
import * as SchemaIssue from "../SchemaIssue.ts"
import * as SchemaParser from "../SchemaParser.ts"
import * as Struct from "../Struct.ts"
import type * as Event from "./Event.ts"
import type * as EventGroup from "./EventGroup.ts"
import { Entry } from "./EventJournal.ts"
import * as EventLog from "./EventLog.ts"
import type { StoreId } from "./EventLogMessage.ts"

/**
 * Required fields that can be part of a declared row key.
 *
 * @stability unstable
 * @category utility types
 * @since 4.0.6
 */
export type RequiredField<Fields extends Schema.Struct.Fields> =
  & {
    [K in keyof Fields]: Fields[K] extends { readonly "~type.optionality": "optional" } ? never : K
  }[keyof Fields]
  & string

/**
 * Required string fields eligible as a row key.
 *
 * @stability unstable
 * @category utility types
 * @since 4.0.6
 */
export type KeyField<Fields extends Schema.Struct.Fields> = {
  [K in RequiredField<Fields>]: Schema.Schema.Type<Fields[K]> extends string ? K : never
}[RequiredField<Fields>]

/**
 * Values of the declared key fields of a row.
 *
 * @stability unstable
 * @category utility types
 * @since 4.0.6
 */
export type KeyValues<Fields extends Schema.Struct.Fields, Names extends keyof Fields> = {
  readonly [K in Names]: Schema.Schema.Type<Fields[K]>
}

/**
 * A row key declared from one or more fields.
 *
 * **Details**
 *
 * `derive` builds the key string from the declared fields. It must be
 * deterministic and return distinct keys for distinct rows. Without it, every
 * declared field must be a string field, and the key is the JSON encoding of
 * the field values in declaration order, which is distinct for distinct
 * values. Other field types need `derive`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type KeyDeclaration<Fields extends Schema.Struct.Fields, Names extends RequiredField<Fields>> =
  & { readonly fields: readonly [Names, ...Array<Names>] }
  & ([Names] extends [KeyField<Fields>] ?
    { readonly derive?: ((fields: KeyValues<Fields, Names>) => string) | undefined }
    : { readonly derive: (fields: KeyValues<Fields, Names>) => string })

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
export type PayloadSchema<
  Fields extends Schema.Struct.Fields,
  Key extends keyof Fields,
  KeySchema extends Schema.Constraint = Fields[Key]
> = Schema.Union<
  readonly [
    Schema.TaggedStruct<"set", { readonly row: Schema.Struct<Fields> }>,
    Schema.TaggedStruct<"patch", {
      readonly key: KeySchema
      readonly fields: Schema.Struct<PatchFields<Fields, Key>>
    }>,
    Schema.TaggedStruct<"remove", { readonly key: KeySchema }>
  ]
>

/**
 * Decoded payload of a row event.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type Payload<
  Fields extends Schema.Struct.Fields,
  Key extends keyof Fields,
  KeySchema extends Schema.Constraint = Fields[Key]
> = Schema.Schema.Type<PayloadSchema<Fields, Key, KeySchema>>

/**
 * A row type that syncs through an `EventLog`.
 *
 * **Details**
 *
 * Includes `EventGroup.add` options, the row schema, its key fields and
 * payload constructors. The row key is the event primary key; success is
 * `void`.
 *
 * `Key` is the union of the declared key fields. `KeySchema` is the schema of
 * the key in `patch` and `remove` payloads: the field's schema for a single
 * field key, and `Schema.String` for a declared key.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface EventRow<
  out Tag extends string,
  in out Fields extends Schema.Struct.Fields,
  in out Key extends keyof Fields & string,
  in out Error extends Schema.Top = typeof Schema.Never,
  in out KeySchema extends Schema.Constraint = Fields[Key]
> {
  readonly tag: Tag
  readonly keyFields: ReadonlyArray<Key>
  readonly schema: Schema.Struct<Fields>
  readonly primaryKey: (payload: Payload<Fields, Key, KeySchema>) => string
  readonly payload: PayloadSchema<Fields, Key, KeySchema>
  readonly success: typeof Schema.Void
  readonly error: Error

  /**
   * Computes the key of a row from its key fields.
   */
  readonly keyOf: (fields: KeyValues<Fields, Key>) => Schema.Schema.Type<KeySchema>

  /**
   * Replaces the whole row, creating it if missing.
   */
  readonly set: (row: Schema.Struct<Fields>["Type"]) => Payload<Fields, Key, KeySchema>

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
    key: Schema.Schema.Type<KeySchema>,
    fields: Schema.Struct<PatchFields<Fields, Key>>["Type"]
  ) => Payload<Fields, Key, KeySchema>

  /**
   * Deletes the row.
   */
  readonly remove: (key: Schema.Schema.Type<KeySchema>) => Payload<Fields, Key, KeySchema>
}

/**
 * Defines a row type as a single event.
 *
 * **Details**
 *
 * `key` is either the name of a required string field, or a declaration of
 * one or more required fields with a `derive` function, which is optional
 * when every declared field is a string field. A declared key is a string:
 * the result of `derive`, or the JSON encoding of the field values. Every key
 * field is excluded from `patch`, so a row's key never changes. To move a row
 * to another key, remove it and set it again.
 *
 * A row's key is computed by `keyOf` from the values as written, and stored
 * as the entry's primary key. Conflicts are grouped by it, and handler
 * callbacks receive it, so storage must be keyed by it. Key fields in a
 * decoded row can differ from it when their schemas transform values.
 *
 * Last-writer-wins applies to top-level fields. Nested values are atomic, so
 * concurrent updates within one nested value do not merge.
 *
 * `error` is the error schema of the event. Handler callbacks can fail with it.
 *
 * **Gotchas**
 *
 * Do not compact row events with `EventLog.groupCompaction` or
 * `EventLog.groupBatchCompaction`. Compaction runs before stored conflicts
 * are read, so merging row ops loses or misapplies writes. Use
 * {@link compaction}, which only drops entries that newer ones shadow.
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
  const Key extends KeyField<Fields> = never,
  const Declared extends RequiredField<Fields> = never,
  Error extends Schema.Top = typeof Schema.Never
>(tag: Tag, options: {
  readonly key: Key | KeyDeclaration<Fields, Declared>
  readonly schema: Schema.Struct<Fields>
  readonly error?: Error | undefined
}): EventRow<
  Tag,
  Fields,
  // A declaration also infers `Key`, as its constraint, so `Declared` decides.
  [Declared] extends [never] ? Key : Declared,
  Error,
  [Declared] extends [never] ? Fields[Key] : typeof Schema.String
> => {
  const declaration = options.key as string | KeyDeclaration<any, string>
  const keyFields: ReadonlyArray<string> = typeof declaration === "string" ? [declaration] : declaration.fields
  const keyOf = typeof declaration === "string"
    ? (row: Readonly<Record<string, unknown>>) => row[declaration]
    : declaration.derive !== undefined
    ? (row: Readonly<Record<string, unknown>>) => declaration.derive!(Struct.pick(row, keyFields) as any)
    : (row: Readonly<Record<string, unknown>>) => JSON.stringify(keyFields.map((name) => row[name]))
  const keySchema = typeof declaration === "string" ? options.schema.fields[declaration] : Schema.String
  const patchFields: Record<string, Schema.Constraint> = {}
  for (const name of Object.keys(options.schema.fields)) {
    if (!keyFields.includes(name)) patchFields[name] = patchField(options.schema.fields[name])
  }
  const payload = Schema.Union([
    Schema.TaggedStruct("set", { row: options.schema }),
    Schema.TaggedStruct("patch", { key: keySchema, fields: Schema.Struct(patchFields) }),
    Schema.TaggedStruct("remove", { key: keySchema })
  ])
  return {
    tag,
    keyFields,
    schema: options.schema,
    keyOf,
    primaryKey: (payload: Op) => (payload._tag === "set" ? keyOf(payload.row) : payload.key) as string,
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
 * Callbacks receive typed values, never conflicts. Every callback receives
 * the entry's primary key, the row key computed when the entry was written.
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
  Key extends keyof Fields & string,
  Error extends Schema.Top,
  KeySchema extends Schema.Constraint,
  RSet = never,
  RPatch = never,
  RRemove = never
>(
  row: EventRow<Tag, Fields, Key, Error, KeySchema>,
  callbacks: {
    readonly set: (
      row: Schema.Struct<Fields>["Type"],
      key: Schema.Schema.Type<KeySchema>
    ) => Effect.Effect<unknown, Error["Type"], RSet>
    readonly patch: (
      key: Schema.Schema.Type<KeySchema>,
      fields: Schema.Struct<PatchFields<Fields, Key>>["Type"]
    ) => Effect.Effect<unknown, Error["Type"], RPatch>
    readonly remove: (key: Schema.Schema.Type<KeySchema>) => Effect.Effect<unknown, Error["Type"], RRemove>
  }
): (options: {
  readonly storeId: StoreId
  readonly payload: Payload<Fields, Key, KeySchema>
  readonly entry: Entry
  readonly conflicts: ReadonlyArray<{
    readonly entry: Entry
    readonly payload: Payload<Fields, Key, KeySchema>
  }>
}) => Effect.Effect<void, Error["Type"], RSet | RPatch | RRemove | DecodingServices<Fields, Key, KeySchema>> => {
  const decode = Schema.decodeUnknownEffect(SchemaBinary.toCodec(row.payload))
  return (options) =>
    Effect.flatMap(
      Effect.orDie(decode(options.entry.payload)),
      (payload): Effect.Effect<unknown, Error["Type"], RSet | RPatch | RRemove> => {
        const op = resolve(payload as Op, options.conflicts as ReadonlyArray<{ readonly payload: Op }>)
        if (op === undefined) return Effect.void
        // The key as written, which conflicts are grouped by. Decoding can change
        // the key fields of the payload.
        const key = options.entry.primaryKey as Schema.Schema.Type<KeySchema>
        switch (op._tag) {
          case "set":
            return callbacks.set(op.row as any, key)
          case "patch":
            return Object.keys(op.fields).length === 0 ? Effect.void : callbacks.patch(key, op.fields as any)
          case "remove":
            return callbacks.remove(key)
        }
      }
    ).pipe(Effect.asVoid)
}

/**
 * Registers a compactor for one row event of a group.
 *
 * **Details**
 *
 * The compactor only drops entries that a newer entry in the same remote
 * batch, for the same row, shadows. Kept entries are forwarded unchanged, so
 * they keep their ids and their stored conflicts. An entry is shadowed by a
 * newer `set` or `remove`, and a `patch` is also shadowed when newer patches
 * write all of its fields.
 *
 * A `set` or `remove` followed only by patches is kept: without it, the
 * patches would apply to a different row, or to none. Entries that fail to
 * decode are kept.
 *
 * Only the row's event is registered, so compactors for other events in the
 * group are kept. Register one compactor per row event to compact several.
 *
 * @stability unstable
 * @category compaction
 * @since 4.0.6
 */
export const compaction = <
  Events extends Event.Any,
  Tag extends Event.Tag<Events>,
  Fields extends Schema.Struct.Fields,
  Key extends keyof Fields & string,
  Error extends Schema.Top,
  KeySchema extends Schema.Constraint
>(
  group: EventGroup.EventGroup<Events>,
  row: EventRow<Tag, Fields, Key, Error, KeySchema>
): Layer.Layer<never, never, EventLog.Registry | DecodingServices<Fields, Key, KeySchema>> =>
  Layer.effectDiscard(Effect.gen(function*() {
    const registry = yield* EventLog.Registry
    const services = yield* Effect.context<DecodingServices<Fields, Key, KeySchema>>()
    const decode = Schema.decodeUnknownEffect(group.events[row.tag].payloadSchemaBinary)
    yield* registry.registerCompaction({
      events: [row.tag],
      effect: Effect.fnUntraced(function*({ entries, write }) {
        const ops = new Map<Entry, Op>()
        for (const entry of entries) {
          const payload = yield* Effect.result(
            decode(entry.payload).pipe(Effect.updateContext((input) => Context.merge(services, input)))
          ) as Effect.Effect<Result.Result<Op, unknown>>
          if (Result.isSuccess(payload)) ops.set(entry, payload.success)
        }
        const shadowed = shadowedEntries(entries, ops)
        for (const entry of entries) {
          if (!shadowed.has(entry)) yield* write(entry)
        }
      })
    })
  }))

// Walks each row's entries from newest to oldest, tracking whether a newer
// `set` or `remove` exists and which fields newer patches write.
const shadowedEntries = (entries: ReadonlyArray<Entry>, ops: ReadonlyMap<Entry, Op>): Set<Entry> => {
  const shadowed = new Set<Entry>()
  const byKey = new Map<string, Array<Entry>>()
  for (const entry of entries) {
    const row = byKey.get(entry.primaryKey)
    if (row === undefined) byKey.set(entry.primaryKey, [entry])
    else row.push(entry)
  }
  for (const row of byKey.values()) {
    row.sort(Entry.Order)
    let replaced = false
    let patched = false
    const written = new Set<string>()
    for (let i = row.length - 1; i >= 0; i--) {
      const op = ops.get(row[i])
      if (op === undefined) continue
      if (op._tag !== "patch") {
        if (replaced) shadowed.add(row[i])
        replaced = true
        continue
      }
      const names = Object.keys(op.fields)
      if (replaced || (patched && names.every((name) => written.has(name)))) shadowed.add(row[i])
      patched = true
      for (const name of names) written.add(name)
    }
  }
  return shadowed
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

type DecodingServices<
  Fields extends Schema.Struct.Fields,
  Key extends keyof Fields,
  KeySchema extends Schema.Constraint
> = PayloadSchema<Fields, Key, KeySchema>["DecodingServices"]

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
