/**
 * Encodes and decodes tar archives as streams in Effect channels.
 *
 * A tar archive is a sequence of entries, each a header followed by the bytes
 * of its body. `decode` turns archive bytes into entries whose bodies stream
 * straight from the input, and `encode` turns entries back into archive bytes.
 * Neither side buffers an entire entry body.
 *
 * The decoder reads the formats produced by common tools: v7, USTAR, PAX
 * extended headers, and GNU long names and base-256 numbers. The encoder writes
 * USTAR, adding PAX extended headers for fields that do not fit or for custom
 * metadata. It does not access the file system or compress archives.
 *
 * @stability unstable
 * @since 4.0.5
 */
import * as Arr from "../Array.ts"
import * as Cause from "../Cause.ts"
import * as Channel from "../Channel.ts"
import * as Data from "../Data.ts"
import * as Effect from "../Effect.ts"
import * as Exit from "../Exit.ts"
import * as Predicate from "../Predicate.ts"
import * as Pull from "../Pull.ts"
import * as Scope from "../Scope.ts"
import * as Semaphore from "../Semaphore.ts"
import * as Stream from "../Stream.ts"
import type * as Types from "../Types.ts"

const TarErrorTypeId = "~effect/encoding/Tar/TarError"

/**
 * Error raised when a tar archive cannot be encoded or decoded.
 *
 * **Details**
 *
 * The `kind` field identifies the failure:
 *
 * - `InvalidHeader`: a header has a bad checksum, a malformed field, or a value
 *   that cannot be written.
 * - `Truncated`: the input ended inside a header or an entry body.
 * - `SizeMismatch`: an entry body produced a byte count other than its declared
 *   `size`.
 * - `Unsupported`: the archive uses a feature this module does not read, such
 *   as GNU sparse files.
 * - `BodyConsumed`: an entry body was read after the decoder had moved past it.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.5
 */
export class TarError extends Data.TaggedError("TarError")<{
  readonly kind: "InvalidHeader" | "Truncated" | "SizeMismatch" | "Unsupported" | "BodyConsumed"
  readonly message: string
}> {
  /**
   * Marks this value as a tar error for runtime guards.
   *
   * @stability unstable
   * @since 4.0.5
   */
  readonly [TarErrorTypeId] = TarErrorTypeId
}

/**
 * Checks whether a value is a `TarError`.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.5
 */
export const isTarError = (u: unknown): u is TarError => Predicate.hasProperty(u, TarErrorTypeId)

/**
 * Kind of filesystem object described by a tar entry.
 *
 * **Details**
 *
 * `Other` covers every typeflag without a dedicated kind, such as GNU volume
 * labels; the raw flag is kept in `Header.typeflag`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type EntryType =
  | "File"
  | "Directory"
  | "Symlink"
  | "Hardlink"
  | "CharDevice"
  | "BlockDevice"
  | "Fifo"
  | "Other"

/**
 * Metadata of a tar entry.
 *
 * **Details**
 *
 * `path` and `linkTarget` are archive paths; hard link targets name another
 * entry of the same archive. `mode` holds the permission bits, including
 * setuid, setgid and sticky; file type bits, as in a `stat` mode, are dropped
 * when decoding and encoding. `pax` holds the PAX extended header records that
 * are not reflected in the other fields, such as `SCHILY.xattr.*` or `atime`.
 * `devMajor` and `devMinor` are set for device entries only.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export interface Header {
  readonly path: string
  readonly type: EntryType
  readonly typeflag: string
  readonly size: number
  readonly mode: number
  readonly uid: number
  readonly gid: number
  readonly uname: string
  readonly gname: string
  readonly mtime: Date
  readonly linkTarget?: string | undefined
  readonly devMajor?: number | undefined
  readonly devMinor?: number | undefined
  readonly pax: Readonly<Record<string, string>>
}

/**
 * Tar entry: a header and a stream of exactly `header.size` body bytes.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export interface Entry<E = never, R = never> {
  readonly header: Header
  readonly body: Stream.Stream<Uint8Array, E, R>
}

/**
 * Options for the entry constructors.
 *
 * **Details**
 *
 * Unset fields default to mode `0o644` (`0o755` for directories, `0o777` for
 * symlinks), uid and gid `0`, empty user and group names, an mtime at the Unix
 * epoch, and no extra PAX records. The defaults make archives reproducible.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export interface EntryOptions {
  readonly mode?: number | undefined
  readonly uid?: number | undefined
  readonly gid?: number | undefined
  readonly uname?: string | undefined
  readonly gname?: string | undefined
  readonly mtime?: Date | undefined
  readonly pax?: Readonly<Record<string, string>> | undefined
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const typeflags: Record<Exclude<EntryType, "Other">, string> = {
  File: "0",
  Hardlink: "1",
  Symlink: "2",
  CharDevice: "3",
  BlockDevice: "4",
  Directory: "5",
  Fifo: "6"
}

const makeHeader = (
  path: string,
  type: "File" | "Directory" | "Symlink" | "Hardlink",
  size: number,
  options: EntryOptions | undefined,
  linkTarget?: string
): Header => ({
  path,
  type,
  typeflag: typeflags[type],
  size,
  mode: options?.mode ?? (type === "Directory" ? 0o755 : type === "Symlink" ? 0o777 : 0o644),
  uid: options?.uid ?? 0,
  gid: options?.gid ?? 0,
  uname: options?.uname ?? "",
  gname: options?.gname ?? "",
  mtime: options?.mtime ?? new Date(0),
  ...(linkTarget === undefined ? undefined : { linkTarget }),
  pax: options?.pax ?? {}
})

/**
 * Creates a regular file entry from in-memory content.
 *
 * **Details**
 *
 * String content is encoded as UTF-8, and `size` is the byte length of the
 * content.
 *
 * @see {@link fileStream} for content that is streamed instead of held in memory
 * @see {@link encode} for writing entries to an archive
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.5
 */
export const file = (path: string, content: string | Uint8Array, options?: EntryOptions): Entry => {
  const bytes = typeof content === "string" ? textEncoder.encode(content) : content
  return {
    header: makeHeader(path, "File", bytes.length, options),
    body: bytes.length === 0 ? Stream.empty : Stream.succeed(bytes)
  }
}

/**
 * Creates a regular file entry whose content is streamed from `body`.
 *
 * **When to use**
 *
 * Use when the content is too large to hold in memory, or is read from a file
 * or another stream, and its byte length is known up front.
 *
 * **Details**
 *
 * The defaults match `file`: mode `0o644`, uid and gid `0`, and an mtime at the
 * Unix epoch. `body` is not run until the entry is encoded.
 *
 * **Gotchas**
 *
 * `size` must be the exact byte length of `body`: `encode` fails with a
 * `SizeMismatch` `TarError` when the body produces fewer or more bytes.
 *
 * @see {@link file} for in-memory content
 * @see {@link encode} for writing entries to an archive
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.5
 */
export const fileStream = <E = never, R = never>(
  path: string,
  size: number,
  body: Stream.Stream<Uint8Array, E, R>,
  options?: EntryOptions
): Entry<E, R> => ({
  header: makeHeader(path, "File", size, options),
  body
})

/**
 * Creates a directory entry.
 *
 * **Details**
 *
 * A trailing `/` is added to `path` when missing, as tar tools expect for
 * directories.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.5
 */
export const directory = (path: string, options?: EntryOptions): Entry => ({
  header: makeHeader(path.endsWith("/") ? path : `${path}/`, "Directory", 0, options),
  body: Stream.empty
})

/**
 * Creates a symbolic link entry pointing at `target`.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.5
 */
export const symlink = (path: string, target: string, options?: EntryOptions): Entry => ({
  header: makeHeader(path, "Symlink", 0, options, target),
  body: Stream.empty
})

/**
 * Creates a hard link entry pointing at another entry of the archive.
 *
 * **Details**
 *
 * `target` is the archive path of an entry written earlier in the same
 * archive.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.5
 */
export const hardlink = (path: string, target: string, options?: EntryOptions): Entry => ({
  header: makeHeader(path, "Hardlink", 0, options, target),
  body: Stream.empty
})

// -----------------------------------------------------------------------------
// Codecs
// -----------------------------------------------------------------------------

/**
 * Creates a channel that decodes tar archive bytes into entries.
 *
 * **Details**
 *
 * Each output chunk holds one entry, and each entry body streams exactly
 * `header.size` bytes straight from the input. Pulling the next entry skips
 * whatever is left of the current body, like Go's `tar.Reader`. The decoder
 * reads v7, USTAR, PAX extended headers (applying `path`, `linkpath`, `size`,
 * `uid`, `gid`, `uname`, `gname` and `mtime`), GNU long names and links, and
 * base-256 numbers. PAX global headers and anything after the end-of-archive
 * marker are ignored.
 *
 * **Gotchas**
 *
 * - Read each body before pulling the next entry: a body read afterwards fails
 *   with a `BodyConsumed` `TarError`. Operators that pull ahead, such as
 *   `Stream.buffer`, therefore can't sit between `decode` and the body reads.
 * - A body reads the entry's bytes once: running it again continues where the
 *   previous run stopped.
 * - Directories, links, devices and FIFOs have no body, and their `size` is
 *   reported as `0`.
 * - Paths are returned as written in the archive, so they can be absolute or
 *   contain `..`. Validate them before writing entries to disk.
 * - Names that are not valid UTF-8 are decoded with replacement characters.
 * - GNU sparse entries fail with an `Unsupported` `TarError`.
 *
 * @see {@link encode} for the inverse operation
 *
 * @stability unstable
 * @category decoding
 * @since 4.0.5
 */
export const decode = <IE = never, Done = unknown>(): Channel.Channel<
  Arr.NonEmptyReadonlyArray<Entry<TarError | IE>>,
  TarError | IE,
  Done,
  Arr.NonEmptyReadonlyArray<Uint8Array>,
  IE,
  Done
> =>
  Channel.fromTransform((upstream, scope) =>
    Effect.suspend(() => {
      const decoder = new Decoder()
      let done: { readonly value: Done } | undefined

      const pullUpstream = upstream.pipe(
        Effect.map((chunks) => {
          for (const chunk of chunks) decoder.push(chunk)
        }),
        Pull.catchDone((value) => {
          done = { value: value as Done }
          decoder.end()
          return Effect.void
        })
      )

      // Pulls more input into the decoder. The entry stream and the current body
      // can both need input, so they take turns.
      const lock = Semaphore.makeUnsafe(1)
      const pullInput = lock.withPermit(Effect.suspend(() => done === undefined ? pullUpstream : Effect.void))

      // Calls the decoder until it has enough input, pulling more in between.
      // The pull is done with `end()` once the decoder returns `undefined`.
      const run = <A, D>(f: () => A | undefined | typeof NeedInput, end: () => D): Pull.Pull<A, TarError | IE, D> =>
        Effect.suspend(function loop(): Pull.Pull<A, TarError | IE, D> {
          let result: A | undefined | typeof NeedInput
          try {
            result = f()
          } catch (error) {
            return isTarError(error) ? Effect.fail(error) : Effect.die(error)
          }
          if (result === NeedInput) return Effect.flatMap(pullInput, loop)
          return result === undefined ? Cause.done(end()) : Effect.succeed(result)
        })

      const body = (id: number): Stream.Stream<Uint8Array, TarError | IE> =>
        Stream.fromPull(Effect.succeed(run(() => decoder.read(id), () => undefined)))

      const next = run(() => {
        const header = decoder.next()
        return header === NeedInput || header === undefined
          ? header
          : Arr.of({ header, body: body(decoder.generation) })
      }, () => done!.value)

      return Effect.as(Scope.addFinalizer(scope, Effect.sync(() => decoder.close())), next)
    })
  )

/**
 * Creates a channel that encodes entries into tar archive bytes.
 *
 * **Details**
 *
 * Each entry is written as a USTAR header, with the path split into the USTAR
 * prefix and name fields when it is longer than 100 bytes. A PAX extended
 * header is added only for what USTAR cannot hold: a long or non-ASCII path,
 * link target, user or group name, a size of 8 GiB or more, a uid or gid above
 * `2097151`, an mtime outside the USTAR range, or custom `pax` records. The
 * archive ends with two zero blocks.
 *
 * Headers, padding and body chunks below 16 KiB are gathered into output chunks
 * of up to 64 KiB, and larger body chunks pass through without copying, so
 * bodies stream without being held in memory.
 *
 * **Gotchas**
 *
 * - A body that produces any byte count other than `header.size` fails with a
 *   `SizeMismatch` `TarError`, so the size must be known before the body is
 *   written.
 * - `header.pax` may contain custom metadata such as `SCHILY.xattr.*`. Keys
 *   `path`, `linkpath`, `size`, `uid`, `gid`, `uname`, `gname` and `mtime` must
 *   be set through the corresponding header fields. These keys and
 *   `GNU.sparse.*` records fail with an `InvalidHeader` `TarError`.
 * - A `File` entry whose path ends with `/` fails with an `InvalidHeader`
 *   `TarError`, because other tools read it as a directory.
 * - mtime is truncated to whole seconds.
 * - `typeflag` is only written for `Other` entries; every other type writes its
 *   standard flag.
 *
 * @see {@link decode} for the inverse operation
 * @see {@link file} for building entries from in-memory content
 * @see {@link fileStream} for building entries from streamed content
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.5
 */
export const encode = <IE = never, Done = unknown, In extends Entry<any, any> = Entry>(): Channel.Channel<
  Arr.NonEmptyReadonlyArray<Uint8Array>,
  TarError | IE | (In extends Entry<infer E, any> ? E : never),
  Done,
  Arr.NonEmptyReadonlyArray<In>,
  IE,
  Done,
  In extends Entry<any, infer R> ? R : never
> =>
  // `In` is generic so that body errors and services are inferred from unions
  // of entries; the implementation treats them as `unknown` and is cast to the
  // signature above
  Channel.fromTransform((upstream: Pull.Pull<Arr.NonEmptyReadonlyArray<Entry<unknown, unknown>>, IE, Done>, scope) =>
    Effect.sync(() => {
      const encoder = new Encoder()
      let entries: ReadonlyArray<Entry<unknown, unknown>> = []
      let index = 0
      let done: { readonly value: Done } | undefined
      // The body being written, and the scope it runs in
      let body: Pull.Pull<Arr.NonEmptyReadonlyArray<Uint8Array>, unknown, void, unknown> | undefined
      let bodyScope: Scope.Closeable | undefined

      // Writes entries and their bodies until a slab is full, and hands out what
      // was written before waiting for more entries
      const pull = Effect.gen(function*() {
        while (true) {
          if (encoder.buffered >= SLAB_SIZE) return encoder.flush()
          if (body !== undefined) {
            const chunks = yield* Pull.catchDone(body, () => Effect.undefined)
            if (chunks !== undefined) {
              for (const chunk of chunks) encoder.body(chunk)
              continue
            }
            body = undefined
            yield* Scope.close(bodyScope!, Exit.void)
            encoder.end()
            continue
          }
          if (index < entries.length) {
            const entry = entries[index++]
            encoder.begin(entry.header)
            // Directories, links and empty files have nothing to stream
            if (entry.body === Stream.empty) {
              encoder.end()
              continue
            }
            bodyScope = Scope.forkUnsafe(scope)
            body = yield* Channel.toPullScoped(entry.body.channel, bodyScope)
            continue
          }
          if (encoder.buffered > 0) return encoder.flush()
          if (done !== undefined) return yield* Cause.done(done.value)
          const next = yield* Pull.catchDone(upstream, (value) => {
            done = { value: value as Done }
            encoder.finish()
            return Effect.undefined
          })
          if (next !== undefined) {
            entries = next
            index = 0
          }
        }
      })
      // The encoder throws a `TarError` for an entry that cannot be written
      return Effect.catchDefect(pull, (defect) => isTarError(defect) ? Effect.fail(defect) : Effect.die(defect))
    })
  ) as any

// -----------------------------------------------------------------------------
// Format
// -----------------------------------------------------------------------------

const BLOCK = 512
const MAX_OCTAL_7 = 0o7777777 // 8-byte numeric fields
const MAX_OCTAL_11 = 0o77777777777 // 12-byte numeric fields
const MAX_META_SIZE = 1024 * 1024 // PAX and GNU long name data
const PERMISSION_BITS = 0o7777
const MAX_DATE_MILLIS = 8.64e15 // the range of `Date`

const padding = (size: number): number => (BLOCK - (size % BLOCK)) % BLOCK

const invalidHeader = (message: string) => new TarError({ kind: "InvalidHeader", message })

const truncated = () => new TarError({ kind: "Truncated", message: "unexpected end of tar archive" })

const sparseUnsupported = () => new TarError({ kind: "Unsupported", message: "GNU sparse files are not supported" })

const types: Record<string, EntryType> = {
  ...Object.fromEntries(Object.entries(typeflags).map(([type, typeflag]) => [typeflag, type])),
  // Contiguous files
  "7": "File"
}

const typeOf = (typeflag: string, path: string): EntryType => {
  // Legacy archives mark directories with a trailing slash only
  if (typeflag === "\0") return path.endsWith("/") ? "Directory" : "File"
  return types[typeflag] ?? "Other"
}

const typeflagOf = (header: Header): string => header.type === "Other" ? header.typeflag : typeflags[header.type]

// Entries of these types never carry body bytes, whatever their size field says
const isHeaderOnly = (type: EntryType): boolean => type !== "File" && type !== "Other"

const isZeroBlock = (block: Uint8Array): boolean => {
  for (let i = 0; i < BLOCK; i++) {
    if (block[i] !== 0) return false
  }
  return true
}

const isAscii = (s: string): boolean => {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c === 0 || c >= 0x80) return false
  }
  return true
}

// -----------------------------------------------------------------------------
// Header decoding
// -----------------------------------------------------------------------------

const readString = (block: Uint8Array, offset: number, length: number): string => {
  let end = offset
  let ascii = true
  const limit = offset + length
  while (end < limit && block[end] !== 0) {
    if (block[end] >= 0x80) ascii = false
    end++
  }
  if (end === offset) return ""
  if (!ascii || end - offset > 256) return textDecoder.decode(block.subarray(offset, end))
  // Most header strings are short ASCII, which is cheaper to build directly
  return String.fromCharCode.apply(null, block.subarray(offset, end) as unknown as Array<number>)
}

const readOctal = (block: Uint8Array, offset: number, length: number): number => {
  let start = offset
  let end = offset + length
  while (start < end && (block[start] === 0 || block[start] === 0x20)) start++
  while (end > start && (block[end - 1] === 0 || block[end - 1] === 0x20)) end--
  let value = 0
  for (let i = start; i < end; i++) {
    const c = block[i]
    if (c < 0x30 || c > 0x37) {
      throw invalidHeader(`invalid octal number in header at offset ${offset}`)
    }
    value = value * 8 + (c - 0x30)
  }
  return value
}

// GNU base-256: the high bit of the first byte is set, and the next bit is the
// sign of a two's complement big-endian number
const readNumber = (block: Uint8Array, offset: number, length: number): number => {
  if ((block[offset] & 0x80) === 0) return readOctal(block, offset, length)
  const negative = (block[offset] & 0x40) !== 0
  // Negative numbers are read as the bitwise inverse of their magnitude minus one
  let value = 0
  for (let i = 0; i < length; i++) {
    let c = block[offset + i]
    if (negative) c ^= 0xff
    if (i === 0) c &= 0x7f
    value = value * 256 + c
    if (value > Number.MAX_SAFE_INTEGER) {
      throw invalidHeader(`base-256 number in header at offset ${offset} is out of range`)
    }
  }
  return negative ? -value - 1 : value
}

const sumBlock = (block: Uint8Array): number => {
  // Four sums let the loop run faster than one
  let a = 0
  let b = 0
  let c = 0
  let d = 0
  for (let i = 0; i < BLOCK; i += 4) {
    a += block[i]
    b += block[i + 1]
    c += block[i + 2]
    d += block[i + 3]
  }
  return a + b + c + d
}

// The checksum is the sum of the block bytes with the checksum field counted as
// spaces. Some old tar writers summed signed bytes, which is accepted too.
const verifyChecksum = (block: Uint8Array): boolean => {
  const stored = readOctal(block, 148, 8)
  let unsigned = sumBlock(block) + 8 * 0x20
  for (let i = 148; i < 156; i++) unsigned -= block[i]
  if (stored === unsigned) return true
  let high = 0
  for (let i = 0; i < BLOCK; i++) {
    if (block[i] > 0x7f && (i < 148 || i >= 156)) high++
  }
  return stored === unsigned - 0x100 * high
}

const hasBytes = (block: Uint8Array, offset: number, bytes: ReadonlyArray<number>): boolean => {
  for (let i = 0; i < bytes.length; i++) {
    if (block[offset + i] !== bytes[i]) return false
  }
  return true
}

const USTAR_MAGIC = [0x75, 0x73, 0x74, 0x61, 0x72, 0x00] // "ustar\0"
const GNU_MAGIC = [0x75, 0x73, 0x74, 0x61, 0x72, 0x20, 0x20, 0x00] // "ustar  \0"
const STAR_TRAILER = [0x74, 0x61, 0x72, 0x00] // "tar\0"
const USTAR_MAGIC_VERSION = new Uint8Array([0x75, 0x73, 0x74, 0x61, 0x72, 0x00, 0x30, 0x30]) // "ustar\0" "00"

interface RawHeader {
  readonly typeflag: string
  path: string
  linkTarget: string
  size: number
  readonly mode: number
  uid: number
  gid: number
  uname: string
  gname: string
  mtimeMillis: number
  devMajor: number
  devMinor: number
}

const parseHeader = (block: Uint8Array): RawHeader => {
  if (!verifyChecksum(block)) {
    throw invalidHeader("header checksum mismatch")
  }
  const isUstar = hasBytes(block, 257, USTAR_MAGIC)
  const isGnu = !isUstar && hasBytes(block, 257, GNU_MAGIC)
  const header: RawHeader = {
    typeflag: String.fromCharCode(block[156]),
    path: readString(block, 0, 100),
    linkTarget: readString(block, 157, 100),
    size: readNumber(block, 124, 12),
    mode: readNumber(block, 100, 8),
    uid: readNumber(block, 108, 8),
    gid: readNumber(block, 116, 8),
    mtimeMillis: readNumber(block, 136, 12) * 1000,
    uname: "",
    gname: "",
    devMajor: 0,
    devMinor: 0
  }
  if (header.size < 0) {
    throw invalidHeader("negative entry size")
  }
  if (!isUstar && !isGnu) return header
  header.uname = readString(block, 265, 32)
  header.gname = readString(block, 297, 32)
  header.devMajor = readNumber(block, 329, 8)
  header.devMinor = readNumber(block, 337, 8)
  if (isUstar) {
    // star archives end the block with "tar\0" and keep times after a shorter prefix
    const prefix = hasBytes(block, 508, STAR_TRAILER) ? readString(block, 345, 131) : readString(block, 345, 155)
    if (prefix.length > 0) header.path = `${prefix}/${header.path}`
  }
  return header
}

// -----------------------------------------------------------------------------
// PAX records
// -----------------------------------------------------------------------------

// Shared by the decoded headers without PAX records
const noPax: Readonly<Record<string, string>> = Object.freeze({})

const paxStringKeys = new Set(["path", "linkpath", "uname", "gname"])
const paxHeaderKeys = new Set(["path", "linkpath", "size", "uid", "gid", "uname", "gname", "mtime"])

// Parses records of the form "<length> <key>=<value>\n", where the length counts
// the bytes of the whole record
const parsePax = (data: Uint8Array): Record<string, string> => {
  const records: Record<string, string> = {}
  let offset = 0
  while (offset < data.length) {
    let space = offset
    while (space < data.length && space - offset < 16 && data[space] !== 0x20) space++
    const lengthField = String.fromCharCode.apply(null, data.subarray(offset, space) as unknown as Array<number>)
    const length = /^\d+$/.test(lengthField) ? Number(lengthField) : Number.NaN
    const end = offset + length
    if (!(length >= 5) || end > data.length || data[space] !== 0x20 || space + 1 >= end || data[end - 1] !== 0x0a) {
      throw invalidHeader("malformed PAX record")
    }
    const record = data.subarray(space + 1, end - 1)
    const equals = record.indexOf(0x3d)
    if (equals <= 0) {
      throw invalidHeader("malformed PAX record")
    }
    const key = textDecoder.decode(record.subarray(0, equals))
    const value = textDecoder.decode(record.subarray(equals + 1))
    if (key.includes("\0") || (paxStringKeys.has(key) && value.includes("\0"))) {
      throw invalidHeader(`invalid PAX record ${key}`)
    }
    records[key] = value
    offset = end
  }
  return records
}

const paxInteger = (key: string, value: string): number => {
  const n = /^\d+$/.test(value) ? Number(value) : Number.NaN
  if (!Number.isSafeInteger(n)) {
    throw invalidHeader(`invalid PAX ${key} ${JSON.stringify(value)}`)
  }
  return n
}

// Applies the records that override header fields and returns the rest. An
// empty value keeps the field from the header block.
const applyPax = (header: RawHeader, records: Record<string, string>): Record<string, string> => {
  const rest: Record<string, string> = {}
  for (const key of Object.keys(records)) {
    const value = records[key]
    if (key.startsWith("GNU.sparse.")) {
      throw sparseUnsupported()
    }
    if (!paxHeaderKeys.has(key)) {
      rest[key] = value
      continue
    }
    if (value === "") continue
    switch (key) {
      case "path":
        header.path = value
        break
      case "linkpath":
        header.linkTarget = value
        break
      case "uname":
      case "gname":
        header[key] = value
        break
      case "uid":
      case "gid":
      case "size":
        header[key] = paxInteger(key, value)
        break
      case "mtime":
        if (!/^-?\d+(\.\d+)?$/.test(value)) {
          throw invalidHeader(`invalid PAX mtime ${JSON.stringify(value)}`)
        }
        header.mtimeMillis = Math.floor(Number(value) * 1000)
    }
  }
  return rest
}

// -----------------------------------------------------------------------------
// Decoding
// -----------------------------------------------------------------------------

// A queue of byte chunks that hands out views without copying where possible.
// Consumed chunks are released right away.
class ByteQueue {
  private chunks: Array<Uint8Array | undefined> = []
  private head = 0
  private offset = 0
  length = 0

  push(chunk: Uint8Array): void {
    if (chunk.length === 0) return
    this.chunks.push(chunk)
    this.length += chunk.length
  }

  takeSome(max: number): Uint8Array {
    const chunk = this.chunks[this.head]!
    const available = chunk.length - this.offset
    if (max < available) {
      const out = chunk.subarray(this.offset, this.offset + max)
      this.offset += max
      this.length -= max
      return out
    }
    const out = this.offset === 0 ? chunk : chunk.subarray(this.offset)
    this.chunks[this.head++] = undefined
    this.length -= available
    this.offset = 0
    if (this.head === this.chunks.length) {
      this.chunks = []
      this.head = 0
    } else if (this.head >= 1024) {
      this.chunks = this.chunks.slice(this.head)
      this.head = 0
    }
    return out
  }

  // Takes exactly `n` bytes; the queue must hold at least `n`
  take(n: number): Uint8Array {
    if (n === 0) return new Uint8Array(0)
    const first = this.takeSome(n)
    if (first.length === n) return first
    const out = new Uint8Array(n)
    out.set(first)
    let filled = first.length
    while (filled < n) {
      const part = this.takeSome(n - filled)
      out.set(part, filled)
      filled += part.length
    }
    return out
  }

  clear(): void {
    this.chunks = []
    this.head = 0
    this.offset = 0
    this.length = 0
  }
}

// Returned by the decoder when the buffered input is not enough to continue
const NeedInput: unique symbol = Symbol("effect/encoding/Tar/NeedInput")

// Reads entries from input that is pushed in chunks, like Go's `tar.Reader`.
// `next` moves to the next entry, skipping what is left of the current body,
// and `read` returns body bytes. Both return `NeedInput` when the buffered input
// is not enough, keeping their progress so that they can be called again, and
// throw a `TarError` on a malformed archive.
class Decoder {
  private readonly queue = new ByteQueue()
  private ended = false
  private finished = false
  private closed = false
  // Incremented whenever the current body is invalidated
  generation = 0
  private remaining = 0
  private pad = 0
  // Bytes to discard before the next header
  private skip = 0
  private zeroBlock = false
  // An extended header whose data is still to be read
  private meta: RawHeader | undefined
  private pax: Record<string, string> | undefined
  private longName = ""
  private longLink = ""

  push(chunk: Uint8Array): void {
    if (!this.finished) this.queue.push(chunk)
  }

  // Marks the end of the input
  end(): void {
    this.ended = true
  }

  close(): void {
    this.closed = true
    this.generation++
    this.queue.clear()
  }

  // Returns the next entry header, or `undefined` once the archive and the
  // input have ended. Input after the end of the archive is discarded.
  next(): Header | undefined | typeof NeedInput {
    this.generation++
    this.skip += this.remaining + this.pad
    this.remaining = 0
    this.pad = 0
    const queue = this.queue
    while (true) {
      if (this.finished) return this.finish()
      while (this.skip > 0) {
        if (queue.length === 0) return this.needInput()
        this.skip -= queue.takeSome(this.skip).length
      }
      if (this.meta !== undefined) {
        const { size, typeflag } = this.meta
        const total = size + padding(size)
        if (queue.length < total) return this.needInput()
        const data = queue.take(total).subarray(0, size)
        this.meta = undefined
        if (typeflag === "x") this.pax = parsePax(data)
        else if (typeflag === "L") this.longName = readString(data, 0, size)
        else this.longLink = readString(data, 0, size)
        continue
      }
      if (queue.length < BLOCK) {
        if (queue.length === 0 && this.ended) return this.finish()
        return this.needInput()
      }
      const block = queue.take(BLOCK)
      if (isZeroBlock(block)) {
        if (this.zeroBlock) return this.finish()
        this.zeroBlock = true
        continue
      }
      if (this.zeroBlock) {
        throw invalidHeader("non-zero block after an end-of-archive block")
      }
      const raw = parseHeader(block)
      switch (raw.typeflag) {
        case "x":
        case "L":
        case "K": {
          if (raw.size > MAX_META_SIZE) {
            throw invalidHeader(`extended header of ${raw.size} bytes exceeds the limit`)
          }
          this.meta = raw
          continue
        }
        case "g": {
          this.skip = raw.size + padding(raw.size)
          continue
        }
        case "S": {
          throw sparseUnsupported()
        }
      }
      const header = this.toHeader(raw)
      this.remaining = header.size
      this.pad = padding(header.size)
      return header
    }
  }

  // Returns the buffered body bytes of the entry from generation `id`, or
  // `undefined` once the whole body has been read
  read(id: number): Arr.NonEmptyArray<Uint8Array> | undefined | typeof NeedInput {
    if (id !== this.generation) {
      throw new TarError({
        kind: "BodyConsumed",
        message: this.closed ?
          "tar entry body read after the archive stream ended" :
          "tar entry body read after moving to the next entry"
      })
    }
    if (this.remaining === 0) return undefined
    if (this.queue.length === 0) return this.needInput()
    const chunks = Arr.of(this.queue.takeSome(this.remaining))
    this.remaining -= chunks[0].length
    while (this.remaining > 0 && this.queue.length > 0) {
      const chunk = this.queue.takeSome(this.remaining)
      this.remaining -= chunk.length
      chunks.push(chunk)
    }
    return chunks
  }

  private needInput(): typeof NeedInput {
    if (this.ended) throw truncated()
    return NeedInput
  }

  private finish(): undefined | typeof NeedInput {
    this.finished = true
    this.queue.clear()
    return this.ended ? undefined : NeedInput
  }

  private toHeader(raw: RawHeader): Header {
    const rest = this.pax === undefined ? noPax : applyPax(raw, this.pax)
    // Empty GNU long names are ignored, as in Go
    if (this.longName !== "") raw.path = this.longName
    if (this.longLink !== "") raw.linkTarget = this.longLink
    this.pax = undefined
    this.longName = ""
    this.longLink = ""
    if (!(Math.abs(raw.mtimeMillis) <= MAX_DATE_MILLIS)) {
      throw invalidHeader("mtime is out of range")
    }
    const type = typeOf(raw.typeflag, raw.path)
    const header: Types.Mutable<Header> = {
      path: raw.path,
      type,
      typeflag: raw.typeflag,
      size: isHeaderOnly(type) ? 0 : raw.size,
      mode: raw.mode & PERMISSION_BITS,
      uid: raw.uid,
      gid: raw.gid,
      uname: raw.uname,
      gname: raw.gname,
      mtime: new Date(raw.mtimeMillis),
      pax: rest
    }
    if (raw.linkTarget !== "") header.linkTarget = raw.linkTarget
    if (type === "CharDevice" || type === "BlockDevice") {
      header.devMajor = raw.devMajor
      header.devMinor = raw.devMinor
    }
    return header
  }
}

// -----------------------------------------------------------------------------
// Encoding
// -----------------------------------------------------------------------------

const writeString = (block: Uint8Array, offset: number, length: number, value: string): void => {
  const n = Math.min(value.length, length)
  for (let i = 0; i < n; i++) block[offset + i] = value.charCodeAt(i)
}

// Writes `length - 1` zero-padded octal digits; the value must fit
const writeOctal = (block: Uint8Array, offset: number, length: number, value: number): void => {
  let i = offset + length - 2
  // Bit operations are faster, but only cover 32 bits
  for (; value > 0x3fffffff && i >= offset; i--) {
    block[i] = 0x30 + (value % 8)
    value = Math.floor(value / 8)
  }
  for (; i >= offset; i--) {
    block[i] = 0x30 + (value & 7)
    value >>>= 3
  }
}

// Keeps the ASCII characters of a value that is also stored in a PAX record
const toAscii = (s: string): string => {
  let out = ""
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c > 0 && c < 0x80) out += s[i]
  }
  return out
}

// Whether a string can be stored as is in a USTAR field of `length` bytes
const fits = (value: string, length: number): boolean => value.length <= length && isAscii(value)

// Split at the last slash that fits the 155-byte USTAR prefix.
const splitPath = (path: string): readonly [prefix: string, name: string] | undefined => {
  if (path.length <= 100 || !isAscii(path)) return undefined
  let length = path.length
  if (length > 156) length = 156
  else if (path[length - 1] === "/") length--
  const i = path.lastIndexOf("/", length - 1)
  if (i <= 0 || path.length - i - 1 > 100) return undefined
  return [path.slice(0, i), path.slice(i + 1)]
}

const paxRecord = (key: string, value: string): Uint8Array => {
  const rest = textEncoder.encode(` ${key}=${value}\n`)
  // The length counts its own digits
  const length = rest.length + String(rest.length + String(rest.length).length).length
  const out = new Uint8Array(length)
  writeString(out, 0, length, String(length))
  out.set(rest, length - rest.length)
  return out
}

const paxHeaderName = (path: string): string => {
  const trimmed = path.replace(/\/+$/, "")
  const i = trimmed.lastIndexOf("/")
  const name = i === -1 ? `PaxHeaders.0/${trimmed}` : `${trimmed.slice(0, i)}/PaxHeaders.0/${trimmed.slice(i + 1)}`
  return toAscii(name).slice(0, 100)
}

interface UstarFields {
  readonly name: string
  readonly prefix: string
  readonly typeflag: string
  readonly size: number
  readonly mode: number
  readonly uid: number
  readonly gid: number
  readonly mtime: number
  readonly linkname: string
  readonly uname: string
  readonly gname: string
  readonly devMajor: number
  readonly devMinor: number
}

const paxHeaderFields: UstarFields = {
  name: "",
  prefix: "",
  typeflag: "x",
  size: 0,
  mode: 0o644,
  uid: 0,
  gid: 0,
  mtime: 0,
  linkname: "",
  uname: "",
  gname: "",
  devMajor: 0,
  devMinor: 0
}

const writeUstarBlock = (block: Uint8Array, fields: UstarFields): void => {
  writeString(block, 0, 100, fields.name)
  writeOctal(block, 100, 8, fields.mode)
  writeOctal(block, 108, 8, fields.uid)
  writeOctal(block, 116, 8, fields.gid)
  writeOctal(block, 124, 12, fields.size)
  writeOctal(block, 136, 12, fields.mtime)
  block[156] = fields.typeflag.charCodeAt(0)
  writeString(block, 157, 100, fields.linkname)
  block.set(USTAR_MAGIC_VERSION, 257)
  writeString(block, 265, 32, fields.uname)
  writeString(block, 297, 32, fields.gname)
  writeOctal(block, 329, 8, fields.devMajor)
  writeOctal(block, 337, 8, fields.devMinor)
  writeString(block, 345, 155, fields.prefix)
  block.fill(0x20, 148, 156)
  // Six digits, a NUL and the space left from the fill
  writeOctal(block, 148, 7, sumBlock(block))
  block[154] = 0
}

const checkNumber = (field: string, value: number | undefined, max: number): number => {
  const n = value ?? 0
  if (!Number.isSafeInteger(n) || n < 0 || n > max) {
    throw invalidHeader(`invalid ${field} ${n}`)
  }
  return n
}

const checkNoNul = (field: string, value: string): string => {
  if (value.includes("\0")) {
    throw invalidHeader(`${field} must not contain NUL characters`)
  }
  return value
}

// Writes the header blocks of an entry, with a PAX header first when needed, into
// zeroed memory from `alloc`. Throws before allocating when the header is invalid.
const encodeHeader = (header: Header, alloc: (size: number) => Uint8Array): void => {
  const path = checkNoNul("path", header.path)
  if (path === "") {
    throw invalidHeader("path must not be empty")
  }
  // GNU tar and node-tar read such an entry as a directory
  if (header.type === "File" && path.endsWith("/")) {
    throw invalidHeader(`File entry ${JSON.stringify(path)} must not end with "/"`)
  }
  const typeflag = typeflagOf(header)
  if (typeflag.length !== 1 || typeflag.charCodeAt(0) >= 0x80 || "xgLKS".includes(typeflag)) {
    throw invalidHeader(`invalid typeflag ${JSON.stringify(typeflag)}`)
  }
  const size = checkNumber("size", header.size, Number.MAX_SAFE_INTEGER)
  if (size > 0 && isHeaderOnly(header.type)) {
    throw invalidHeader(`${header.type} entry ${JSON.stringify(path)} must have size 0`)
  }
  const mode = checkNumber("mode", header.mode, Number.MAX_SAFE_INTEGER) & PERMISSION_BITS
  const uid = checkNumber("uid", header.uid, Number.MAX_SAFE_INTEGER)
  const gid = checkNumber("gid", header.gid, Number.MAX_SAFE_INTEGER)
  const devMajor = checkNumber("devMajor", header.devMajor, MAX_OCTAL_7)
  const devMinor = checkNumber("devMinor", header.devMinor, MAX_OCTAL_7)
  const millis = header.mtime.getTime()
  if (Number.isNaN(millis)) {
    throw invalidHeader("mtime must be a valid date")
  }
  const mtime = Math.floor(millis / 1000)

  // Records of the PAX header, created when one is needed
  let pax: Record<string, string> | undefined
  for (const key of Object.keys(header.pax)) {
    if (key.startsWith("GNU.sparse.")) {
      throw invalidHeader(`PAX record ${JSON.stringify(key)} is not supported`)
    }
    if (paxHeaderKeys.has(key)) {
      throw invalidHeader(`PAX record ${JSON.stringify(key)} must be set through its header field`)
    }
    if (key === "" || key.includes("=") || key.includes("\0")) {
      throw invalidHeader(`invalid PAX record ${JSON.stringify(key)}`)
    }
    pax ??= {}
    pax[key] = header.pax[key]
  }

  // PAX holds overflow values; USTAR keeps truncated ASCII strings or zero.
  const split = splitPath(path)
  const linkTarget = checkNoNul("linkTarget", header.linkTarget ?? "")
  const uname = checkNoNul("uname", header.uname)
  const gname = checkNoNul("gname", header.gname)
  const pathFits = split !== undefined || fits(path, 100)
  const linkTargetFits = fits(linkTarget, 100)
  const unameFits = fits(uname, 32)
  const gnameFits = fits(gname, 32)
  if (!pathFits) (pax ??= {}).path = path
  if (!linkTargetFits) (pax ??= {}).linkpath = linkTarget
  if (!unameFits) (pax ??= {}).uname = uname
  if (!gnameFits) (pax ??= {}).gname = gname
  if (size > MAX_OCTAL_11) (pax ??= {}).size = String(size)
  if (uid > MAX_OCTAL_7) (pax ??= {}).uid = String(uid)
  if (gid > MAX_OCTAL_7) (pax ??= {}).gid = String(gid)
  if (mtime < 0 || mtime > MAX_OCTAL_11) (pax ??= {}).mtime = String(mtime)

  const ustar: UstarFields = {
    name: split !== undefined ? split[1] : pathFits ? path : toAscii(path).slice(0, 100),
    prefix: split !== undefined ? split[0] : "",
    typeflag,
    size: size > MAX_OCTAL_11 ? 0 : size,
    mode,
    uid: uid > MAX_OCTAL_7 ? 0 : uid,
    gid: gid > MAX_OCTAL_7 ? 0 : gid,
    mtime: mtime < 0 || mtime > MAX_OCTAL_11 ? 0 : mtime,
    linkname: linkTargetFits ? linkTarget : toAscii(linkTarget).slice(0, 100),
    uname: unameFits ? uname : toAscii(uname).slice(0, 32),
    gname: gnameFits ? gname : toAscii(gname).slice(0, 32),
    devMajor,
    devMinor
  }

  if (pax === undefined) {
    writeUstarBlock(alloc(BLOCK), ustar)
    return
  }
  const records = Object.keys(pax).sort().map((key) => paxRecord(key, pax[key]))
  let dataLength = 0
  for (const record of records) dataLength += record.length
  const paxBlocks = 1 + Math.ceil(dataLength / BLOCK)
  const out = alloc(BLOCK * (paxBlocks + 1))
  writeUstarBlock(out, { ...paxHeaderFields, name: paxHeaderName(path), size: dataLength })
  let offset = BLOCK
  for (const record of records) {
    out.set(record, offset)
    offset += record.length
  }
  writeUstarBlock(out.subarray(BLOCK * paxBlocks), ustar)
}

const sizeMismatch = (header: Header, written: number) =>
  new TarError({
    kind: "SizeMismatch",
    message: `body of ${JSON.stringify(header.path)} has ${
      written > header.size ? "more than" : "only"
    } ${written} bytes, but its size is ${header.size}`
  })

const SLAB_SIZE = 64 * 1024

// Bodies below this size are copied next to their header instead of being
// handed out as chunks of their own
const COPY_LIMIT = 16 * 1024

// Writes archive bytes. Headers, padding and small body chunks are written into
// shared slabs, so that an archive of small entries comes out in a few large
// chunks; larger body chunks pass through as they are. `flush` hands out what
// has been written so far. Methods throw a `TarError` for an entry that cannot
// be written, before writing any of it.
class Encoder {
  private slab = new Uint8Array(0)
  // Start of the bytes in `slab` that have not been flushed, and their end
  private start = 0
  private offset = 0
  private chunks: Array<Uint8Array> = []
  // Bytes written since the last flush
  buffered = 0
  // The entry whose body is being written, and the body bytes written so far
  private header: Header | undefined
  private written = 0

  // Writes the header of an entry whose body follows through `body` calls
  begin(header: Header): void {
    encodeHeader(header, this.alloc)
    this.header = header
    this.written = 0
  }

  body(chunk: Uint8Array): void {
    const header = this.header!
    this.written += chunk.length
    if (this.written > header.size) {
      throw sizeMismatch(header, this.written)
    }
    if (chunk.length < COPY_LIMIT) {
      // `reserve` can start a new slab, so it must run before `slab` is read
      const offset = this.reserve(chunk.length)
      this.slab.set(chunk, offset)
      return
    }
    this.cut()
    this.chunks.push(chunk)
    this.buffered += chunk.length
  }

  // Ends the body started with `begin`
  end(): void {
    const header = this.header!
    this.header = undefined
    if (this.written !== header.size) {
      throw sizeMismatch(header, this.written)
    }
    this.reserve(padding(header.size))
  }

  // Writes the end-of-archive blocks
  finish(): void {
    this.reserve(BLOCK * 2)
  }

  flush(): Arr.NonEmptyArray<Uint8Array> {
    this.cut()
    const chunks = this.chunks as Arr.NonEmptyArray<Uint8Array>
    this.chunks = []
    this.buffered = 0
    return chunks
  }

  // Ends the current run of slab bytes as a chunk
  private cut(): void {
    if (this.offset > this.start) {
      this.chunks.push(this.slab.subarray(this.start, this.offset))
      this.start = this.offset
    }
  }

  // Returns `size` zeroed bytes of the output
  private alloc = (size: number): Uint8Array => {
    const offset = this.reserve(size)
    return this.slab.subarray(offset, offset + size)
  }

  // Reserves `size` zeroed bytes of the output in `slab`, and returns their offset
  private reserve(size: number): number {
    if (this.offset + size > this.slab.length) {
      this.cut()
      this.slab = new Uint8Array(Math.max(SLAB_SIZE, size))
      this.start = 0
      this.offset = 0
    }
    const offset = this.offset
    this.offset += size
    this.buffered += size
    return offset
  }
}
