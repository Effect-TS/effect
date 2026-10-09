/**
 * An SFTP (version 3) client running over an SSH `sftp` subsystem channel.
 *
 * Requests are pipelined: many requests can be in flight at once and
 * `readFile`, `writeFile`, and `stream` keep several reads or writes
 * outstanding to hide round-trip latency. OpenSSH extensions are used when
 * the server advertises them (`posix-rename@openssh.com`,
 * `hardlink@openssh.com`, `fsync@openssh.com`, `limits@openssh.com`,
 * `copy-data`).
 *
 * `fileSystem` and `layerFileSystem` expose the remote file system as an
 * Effect `FileSystem`, so code written against `FileSystem` can operate on a
 * remote host.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as ByteSize from "../ByteSize.ts"
import * as Cause from "../Cause.ts"
import * as Context from "../Context.ts"
import * as Deferred from "../Deferred.ts"
import * as Effect from "../Effect.ts"
import * as Fiber from "../Fiber.ts"
import * as FileSystem from "../FileSystem.ts"
import * as Layer from "../Layer.ts"
import * as Option from "../Option.ts"
import * as PlatformError from "../PlatformError.ts"
import * as Predicate from "../Predicate.ts"
import * as Queue from "../Queue.ts"
import * as Random from "../Random.ts"
import type * as Scope from "../Scope.ts"
import * as Sink from "../Sink.ts"
import * as Stream from "../Stream.ts"
import * as Glob from "./internal/glob.ts"
import { concat, Reader, WireError, Writer } from "./internal/wire.ts"
import * as Ssh from "./Ssh.ts"
import { SshChannelError, SshError, SshProtocolError, SshSftpError } from "./SshError.ts"

/**
 * Type identifier attached to `Sftp` values.
 *
 * @stability experimental
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId = "~effect/ssh/Sftp"

const FXP_INIT = 1
const FXP_VERSION = 2
const FXP_OPEN = 3
const FXP_CLOSE = 4
const FXP_READ = 5
const FXP_WRITE = 6
const FXP_LSTAT = 7
const FXP_FSTAT = 8
const FXP_SETSTAT = 9
const FXP_FSETSTAT = 10
const FXP_OPENDIR = 11
const FXP_READDIR = 12
const FXP_REMOVE = 13
const FXP_MKDIR = 14
const FXP_RMDIR = 15
const FXP_REALPATH = 16
const FXP_STAT = 17
const FXP_RENAME = 18
const FXP_READLINK = 19
const FXP_SYMLINK = 20
const FXP_STATUS = 101
const FXP_HANDLE = 102
const FXP_DATA = 103
const FXP_NAME = 104
const FXP_ATTRS = 105
const FXP_EXTENDED = 200
const FXP_EXTENDED_REPLY = 201

const FXF_READ = 0x01
const FXF_WRITE = 0x02
const FXF_APPEND = 0x04
const FXF_CREAT = 0x08
const FXF_TRUNC = 0x10
const FXF_EXCL = 0x20

const ATTR_SIZE = 0x01
const ATTR_UIDGID = 0x02
const ATTR_PERMISSIONS = 0x04
const ATTR_ACMODTIME = 0x08
const ATTR_EXTENDED = 0x80000000

/**
 * SFTP status codes.
 *
 * @stability experimental
 * @category constants
 * @since 4.0.0
 */
export const StatusCode = {
  OK: 0,
  EOF: 1,
  NO_SUCH_FILE: 2,
  PERMISSION_DENIED: 3,
  FAILURE: 4,
  BAD_MESSAGE: 5,
  NO_CONNECTION: 6,
  CONNECTION_LOST: 7,
  OP_UNSUPPORTED: 8
} as const

const S_IFMT = 0o170000

/**
 * File attributes as transferred by SFTP version 3. Absent members were not
 * reported by the server or are not being changed.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Attributes {
  readonly size?: bigint | undefined
  readonly uid?: number | undefined
  readonly gid?: number | undefined
  readonly permissions?: number | undefined
  readonly atime?: number | undefined
  readonly mtime?: number | undefined
  readonly extended?: ReadonlyArray<readonly [type: string, data: string]> | undefined
}

/**
 * A directory entry returned by `readDirectory`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface DirectoryEntry {
  readonly filename: string
  readonly longname: string
  readonly attributes: Attributes
}

/**
 * An open remote file. Reads and writes take explicit offsets.
 *
 * **Details**
 *
 * `read` returns `None` at end of file and may return fewer bytes than
 * requested. The handle is closed when the scope that opened it closes.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface SftpFile {
  readonly path: string
  readonly read: (offset: bigint, length: number) => Effect.Effect<Option.Option<Uint8Array>, SshError>
  readonly write: (offset: bigint, data: Uint8Array) => Effect.Effect<void, SshError>
  readonly stat: Effect.Effect<Attributes, SshError>
  readonly setStat: (attributes: Attributes) => Effect.Effect<void, SshError>
  readonly sync: Effect.Effect<void, SshError>
}

/**
 * An SFTP session.
 *
 * **Details**
 *
 * `extensions` lists the extensions advertised by the server.
 * `maxReadLength` and `maxWriteLength` are the chunk sizes used for reads and
 * writes. `rename` fails if the target exists unless `overwrite` is set,
 * which requires `posix-rename@openssh.com`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Sftp {
  readonly [TypeId]: typeof TypeId
  readonly version: number
  readonly extensions: ReadonlyMap<string, string>
  readonly maxReadLength: number
  readonly maxWriteLength: number
  readonly open: (
    path: string,
    options?: {
      readonly flag?: FileSystem.OpenFlag | undefined
      readonly mode?: number | undefined
    }
  ) => Effect.Effect<SftpFile, SshError, Scope.Scope>
  readonly stat: (path: string) => Effect.Effect<Attributes, SshError>
  readonly lstat: (path: string) => Effect.Effect<Attributes, SshError>
  readonly setStat: (path: string, attributes: Attributes) => Effect.Effect<void, SshError>
  readonly readDirectory: (path: string) => Effect.Effect<Array<DirectoryEntry>, SshError>
  readonly makeDirectory: (
    path: string,
    options?: { readonly mode?: number | undefined }
  ) => Effect.Effect<void, SshError>
  readonly removeDirectory: (path: string) => Effect.Effect<void, SshError>
  readonly remove: (path: string) => Effect.Effect<void, SshError>
  readonly rename: (
    oldPath: string,
    newPath: string,
    options?: { readonly overwrite?: boolean | undefined }
  ) => Effect.Effect<void, SshError>
  readonly readLink: (path: string) => Effect.Effect<string, SshError>
  readonly symlink: (target: string, path: string) => Effect.Effect<void, SshError>
  readonly hardLink: (existingPath: string, newPath: string) => Effect.Effect<void, SshError>
  readonly realPath: (path: string) => Effect.Effect<string, SshError>
  readonly readFile: (path: string) => Effect.Effect<Uint8Array, SshError>
  readonly writeFile: (
    path: string,
    data: Uint8Array,
    options?: {
      readonly flag?: FileSystem.OpenFlag | undefined
      readonly mode?: number | undefined
    }
  ) => Effect.Effect<void, SshError>
  readonly copyFile: (fromPath: string, toPath: string) => Effect.Effect<void, SshError>
  readonly stream: (
    path: string,
    options?: {
      readonly offset?: bigint | undefined
      readonly bytesToRead?: bigint | undefined
      readonly chunkSize?: number | undefined
    }
  ) => Stream.Stream<Uint8Array, SshError>
  readonly extended: (request: string, data?: Uint8Array) => Effect.Effect<Uint8Array, SshError>
}

/**
 * Service tag for an SFTP session.
 *
 * @stability experimental
 * @category services
 * @since 4.0.0
 */
export const Sftp: Context.Service<Sftp, Sftp> = Context.Service<Sftp>("effect/ssh/Sftp")

/**
 * Returns `true` when a value is an `Sftp` session.
 *
 * @stability experimental
 * @category guards
 * @since 4.0.0
 */
export const isSftp = (u: unknown): u is Sftp => Predicate.hasProperty(u, TypeId)

const statusMessages: Record<number, string> = {
  0: "OK",
  1: "End of file",
  2: "No such file",
  3: "Permission denied",
  4: "Failure",
  5: "Bad message",
  6: "No connection",
  7: "Connection lost",
  8: "Operation unsupported"
}

const sftpError = (code: number, description: string, method: string, path?: string) =>
  new SshError({
    reason: new SshSftpError({ code, description: description || statusMessages[code] || "Unknown", method, path })
  })

const protocolError = (description: string, cause?: unknown) =>
  new SshError({ reason: new SshProtocolError({ description, cause }) })

const writeAttributes = (writer: Writer, attributes: Attributes | undefined): Writer => {
  if (attributes === undefined) return writer.uint32(0)
  let flags = 0
  if (attributes.size !== undefined) flags |= ATTR_SIZE
  if (attributes.uid !== undefined && attributes.gid !== undefined) flags |= ATTR_UIDGID
  if (attributes.permissions !== undefined) flags |= ATTR_PERMISSIONS
  if (attributes.atime !== undefined && attributes.mtime !== undefined) flags |= ATTR_ACMODTIME
  if (attributes.extended !== undefined && attributes.extended.length > 0) flags |= ATTR_EXTENDED
  writer.uint32(flags)
  if (flags & ATTR_SIZE) writer.uint64(attributes.size!)
  if (flags & ATTR_UIDGID) writer.uint32(attributes.uid!).uint32(attributes.gid!)
  if (flags & ATTR_PERMISSIONS) writer.uint32(attributes.permissions!)
  if (flags & ATTR_ACMODTIME) writer.uint32(attributes.atime!).uint32(attributes.mtime!)
  if (flags & ATTR_EXTENDED) {
    writer.uint32(attributes.extended!.length)
    for (const [type, data] of attributes.extended!) writer.string(type).string(data)
  }
  return writer
}

const readAttributes = (reader: Reader): Attributes => {
  const flags = reader.uint32()
  const attributes: {
    size?: bigint
    uid?: number
    gid?: number
    permissions?: number
    atime?: number
    mtime?: number
    extended?: Array<readonly [string, string]>
  } = {}
  if (flags & ATTR_SIZE) attributes.size = reader.uint64()
  if (flags & ATTR_UIDGID) {
    attributes.uid = reader.uint32()
    attributes.gid = reader.uint32()
  }
  if (flags & ATTR_PERMISSIONS) attributes.permissions = reader.uint32()
  if (flags & ATTR_ACMODTIME) {
    attributes.atime = reader.uint32()
    attributes.mtime = reader.uint32()
  }
  if (flags & ATTR_EXTENDED) {
    const count = reader.uint32()
    attributes.extended = []
    for (let i = 0; i < count; i++) attributes.extended.push([reader.utf8(), reader.utf8()])
  }
  return attributes
}

const openFlags = (flag: FileSystem.OpenFlag): number => {
  switch (flag) {
    case "r":
      return FXF_READ
    case "r+":
      return FXF_READ | FXF_WRITE
    case "w":
      return FXF_WRITE | FXF_CREAT | FXF_TRUNC
    case "wx":
      return FXF_WRITE | FXF_CREAT | FXF_TRUNC | FXF_EXCL
    case "w+":
      return FXF_READ | FXF_WRITE | FXF_CREAT | FXF_TRUNC
    case "wx+":
      return FXF_READ | FXF_WRITE | FXF_CREAT | FXF_TRUNC | FXF_EXCL
    case "a":
      return FXF_WRITE | FXF_CREAT | FXF_APPEND
    case "ax":
      return FXF_WRITE | FXF_CREAT | FXF_APPEND | FXF_EXCL
    case "a+":
      return FXF_READ | FXF_WRITE | FXF_CREAT | FXF_APPEND
    case "ax+":
      return FXF_READ | FXF_WRITE | FXF_CREAT | FXF_APPEND | FXF_EXCL
  }
}

interface Response {
  readonly type: number
  readonly reader: Reader
}

const PIPELINE = 32

/**
 * Starts an SFTP session on a channel already running the `sftp` subsystem.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const fromChannel = Effect.fnUntraced(function*(
  channel: Ssh.SshStream
): Effect.fn.Return<Sftp, SshError, Scope.Scope> {
  const pending = new Map<number, Deferred.Deferred<Response, SshError>>()
  const versionReply = Deferred.makeUnsafe<Response, SshError>()
  let nextId = 0
  let failure: SshError | undefined

  const fail = (error: SshError) => {
    if (failure !== undefined) return
    failure = error
    Deferred.doneUnsafe(versionReply, Effect.fail(error))
    for (const deferred of pending.values()) Deferred.doneUnsafe(deferred, Effect.fail(error))
    pending.clear()
  }

  let buffer: Uint8Array = new Uint8Array(0)
  const onData = (chunk: Uint8Array) => {
    buffer = buffer.length === 0 ? chunk : concat([buffer, chunk])
    while (buffer.length >= 4) {
      const length = new DataView(buffer.buffer, buffer.byteOffset, 4).getUint32(0)
      if (length === 0 || length > 1024 * 1024) {
        throw new WireError(`invalid SFTP packet length ${length}`)
      }
      if (buffer.length < 4 + length) break
      const packet = buffer.subarray(4, 4 + length)
      buffer = buffer.subarray(4 + length)
      const reader = new Reader(packet, 1)
      const type = packet[0]
      if (type === FXP_VERSION) {
        Deferred.doneUnsafe(versionReply, Effect.succeed({ type, reader }))
        continue
      }
      const id = reader.uint32()
      const deferred = pending.get(id)
      if (deferred === undefined) throw new WireError(`unexpected SFTP response id ${id}`)
      pending.delete(id)
      Deferred.doneUnsafe(deferred, Effect.succeed({ type, reader }))
    }
  }

  yield* Stream.runForEach(channel.stdout, (chunk) =>
    Effect.try({
      try: () => onData(chunk),
      catch: (cause) => protocolError(cause instanceof WireError ? cause.message : "malformed SFTP packet", cause)
    })).pipe(
      Effect.andThen(
        Effect.fail(new SshError({ reason: new SshChannelError({ description: "SFTP channel closed" }) }))
      ),
      Effect.catch((error) => Effect.sync(() => fail(error))),
      Effect.forkScoped
    )

  const packet = (type: number, id: number | undefined, body: Writer | undefined): Uint8Array => {
    const content = body?.finish() ?? new Uint8Array(0)
    const writer = new Writer(content.length + 9).uint32(content.length + (id === undefined ? 1 : 5)).byte(type)
    if (id !== undefined) writer.uint32(id)
    return writer.raw(content).finish()
  }

  // Requests are written by a single fiber in the order their ids were
  // allocated. Servers process requests in order, which matters for handles
  // opened with APPEND, where write offsets are ignored.
  const outbox = yield* Queue.unbounded<Uint8Array>()
  yield* Effect.forever(
    Effect.flatMap(Queue.takeAll(outbox), (packets) => channel.write(concat(packets)))
  ).pipe(
    Effect.catch((error) => Effect.sync(() => fail(error))),
    Effect.forkScoped
  )
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => fail(new SshError({ reason: new SshChannelError({ description: "SFTP session closed" }) })))
  )

  const request = (type: number, body?: Writer): Effect.Effect<Response, SshError> =>
    Effect.suspend(() => {
      if (failure !== undefined) return Effect.fail(failure)
      const id = nextId
      nextId = (nextId + 1) >>> 0
      const deferred = Deferred.makeUnsafe<Response, SshError>()
      pending.set(id, deferred)
      Queue.offerUnsafe(outbox, packet(type, id, body))
      return Deferred.await(deferred)
    })

  /**
   * Handles a response, turning malformed replies into protocol errors.
   */
  const respond = <A>(
    response: Effect.Effect<Response, SshError>,
    f: (response: Response) => Effect.Effect<A, SshError>
  ): Effect.Effect<A, SshError> =>
    Effect.flatMap(response, (value) =>
      Effect.suspend(() => f(value)).pipe(
        Effect.catchDefect((cause) => Effect.fail(protocolError("malformed SFTP response", cause)))
      ))

  const decode = <A>(method: string, f: () => A): Effect.Effect<A, SshError> =>
    Effect.try({ try: f, catch: (cause) => protocolError(`malformed ${method} response`, cause) })

  const status = (response: Response, method: string, path?: string): Effect.Effect<never, SshError> =>
    response.type === FXP_STATUS
      ? Effect.flatMap(
        decode(method, () => ({ code: response.reader.uint32(), message: response.reader.utf8() })),
        ({ code, message }) => Effect.fail(sftpError(code, message, method, path))
      )
      : Effect.fail(protocolError(`unexpected SFTP response ${response.type} to ${method}`))

  const expectOk = (method: string, path?: string) => (response: Response): Effect.Effect<void, SshError> => {
    if (response.type === FXP_STATUS) {
      const code = response.reader.uint32()
      if (code === StatusCode.OK) return Effect.void
      return Effect.fail(sftpError(code, response.reader.utf8(), method, path))
    }
    return status(response, method, path)
  }

  const expect =
    <A>(type: number, method: string, path: string | undefined, f: (reader: Reader) => A) =>
    (response: Response): Effect.Effect<A, SshError> =>
      response.type === type ? decode(method, () => f(response.reader)) : status(response, method, path)

  yield* channel.write(packet(FXP_INIT, undefined, new Writer().uint32(3)))
  const version = yield* Deferred.await(versionReply)
  const { extensions, versionNumber } = yield* decode("version", () => {
    const versionNumber = version.reader.uint32()
    const extensions = new Map<string, string>()
    while (version.reader.remaining > 0) extensions.set(version.reader.utf8(), version.reader.utf8())
    return { versionNumber, extensions }
  })

  const extended = (name: string, data?: Uint8Array): Effect.Effect<Uint8Array, SshError> =>
    respond(
      request(FXP_EXTENDED, new Writer().string(name).raw(data ?? new Uint8Array(0))),
      (response) => {
        if (response.type === FXP_EXTENDED_REPLY) return Effect.succeed(response.reader.rest())
        if (response.type === FXP_STATUS) {
          const code = response.reader.uint32()
          if (code === StatusCode.OK) return Effect.succeed(new Uint8Array(0))
          return Effect.fail(sftpError(code, response.reader.utf8(), name))
        }
        return status(response, name)
      }
    )

  const unsupported = (name: string, method: string, path?: string) =>
    Effect.fail(sftpError(StatusCode.OP_UNSUPPORTED, `the server does not support ${name}`, method, path))

  let maxReadLength = 32 * 1024
  let maxWriteLength = 32 * 1024
  if (extensions.has("limits@openssh.com")) {
    const limits = yield* Effect.flatMap(extended("limits@openssh.com"), (data) =>
      decode("limits", () => {
        const reader = new Reader(data)
        return { packet: reader.uint64(), read: reader.uint64(), write: reader.uint64() }
      }))
    const cap = (value: bigint) => value > BigInt(0) ? Math.min(Number(value), 255 * 1024) : 32 * 1024
    maxReadLength = cap(limits.read)
    maxWriteLength = cap(limits.write)
  }

  const closeHandle = (handle: Uint8Array, method: string, path: string) =>
    respond(request(FXP_CLOSE, new Writer().string(handle)), expectOk(method, path))

  const openHandle = (path: string, flags: number, attributes: Attributes | undefined) =>
    Effect.acquireRelease(
      respond(
        request(FXP_OPEN, writeAttributes(new Writer().string(path).uint32(flags), attributes)),
        expect(FXP_HANDLE, "open", path, (reader) => reader.string())
      ),
      (handle) => Effect.ignore(closeHandle(handle, "close", path))
    )

  const readHandle = (handle: Uint8Array, path: string, offset: bigint, length: number) =>
    respond(
      request(FXP_READ, new Writer().string(handle).uint64(offset).uint32(length)),
      (response): Effect.Effect<Option.Option<Uint8Array>, SshError> => {
        if (response.type === FXP_DATA) return Effect.succeed(Option.some(response.reader.string()))
        if (response.type === FXP_STATUS) {
          const code = response.reader.uint32()
          if (code === StatusCode.EOF) return Effect.succeed(Option.none())
          return Effect.fail(sftpError(code, response.reader.utf8(), "read", path))
        }
        return status(response, "read", path)
      }
    )

  /**
   * Reads exactly `length` bytes unless end of file is reached first.
   */
  const readFully = (handle: Uint8Array, path: string, offset: bigint, length: number) =>
    Effect.gen(function*() {
      const chunks: Array<Uint8Array> = []
      let received = 0
      while (received < length) {
        const chunk = yield* readHandle(handle, path, offset + BigInt(received), length - received)
        if (Option.isNone(chunk) || chunk.value.length === 0) break
        chunks.push(chunk.value)
        received += chunk.value.length
      }
      return chunks.length === 1 ? chunks[0] : concat(chunks)
    })

  const writeHandle = (handle: Uint8Array, path: string, offset: bigint, data: Uint8Array) => {
    if (data.length <= maxWriteLength) {
      return respond(
        request(FXP_WRITE, new Writer(data.length + 64).string(handle).uint64(offset).string(data)),
        expectOk("write", path)
      )
    }
    const parts: Array<readonly [bigint, Uint8Array]> = []
    for (let start = 0; start < data.length; start += maxWriteLength) {
      parts.push([offset + BigInt(start), data.subarray(start, start + maxWriteLength)])
    }
    return Effect.forEach(
      parts,
      ([partOffset, part]) =>
        respond(
          request(FXP_WRITE, new Writer(part.length + 64).string(handle).uint64(partOffset).string(part)),
          expectOk("write", path)
        ),
      { concurrency: PIPELINE, discard: true }
    )
  }

  const fstat = (handle: Uint8Array, path: string) =>
    respond(request(FXP_FSTAT, new Writer().string(handle)), expect(FXP_ATTRS, "fstat", path, readAttributes))

  const pathRequest = (type: number, path: string) => request(type, new Writer().string(path))

  const stat = (path: string) => respond(pathRequest(FXP_STAT, path), expect(FXP_ATTRS, "stat", path, readAttributes))

  const lstat = (path: string) =>
    respond(pathRequest(FXP_LSTAT, path), expect(FXP_ATTRS, "lstat", path, readAttributes))

  const nameReply = (method: string, path: string) =>
    expect(FXP_NAME, method, path, (reader) => {
      const count = reader.uint32()
      const entries: Array<DirectoryEntry> = []
      for (let i = 0; i < count; i++) {
        entries.push({ filename: reader.utf8(), longname: reader.utf8(), attributes: readAttributes(reader) })
      }
      return entries
    })

  const readDirectory = (path: string) =>
    Effect.scoped(Effect.gen(function*() {
      const handle = yield* Effect.acquireRelease(
        respond(
          pathRequest(FXP_OPENDIR, path),
          expect(FXP_HANDLE, "opendir", path, (reader) => reader.string())
        ),
        (handle) => Effect.ignore(closeHandle(handle, "closedir", path))
      )
      const entries: Array<DirectoryEntry> = []
      while (true) {
        const response = yield* request(FXP_READDIR, new Writer().string(handle))
        if (response.type === FXP_STATUS) {
          const code = response.reader.uint32()
          if (code === StatusCode.EOF) return entries
          return yield* sftpError(code, response.reader.utf8(), "readdir", path)
        }
        entries.push(...(yield* nameReply("readdir", path)(response)))
      }
    }))

  const realPath = (path: string) =>
    respond(
      pathRequest(FXP_REALPATH, path),
      (response) =>
        Effect.flatMap(nameReply("realpath", path)(response), (entries) =>
          entries.length > 0
            ? Effect.succeed(entries[0].filename)
            : Effect.fail(protocolError("empty realpath response")))
    )

  const readLink = (path: string) =>
    respond(
      pathRequest(FXP_READLINK, path),
      (response) =>
        Effect.flatMap(nameReply("readlink", path)(response), (entries) =>
          entries.length > 0
            ? Effect.succeed(entries[0].filename)
            : Effect.fail(protocolError("empty readlink response")))
    )

  const open: Sftp["open"] = (path, options) =>
    Effect.map(
      openHandle(
        path,
        openFlags(options?.flag ?? "r"),
        options?.mode === undefined ? undefined : { permissions: options.mode }
      ),
      (handle): SftpFile => ({
        path,
        read: (offset, length) => readHandle(handle, path, offset, Math.min(length, maxReadLength)),
        write: (offset, data) => writeHandle(handle, path, offset, data),
        stat: fstat(handle, path),
        setStat: (attributes) =>
          respond(
            request(FXP_FSETSTAT, writeAttributes(new Writer().string(handle), attributes)),
            expectOk("fsetstat", path)
          ),
        sync: extensions.has("fsync@openssh.com")
          ? Effect.asVoid(extended("fsync@openssh.com", new Writer().string(handle).finish()))
          : Effect.void
      })
    )

  const readFile = (path: string) =>
    Effect.scoped(Effect.gen(function*() {
      const handle = yield* openHandle(path, FXF_READ, undefined)
      const attributes = yield* fstat(handle, path)
      const chunks: Array<Uint8Array> = []
      let offset = BigInt(0)
      if (attributes.size !== undefined && attributes.size > BigInt(0)) {
        const size = Number(attributes.size)
        const offsets: Array<number> = []
        for (let start = 0; start < size; start += maxReadLength) offsets.push(start)
        const parts = yield* Effect.forEach(
          offsets,
          (start) => readFully(handle, path, BigInt(start), Math.min(maxReadLength, size - start)),
          { concurrency: PIPELINE }
        )
        for (const part of parts) {
          chunks.push(part)
          offset += BigInt(part.length)
          if (part.length < maxReadLength && offset < BigInt(size)) break
        }
      }
      // Pick up data appended after the size was read, and files that report
      // no size.
      while (true) {
        const chunk = yield* readHandle(handle, path, offset, maxReadLength)
        if (Option.isNone(chunk) || chunk.value.length === 0) break
        chunks.push(chunk.value)
        offset += BigInt(chunk.value.length)
      }
      return concat(chunks)
    }))

  const writeFile: Sftp["writeFile"] = (path, data, options) =>
    Effect.scoped(Effect.gen(function*() {
      const flag = options?.flag ?? "w"
      const handle = yield* openHandle(
        path,
        openFlags(flag),
        options?.mode === undefined ? undefined : { permissions: options.mode }
      )
      yield* writeHandle(handle, path, BigInt(0), data)
    }))

  const sameFile = (fromPath: string, toPath: string) =>
    Effect.gen(function*() {
      const from = yield* realPath(fromPath)
      const to = yield* Effect.option(realPath(toPath))
      return to._tag === "Some" && to.value === from
    })

  const copyFile = (fromPath: string, toPath: string) =>
    Effect.scoped(Effect.gen(function*() {
      // Opening the target truncates it, which would destroy the source.
      if (yield* sameFile(fromPath, toPath)) return
      const source = yield* openHandle(fromPath, FXF_READ, undefined)
      const attributes = yield* fstat(source, fromPath)
      const target = yield* openHandle(
        toPath,
        FXF_WRITE | FXF_CREAT | FXF_TRUNC,
        attributes.permissions === undefined ? undefined : { permissions: attributes.permissions & 0o7777 }
      )
      if (extensions.has("copy-data")) {
        yield* extended(
          "copy-data",
          new Writer().string(source).uint64(BigInt(0)).uint64(BigInt(0)).string(target).uint64(BigInt(0)).finish()
        )
        return
      }
      let offset = BigInt(0)
      while (true) {
        const chunk = yield* readHandle(source, fromPath, offset, maxReadLength)
        if (Option.isNone(chunk) || chunk.value.length === 0) break
        yield* writeHandle(target, toPath, offset, chunk.value)
        offset += BigInt(chunk.value.length)
      }
    }))

  const stream: Sftp["stream"] = (path, options) =>
    Stream.unwrap(Effect.gen(function*() {
      const scope = yield* Effect.scope
      const handle = yield* openHandle(path, FXF_READ, undefined)
      const chunkSize = Math.min(options?.chunkSize ?? maxReadLength, maxReadLength)
      const end = options?.bytesToRead === undefined ? undefined : (options.offset ?? BigInt(0)) + options.bytesToRead
      let nextOffset = options?.offset ?? BigInt(0)
      let done = false
      const inFlight: Array<Fiber.Fiber<Uint8Array, SshError>> = []
      const canSchedule = () => !done && inFlight.length < PIPELINE && (end === undefined || nextOffset < end)
      const schedule = Effect.gen(function*() {
        while (canSchedule()) {
          const length = end === undefined ? chunkSize : Math.min(chunkSize, Number(end - nextOffset))
          inFlight.push(yield* Effect.forkIn(readFully(handle, path, nextOffset, length), scope))
          nextOffset += BigInt(length)
        }
      })
      const pull = Effect.gen(function*() {
        yield* schedule
        const fiber = inFlight.shift()
        if (fiber === undefined) return yield* Cause.done()
        const chunk = yield* Fiber.join(fiber)
        if (chunk.length === 0) {
          done = true
          for (const pendingFiber of inFlight.splice(0)) yield* Fiber.interrupt(pendingFiber)
          return yield* Cause.done()
        }
        return [chunk] as const
      })
      return Stream.fromPull(Effect.succeed(pull))
    }))

  const rename: Sftp["rename"] = (oldPath, newPath, options) => {
    if (options?.overwrite === true) {
      if (!extensions.has("posix-rename@openssh.com")) {
        return unsupported("posix-rename@openssh.com", "rename", oldPath)
      }
      return Effect.asVoid(
        extended("posix-rename@openssh.com", new Writer().string(oldPath).string(newPath).finish())
      )
    }
    return respond(
      request(FXP_RENAME, new Writer().string(oldPath).string(newPath)),
      expectOk("rename", oldPath)
    )
  }

  return {
    [TypeId]: TypeId,
    version: versionNumber,
    extensions,
    maxReadLength,
    maxWriteLength,
    open,
    stat,
    lstat,
    setStat: (path, attributes) =>
      respond(
        request(FXP_SETSTAT, writeAttributes(new Writer().string(path), attributes)),
        expectOk("setstat", path)
      ),
    readDirectory,
    makeDirectory: (path, options) =>
      respond(
        request(
          FXP_MKDIR,
          writeAttributes(
            new Writer().string(path),
            options?.mode === undefined ? undefined : { permissions: options.mode }
          )
        ),
        expectOk("mkdir", path)
      ),
    removeDirectory: (path) => respond(pathRequest(FXP_RMDIR, path), expectOk("rmdir", path)),
    remove: (path) => respond(pathRequest(FXP_REMOVE, path), expectOk("remove", path)),
    rename,
    readLink,
    // OpenSSH's sftp-server expects the target before the link path, the
    // reverse of the draft specification; other servers follow OpenSSH.
    symlink: (target, path) =>
      respond(request(FXP_SYMLINK, new Writer().string(target).string(path)), expectOk("symlink", path)),
    hardLink: (existingPath, newPath) =>
      extensions.has("hardlink@openssh.com")
        ? Effect.asVoid(extended("hardlink@openssh.com", new Writer().string(existingPath).string(newPath).finish()))
        : unsupported("hardlink@openssh.com", "link", existingPath),
    realPath,
    readFile,
    writeFile,
    copyFile,
    stream,
    extended
  }
})

/**
 * Opens an SFTP session on a new `sftp` subsystem channel.
 *
 * **Details**
 *
 * The channel, and with it the session, closes when the scope closes.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(
  ssh: Ssh.Ssh
): Effect.fn.Return<Sftp, SshError, Scope.Scope> {
  const channel = yield* ssh.subsystem("sftp")
  return yield* fromChannel(channel)
})

/**
 * Layer that opens an SFTP session over the context's `Ssh` service.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Sftp, SshError, Ssh.Ssh> = Layer.effect(
  Sftp,
  Effect.gen(function*() {
    return yield* make(yield* Ssh.Ssh)
  })
)

// -----------------------------------------------------------------------------
// FileSystem
// -----------------------------------------------------------------------------

const fileType = (permissions: number | undefined): FileSystem.File.Type => {
  switch ((permissions ?? 0) & S_IFMT) {
    case 0o100000:
      return "File"
    case 0o040000:
      return "Directory"
    case 0o120000:
      return "SymbolicLink"
    case 0o060000:
      return "BlockDevice"
    case 0o020000:
      return "CharacterDevice"
    case 0o010000:
      return "FIFO"
    case 0o140000:
      return "Socket"
    default:
      return "Unknown"
  }
}

const toInfo = (attributes: Attributes): FileSystem.File.Info => ({
  type: fileType(attributes.permissions),
  mtime: attributes.mtime === undefined ? Option.none() : Option.some(new Date(attributes.mtime * 1000)),
  atime: attributes.atime === undefined ? Option.none() : Option.some(new Date(attributes.atime * 1000)),
  birthtime: Option.none(),
  dev: 0,
  ino: Option.none(),
  mode: attributes.permissions ?? 0,
  nlink: Option.none(),
  uid: Option.fromNullishOr(attributes.uid),
  gid: Option.fromNullishOr(attributes.gid),
  rdev: Option.none(),
  size: ByteSize.bytes(attributes.size ?? BigInt(0)),
  blksize: Option.none(),
  blocks: Option.none()
})

const toSeconds = (time: Date | number) => Math.floor((typeof time === "number" ? time : time.getTime()) / 1000)

const joinPath = (directory: string, name: string) =>
  directory === "" || directory === "." ? name : directory.endsWith("/") ? directory + name : `${directory}/${name}`

const dirname = (path: string) => {
  const index = path.replace(/\/+$/, "").lastIndexOf("/")
  return index <= 0 ? (path.startsWith("/") ? "/" : ".") : path.slice(0, index)
}

/**
 * Exposes an SFTP session as an Effect `FileSystem`.
 *
 * **Details**
 *
 * Failures are reported as `PlatformError`s: missing paths as `NotFound`,
 * permission failures as `PermissionDenied`, and other SFTP failures as
 * `Unknown`. `rename` overwrites existing targets when the server supports
 * `posix-rename@openssh.com`, matching POSIX `rename`.
 *
 * **Gotchas**
 *
 * - `watch` is not supported and fails.
 * - `open` with `noFollow` checks for a symbolic link before opening, which
 *   is not atomic.
 * - `link` requires `hardlink@openssh.com`.
 * - Timestamps have one-second resolution.
 *
 * @stability experimental
 * @category file system
 * @since 4.0.0
 */
export const fileSystem = (sftp: Sftp): FileSystem.FileSystem => {
  const toPlatformError = (method: string, path?: string) => (error: SshError): PlatformError.PlatformError => {
    const reason = error.reason
    if (reason._tag === "SshSftpError") {
      if (reason.code === StatusCode.OP_UNSUPPORTED) {
        return PlatformError.badArgument({
          module: "FileSystem",
          method,
          description: reason.description,
          cause: error
        })
      }
      return PlatformError.systemError({
        _tag: reason.code === StatusCode.NO_SUCH_FILE
          ? "NotFound"
          : reason.code === StatusCode.PERMISSION_DENIED
          ? "PermissionDenied"
          : reason.code === StatusCode.EOF
          ? "UnexpectedEof"
          : "Unknown",
        module: "FileSystem",
        method,
        description: reason.description,
        pathOrDescriptor: path ?? reason.path,
        cause: error
      })
    }
    return PlatformError.systemError({
      _tag: "Unknown",
      module: "FileSystem",
      method,
      description: error.message,
      pathOrDescriptor: path,
      cause: error
    })
  }
  const lift = (method: string, path?: string) => <A, R>(effect: Effect.Effect<A, SshError, R>) =>
    Effect.mapError(effect, toPlatformError(method, path))
  const liftAny =
    (method: string, path?: string) => <A, R>(effect: Effect.Effect<A, SshError | PlatformError.PlatformError, R>) =>
      Effect.mapError(
        effect,
        (error) => PlatformError.isPlatformError(error) ? error : toPlatformError(method, path)(error)
      )

  const statOption = (path: string, follow = true) =>
    (follow ? sftp.stat(path) : sftp.lstat(path)).pipe(
      Effect.map(Option.some),
      Effect.catchReason("SshError", "SshSftpError", (reason, error) =>
        reason.code === StatusCode.NO_SUCH_FILE ? Effect.succeed(Option.none<Attributes>()) : Effect.fail(error))
    )

  const alreadyExists = (method: string, path: string) =>
    PlatformError.systemError({
      _tag: "AlreadyExists",
      module: "FileSystem",
      method,
      description: "file already exists",
      pathOrDescriptor: path
    })

  const makeDirectory: FileSystem.FileSystem["makeDirectory"] = (path, options) =>
    Effect.gen(function*() {
      const mode = options?.mode
      const recursive = options?.recursive === true
      if (recursive) {
        const existing = yield* statOption(path)
        if (Option.isSome(existing)) {
          if (fileType(existing.value.permissions) === "Directory") return
          return yield* alreadyExists("makeDirectory", path)
        }
        const parent = dirname(path)
        if (parent !== path) yield* makeDirectory(parent, { recursive: true, mode })
      }
      const created = yield* sftp.makeDirectory(path, { mode }).pipe(
        Effect.as(true),
        Effect.catchReason("SshError", "SshSftpError", (reason, error) =>
          reason.code === StatusCode.FAILURE ? Effect.succeed(false) : Effect.fail(error))
      )
      if (created) {
        return
      }
      // Servers report an existing path as a generic failure.
      const existing = yield* statOption(path)
      if (Option.isNone(existing)) {
        return yield* sftpError(StatusCode.FAILURE, "", "mkdir", path)
      }
      if (recursive && fileType(existing.value.permissions) === "Directory") {
        return
      }
      return yield* alreadyExists("makeDirectory", path)
    }).pipe(liftAny("makeDirectory", path))

  const removeRecursive = (path: string): Effect.Effect<void, SshError> =>
    Effect.gen(function*() {
      const attributes = yield* sftp.lstat(path)
      if (fileType(attributes.permissions) !== "Directory") return yield* sftp.remove(path)
      const entries = yield* sftp.readDirectory(path)
      yield* Effect.forEach(
        entries.filter((entry) => entry.filename !== "." && entry.filename !== ".."),
        (entry) => removeRecursive(joinPath(path, entry.filename)),
        { concurrency: 8, discard: true }
      )
      yield* sftp.removeDirectory(path)
    })

  const remove: FileSystem.FileSystem["remove"] = (path, options) =>
    Effect.gen(function*() {
      const attributes = yield* statOption(path, false)
      if (Option.isNone(attributes)) {
        if (options?.force === true) return
        return yield* sftpError(StatusCode.NO_SUCH_FILE, "", "remove", path)
      }
      if (fileType(attributes.value.permissions) === "Directory") {
        if (options?.recursive !== true) {
          return yield* PlatformError.systemError({
            _tag: "BadResource",
            module: "FileSystem",
            method: "remove",
            description: "path is a directory",
            pathOrDescriptor: path
          })
        }
        return yield* removeRecursive(path)
      }
      yield* sftp.remove(path)
    }).pipe(liftAny("remove", path))

  const listRecursive = (root: string, prefix: string, maxDepth: number): Effect.Effect<Array<string>, SshError> =>
    Effect.gen(function*() {
      const entries = yield* sftp.readDirectory(prefix === "" ? root : joinPath(root, prefix))
      const out: Array<string> = []
      for (const entry of entries) {
        if (entry.filename === "." || entry.filename === "..") continue
        const relative = prefix === "" ? entry.filename : `${prefix}/${entry.filename}`
        out.push(relative)
        const depth = relative.split("/").length
        if (depth < maxDepth && fileType(entry.attributes.permissions) === "Directory") {
          out.push(...(yield* listRecursive(root, relative, maxDepth)))
        }
      }
      return out
    })

  const randomPart = Effect.map(Random.nextIntBetween(0, 0xffffff), (n) => n.toString(16).padStart(6, "0"))
  const randomName = Effect.map(Effect.all([randomPart, randomPart]), (parts) => parts.join(""))

  const makeTempDirectory: FileSystem.FileSystem["makeTempDirectory"] = (options) =>
    Effect.gen(function*() {
      const directory = options?.directory ?? "/tmp"
      for (let attempt = 0; attempt < 8; attempt++) {
        const path = joinPath(directory, `${options?.prefix ?? ""}${yield* randomName}`)
        const created = yield* sftp.makeDirectory(path, { mode: 0o700 }).pipe(
          Effect.as(true),
          Effect.catchReason("SshError", "SshSftpError", (reason, error) =>
            reason.code === StatusCode.FAILURE ? Effect.succeed(false) : Effect.fail(error))
        )
        if (created) {
          return path
        }
      }
      return yield* sftpError(StatusCode.FAILURE, "could not create a unique temporary directory", "mkdtemp", directory)
    }).pipe(lift("makeTempDirectory"))

  const makeTempFile: FileSystem.FileSystem["makeTempFile"] = (options) =>
    Effect.gen(function*() {
      const directory = yield* makeTempDirectory(options)
      const path = joinPath(directory, `${yield* randomName}${options?.suffix ?? ""}`)
      yield* lift("makeTempFile", path)(sftp.writeFile(path, new Uint8Array(0), { flag: "wx" }))
      return path
    })

  const removeTemp = (path: string) => Effect.orDie(lift("remove", path)(removeRecursive(path)))

  const open: FileSystem.FileSystem["open"] = (path, options) =>
    Effect.gen(function*() {
      const flag = options?.flag ?? "r"
      if (options?.noFollow === true) {
        const attributes = yield* statOption(path, false)
        if (Option.isSome(attributes) && fileType(attributes.value.permissions) === "SymbolicLink") {
          return yield* PlatformError.systemError({
            _tag: "Unknown",
            module: "FileSystem",
            method: "open",
            description: "path is a symbolic link",
            pathOrDescriptor: path
          })
        }
      }
      const file = yield* sftp.open(path, { flag, mode: options?.mode })
      return makeFile(file, flag.startsWith("a"))
    }).pipe(liftAny("open", path))

  const makeFile = (file: SftpFile, append: boolean): FileSystem.File => {
    let position = BigInt(0)
    const negative = (method: string) =>
      PlatformError.badArgument({
        module: "FileSystem",
        method,
        description: "Cannot read before the start of the file"
      })
    const write = (buffer: Uint8Array) =>
      Effect.suspend(() => {
        const offset = position
        return Effect.map(lift("write", file.path)(file.write(offset, buffer)), () => {
          if (!append) position = offset + BigInt(buffer.length)
          return buffer.length
        })
      })
    return {
      [FileSystem.FileTypeId]: FileSystem.FileTypeId,
      stat: Effect.map(lift("stat", file.path)(file.stat), toInfo),
      sync: lift("sync", file.path)(file.sync),
      seek: (offset, from) =>
        Effect.suspend(() => {
          const next = from === "start" ? offset : position + offset
          if (next < BigInt(0)) {
            return Effect.fail(
              PlatformError.badArgument({
                module: "FileSystem",
                method: "seek",
                description: "Cannot seek before the start of the file"
              })
            )
          }
          position = next
          return Effect.succeed(next)
        }),
      read: (buffer, readOptions) =>
        Effect.suspend(() => {
          const explicit = readOptions?.position
          if (explicit !== undefined && explicit < BigInt(0)) return Effect.fail(negative("read"))
          const offset = explicit ?? position
          return Effect.map(lift("read", file.path)(file.read(offset, buffer.length)), (chunk) => {
            if (Option.isNone(chunk)) return 0
            buffer.set(chunk.value)
            if (explicit === undefined) position = offset + BigInt(chunk.value.length)
            return chunk.value.length
          })
        }),
      readAlloc: (size, readOptions) =>
        Effect.suspend(() => {
          const explicit = readOptions?.position
          if (explicit !== undefined && explicit < BigInt(0)) return Effect.fail(negative("readAlloc"))
          if (size === 0) return Effect.succeed(Option.none())
          const offset = explicit ?? position
          return Effect.map(lift("readAlloc", file.path)(file.read(offset, size)), (chunk) => {
            if (Option.isNone(chunk) || chunk.value.length === 0) return Option.none()
            if (explicit === undefined) position = offset + BigInt(chunk.value.length)
            return chunk
          })
        }),
      truncate: (length) =>
        Effect.map(lift("truncate", file.path)(file.setStat({ size: BigInt(length ?? 0) })), () => {
          if (!append && position > BigInt(length ?? 0)) position = BigInt(length ?? 0)
        }),
      write,
      writeAll: (buffer) => Effect.asVoid(write(buffer))
    }
  }

  const copyRecursive = (
    fromPath: string,
    toPath: string,
    options: { readonly overwrite: boolean; readonly preserveTimestamps: boolean }
  ): Effect.Effect<void, SshError | PlatformError.PlatformError> =>
    Effect.gen(function*() {
      const source = yield* sftp.lstat(fromPath)
      const type = fileType(source.permissions)
      const existing = yield* statOption(toPath, false)
      if (type === "Directory") {
        if (Option.isNone(existing)) {
          yield* sftp.makeDirectory(toPath, { mode: (source.permissions ?? 0o755) & 0o7777 })
        } else if (fileType(existing.value.permissions) !== "Directory" || !options.overwrite) {
          return yield* alreadyExists("copy", toPath)
        }
        const entries = yield* sftp.readDirectory(fromPath)
        for (const entry of entries) {
          if (entry.filename === "." || entry.filename === "..") continue
          yield* copyRecursive(joinPath(fromPath, entry.filename), joinPath(toPath, entry.filename), options)
        }
      } else {
        if (Option.isSome(existing)) {
          if (!options.overwrite) return yield* alreadyExists("copy", toPath)
          yield* sftp.remove(toPath)
        }
        if (type === "SymbolicLink") {
          yield* sftp.symlink(yield* sftp.readLink(fromPath), toPath)
          return
        }
        yield* sftp.copyFile(fromPath, toPath)
      }
      if (options.preserveTimestamps && source.atime !== undefined && source.mtime !== undefined) {
        yield* sftp.setStat(toPath, { atime: source.atime, mtime: source.mtime })
      }
    })

  const glob: FileSystem.FileSystem["glob"] = (pattern, options) =>
    Effect.gen(function*() {
      const root = options?.root ?? "."
      const matcher = Glob.toRegExp(pattern)
      const excludes = (options?.exclude ?? []).map(Glob.toRegExp)
      const plan = Glob.plan(pattern)
      const base = plan.base
      const baseExists = base === "" ? true : Option.isSome(yield* statOption(joinPath(root, base)))
      if (!baseExists) return []
      const listed = yield* listRecursive(
        base === "" ? root : joinPath(root, base),
        "",
        plan.maxDepth - base.split("/").filter(Boolean).length
      )
      const candidates = listed.map((path) => base === "" ? path : `${base}/${path}`)
      return candidates.filter((path) => matcher.test(path) && !excludes.some((exclude) => exclude.test(path)))
    }).pipe(lift("glob", pattern))

  const impl = FileSystem.make({
    access: (path, options) =>
      Effect.gen(function*() {
        yield* sftp.stat(path)
        if (options?.readable === true) yield* Effect.scoped(sftp.open(path, { flag: "r" }))
        if (options?.writable === true) yield* Effect.scoped(sftp.open(path, { flag: "r+" }))
      }).pipe(lift("access", path)),
    copy: (fromPath, toPath, options) =>
      Effect.gen(function*() {
        // Like Node's `cp`, refuse to copy onto the source or into itself.
        const from = yield* sftp.realPath(fromPath)
        const target = yield* Effect.option(sftp.realPath(toPath))
        const to = target._tag === "Some"
          ? target.value
          : joinPath(yield* sftp.realPath(dirname(toPath)), toPath.replace(/\/+$/, "").split("/").pop()!)
        if (to === from || to.startsWith(from.endsWith("/") ? from : `${from}/`)) {
          return yield* PlatformError.badArgument({
            module: "FileSystem",
            method: "copy",
            description: to === from
              ? "source and destination are the same"
              : "cannot copy a directory into itself"
          })
        }
        yield* copyRecursive(fromPath, toPath, {
          overwrite: options?.overwrite ?? false,
          preserveTimestamps: options?.preserveTimestamps ?? false
        })
      }).pipe(liftAny("copy", fromPath)),
    copyFile: (fromPath, toPath) => lift("copyFile", fromPath)(sftp.copyFile(fromPath, toPath)),
    chmod: (path, mode) => lift("chmod", path)(sftp.setStat(path, { permissions: mode })),
    chown: (path, uid, gid) => lift("chown", path)(sftp.setStat(path, { uid, gid })),
    glob,
    link: (fromPath, toPath) => lift("link", fromPath)(sftp.hardLink(fromPath, toPath)),
    makeDirectory,
    makeTempDirectory,
    makeTempDirectoryScoped: (options) => Effect.acquireRelease(makeTempDirectory(options), removeTemp),
    makeTempFile,
    makeTempFileScoped: (options) => Effect.acquireRelease(makeTempFile(options), (path) => removeTemp(dirname(path))),
    open,
    readDirectory: (path, options) =>
      lift("readDirectory", path)(
        options?.recursive === true
          ? listRecursive(path, "", Infinity)
          : Effect.map(
            sftp.readDirectory(path),
            (entries) =>
              entries.filter((entry) => entry.filename !== "." && entry.filename !== "..").map((entry) =>
                entry.filename
              )
          )
      ),
    readFile: (path) => lift("readFile", path)(sftp.readFile(path)),
    readLink: (path) => lift("readLink", path)(sftp.readLink(path)),
    realPath: (path) => lift("realPath", path)(sftp.realPath(path)),
    remove,
    rename: (oldPath, newPath) =>
      lift("rename", oldPath)(
        sftp.rename(oldPath, newPath, { overwrite: sftp.extensions.has("posix-rename@openssh.com") })
      ),
    stat: (path) => Effect.map(lift("stat", path)(sftp.stat(path)), toInfo),
    symlink: (fromPath, toPath) => lift("symlink", toPath)(sftp.symlink(fromPath, toPath)),
    truncate: (path, length) => lift("truncate", path)(sftp.setStat(path, { size: BigInt(length ?? 0) })),
    utimes: (path, atime, mtime) =>
      lift("utimes", path)(sftp.setStat(path, { atime: toSeconds(atime), mtime: toSeconds(mtime) })),
    watch: (path) =>
      Stream.fail(
        PlatformError.badArgument({
          module: "FileSystem",
          method: "watch",
          description: `watching is not supported over SFTP (${path})`
        })
      ),
    writeFile: (path, data, options) => lift("writeFile", path)(sftp.writeFile(path, data, options))
  })

  return FileSystem.FileSystem.of({
    ...impl,
    stream: (path, options) =>
      sftp.stream(path, {
        offset: options?.offset === undefined ? undefined : ByteSize.fromInputUnsafe(options.offset),
        bytesToRead: options?.bytesToRead === undefined ? undefined : ByteSize.fromInputUnsafe(options.bytesToRead),
        chunkSize: options?.chunkSize
      }).pipe(Stream.mapError(toPlatformError("stream", path))),
    sink: (path, options) =>
      Sink.unwrap(Effect.map(
        open(path, { flag: options?.flag ?? "w", mode: options?.mode }),
        (file) => Sink.forEach((chunk: Uint8Array) => file.writeAll(chunk))
      ))
  })
}

/**
 * Layer that provides a `FileSystem` backed by an SFTP session over the
 * context's `Ssh` service.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layerFileSystem: Layer.Layer<FileSystem.FileSystem, SshError, Ssh.Ssh> = Layer.effect(
  FileSystem.FileSystem,
  Effect.gen(function*() {
    return fileSystem(yield* make(yield* Ssh.Ssh))
  })
)
