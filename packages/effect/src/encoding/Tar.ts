/**
 * Encodes and decodes tar archives as streams in Effect channels.
 *
 * A tar archive is a sequence of entries, each a header followed by the bytes
 * of its body. `decode` turns archive bytes into entries whose bodies stream
 * straight from the input, and `encode` turns entries back into archive bytes.
 * Neither side buffers an entry body, so archives of any size can pass through
 * in constant memory.
 *
 * The decoder reads the formats produced by common tools: v7, USTAR, PAX
 * extended headers, and GNU long names and base-256 numbers. The encoder writes
 * plain USTAR and adds a PAX extended header only for an entry that does not
 * fit USTAR. The module does not touch the file system and does not compress.
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
 * setuid, setgid and sticky. `pax` holds the PAX extended header records that
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
const epoch = new Date(0)

const makeHeader = (
  path: string,
  type: EntryType,
  typeflag: string,
  size: number,
  defaultMode: number,
  options: EntryOptions | undefined,
  linkTarget?: string
): Header => ({
  path,
  type,
  typeflag,
  size,
  mode: options?.mode ?? defaultMode,
  uid: options?.uid ?? 0,
  gid: options?.gid ?? 0,
  uname: options?.uname ?? "",
  gname: options?.gname ?? "",
  mtime: options?.mtime ?? epoch,
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
    header: makeHeader(path, "File", "0", bytes.length, 0o644, options),
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
  header: makeHeader(path, "File", "0", size, 0o644, options),
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
  header: makeHeader(path.endsWith("/") ? path : `${path}/`, "Directory", "5", 0, 0o755, options),
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
  header: makeHeader(path, "Symlink", "2", 0, 0o777, options, target),
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
  header: makeHeader(path, "Hardlink", "1", 0, 0o644, options, target),
  body: Stream.empty
})

// -----------------------------------------------------------------------------
// Format
// -----------------------------------------------------------------------------

const BLOCK = 512
const MAX_OCTAL_7 = 0o7777777 // 8-byte numeric fields
const MAX_OCTAL_11 = 0o77777777777 // 12-byte numeric fields
const MAX_META_SIZE = 1024 * 1024 // PAX and GNU long name data

const padding = (size: number): number => (BLOCK - (size % BLOCK)) % BLOCK

const invalidHeader = (message: string) => new TarError({ kind: "InvalidHeader", message })

const sparseUnsupported = () => new TarError({ kind: "Unsupported", message: "GNU sparse files are not supported" })

// Runs a header codec function that throws `TarError`
const attempt = <A>(f: () => A): Effect.Effect<A, TarError> => {
  try {
    return Effect.succeed(f())
  } catch (error) {
    return Effect.fail(error as TarError)
  }
}

const typeflags: Record<Exclude<EntryType, "Other">, string> = {
  File: "0",
  Hardlink: "1",
  Symlink: "2",
  CharDevice: "3",
  BlockDevice: "4",
  Directory: "5",
  Fifo: "6"
}

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
  const limit = offset + length
  while (end < limit && block[end] !== 0) end++
  return textDecoder.decode(block.subarray(offset, end))
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

const verifyChecksum = (block: Uint8Array): boolean => {
  const stored = readOctal(block, 148, 8)
  let unsigned = 0
  let signed = 0
  for (let i = 0; i < BLOCK; i++) {
    const c = i >= 148 && i < 156 ? 0x20 : block[i]
    unsigned += c
    signed += c > 0x7f ? c - 0x100 : c
  }
  return stored === unsigned || stored === signed
}

const readFixed = (block: Uint8Array, offset: number, length: number): string =>
  String.fromCharCode(...block.subarray(offset, offset + length))

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
  const magic = readFixed(block, 257, 6)
  const isUstar = magic === "ustar\0"
  const isGnu = magic === "ustar " && readFixed(block, 263, 2) === " \0"
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
    const prefix = readFixed(block, 508, 4) === "tar\0" ? readString(block, 345, 131) : readString(block, 345, 155)
    if (prefix.length > 0) header.path = `${prefix}/${header.path}`
  }
  return header
}

// -----------------------------------------------------------------------------
// PAX records
// -----------------------------------------------------------------------------

const paxStringKeys = new Set(["path", "linkpath", "uname", "gname"])
const paxHeaderKeys = new Set(["path", "linkpath", "size", "uid", "gid", "uname", "gname", "mtime"])

// Parses records of the form "<length> <key>=<value>\n", where the length counts
// the bytes of the whole record
const parsePax = (data: Uint8Array, into: Record<string, string>): void => {
  let offset = 0
  while (offset < data.length) {
    let space = offset
    while (space < data.length && space - offset < 16 && data[space] !== 0x20) space++
    const lengthField = readFixed(data, offset, space - offset)
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
    into[key] = value
    offset = end
  }
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
    switch (key) {
      case "path":
        if (value !== "") header.path = value
        break
      case "linkpath":
        if (value !== "") header.linkTarget = value
        break
      case "uname":
        if (value !== "") header.uname = value
        break
      case "gname":
        if (value !== "") header.gname = value
        break
      case "uid":
        if (value !== "") header.uid = paxInteger(key, value)
        break
      case "gid":
        if (value !== "") header.gid = paxInteger(key, value)
        break
      case "size":
        if (value !== "") header.size = paxInteger(key, value)
        break
      case "mtime":
        if (value !== "") {
          if (!/^-?\d+(\.\d+)?$/.test(value)) {
            throw invalidHeader(`invalid PAX mtime ${JSON.stringify(value)}`)
          }
          header.mtimeMillis = Math.floor(Number(value) * 1000)
        }
        break
      default:
        rest[key] = value
    }
  }
  return rest
}

// -----------------------------------------------------------------------------
// Decoding
// -----------------------------------------------------------------------------

// A queue of byte chunks that hands out views without copying where possible
class ByteQueue {
  private chunks: Array<Uint8Array> = []
  private offset = 0
  length = 0

  push(chunk: Uint8Array): void {
    if (chunk.length === 0) return
    this.chunks.push(chunk)
    this.length += chunk.length
  }

  // Takes up to `max` bytes from the first chunk
  takeSome(max: number): Uint8Array {
    const chunk = this.chunks[0]
    const available = chunk.length - this.offset
    if (max < available) {
      const out = chunk.subarray(this.offset, this.offset + max)
      this.offset += max
      this.length -= max
      return out
    }
    const out = this.offset === 0 ? chunk : chunk.subarray(this.offset)
    this.chunks.shift()
    this.length -= available
    this.offset = 0
    return out
  }

  // Takes exactly `n` bytes; the queue must hold at least `n`
  take(n: number): Uint8Array {
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
    this.offset = 0
    this.length = 0
  }
}

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
 *   with a `BodyConsumed` `TarError`.
 * - Directories, links, devices and FIFOs have no body, and their `size` is
 *   reported as `0`.
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
      const decoder = makeDecoder(upstream)
      return Effect.as(Scope.addFinalizer(scope, Effect.sync(decoder.close)), decoder.pull)
    })
  )

const makeDecoder = <IE, Done>(upstream: Pull.Pull<Arr.NonEmptyReadonlyArray<Uint8Array>, IE, Done>) => {
  const queue = new ByteQueue()
  const lock = Semaphore.makeUnsafe(1)
  let upstreamDone: { readonly value: Done } | undefined
  let closed = false
  // Incremented whenever the current body is invalidated
  let generation = 0
  // Body bytes not yet read, and the padding after them
  let remaining = 0
  let pad = 0

  const truncated = () => new TarError({ kind: "Truncated", message: "unexpected end of tar archive" })

  const pullUpstream: Effect.Effect<boolean, IE> = upstream.pipe(
    Effect.map((chunks) => {
      for (const chunk of chunks) queue.push(chunk)
      return true
    }),
    Pull.catchDone((value) => {
      upstreamDone = { value: value as Done }
      return Effect.succeed(false)
    })
  )

  // Pulls until at least `n` bytes are buffered, or the input ends
  const fill = (n: number): Effect.Effect<boolean, IE> =>
    Effect.suspend(() => {
      if (queue.length >= n) return Effect.succeed(true)
      if (upstreamDone !== undefined) return Effect.succeed(false)
      return Effect.flatMap(pullUpstream, () => fill(n))
    })

  const readExact = (n: number): Effect.Effect<Uint8Array, TarError | IE> =>
    Effect.flatMap(fill(n), (ok) => ok ? Effect.succeed(queue.take(n)) : Effect.fail(truncated()))

  // Reads one block, or `undefined` when the input ends on a block boundary
  const readBlock: Effect.Effect<Uint8Array | undefined, TarError | IE> = Effect.flatMap(
    fill(BLOCK),
    (ok) => {
      if (ok) return Effect.succeed(queue.take(BLOCK))
      return queue.length === 0 ? Effect.succeed(undefined) : Effect.fail(truncated())
    }
  )

  const readSome = (max: number): Effect.Effect<Uint8Array, TarError | IE> =>
    Effect.flatMap(fill(1), (ok) => ok ? Effect.succeed(queue.takeSome(max)) : Effect.fail(truncated()))

  const skip = (n: number): Effect.Effect<void, TarError | IE> =>
    n === 0 ? Effect.void : Effect.flatMap(readSome(Math.min(n, 65536)), (chunk) => skip(n - chunk.length))

  // Reads the data of a PAX or GNU long name entry, including its padding
  const readMeta = (size: number): Effect.Effect<Uint8Array, TarError | IE> => {
    if (size > MAX_META_SIZE) {
      return Effect.fail(invalidHeader(`extended header of ${size} bytes exceeds the limit`))
    }
    return Effect.flatMap(readExact(size + padding(size)), (data) => Effect.succeed(data.subarray(0, size)))
  }

  const finish: Effect.Effect<never, IE | Cause.Done<Done>> = Effect.suspend(function loop(): Effect.Effect<
    never,
    IE | Cause.Done<Done>
  > {
    generation++
    queue.clear()
    if (upstreamDone !== undefined) return Cause.done(upstreamDone.value)
    return Effect.flatMap(pullUpstream, loop)
  })

  const body = (id: number): Stream.Stream<Uint8Array, TarError | IE> =>
    Stream.fromPull(Effect.succeed(lock.withPermit(Effect.suspend((): Pull.Pull<
      Arr.NonEmptyReadonlyArray<Uint8Array>,
      TarError | IE
    > => {
      if (id !== generation) {
        return Effect.fail(
          new TarError({
            kind: "BodyConsumed",
            message: closed ?
              "tar entry body read after the archive stream ended" :
              "tar entry body read after moving to the next entry"
          })
        )
      }
      if (remaining === 0) return Cause.done()
      return Effect.map(readSome(remaining), (chunk) => {
        remaining -= chunk.length
        return Arr.of(chunk)
      })
    }))))

  const next: Pull.Pull<Arr.NonEmptyReadonlyArray<Entry<TarError | IE>>, TarError | IE, Done> = Effect.gen(
    function*() {
      generation++
      yield* skip(remaining + pad)
      remaining = 0
      pad = 0
      const pax: Record<string, string> = {}
      let longName: string | undefined
      let longLink: string | undefined
      while (true) {
        const block = yield* readBlock
        if (block === undefined) return yield* finish
        if (isZeroBlock(block)) {
          const second = yield* readBlock
          if (second === undefined || isZeroBlock(second)) return yield* finish
          return yield* Effect.fail(invalidHeader("non-zero block after an end-of-archive block"))
        }
        const raw = yield* attempt(() => parseHeader(block))
        switch (raw.typeflag) {
          case "x": {
            const data = yield* readMeta(raw.size)
            yield* attempt(() => parsePax(data, pax))
            continue
          }
          case "g": {
            yield* skip(raw.size + padding(raw.size))
            continue
          }
          case "L": {
            longName = readString(yield* readMeta(raw.size), 0, raw.size)
            continue
          }
          case "K": {
            longLink = readString(yield* readMeta(raw.size), 0, raw.size)
            continue
          }
          case "S": {
            return yield* Effect.fail(sparseUnsupported())
          }
        }
        const rest = yield* attempt(() => applyPax(raw, pax))
        if (longName !== undefined) raw.path = longName
        if (longLink !== undefined) raw.linkTarget = longLink
        const type = typeOf(raw.typeflag, raw.path)
        const size = isHeaderOnly(type) ? 0 : raw.size
        remaining = size
        pad = padding(size)
        const isDevice = type === "CharDevice" || type === "BlockDevice"
        const header: Header = {
          path: raw.path,
          type,
          typeflag: raw.typeflag,
          size,
          mode: raw.mode,
          uid: raw.uid,
          gid: raw.gid,
          uname: raw.uname,
          gname: raw.gname,
          mtime: new Date(raw.mtimeMillis),
          ...(raw.linkTarget === "" ? undefined : { linkTarget: raw.linkTarget }),
          ...(isDevice ? { devMajor: raw.devMajor, devMinor: raw.devMinor } : undefined),
          pax: rest
        }
        return Arr.of({ header, body: body(generation) })
      }
    }
  )

  return {
    pull: lock.withPermit(next),
    close: () => {
      closed = true
      generation++
    }
  }
}

// -----------------------------------------------------------------------------
// Encoding
// -----------------------------------------------------------------------------

const writeString = (block: Uint8Array, offset: number, length: number, value: string): void => {
  const n = Math.min(value.length, length)
  for (let i = 0; i < n; i++) block[offset + i] = value.charCodeAt(i)
}

const writeOctal = (block: Uint8Array, offset: number, length: number, value: number): void => {
  writeString(block, offset, length - 1, value.toString(8).padStart(length - 1, "0"))
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

// Splits a path into a USTAR prefix and name, the same way Go's tar.Writer does
const splitPath = (path: string): readonly [prefix: string, name: string] | undefined => {
  if (path.length <= 100 || !isAscii(path)) return undefined
  let length = path.length
  if (length > 156) length = 156
  else if (path[length - 1] === "/") length--
  const i = path.lastIndexOf("/", length - 1)
  const nameLength = path.length - i - 1
  if (i <= 0 || nameLength > 100 || nameLength === 0 || i > 155) return undefined
  return [path.slice(0, i), path.slice(i + 1)]
}

const paxRecord = (key: string, value: string): Uint8Array => {
  const rest = ` ${key}=${value}\n`
  const restLength = textEncoder.encode(rest).length
  let size = restLength + String(restLength).length
  if (String(size).length + restLength !== size) size = String(size).length + restLength
  return textEncoder.encode(`${size}${rest}`)
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

const writeUstarBlock = (block: Uint8Array, fields: UstarFields): void => {
  writeString(block, 0, 100, fields.name)
  writeOctal(block, 100, 8, fields.mode)
  writeOctal(block, 108, 8, fields.uid)
  writeOctal(block, 116, 8, fields.gid)
  writeOctal(block, 124, 12, fields.size)
  writeOctal(block, 136, 12, fields.mtime)
  block[156] = fields.typeflag.charCodeAt(0)
  writeString(block, 157, 100, fields.linkname)
  writeString(block, 257, 8, "ustar\x0000")
  writeString(block, 265, 32, fields.uname)
  writeString(block, 297, 32, fields.gname)
  writeOctal(block, 329, 8, fields.devMajor)
  writeOctal(block, 337, 8, fields.devMinor)
  writeString(block, 345, 155, fields.prefix)
  block.fill(0x20, 148, 156)
  let sum = 0
  for (let i = 0; i < BLOCK; i++) sum += block[i]
  // Six digits, a NUL and the space left from the fill
  writeOctal(block, 148, 7, sum)
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

// Encodes the header blocks of an entry: an optional PAX extended header for
// the fields that don't fit USTAR, then the USTAR header
const encodeHeader = (header: Header): Uint8Array => {
  const path = checkNoNul("path", header.path)
  if (path === "") {
    throw invalidHeader("path must not be empty")
  }
  const typeflag = typeflagOf(header)
  if (typeflag.length !== 1 || typeflag.charCodeAt(0) >= 0x80 || "xgLKS".includes(typeflag)) {
    throw invalidHeader(`invalid typeflag ${JSON.stringify(typeflag)}`)
  }
  const size = checkNumber("size", header.size, Number.MAX_SAFE_INTEGER)
  if (size > 0 && isHeaderOnly(header.type)) {
    throw invalidHeader(`${header.type} entry ${JSON.stringify(path)} must have size 0`)
  }
  const mode = checkNumber("mode", header.mode, MAX_OCTAL_7)
  const uid = checkNumber("uid", header.uid, Number.MAX_SAFE_INTEGER)
  const gid = checkNumber("gid", header.gid, Number.MAX_SAFE_INTEGER)
  const devMajor = checkNumber("devMajor", header.devMajor, MAX_OCTAL_7)
  const devMinor = checkNumber("devMinor", header.devMinor, MAX_OCTAL_7)
  const millis = header.mtime.getTime()
  if (Number.isNaN(millis)) {
    throw invalidHeader("mtime must be a valid date")
  }
  const mtime = Math.floor(millis / 1000)

  const pax: Record<string, string> = {}
  for (const key of Object.keys(header.pax)) {
    if (paxHeaderKeys.has(key)) {
      throw invalidHeader(`PAX record ${JSON.stringify(key)} must be set through its header field`)
    }
    const value = header.pax[key]
    if (key === "" || key.includes("=") || key.includes("\0") || (paxStringKeys.has(key) && value.includes("\0"))) {
      throw invalidHeader(`invalid PAX record ${JSON.stringify(key)}`)
    }
    pax[key] = value
  }

  // A value that doesn't fit its USTAR field moves to a PAX record, and the
  // field keeps what it can: the ASCII part of a string, or zero for a number
  const fitString = (key: string, value: string, length: number): string => {
    if (isAscii(value) && value.length <= length) return value
    pax[key] = value
    return toAscii(value).slice(0, length)
  }
  const fitNumber = (key: string, value: number, max: number): number => {
    if (value >= 0 && value <= max) return value
    pax[key] = String(value)
    return 0
  }

  const split = splitPath(path)
  const ustar: UstarFields = {
    name: split === undefined ? fitString("path", path, 100) : split[1],
    prefix: split === undefined ? "" : split[0],
    typeflag,
    size: fitNumber("size", size, MAX_OCTAL_11),
    mode,
    uid: fitNumber("uid", uid, MAX_OCTAL_7),
    gid: fitNumber("gid", gid, MAX_OCTAL_7),
    mtime: fitNumber("mtime", mtime, MAX_OCTAL_11),
    linkname: fitString("linkpath", checkNoNul("linkTarget", header.linkTarget ?? ""), 100),
    uname: fitString("uname", checkNoNul("uname", header.uname), 32),
    gname: fitString("gname", checkNoNul("gname", header.gname), 32),
    devMajor,
    devMinor
  }

  const keys = Object.keys(pax).sort()
  if (keys.length === 0) {
    const block = new Uint8Array(BLOCK)
    writeUstarBlock(block, ustar)
    return block
  }
  const records = keys.map((key) => paxRecord(key, pax[key]))
  let dataLength = 0
  for (const record of records) dataLength += record.length
  const dataBlocks = Math.ceil(dataLength / BLOCK)
  const out = new Uint8Array(BLOCK * (dataBlocks + 2))
  writeUstarBlock(out.subarray(0, BLOCK), {
    name: paxHeaderName(path),
    prefix: "",
    typeflag: "x",
    size: dataLength,
    mode: 0o644,
    uid: 0,
    gid: 0,
    mtime: 0,
    linkname: "",
    uname: "",
    gname: "",
    devMajor: 0,
    devMinor: 0
  })
  let offset = BLOCK
  for (const record of records) {
    out.set(record, offset)
    offset += record.length
  }
  writeUstarBlock(out.subarray(BLOCK * (dataBlocks + 1)), ustar)
  return out
}

/**
 * Creates a channel that encodes entries into tar archive bytes.
 *
 * **Details**
 *
 * Each entry is written as a USTAR header, with the path split into the USTAR
 * prefix and name fields when it is longer than 100 bytes. A PAX extended
 * header is added only for what USTAR cannot hold: a long or non-ASCII path,
 * link target, user or group name, a size of 8 GiB or more, a uid or gid above
 * `2097151`, an mtime outside the USTAR range, or extra `pax` records. Records
 * in `header.pax` are written as given, except where a field that doesn't fit
 * replaces a record with the same key. Bodies are streamed through unbuffered,
 * and the archive ends with two zero blocks.
 *
 * **Gotchas**
 *
 * - A body that produces any byte count other than `header.size` fails with a
 *   `SizeMismatch` `TarError`, so the size must be known before the body is
 *   written.
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
> => encodeEntries()

// The input is generic over the entry type in `encode` so that body errors and
// services are inferred from unions of entries
const encodeEntries = <IE, Done, E, R>(): Channel.Channel<
  Arr.NonEmptyReadonlyArray<Uint8Array>,
  TarError | IE | E,
  Done,
  Arr.NonEmptyReadonlyArray<Entry<E, R>>,
  IE,
  Done,
  R
> =>
  Channel.fromTransform((upstream, scope) =>
    Effect.sync(() => {
      let entries: ReadonlyArray<Entry<E, R>> = []
      let index = 0
      let finished: { readonly value: Done } | undefined
      let current: {
        readonly pull: Pull.Pull<Arr.NonEmptyReadonlyArray<Uint8Array>, E, void, R>
        readonly scope: Scope.Closeable
        readonly header: Header
        written: number
      } | undefined

      const sizeMismatch = (header: Header, written: number) =>
        new TarError({
          kind: "SizeMismatch",
          message: `body of ${JSON.stringify(header.path)} has ${
            written > header.size ? "more than" : "only"
          } ${written} bytes, but its size is ${header.size}`
        })

      const pull: Pull.Pull<Arr.NonEmptyReadonlyArray<Uint8Array>, TarError | IE | E, Done, R> = Effect.gen(
        function*() {
          while (true) {
            if (finished !== undefined) return yield* Cause.done(finished.value)
            if (current !== undefined) {
              const body = current
              const chunks = yield* Pull.catchDone(body.pull, () => Effect.succeed(undefined))
              if (chunks !== undefined) {
                for (const chunk of chunks) body.written += chunk.length
                if (body.written > body.header.size) {
                  return yield* Effect.fail(sizeMismatch(body.header, body.written))
                }
                return chunks
              }
              current = undefined
              yield* Scope.close(body.scope, Exit.void)
              if (body.written !== body.header.size) {
                return yield* Effect.fail(sizeMismatch(body.header, body.written))
              }
              const pad = padding(body.header.size)
              if (pad > 0) return Arr.of(new Uint8Array(pad))
              continue
            }
            if (index < entries.length) {
              const entry = entries[index++]
              const blocks = yield* attempt(() => encodeHeader(entry.header))
              const bodyScope = Scope.forkUnsafe(scope)
              current = {
                pull: yield* Channel.toPullScoped(entry.body.channel, bodyScope),
                scope: bodyScope,
                header: entry.header,
                written: 0
              }
              return Arr.of(blocks)
            }
            const next = yield* Pull.catchDone(upstream, (value) => {
              finished = { value: value as Done }
              return Effect.succeed(undefined)
            })
            if (next === undefined) return Arr.of(new Uint8Array(BLOCK * 2))
            entries = next
            index = 0
          }
        }
      )
      return pull
    })
  )
