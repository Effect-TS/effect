/**
 * Extension types: user-defined logical types stored as a regular Arrow type.
 *
 * **Mental model**
 *
 * - A field is an extension field when its metadata has
 *   `ARROW:extension:name` (and optionally `ARROW:extension:metadata`). Its
 *   data is stored as the field's ordinary type, the storage type.
 * - Readers that are given an {@link ArrowExtension} for that name pass each
 *   storage value through `decode`; builders pass each value through
 *   `encode`. Without a registered extension, the storage values are used.
 *
 * **Example** (A UUID extension over 16-byte binaries)
 *
 * ```ts import.meta.vitest
 * import { ArrowColumn, ArrowExtension, ArrowSchema } from "effect/arrow"
 * import { Result } from "effect"
 *
 * const uuid = ArrowExtension.make({
 *   name: "arrow.uuid",
 *   decode: (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""),
 *   encode: (hex: string) => Uint8Array.from(hex.match(/../g)!, (b) => parseInt(b, 16))
 * })
 * const field = ArrowSchema.field("id", ArrowSchema.fixedSizeBinary(16), {
 *   metadata: ArrowExtension.metadata("arrow.uuid")
 * })
 *
 * const ids = ["00112233445566778899aabbccddeeff"]
 * const column = Result.getOrThrow(ArrowColumn.fromValues(field, ids, { extensions: [uuid] }))
 *
 * ArrowColumn.toArray(column) // => ["00112233445566778899aabbccddeeff"]
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */

/**
 * A registered extension type: how to turn its storage values into values of
 * type `A`, and back.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface ArrowExtension<A, Storage> {
  /** The `ARROW:extension:name` this extension handles. */
  readonly name: string
  /** Turns a non-null storage value into a value; `metadata` is `ARROW:extension:metadata` or `""`. */
  readonly decode: (storage: Storage, metadata: string) => A
  /** Turns a non-null value into its storage value. */
  readonly encode: (value: A, metadata: string) => Storage
}

/**
 * Creates an extension.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const make = <A, Storage>(options: {
  readonly name: string
  readonly decode: (storage: Storage, metadata: string) => A
  readonly encode: (value: A, metadata: string) => Storage
}): ArrowExtension<A, Storage> => ({ name: options.name, decode: options.decode, encode: options.encode })

/**
 * The field metadata that marks a field as an extension field.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const metadata = (name: string, extensionMetadata?: string): ReadonlyMap<string, string> =>
  new Map(
    extensionMetadata === undefined
      ? [["ARROW:extension:name", name]]
      : [["ARROW:extension:name", name], ["ARROW:extension:metadata", extensionMetadata]]
  )
