/**
 * Small helpers for schema patterns that are too specialized for the main
 * `Schema` module. The current helper builds a schema for an existing class:
 * the encoded input is checked with a struct schema, decoding calls the class
 * constructor with the decoded properties, and the final value remains an
 * instance of that class.
 *
 * @since 4.0.0
 */
import { identity } from "./Function.ts"
import * as Schema from "./Schema.ts"
import * as SchemaTransformation from "./SchemaTransformation.ts"

/**
 * Builds an experimental schema for instances of a native class using a struct
 * schema as the encoded representation.
 *
 * **When to use**
 *
 * Use when you need a schema for an existing native class while keeping a
 * `Struct` schema as its encoded representation.
 *
 * **Details**
 *
 * Decoding constructs `new constructor(props)` from the encoded fields.
 * Encoding uses the instance as the encoded shape, so the class should expose
 * properties compatible with the provided encoding schema.
 *
 * @see {@link Schema.instanceOf} for validating existing class instances without a struct encoding
 * @see {@link Schema.Class} for defining schema-backed classes directly
 * @see {@link Schema.ErrorClass} for defining schema-backed error classes
 *
 * @category schemas
 * @since 4.0.0
 */
export function getNativeClassSchema<C extends new(...args: any) => any, S extends Schema.Struct<Schema.Struct.Fields>>(
  constructor: C,
  options: {
    readonly encoding: S
    readonly annotations?: Schema.Annotations.Declaration<InstanceType<C>>
  }
): Schema.decodeTo<Schema.instanceOf<InstanceType<C>, S["Iso"]>, S> {
  const transformation = SchemaTransformation.transform<InstanceType<C>, S["Type"]>({
    decode: (props) => new constructor(props),
    encode: identity
  })
  return Schema.instanceOf(constructor, {
    toCodec: () => Schema.link<InstanceType<C>>()(options.encoding, transformation),
    ...options.annotations
  }).pipe(Schema.encodeTo(options.encoding, transformation))
}
