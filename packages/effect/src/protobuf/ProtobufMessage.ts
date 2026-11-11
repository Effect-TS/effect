/**
 * Encodes and decodes the values of protobuf messages, as their descriptors
 * from `ProtobufDescriptor` describe them.
 *
 * **Mental model**
 *
 * A message value is a plain object, keyed by the `localName` of each field,
 * the lowerCamelCase of its name:
 *
 * - A field with implicit presence, such as a proto3 field without `optional`,
 *   always holds a value: its zero value when it is absent.
 * - A field with explicit presence, such as a message field, is left out when
 *   it is absent.
 * - A repeated field holds an array, and a map field a record. Map keys are
 *   strings: integers in decimal, booleans as `"true"` and `"false"`.
 * - A oneof holds `{ _tag, value }`, where `_tag` is the `localName` of its
 *   set field, or is left out.
 * - 64-bit integers are `bigint`s, unless `[jstype = JS_NUMBER]` or
 *   `[jstype = JS_STRING]` asks for a `number` or a decimal `string`.
 * - Enums are their numbers, and bytes are `Uint8Array`s.
 * - Fields the descriptor does not declare, extensions among them, are kept
 *   as their encoded bytes under {@link unknownFields}, and written back.
 *
 * **Gotchas**
 *
 * - Encoding accepts a 64-bit integer as a `bigint`, an integer `number` or a
 *   decimal `string`, whatever the field's `jstype`.
 * - An absent field may also be `undefined`, or left out, when encoding,
 *   except a required field.
 * - A `number` decoded for `[jstype = JS_NUMBER]` loses precision outside the
 *   safe integer range, as `Number` does.
 * - A closed enum holds only its own numbers. Decoding keeps other numbers as
 *   unknown fields.
 *
 * **Example** (Encoding and decoding a message)
 *
 * ```ts import.meta.vitest
 * import { Result } from "effect"
 * import { ProtobufDescriptor, ProtobufMessage } from "effect/protobuf"
 *
 * // message Point { int32 x = 1; int32 y = 2; }
 * const registry = Result.getOrThrow(ProtobufDescriptor.make([{
 *   name: "point.proto",
 *   syntax: "proto3",
 *   messageType: [{
 *     name: "Point",
 *     field: [
 *       { name: "x", number: 1, label: 1, type: 5 },
 *       { name: "y", number: 2, label: 1, type: 5 }
 *     ]
 *   }]
 * }]))
 * const Point = registry.getMessage("Point")!
 *
 * const bytes = Result.getOrThrow(ProtobufMessage.encode(Point)({ x: 3, y: -1 }))
 * Result.getOrThrow(ProtobufMessage.decode(Point)(bytes)) // => { x: 3, y: -1 }
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Data from "../Data.ts"
import * as Result from "../Result.ts"
import * as Binary from "./internal/binary.ts"
import type * as ProtobufDescriptor from "./ProtobufDescriptor.ts"

/**
 * The key of the unknown fields of a message value: the encoded bytes of the
 * fields its descriptor does not declare, extensions among them, and of the
 * numbers that a closed enum does not have.
 *
 * @stability experimental
 * @category symbols
 * @since 4.1.5
 */
export const unknownFields: unique symbol = Symbol.for("effect/protobuf/ProtobufMessage/unknownFields")

/**
 * A message value, keyed by the `localName` of each field.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Message {
  readonly [key: string]: unknown
  readonly [unknownFields]?: Uint8Array
}

/**
 * The error for a value that does not encode, or bytes that do not decode.
 * `path` leads to the field that failed: the keys of message fields, indexes
 * of list elements, and keys of map entries.
 *
 * @stability experimental
 * @category errors
 * @since 4.1.5
 */
export class ProtobufMessageError extends Data.TaggedError("ProtobufMessageError")<{
  readonly message: string
  readonly path: ReadonlyArray<PropertyKey>
}> {}

const toError = (failure: Binary.Failure): ProtobufMessageError =>
  new ProtobufMessageError({ message: failure.message, path: failure.path })

/**
 * Options for {@link decode}.
 *
 * **Details**
 *
 * - `readUnknownFields`: whether to keep the fields the descriptor does not
 *   declare, `true` by default.
 * - `maxDepth`: how deep messages may nest, 100 by default.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface DecodeOptions {
  readonly readUnknownFields?: boolean | undefined
  readonly maxDepth?: number | undefined
}

/**
 * Options for {@link encode}.
 *
 * **Details**
 *
 * - `writeUnknownFields`: whether to write the unknown fields of values,
 *   `true` by default.
 * - `maxDepth`: how deep messages may nest, 100 by default.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface EncodeOptions {
  readonly writeUnknownFields?: boolean | undefined
  readonly maxDepth?: number | undefined
}

/**
 * Decodes the binary encoding of a message.
 *
 * **Details**
 *
 * A message field that occurs more than once merges its occurrences, as
 * protobuf does. A field of another wire type than its own is kept as an
 * unknown field.
 *
 * **Example** (Decoding a message)
 *
 * ```ts import.meta.vitest
 * import { Result } from "effect"
 * import { ProtobufDescriptor, ProtobufMessage } from "effect/protobuf"
 *
 * // message Test { int32 a = 1; }
 * const registry = Result.getOrThrow(ProtobufDescriptor.make([{
 *   name: "test.proto",
 *   syntax: "proto3",
 *   messageType: [{ name: "Test", field: [{ name: "a", number: 1, label: 1, type: 5 }] }]
 * }]))
 * const decode = ProtobufMessage.decode(registry.getMessage("Test")!)
 *
 * Result.getOrThrow(decode(new Uint8Array([0x08, 0x96, 0x01]))) // => { a: 150 }
 * Result.isFailure(decode(new Uint8Array([0x08, 0x96]))) // => true
 * ```
 *
 * @stability experimental
 * @category decoding
 * @since 4.1.5
 */
export const decode = (
  descriptor: ProtobufDescriptor.MessageDescriptor,
  options?: DecodeOptions
): (bytes: Uint8Array) => Result.Result<Message, ProtobufMessageError> =>
(bytes) => Result.mapError(Binary.decode(descriptor, bytes, options), toError)

/**
 * Encodes a message. Fields are written in field-number order, and unknown
 * fields last.
 *
 * **Example** (Encoding a message)
 *
 * ```ts import.meta.vitest
 * import { Result } from "effect"
 * import { ProtobufDescriptor, ProtobufMessage } from "effect/protobuf"
 *
 * // message Test { int32 a = 1; }
 * const registry = Result.getOrThrow(ProtobufDescriptor.make([{
 *   name: "test.proto",
 *   syntax: "proto3",
 *   messageType: [{ name: "Test", field: [{ name: "a", number: 1, label: 1, type: 5 }] }]
 * }]))
 * const encode = ProtobufMessage.encode(registry.getMessage("Test")!)
 *
 * Result.getOrThrow(encode({ a: 150 })) // => new Uint8Array([0x08, 0x96, 0x01])
 * Result.isFailure(encode({ a: 1.5 })) // => true
 * ```
 *
 * @stability experimental
 * @category encoding
 * @since 4.1.5
 */
export const encode = (
  descriptor: ProtobufDescriptor.MessageDescriptor,
  options?: EncodeOptions
): (message: object) => Result.Result<Uint8Array<ArrayBuffer>, ProtobufMessageError> =>
(message) => Result.mapError(Binary.encode(descriptor, message, options), toError)

/**
 * Reads an extension from the unknown fields of a message: its value, or
 * `undefined` when it is not set, or an array for a repeated extension.
 *
 * @stability experimental
 * @category extensions
 * @since 4.1.5
 */
export const getExtension = (
  message: object,
  extension: ProtobufDescriptor.ExtensionDescriptor
): Result.Result<unknown, ProtobufMessageError> => Result.mapError(Binary.getExtension(message, extension), toError)

/**
 * Returns a copy of a message with an extension set in its unknown fields,
 * replacing an earlier value. `undefined` clears the extension.
 *
 * **Example** (Setting an extension)
 *
 * ```ts import.meta.vitest
 * import { Result } from "effect"
 * import { ProtobufDescriptor, ProtobufMessage } from "effect/protobuf"
 *
 * // message Product { string name = 1; extensions 100 to max; }
 * // extend Product { int32 priority = 100; }
 * const registry = Result.getOrThrow(ProtobufDescriptor.make([{
 *   name: "product.proto",
 *   messageType: [{
 *     name: "Product",
 *     field: [{ name: "name", number: 1, label: 1, type: 9 }],
 *     extensionRange: [{ start: 100, end: 536870912 }]
 *   }],
 *   extension: [{ name: "priority", number: 100, label: 1, type: 5, extendee: ".Product" }]
 * }]))
 * const priority = registry.getExtension("priority")!
 *
 * const product = Result.getOrThrow(ProtobufMessage.setExtension({ name: "lamp" }, priority, 3))
 * Result.getOrThrow(ProtobufMessage.getExtension(product, priority)) // => 3
 * ```
 *
 * @stability experimental
 * @category extensions
 * @since 4.1.5
 */
export const setExtension = <A extends object>(
  message: A,
  extension: ProtobufDescriptor.ExtensionDescriptor,
  value: unknown
): Result.Result<A & Message, ProtobufMessageError> =>
  Result.mapError(Binary.setExtension(message, extension, value), toError) as Result.Result<
    A & Message,
    ProtobufMessageError
  >
