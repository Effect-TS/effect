/**
 * Mutable rows that converge across event-log replicas.
 *
 * An `EventRow` is a single event per row type. Its payload is a `set`,
 * `patch` or `remove` op for one row, keyed by a string field of the row.
 * `make` returns the options `EventGroup.add` takes, so row events and plain
 * events can share a group. Write ops with the existing `EventLog.write` and
 * `EventLog.writeMany`, using the payload constructors on the row.
 *
 * `handler` builds the event handler. When an entry arrives after newer
 * entries for the same row, it resolves the conflict with last-writer-wins on
 * top-level fields, then calls at most one of your `set`, `patch` or `remove`
 * callbacks. Every replica ends up with the row it would have if it had
 * applied every entry in id order.
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
import * as Schema from "../Schema.ts"
import type { Entry } from "./EventJournal.ts"
import type { StoreId } from "./EventLogMessage.ts"

/**
 * Fields of a row schema that can be its key: required fields whose value is
 * a string.
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
 * Field schemas of a `patch` payload: every non-key field of the row, made
 * optional.
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
 * - `set` carries the full row, with every field required.
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
 * It is the options object `EventGroup.add` takes, plus the row schema, the
 * key field and payload constructors for `EventLog.write` and
 * `EventLog.writeMany`. The event tag is the row name and the primary key is
 * the row key. Handlers always succeed with `void`.
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
   * Replace the whole row, or create it.
   */
  readonly set: (row: Schema.Struct<Fields>["Type"]) => Payload<Fields, Key>

  /**
   * Write some fields of an existing row. A patch on a missing row does
   * nothing. To clear a value, use a nullable field and write `null`.
   */
  readonly patch: (
    key: Schema.Schema.Type<Fields[Key]>,
    fields: Schema.Struct<PatchFields<Fields, Key>>["Type"]
  ) => Payload<Fields, Key>

  /**
   * Delete the row.
   */
  readonly remove: (key: Schema.Schema.Type<Fields[Key]>) => Payload<Fields, Key>
}

/**
 * Defines a row type as a single event.
 *
 * **Details**
 *
 * `key` names the row field used as the event's primary key. Its value must
 * be a string. Composite keys are not supported.
 *
 * Top-level fields are the unit of last-writer-wins. Nested structs and
 * arrays are written whole: a patch replaces them, and concurrent patches to
 * different parts of one nested value do not merge.
 *
 * `error` is the error schema of the event. Handler callbacks can fail with it.
 *
 * **Gotchas**
 *
 * Do not use row events with `EventLog.groupCompaction` or
 * `EventLog.groupBatchCompaction`. Compaction runs before stored conflicts
 * are read, so collapsing row ops loses or misapplies writes. Each entry is a
 * single storage write anyway.
 *
 * An operation over several rows, such as clearing completed items, is one op
 * per row written with `EventLog.writeMany`. Each row then resolves its own
 * conflicts.
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
    if (name !== key) patchFields[name] = Schema.optionalKey(options.schema.fields[name])
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
 * The handler resolves the entry against its stored newer conflicts, then
 * calls at most one callback. Callbacks never see the conflicts.
 *
 * The newer conflicts are collapsed into one op, in id order. A later `set`
 * or `remove` replaces whatever came before it, a `patch` on a `set` or
 * `patch` merges its fields on top, and a `patch` after a `remove` stays a
 * `remove`. Then, for the entry being handled:
 *
 * - With no newer conflicts, the entry is written as is.
 * - With a newer `set` or `remove`, nothing is written.
 * - With a newer `patch`, a `set` is written with the patch's fields on top,
 *   a `patch` is written without the fields the newer patch already wrote,
 *   and a `remove` is written as is.
 *
 * A patch with no fields left is skipped, and so is an empty patch. Skipped
 * entries are still journaled and synced.
 *
 * **Gotchas**
 *
 * Convergence depends on the callbacks following this contract, which the
 * handler cannot check:
 *
 * - `set` replaces the whole row, creating it if it is missing.
 * - `patch` updates an existing row and does nothing if the row is missing.
 *   An upsert here brings back removed rows on some replicas only.
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
  _row: EventRow<Tag, Fields, Key, Error>,
  callbacks: {
    readonly set: (row: Schema.Struct<Fields>["Type"]) => Effect.Effect<unknown, Error["Type"], RSet>
    readonly patch: (
      key: Schema.Schema.Type<Fields[Key]>,
      fields: Schema.Struct<PatchFields<Fields, Key>>["Type"]
    ) => Effect.Effect<unknown, Error["Type"], RPatch>
    readonly remove: (key: Schema.Schema.Type<Fields[Key]>) => Effect.Effect<unknown, Error["Type"], RRemove>
  }
) =>
(options: {
  readonly storeId: StoreId
  readonly payload: Payload<Fields, Key>
  readonly entry: Entry
  readonly conflicts: ReadonlyArray<{
    readonly entry: Entry
    readonly payload: Payload<Fields, Key>
  }>
}): Effect.Effect<void, Error["Type"], RSet | RPatch | RRemove> => {
  const op = resolve(options.payload as Op, options.conflicts as ReadonlyArray<{ readonly payload: Op }>)
  if (op === undefined) return Effect.void
  switch (op._tag) {
    case "set":
      return Effect.asVoid(callbacks.set(op.row as any))
    case "patch":
      return Object.keys(op.fields).length === 0
        ? Effect.void
        : Effect.asVoid(callbacks.patch(op.key as any, op.fields as any))
    case "remove":
      return Effect.asVoid(callbacks.remove(op.key as any))
  }
}

type Op =
  | { readonly _tag: "set"; readonly row: Readonly<Record<string, unknown>> }
  | { readonly _tag: "patch"; readonly key: unknown; readonly fields: Readonly<Record<string, unknown>> }
  | { readonly _tag: "remove"; readonly key: unknown }

// `x ; y`: the result of applying `x` and then `y`.
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

// What to write for a late entry, given its newer conflicts in id order.
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
    case "patch": {
      const fields: Record<string, unknown> = {}
      for (const name of Object.keys(entry.fields)) {
        if (!Object.hasOwn(newer.fields, name)) fields[name] = entry.fields[name]
      }
      return { _tag: "patch", key: entry.key, fields }
    }
    case "remove":
      return entry
  }
}
