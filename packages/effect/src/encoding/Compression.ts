/**
 * Decompresses the codecs used inside columnar formats: Snappy, gzip, LZ4
 * (block and frame) and Zstandard.
 *
 * **Mental model**
 *
 * - Each codec has one function that takes the compressed bytes and returns
 *   the decompressed bytes as a `Result`. Nothing is streamed: a Parquet page
 *   or an Arrow IPC buffer is compressed as one unit, and the container
 *   records its size.
 * - The caller always bounds the output with
 *   {@link DecompressOptions.maxOutputSize}; there is no default limit. When
 *   the container records the uncompressed size, pass it as
 *   {@link DecompressOptions.expectedSize} and any other size fails.
 * - Format modules such as Parquet map their codec ids to these functions and
 *   their own errors; the codecs are not reimplemented per format.
 *
 * **Example** (Decompressing a Snappy block)
 *
 * ```ts import.meta.vitest
 * import { Compression } from "effect/encoding"
 * import { Result } from "effect"
 *
 * // Uncompressed length 5, then a literal of 5 bytes
 * const compressed = new Uint8Array([5, 16, 104, 101, 108, 108, 111])
 * const bytes = Compression.decompressSnappy(compressed, { maxOutputSize: 1024 })
 *
 * new TextDecoder().decode(Result.getOrThrow(bytes)) // => "hello"
 * ```
 *
 * **Details**
 *
 * Decoding is synchronous and runs in pure JavaScript, so it works the same on
 * every runtime. Malformed, truncated or oversized input fails with a
 * {@link CompressionError} and never reads past the input. The returned bytes
 * are a new buffer that does not share memory with the input.
 *
 * {@link DecompressOptions.maxOutputSize} bounds the output, not total memory.
 * Decoders also use working buffers of a fixed size, whatever the limit: up
 * to 96 KiB for the gzip inflater's window and output, and up to 128 KiB of
 * literals plus decoding tables for Zstandard. When the host cannot allocate
 * an output within the limit, its own allocation error is thrown, not a
 * {@link CompressionError}.
 *
 * Compression (writing) is not supported, nor are Brotli, LZO, Zstandard
 * dictionaries, the LZ4 legacy frame format and the Snappy framing format.
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Data from "../Data.ts"
import { DecodeFailure, type Decoder } from "../internal/compression/failure.ts"
import { gzip } from "../internal/compression/gzip.ts"
import { lz4Block, lz4Frame } from "../internal/compression/lz4.ts"
import { snappy } from "../internal/compression/snappy.ts"
import { zstd } from "../internal/compression/zstd.ts"
import * as Predicate from "../Predicate.ts"
import * as Result from "../Result.ts"

const CompressionErrorTypeId = "~effect/encoding/Compression/CompressionError"

/**
 * A codec supported by this module, as recorded on a {@link CompressionError}.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Codec = "Snappy" | "Gzip" | "Lz4Block" | "Lz4Frame" | "Zstd"

/**
 * Error returned when compressed input cannot be decoded within the limits.
 *
 * **Details**
 *
 * The `kind` field identifies the failure:
 *
 * - `Malformed`: the input breaks the codec's format, for example an unknown
 *   block type, a match that reaches before the start of the output, output
 *   that differs from a size recorded in the input, or bytes left over after
 *   the end of the data.
 * - `Truncated`: the input ends inside a header, block or checksum.
 * - `Checksum`: a checksum stored in the input does not match the data.
 * - `SizeMismatch`: the output size differs from
 *   {@link DecompressOptions.expectedSize}.
 * - `OutputLimit`: the output would be larger than
 *   {@link DecompressOptions.maxOutputSize}.
 * - `Unsupported`: valid input that uses a feature this module does not
 *   implement, such as a Zstandard dictionary.
 *
 * @stability experimental
 * @category errors
 * @since 4.1.5
 */
export class CompressionError extends Data.TaggedError("CompressionError")<{
  readonly codec: Codec
  readonly kind: "Malformed" | "Truncated" | "Checksum" | "SizeMismatch" | "OutputLimit" | "Unsupported"
  readonly message: string
}> {
  /**
   * Marks this value as a compression error for runtime guards.
   *
   * @stability experimental
   * @since 4.1.5
   */
  readonly [CompressionErrorTypeId] = CompressionErrorTypeId
}

/**
 * Checks whether a value is a {@link CompressionError}.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.5
 */
export const isCompressionError = (u: unknown): u is CompressionError =>
  Predicate.hasProperty(u, CompressionErrorTypeId)

/**
 * Options for every decompression function.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface DecompressOptions {
  /**
   * The largest output allowed, in bytes. Decoding fails with `OutputLimit`
   * before the output grows past it. Required, because a few bytes of
   * compressed input can expand to gigabytes. It bounds the output only, not
   * the fixed working buffers of the decoders.
   */
  readonly maxOutputSize: number
  /**
   * The exact output size, when the container records it, such as a Parquet
   * page's `uncompressed_page_size`. Any other size fails with
   * `SizeMismatch`, and the output is allocated once at this size. It must
   * not exceed `maxOutputSize`.
   */
  readonly expectedSize?: number | undefined
}

const checkSize = (name: string, value: number): void => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer, got ${value}`)
  }
}

const failure = (
  codec: Codec,
  kind: CompressionError["kind"],
  message: string
): Result.Result<never, CompressionError> => Result.fail(new CompressionError({ codec, kind, message }))

const run = (
  codec: Codec,
  decoder: Decoder,
  input: Uint8Array,
  options: DecompressOptions
): Result.Result<Uint8Array, CompressionError> => {
  const { expectedSize, maxOutputSize } = options
  checkSize("maxOutputSize", maxOutputSize)
  if (expectedSize !== undefined) {
    checkSize("expectedSize", expectedSize)
    if (expectedSize > maxOutputSize) {
      return failure(
        codec,
        "OutputLimit",
        `the expected size of ${expectedSize} bytes is larger than the limit of ${maxOutputSize} bytes`
      )
    }
  }
  try {
    const output = decoder(input, expectedSize ?? maxOutputSize, expectedSize)
    if (expectedSize !== undefined && output.length !== expectedSize) {
      return failure(codec, "SizeMismatch", `expected ${expectedSize} bytes of output, got ${output.length}`)
    }
    return Result.succeed(output)
  } catch (error) {
    if (!(error instanceof DecodeFailure)) throw error
    // With an expected size, more output than that is a size mismatch
    return error.kind === "OutputLimit" && expectedSize !== undefined
      ? failure(codec, "SizeMismatch", `the output is larger than the expected ${expectedSize} bytes`)
      : failure(codec, error.kind, error.message)
  }
}

/**
 * Decodes Snappy data in the raw block format: a varint with the uncompressed
 * length, then literals and copies. This is the format of Parquet's `SNAPPY`
 * codec, not the framing (`.sz` stream) format.
 *
 * **Details**
 *
 * Specification: https://github.com/google/snappy/blob/1.2.2/format_description.txt
 *
 * Throws a `RangeError` when an option is not a non-negative safe integer.
 *
 * @stability experimental
 * @category decoding
 * @since 4.1.5
 */
export const decompressSnappy = (
  input: Uint8Array,
  options: DecompressOptions
): Result.Result<Uint8Array, CompressionError> => run("Snappy", snappy, input, options)

/**
 * Decodes gzip data (RFC 1952): one or more gzip members, each holding a
 * deflate stream (RFC 1951) and checked against its CRC-32 and length. This is
 * the format of Parquet's `GZIP` codec.
 *
 * **Details**
 *
 * Specification: https://www.rfc-editor.org/rfc/rfc1952
 *
 * Throws a `RangeError` when an option is not a non-negative safe integer.
 *
 * @stability experimental
 * @category decoding
 * @since 4.1.5
 */
export const decompressGzip = (
  input: Uint8Array,
  options: DecompressOptions
): Result.Result<Uint8Array, CompressionError> => run("Gzip", gzip, input, options)

/**
 * Decodes one LZ4 block: a sequence of literals and matches with no header,
 * size or checksum. This is the format of Parquet's `LZ4_RAW` codec. A block
 * does not record its size, so pass `expectedSize` when the container knows
 * it.
 *
 * **Details**
 *
 * Specification: https://github.com/lz4/lz4/blob/v1.10.0/doc/lz4_Block_format.md
 *
 * Throws a `RangeError` when an option is not a non-negative safe integer.
 *
 * @stability experimental
 * @category decoding
 * @since 4.1.5
 */
export const decompressLz4Block = (
  input: Uint8Array,
  options: DecompressOptions
): Result.Result<Uint8Array, CompressionError> => run("Lz4Block", lz4Block, input, options)

/**
 * Decodes LZ4 frames: one or more frames of LZ4 blocks, with their optional
 * block and content checksums verified. Skippable frames are skipped. This is
 * the format of Arrow IPC's `LZ4_FRAME` codec. The legacy frame format and
 * Parquet's deprecated Hadoop-framed `LZ4` codec are not supported.
 *
 * **Details**
 *
 * Specification: https://github.com/lz4/lz4/blob/v1.10.0/doc/lz4_Frame_format.md
 *
 * Throws a `RangeError` when an option is not a non-negative safe integer.
 *
 * @stability experimental
 * @category decoding
 * @since 4.1.5
 */
export const decompressLz4Frame = (
  input: Uint8Array,
  options: DecompressOptions
): Result.Result<Uint8Array, CompressionError> => run("Lz4Frame", lz4Frame, input, options)

/**
 * Decodes Zstandard data (RFC 8878): one or more frames, with their optional
 * content checksums verified. Skippable frames are skipped. This is the format
 * of Parquet's and Arrow IPC's `ZSTD` codec. Frames that need a dictionary
 * fail with `Unsupported`.
 *
 * **Details**
 *
 * Specification: https://www.rfc-editor.org/rfc/rfc8878
 *
 * Like libzstd, it accepts two inputs that RFC 8878's wording excludes: a
 * match offset equal to the window size, which libzstd's encoder emits, and
 * a sequences FSE table with a single symbol.
 *
 * Throws a `RangeError` when an option is not a non-negative safe integer.
 *
 * @stability experimental
 * @category decoding
 * @since 4.1.5
 */
export const decompressZstd = (
  input: Uint8Array,
  options: DecompressOptions
): Result.Result<Uint8Array, CompressionError> => run("Zstd", zstd, input, options)
