// Wraps a codec of the encoded side of a schema, which reads and writes bytes
// or JSON, in a schema transformation.

import * as Effect from "../../Effect.ts"
import * as InternalParser from "../../internal/schema/parser.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import * as SchemaIssue from "../../SchemaIssue.ts"
import * as SchemaParser from "../../SchemaParser.ts"
import * as SchemaTransformation from "../../SchemaTransformation.ts"
import * as ProtobufSchema from "./schema.ts"
import * as Wire from "./wire.ts"

/**
 * Both directions are synchronous, and throw a `WireError` for malformed input
 * or values without a representation.
 *
 * @internal
 */
export interface Codec<E> {
  readonly encode: (value: unknown) => E
  readonly decode: (input: E) => unknown
}

/**
 * `from` decoded to `schema` through `codec`. A schema without transformations,
 * and without checks other than those of the protobuf scalars, is checked by
 * the codec alone, which skips the schema pass around it.
 *
 * @internal
 */
export const derive = <E>(
  from: Schema.Codec<E>,
  schema: Schema.Constraint,
  codec: Codec<E>
): Schema.Top => {
  const trusted: Trusted | undefined = ProtobufSchema.isExact(schema.ast) ? { value: undefined } : undefined
  return from.pipe(
    Schema.decodeTo(trusted === undefined ? schema : trustedTarget(schema, trusted), makeTransformation(codec, trusted))
  )
}

// The value the codec last decoded, which the schema pass returns as it is.
/** @internal */
export interface Trusted {
  value: unknown
}

/** @internal */
export const makeTransformation = <E>(
  codec: Codec<E>,
  trusted: Trusted | undefined
): SchemaTransformation.Transformation<unknown, E> => {
  return SchemaTransformation.transformEffect({
    decode: (input: E, options) => {
      try {
        const value = codec.decode(input)
        if (trusted !== undefined) trusted.value = value
        return Effect.succeed(value)
      } catch (e) {
        return e instanceof Wire.WireError ? Effect.fail(toIssue(e, options)) : Effect.die(e)
      }
    },
    encode: (value: unknown, options) => {
      try {
        return Effect.succeed(codec.encode(value))
      } catch (e) {
        return e instanceof Wire.WireError ? Effect.fail(toIssue(e, options)) : Effect.die(e)
      }
    }
  })
}

// The type of an exact schema, whose schema pass returns the value the codec
// decoded, and the value to encode, as they are. Any other input, such as that
// of `Schema.is`, runs the schema pass. Encoding keeps it under
// `onExcessProperty: "error"`, since the codec ignores excess keys.
const trustedTarget = (schema: Schema.Constraint, trusted: Trusted): Schema.Constraint => {
  const type = Schema.make(SchemaAST.toType(schema.ast))
  const parse = SchemaParser.decodeUnknownEffect(type as Schema.ConstraintDecoder<unknown>)
  const run = (
    accept: (input: unknown, options: SchemaAST.ParseOptions) => boolean
  ): SchemaAST.Declaration["run"] =>
  () =>
  (input, _ast, options) => accept(input, options) ? InternalParser.sameExit : parse(input, options)
  return Schema.make(
    new SchemaAST.Declaration(
      [type.ast],
      run((input) => {
        if (trusted.value === undefined || trusted.value !== input) return false
        trusted.value = undefined
        return true
      }),
      { identifier: "protobuf value" },
      undefined,
      undefined,
      undefined,
      undefined,
      run((_, options) => options.onExcessProperty !== "error")
    )
  )
}

/** @internal */
export const toIssue = (e: Wire.WireError, options: SchemaAST.ParseOptions): SchemaIssue.Issue => {
  const issue = e.missing
    ? new SchemaIssue.MissingKey(undefined)
    : new SchemaIssue.InvalidValue({ message: e.message }, e.input, options)
  return e.path.length === 0 ? issue : new SchemaIssue.Pointer(e.path, issue)
}
