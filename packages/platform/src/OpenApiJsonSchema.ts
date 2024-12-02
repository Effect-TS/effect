/**
 * @since 1.0.0
 */
import * as JSONSchema from "effect/JSONSchema"
import * as Record from "effect/Record"
import type * as Schema from "effect/Schema"

/**
 * @category model
 * @since 1.0.0
 */
export type Root = JSONSchema.JsonSchema7 & {
  $defs?: Record<string, JSONSchema.JsonSchema7>
}

/**
 * @category encoding
 * @since 1.0.0
 */
export const make = <A, I, R>(schema: Schema.Schema<A, I, R>): Root => {
  const defs: Record<string, JSONSchema.JsonSchema7> = {}
  const out = makeWithDefs(schema, { defs })
  if (!Record.isEmptyRecord(defs)) {
    out.$defs = defs
  }
  return out
}

/**
 * @category encoding
 * @since 1.0.0
 */
export const makeWithDefs = <A, I, R>(schema: Schema.Schema<A, I, R>, options: {
  readonly defs: Record<string, JSONSchema.JsonSchema7>
  readonly defsPath?: string
}): Root => {
  const defsPath = options.defsPath ?? "#/$defs/"
  const getRef = (id: string) => `${defsPath}${id}`
  return JSONSchema.makeWithOptions(schema, {
    defs: options.defs,
    defsPath,
    getRef
  })
}
