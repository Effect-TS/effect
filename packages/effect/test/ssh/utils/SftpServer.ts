/**
 * An in-memory SFTP version 3 server (draft-ietf-secsh-filexfer-02) used to
 * exercise the `Sftp` client without an external `sshd`.
 *
 * It behaves like OpenSSH's `sftp-server`: errors are reported through the
 * same errno-to-status mapping, `SYMLINK` takes the target before the link
 * path, `RENAME` refuses to replace existing targets, `MKDIR` reports existing
 * paths as a generic failure, and the `posix-rename@openssh.com`,
 * `hardlink@openssh.com`, `fsync@openssh.com`, `limits@openssh.com` and
 * `copy-data` extensions are available. The server runs as an unprivileged
 * user (uid/gid 1000 by default) and enforces POSIX permission bits.
 */
import * as Effect from "effect/Effect"
import { concat, fromUtf8, Reader, utf8, WireError, Writer } from "effect/ssh/internal/wire"
import * as Stream from "effect/Stream"
import type { ServerChannel } from "./TestServer.ts"

// -----------------------------------------------------------------------------
// Protocol constants
// -----------------------------------------------------------------------------

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

export const Status = {
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

const statusMessages = [
  "Success",
  "End of file",
  "No such file",
  "Permission denied",
  "Failure",
  "Bad message",
  "No connection",
  "Connection lost",
  "Operation unsupported"
]

export const S_IFMT = 0o170000
export const S_IFREG = 0o100000
export const S_IFDIR = 0o040000
export const S_IFLNK = 0o120000

const requestNames: Record<number, string> = {
  [FXP_OPEN]: "open",
  [FXP_CLOSE]: "close",
  [FXP_READ]: "read",
  [FXP_WRITE]: "write",
  [FXP_LSTAT]: "lstat",
  [FXP_FSTAT]: "fstat",
  [FXP_SETSTAT]: "setstat",
  [FXP_FSETSTAT]: "fsetstat",
  [FXP_OPENDIR]: "opendir",
  [FXP_READDIR]: "readdir",
  [FXP_REMOVE]: "remove",
  [FXP_MKDIR]: "mkdir",
  [FXP_RMDIR]: "rmdir",
  [FXP_REALPATH]: "realpath",
  [FXP_STAT]: "stat",
  [FXP_RENAME]: "rename",
  [FXP_READLINK]: "readlink",
  [FXP_SYMLINK]: "symlink"
}

/** Extensions advertised by default, as OpenSSH does. */
export const defaultExtensions: ReadonlyArray<string> = [
  "posix-rename@openssh.com",
  "hardlink@openssh.com",
  "fsync@openssh.com",
  "limits@openssh.com",
  "copy-data"
]

// -----------------------------------------------------------------------------
// In-memory file tree
// -----------------------------------------------------------------------------

interface NodeBase {
  /** Permission bits including the `S_IFMT` file type bits. */
  mode: number
  uid: number
  gid: number
  atime: number
  mtime: number
}

export interface FileNode extends NodeBase {
  readonly type: "file"
  /** Backing storage; only the first `size` bytes are file content. */
  buffer: Uint8Array
  size: number
}

export interface DirectoryNode extends NodeBase {
  readonly type: "directory"
  readonly children: Map<string, Node>
}

export interface SymlinkNode extends NodeBase {
  readonly type: "symlink"
  readonly target: string
}

export type Node = FileNode | DirectoryNode | SymlinkNode

/** Returns the content of a file node. */
export const contents = (node: FileNode): Uint8Array => node.buffer.slice(0, node.size)

type Errno =
  | "ENOENT"
  | "ENOTDIR"
  | "EBADF"
  | "ELOOP"
  | "EPERM"
  | "EACCES"
  | "EINVAL"
  | "EEXIST"
  | "EISDIR"
  | "ENOTEMPTY"
  | "EBUSY"

class SystemError extends Error {
  constructor(readonly errno: Errno) {
    super(errno)
  }
}

/** OpenSSH's `errno_to_portable`. */
const errnoToStatus = (errno: Errno): number => {
  switch (errno) {
    case "ENOENT":
    case "ENOTDIR":
    case "EBADF":
    case "ELOOP":
      return Status.NO_SUCH_FILE
    case "EPERM":
    case "EACCES":
      return Status.PERMISSION_DENIED
    case "EINVAL":
      return Status.BAD_MESSAGE
    default:
      return Status.FAILURE
  }
}

const fail = (errno: Errno): never => {
  throw new SystemError(errno)
}

const splitPath = (path: string) => path.split("/").filter((segment) => segment !== "")

interface Location {
  /** The directory containing the entry. */
  readonly parent: DirectoryNode
  /** Entry name in `parent` (empty for the root directory). */
  readonly name: string
  /** The entry, or `undefined` when only the final component is missing. */
  readonly node: Node | undefined
  /** Canonical absolute path of the entry. */
  readonly path: string
}

export interface NodeOptions {
  readonly mode?: number | undefined
  readonly uid?: number | undefined
  readonly gid?: number | undefined
  readonly atime?: number | undefined
  readonly mtime?: number | undefined
}

/**
 * The file tree served by an `SftpServer`. The helpers bypass permission
 * checks and create missing parent directories, so tests can seed and
 * inspect the tree directly. Relative paths are resolved against `home`.
 */
export interface MemoryFileSystem {
  readonly root: DirectoryNode
  readonly home: string
  readonly lookup: (path: string, options?: { readonly follow?: boolean | undefined }) => Node | undefined
  readonly exists: (path: string) => boolean
  readonly writeFile: (path: string, content: Uint8Array | string, options?: NodeOptions) => FileNode
  readonly makeDirectory: (path: string, options?: NodeOptions) => DirectoryNode
  readonly symlink: (target: string, path: string) => SymlinkNode
  readonly readFile: (path: string) => Uint8Array
  readonly readFileString: (path: string) => string
  readonly list: (path: string) => Array<string>
  readonly remove: (path: string) => void
}

const makeTree = (options: {
  readonly uid: number
  readonly gid: number
  readonly home: string
  readonly now: () => number
}) => {
  const now = options.now
  const directory = (mode: number, uid: number, gid: number): DirectoryNode => {
    const time = now()
    return {
      type: "directory",
      children: new Map(),
      mode: S_IFDIR | (mode & 0o7777),
      uid,
      gid,
      atime: time,
      mtime: time
    }
  }
  const root = directory(0o755, 0, 0)

  const absolute = (path: string) => path.startsWith("/") ? path : `${options.home}/${path}`

  const selfLocation = (stack: ReadonlyArray<DirectoryNode>, names: ReadonlyArray<string>): Location =>
    stack.length === 1
      ? { parent: root, name: "", node: root, path: "/" }
      : {
        parent: stack[stack.length - 2],
        name: names[names.length - 1],
        node: stack[stack.length - 1],
        path: "/" + names.join("/")
      }

  /**
   * Resolves a path like the kernel does: symbolic links in intermediate
   * components are always followed, the final component only when `follow`
   * is set. `searchable` decides whether a directory may be traversed.
   */
  const resolve = (
    path: string,
    follow: boolean,
    searchable: (directory: DirectoryNode) => boolean = () => true
  ): Location => {
    if (path === "") return fail("ENOENT")
    let components = splitPath(absolute(path))
    let stack: Array<DirectoryNode> = [root]
    let names: Array<string> = []
    let links = 0
    for (let i = 0; i < components.length; i++) {
      const name = components[i]
      const last = i === components.length - 1
      if (name === "." || name === "..") {
        if (name === ".." && stack.length > 1) {
          stack.pop()
          names.pop()
        }
        if (last) return selfLocation(stack, names)
        continue
      }
      const current = stack[stack.length - 1]
      if (!searchable(current)) return fail("EACCES")
      const node = current.children.get(name)
      if (node === undefined) {
        if (last) return { parent: current, name, node: undefined, path: "/" + [...names, name].join("/") }
        return fail("ENOENT")
      }
      if (node.type === "symlink" && (!last || follow)) {
        if (++links > 40) return fail("ELOOP")
        if (node.target.startsWith("/")) {
          stack = [root]
          names = []
        }
        components = [...splitPath(node.target), ...components.slice(i + 1)]
        if (components.length === 0) return selfLocation(stack, names)
        i = -1
        continue
      }
      if (last) return { parent: current, name, node, path: "/" + [...names, name].join("/") }
      if (node.type !== "directory") return fail("ENOTDIR")
      stack.push(node)
      names.push(name)
    }
    return selfLocation(stack, names)
  }

  const lookup: MemoryFileSystem["lookup"] = (path, lookupOptions) => {
    try {
      return resolve(path, lookupOptions?.follow ?? true).node
    } catch {
      return undefined
    }
  }

  const ensureParent = (path: string): Location => {
    const segments = splitPath(absolute(path))
    const name = segments.pop()
    if (name === undefined) return fail("EEXIST")
    let current = root
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      let next = current.children.get(segment)
      if (next === undefined) {
        next = directory(0o755, options.uid, options.gid)
        current.children.set(segment, next)
      }
      if (next.type === "symlink") {
        const target = resolve(`/${segments.slice(0, i + 1).join("/")}`, true).node
        if (target === undefined) return fail("ENOENT")
        next = target
      }
      if (next.type !== "directory") return fail("ENOTDIR")
      current = next
    }
    return { parent: current, name, node: current.children.get(name), path: "/" + [...segments, name].join("/") }
  }

  const apply = <A extends Node>(node: A, nodeOptions: NodeOptions | undefined): A => {
    if (nodeOptions?.mode !== undefined) node.mode = (node.mode & S_IFMT) | (nodeOptions.mode & 0o7777)
    if (nodeOptions?.uid !== undefined) node.uid = nodeOptions.uid
    if (nodeOptions?.gid !== undefined) node.gid = nodeOptions.gid
    if (nodeOptions?.atime !== undefined) node.atime = nodeOptions.atime
    if (nodeOptions?.mtime !== undefined) node.mtime = nodeOptions.mtime
    return node
  }

  const newFile = (mode: number, content: Uint8Array = new Uint8Array(0)): FileNode => {
    const time = now()
    return {
      type: "file",
      buffer: content.slice(),
      size: content.length,
      mode: S_IFREG | (mode & 0o7777),
      uid: options.uid,
      gid: options.gid,
      atime: time,
      mtime: time
    }
  }

  const newSymlink = (target: string): SymlinkNode => {
    const time = now()
    return {
      type: "symlink",
      target,
      mode: S_IFLNK | 0o777,
      uid: options.uid,
      gid: options.gid,
      atime: time,
      mtime: time
    }
  }

  const fs: MemoryFileSystem = {
    root,
    home: options.home,
    lookup,
    exists: (path) => lookup(path, { follow: false }) !== undefined,
    writeFile: (path, content, nodeOptions) => {
      const location = ensureParent(path)
      const node = newFile(0o644, typeof content === "string" ? utf8(content) : content)
      location.parent.children.set(location.name, node)
      return apply(node, nodeOptions)
    },
    makeDirectory: (path, nodeOptions) => {
      const existing = lookup(path)
      if (existing?.type === "directory") return apply(existing, nodeOptions)
      const location = ensureParent(path)
      const node = directory(0o755, options.uid, options.gid)
      location.parent.children.set(location.name, node)
      return apply(node, nodeOptions)
    },
    symlink: (target, path) => {
      const location = ensureParent(path)
      const node = newSymlink(target)
      location.parent.children.set(location.name, node)
      return node
    },
    readFile: (path) => {
      const node = lookup(path)
      if (node?.type !== "file") throw new Error(`not a file: ${path}`)
      return contents(node)
    },
    readFileString: (path) => fromUtf8(fs.readFile(path)),
    list: (path) => {
      const node = lookup(path)
      if (node?.type !== "directory") throw new Error(`not a directory: ${path}`)
      return [...node.children.keys()].sort()
    },
    remove: (path) => {
      const location = resolve(path, false)
      location.parent.children.delete(location.name)
    }
  }

  fs.makeDirectory("/home", { uid: 0, gid: 0 })
  fs.makeDirectory(options.home)
  fs.makeDirectory("/tmp", { mode: 0o1777, uid: 0, gid: 0 })

  return { fs, resolve, newFile, newSymlink, directory }
}

// -----------------------------------------------------------------------------
// Server
// -----------------------------------------------------------------------------

export interface SftpServerOptions {
  /** Extensions advertised in the VERSION reply (defaults to `defaultExtensions`). */
  readonly extensions?: ReadonlyArray<string> | undefined
  /** Reported by `limits@openssh.com` and enforced by clamping READ lengths. */
  readonly maxReadLength?: number | undefined
  /** Reported by `limits@openssh.com`. */
  readonly maxWriteLength?: number | undefined
  readonly maxPacketLength?: number | undefined
  readonly maxOpenHandles?: number | undefined
  /**
   * Limits the number of bytes returned by a READ request to simulate short
   * reads. Receives the requested offset and (clamped) length.
   */
  readonly shortRead?: ((offset: number, length: number) => number) | undefined
  /** Maximum number of entries returned per READDIR response (OpenSSH: 100). */
  readonly readdirBatchSize?: number | undefined
  /**
   * Sends the responses to the requests contained in one channel data chunk
   * in reverse order.
   */
  readonly reorderResponses?: boolean | undefined
  /** Splits outgoing data into channel writes of at most this many bytes. */
  readonly responseChunkSize?: number | undefined
  readonly uid?: number | undefined
  readonly gid?: number | undefined
  readonly user?: string | undefined
  readonly home?: string | undefined
  readonly umask?: number | undefined
  /** Current time in seconds. */
  readonly now?: (() => number) | undefined
}

export interface SftpServerStats {
  /** Names of the requests received, in order (`extended:<name>` for extensions). */
  readonly requests: Array<string>
  /** Largest length requested by a READ. */
  largestRead: number
  /** Largest payload received by a WRITE. */
  largestWrite: number
  /** Number of sessions that completed INIT. */
  sessions: number
  /** Version sent by the client in INIT. */
  clientVersion: number | undefined
}

export interface SftpServer {
  readonly fs: MemoryFileSystem
  readonly stats: SftpServerStats
  /** Number of currently open handles. */
  readonly openHandles: () => number
  /** Runs the SFTP protocol on a channel until the client sends EOF. */
  readonly serve: (channel: ServerChannel) => Effect.Effect<void>
  /** `onSession` handler for `TestServer` serving the `sftp` subsystem. */
  readonly onSession: (
    channel: ServerChannel,
    start: { readonly type: string; readonly value: string }
  ) => Effect.Effect<void>
}

type Handle =
  | {
    readonly kind: "file"
    readonly node: Node
    readonly path: string
    readonly readable: boolean
    readonly writable: boolean
    readonly append: boolean
  }
  | {
    readonly kind: "directory"
    readonly node: DirectoryNode
    readonly path: string
    readonly entries: Array<readonly [string, Node]>
  }

interface ClientAttributes {
  size?: bigint
  uid?: number
  gid?: number
  permissions?: number
  atime?: number
  mtime?: number
}

const readAttributes = (reader: Reader): ClientAttributes => {
  const flags = reader.uint32()
  const attributes: ClientAttributes = {}
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
    for (let i = 0; i < count; i++) {
      reader.string()
      reader.string()
    }
  }
  return attributes
}

const nodeSize = (node: Node) =>
  node.type === "file" ? node.size : node.type === "symlink" ? utf8(node.target).length : 4096

const writeAttributes = (writer: Writer, node: Node): Writer =>
  writer
    .uint32(ATTR_SIZE | ATTR_UIDGID | ATTR_PERMISSIONS | ATTR_ACMODTIME)
    .uint64(BigInt(nodeSize(node)))
    .uint32(node.uid)
    .uint32(node.gid)
    .uint32(node.mode)
    .uint32(node.atime)
    .uint32(node.mtime)

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** An `ls -l` style line, like OpenSSH's `ls_file`. */
const longName = (name: string, node: Node, user: (id: number) => string) => {
  const type = node.type === "directory" ? "d" : node.type === "symlink" ? "l" : "-"
  let bits = ""
  for (let shift = 6; shift >= 0; shift -= 3) {
    const triple = (node.mode >> shift) & 7
    bits += (triple & 4 ? "r" : "-") + (triple & 2 ? "w" : "-") + (triple & 1 ? "x" : "-")
  }
  const date = new Date(node.mtime * 1000)
  const when = `${months[date.getUTCMonth()]} ${String(date.getUTCDate()).padStart(2, " ")} ${
    String(date.getUTCHours()).padStart(2, "0")
  }:${String(date.getUTCMinutes()).padStart(2, "0")}`
  return `${type}${bits}    1 ${user(node.uid).padEnd(8)} ${user(node.gid).padEnd(8)} ${
    String(nodeSize(node)).padStart(8)
  } ${when} ${name}`
}

export const make = (options: SftpServerOptions = {}): SftpServer => {
  const uid = options.uid ?? 1000
  const gid = options.gid ?? 1000
  const user = options.user ?? "tester"
  const home = options.home ?? `/home/${user}`
  const umask = options.umask ?? 0o022
  const now = options.now ?? (() => Math.floor(Date.now() / 1000))
  const extensions = options.extensions ?? defaultExtensions
  const maxPacketLength = options.maxPacketLength ?? 256 * 1024
  const maxReadLength = options.maxReadLength ?? maxPacketLength - 1024
  const maxWriteLength = options.maxWriteLength ?? maxPacketLength - 1024
  const maxOpenHandles = options.maxOpenHandles ?? 512
  const readdirBatchSize = options.readdirBatchSize ?? 100

  const tree = makeTree({ uid, gid, home, now })
  const { fs, resolve } = tree
  const userName = (id: number) => id === 0 ? "root" : id === uid ? user : String(id)

  const stats: SftpServerStats = {
    requests: [],
    largestRead: 0,
    largestWrite: 0,
    sessions: 0,
    clientVersion: undefined
  }

  // Permissions ------------------------------------------------------------------

  const can = (node: Node, bit: 4 | 2 | 1) => {
    if (uid === 0) return true
    const mode = node.mode
    if (node.uid === uid) return ((mode >> 6) & bit) !== 0
    if (node.gid === gid) return ((mode >> 3) & bit) !== 0
    return (mode & bit) !== 0
  }
  const searchable = (directory: DirectoryNode) => can(directory, 1)
  const locate = (path: string, follow: boolean) => resolve(path, follow, searchable)
  const existing = (path: string, follow: boolean): Location & { readonly node: Node } => {
    const location = locate(path, follow)
    if (location.node === undefined) return fail("ENOENT")
    return location as Location & { readonly node: Node }
  }
  const requireWritableParent = (location: Location) => {
    if (!can(location.parent, 2)) fail("EACCES")
  }
  /** Sticky directories only allow owners to remove or rename entries. */
  const requireDeletable = (location: Location) => {
    requireWritableParent(location)
    if (
      uid !== 0 && (location.parent.mode & 0o1000) !== 0 && location.node !== undefined &&
      location.node.uid !== uid && location.parent.uid !== uid
    ) {
      fail("EPERM")
    }
  }
  const requireOwner = (node: Node) => {
    if (uid !== 0 && node.uid !== uid) fail("EPERM")
  }
  const touch = (node: Node) => {
    node.mtime = now()
  }

  // File content ---------------------------------------------------------------

  const resize = (node: FileNode, size: number) => {
    if (size > node.buffer.length) {
      let capacity = Math.max(node.buffer.length * 2, 1024)
      while (capacity < size) capacity *= 2
      const buffer = new Uint8Array(capacity)
      buffer.set(node.buffer.subarray(0, node.size))
      node.buffer = buffer
    } else if (size < node.size) {
      node.buffer.fill(0, size, node.size)
    }
    node.size = size
  }

  const writeData = (node: FileNode, offset: number, data: Uint8Array) => {
    const end = offset + data.length
    if (end > node.size) resize(node, end)
    node.buffer.set(data, offset)
    touch(node)
  }

  const truncate = (node: Node, size: bigint) => {
    if (node.type === "directory") return fail("EISDIR")
    if (node.type !== "file") return fail("EINVAL")
    resize(node, Number(size))
    touch(node)
  }

  // Tree operations --------------------------------------------------------------

  const unlink = (location: Location) => {
    location.parent.children.delete(location.name)
    touch(location.parent)
  }

  const link = (location: Location, node: Node) => {
    location.parent.children.set(location.name, node)
    touch(location.parent)
  }

  /** `rename(2)`: replaces compatible targets. */
  const posixRename = (from: string, to: string) => {
    const source = existing(from, false)
    if (source.node === fs.root) return fail("EBUSY")
    const target = locate(to, false)
    requireDeletable(source)
    requireDeletable(target)
    if (target.node === source.node) return
    if (source.node.type === "directory") {
      if (target.path === source.path || target.path.startsWith(source.path + "/")) return fail("EINVAL")
      if (target.node !== undefined) {
        if (target.node.type !== "directory") return fail("ENOTDIR")
        if (target.node.children.size > 0) return fail("ENOTEMPTY")
      }
    } else if (target.node?.type === "directory") {
      return fail("EISDIR")
    }
    unlink(source)
    link(target, source.node)
  }

  const setAttributes = (node: Node, attributes: ClientAttributes, truncateAllowed: () => void) => {
    // Like OpenSSH, every requested change is attempted and the last failure
    // is reported.
    let error: SystemError | undefined
    const attempt = (f: () => void) => {
      try {
        f()
      } catch (cause) {
        if (cause instanceof SystemError) error = cause
        else throw cause
      }
    }
    if (attributes.size !== undefined) {
      const size = attributes.size
      attempt(() => {
        truncateAllowed()
        truncate(node, size)
      })
    }
    if (attributes.permissions !== undefined) {
      const permissions = attributes.permissions
      attempt(() => {
        requireOwner(node)
        node.mode = (node.mode & S_IFMT) | (permissions & 0o7777)
      })
    }
    if (attributes.atime !== undefined && attributes.mtime !== undefined) {
      const { atime, mtime } = attributes
      attempt(() => {
        requireOwner(node)
        node.atime = atime
        node.mtime = mtime
      })
    }
    if (attributes.uid !== undefined && attributes.gid !== undefined) {
      const { gid: newGid, uid: newUid } = attributes
      attempt(() => {
        if (uid !== 0 && (node.uid !== uid || newUid !== node.uid)) fail("EPERM")
        node.uid = newUid
        node.gid = newGid
      })
    }
    if (error !== undefined) throw error
  }

  /** OpenSSH's realpath: the final component does not need to exist. */
  const realPath = (path: string) => {
    const location = locate(path === "" ? "." : path, true)
    return location.path
  }

  // Sessions -----------------------------------------------------------------------

  const handles = new Map<number, Handle>()
  let nextHandle = 0

  const serve = (channel: ServerChannel): Effect.Effect<void> => {
    const sessionHandles = new Set<number>()

    const allocate = (handle: Handle) => {
      if (handles.size >= maxOpenHandles) return fail("EBUSY")
      const id = nextHandle++
      handles.set(id, handle)
      sessionHandles.add(id)
      return new Writer(8).uint32(id).finish()
    }
    const lookupHandle = (reader: Reader): [number, Handle] | undefined => {
      const raw = reader.string()
      if (raw.length !== 4) return undefined
      const id = new Reader(raw).uint32()
      const handle = handles.get(id)
      return handle === undefined || !sessionHandles.has(id) ? undefined : [id, handle]
    }
    const fileHandle = (reader: Reader) => {
      const found = lookupHandle(reader)
      return found !== undefined && found[1].kind === "file" ? found[1] : undefined
    }

    const status = (id: number, code: number, message?: string) =>
      new Writer().byte(FXP_STATUS).uint32(id).uint32(code).string(message ?? statusMessages[code] ?? "Unknown").string(
        ""
      )
    const ok = (id: number) => status(id, Status.OK)
    const name = (id: number, entries: ReadonlyArray<readonly [string, string, Node | undefined]>) => {
      const writer = new Writer().byte(FXP_NAME).uint32(id).uint32(entries.length)
      for (const [filename, longname, node] of entries) {
        writer.string(filename).string(longname)
        if (node === undefined) writer.uint32(0)
        else writeAttributes(writer, node)
      }
      return writer
    }
    const attrs = (id: number, node: Node) => writeAttributes(new Writer().byte(FXP_ATTRS).uint32(id), node)

    const open = (id: number, reader: Reader): Writer => {
      const path = reader.utf8()
      const pflags = reader.uint32()
      const attributes = readAttributes(reader)
      const readable = (pflags & FXF_READ) !== 0 || (pflags & FXF_WRITE) === 0
      const writable = (pflags & FXF_WRITE) !== 0
      const append = (pflags & FXF_APPEND) !== 0
      const create = (pflags & FXF_CREAT) !== 0
      const exclusive = create && (pflags & FXF_EXCL) !== 0
      // O_CREAT | O_EXCL never follows a final symbolic link.
      const location = locate(path, !exclusive)
      let node = location.node
      if (node !== undefined) {
        if (exclusive) return fail("EEXIST")
        if (node.type === "directory" && writable) return fail("EISDIR")
        if (readable && !can(node, 4)) return fail("EACCES")
        if (writable && !can(node, 2)) return fail("EACCES")
        if (node.type === "file" && writable && (pflags & FXF_TRUNC) !== 0) truncate(node, BigInt(0))
      } else {
        if (!create) return fail("ENOENT")
        requireWritableParent(location)
        const mode = (attributes.permissions ?? 0o666) & ~umask
        node = tree.newFile(mode)
        link(location, node)
      }
      return new Writer().byte(FXP_HANDLE).uint32(id).string(
        allocate({ kind: "file", node, path, readable, writable, append })
      )
    }

    const read = (id: number, reader: Reader): Writer => {
      const handle = fileHandle(reader)
      const offset = Number(reader.uint64())
      const requested = reader.uint32()
      if (handle === undefined) return status(id, Status.FAILURE)
      stats.largestRead = Math.max(stats.largestRead, requested)
      if (handle.node.type === "directory") return fail("EISDIR")
      if (!handle.readable || handle.node.type !== "file") return fail("EBADF")
      const node = handle.node
      let length = Math.min(requested, maxReadLength)
      if (options.shortRead !== undefined) length = Math.max(1, Math.min(length, options.shortRead(offset, length)))
      if (offset >= node.size || length === 0) return status(id, Status.EOF)
      const data = node.buffer.subarray(offset, Math.min(node.size, offset + length))
      return new Writer(data.length + 16).byte(FXP_DATA).uint32(id).string(data)
    }

    const write = (id: number, reader: Reader): Writer => {
      const handle = fileHandle(reader)
      const offset = Number(reader.uint64())
      const data = reader.string()
      if (handle === undefined) return status(id, Status.FAILURE)
      stats.largestWrite = Math.max(stats.largestWrite, data.length)
      if (!handle.writable || handle.node.type !== "file") return fail("EBADF")
      writeData(handle.node, handle.append ? handle.node.size : offset, data)
      return ok(id)
    }

    const readdir = (id: number, reader: Reader): Writer => {
      const found = lookupHandle(reader)
      if (found === undefined || found[1].kind !== "directory") return status(id, Status.FAILURE)
      const handle = found[1]
      if (handle.entries.length === 0) return status(id, Status.EOF)
      const batch = handle.entries.splice(0, readdirBatchSize)
      return name(id, batch.map(([filename, node]) => [filename, longName(filename, node, userName), node]))
    }

    const extended = (id: number, reader: Reader): Writer => {
      const request = reader.utf8()
      stats.requests.push(`extended:${request}`)
      if (!extensions.includes(request)) return status(id, Status.OP_UNSUPPORTED)
      switch (request) {
        case "posix-rename@openssh.com": {
          const from = reader.utf8()
          posixRename(from, reader.utf8())
          return ok(id)
        }
        case "hardlink@openssh.com": {
          const source = existing(reader.utf8(), false)
          const target = locate(reader.utf8(), false)
          if (source.node.type === "directory") return fail("EPERM")
          if (target.node !== undefined) return fail("EEXIST")
          requireWritableParent(target)
          link(target, source.node)
          return ok(id)
        }
        case "fsync@openssh.com": {
          return fileHandle(reader) === undefined ? status(id, Status.FAILURE) : ok(id)
        }
        case "limits@openssh.com": {
          return new Writer()
            .byte(FXP_EXTENDED_REPLY)
            .uint32(id)
            .uint64(BigInt(maxPacketLength))
            .uint64(BigInt(maxReadLength))
            .uint64(BigInt(maxWriteLength))
            .uint64(BigInt(Math.max(0, maxOpenHandles - handles.size)))
        }
        case "copy-data": {
          const readHandle = lookupHandle(reader)
          const readOffset = Number(reader.uint64())
          const readLength = Number(reader.uint64())
          const writeHandle = lookupHandle(reader)
          const writeOffset = Number(reader.uint64())
          if (readHandle === undefined || writeHandle === undefined) return status(id, Status.FAILURE)
          if (readHandle[0] === writeHandle[0]) return status(id, Status.FAILURE)
          const source = readHandle[1]
          const target = writeHandle[1]
          if (source.kind !== "file" || target.kind !== "file") return status(id, Status.FAILURE)
          if (source.node.type !== "file" || !source.readable) return status(id, Status.PERMISSION_DENIED)
          if (target.node.type !== "file" || !target.writable) return status(id, Status.PERMISSION_DENIED)
          if (target.append) return status(id, Status.FAILURE)
          const end = readLength === 0 ? source.node.size : Math.min(source.node.size, readOffset + readLength)
          if (readOffset < end) writeData(target.node, writeOffset, source.node.buffer.slice(readOffset, end))
          return ok(id)
        }
      }
      return status(id, Status.OP_UNSUPPORTED)
    }

    const dispatch = (type: number, id: number, reader: Reader): Writer => {
      const requestName = requestNames[type]
      if (requestName !== undefined) stats.requests.push(requestName)
      switch (type) {
        case FXP_OPEN:
          return open(id, reader)
        case FXP_CLOSE: {
          const found = lookupHandle(reader)
          if (found === undefined) return status(id, Status.FAILURE)
          handles.delete(found[0])
          sessionHandles.delete(found[0])
          return ok(id)
        }
        case FXP_READ:
          return read(id, reader)
        case FXP_WRITE:
          return write(id, reader)
        case FXP_STAT:
          return attrs(id, existing(reader.utf8(), true).node)
        case FXP_LSTAT:
          return attrs(id, existing(reader.utf8(), false).node)
        case FXP_FSTAT: {
          const found = lookupHandle(reader)
          return found === undefined ? status(id, Status.FAILURE) : attrs(id, found[1].node)
        }
        case FXP_SETSTAT: {
          const path = reader.utf8()
          const attributes = readAttributes(reader)
          const node = existing(path, true).node
          setAttributes(node, attributes, () => {
            if (!can(node, 2)) fail("EACCES")
          })
          return ok(id)
        }
        case FXP_FSETSTAT: {
          const handle = fileHandle(reader)
          const attributes = readAttributes(reader)
          if (handle === undefined) return status(id, Status.FAILURE)
          setAttributes(handle.node, attributes, () => {
            if (!handle.writable) fail("EINVAL")
          })
          return ok(id)
        }
        case FXP_OPENDIR: {
          const path = reader.utf8()
          const location = existing(path, true)
          const node = location.node
          if (node.type !== "directory") return fail("ENOTDIR")
          if (!can(node, 4)) return fail("EACCES")
          const entries: Array<readonly [string, Node]> = [
            [".", node],
            ["..", location.parent],
            ...[...node.children.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
          ]
          return new Writer().byte(FXP_HANDLE).uint32(id).string(allocate({ kind: "directory", node, path, entries }))
        }
        case FXP_READDIR:
          return readdir(id, reader)
        case FXP_REMOVE: {
          const location = existing(reader.utf8(), false)
          if (location.node.type === "directory") return fail("EISDIR")
          requireDeletable(location)
          unlink(location)
          return ok(id)
        }
        case FXP_MKDIR: {
          const path = reader.utf8()
          const attributes = readAttributes(reader)
          const location = locate(path, false)
          if (location.node !== undefined) return fail("EEXIST")
          requireWritableParent(location)
          const directory = tree.directory((attributes.permissions ?? 0o777) & ~umask, uid, gid)
          link(location, directory)
          return ok(id)
        }
        case FXP_RMDIR: {
          const location = existing(reader.utf8(), false)
          if (location.node === fs.root) return fail("EBUSY")
          if (location.node.type !== "directory") return fail("ENOTDIR")
          if (location.node.children.size > 0) return fail("ENOTEMPTY")
          requireDeletable(location)
          unlink(location)
          return ok(id)
        }
        case FXP_REALPATH: {
          const resolved = realPath(reader.utf8())
          return name(id, [[resolved, resolved, undefined]])
        }
        case FXP_RENAME: {
          const from = reader.utf8()
          const to = reader.utf8()
          const source = existing(from, false)
          if (source.node.type === "file") {
            // OpenSSH links the new name and unlinks the old one, so existing
            // targets are never replaced.
            const target = locate(to, false)
            if (target.node !== undefined) return fail("EEXIST")
            requireWritableParent(target)
            requireDeletable(source)
            link(target, source.node)
            unlink(source)
            return ok(id)
          }
          let targetExists = false
          try {
            targetExists = locate(to, true).node !== undefined
          } catch {
            targetExists = false
          }
          if (targetExists) return status(id, Status.FAILURE)
          posixRename(from, to)
          return ok(id)
        }
        case FXP_READLINK: {
          const node = existing(reader.utf8(), false).node
          if (node.type !== "symlink") return fail("EINVAL")
          return name(id, [[node.target, node.target, undefined]])
        }
        case FXP_SYMLINK: {
          // OpenSSH order: target first, then the link path.
          const target = reader.utf8()
          const location = locate(reader.utf8(), false)
          if (location.node !== undefined) return fail("EEXIST")
          requireWritableParent(location)
          link(location, tree.newSymlink(target))
          return ok(id)
        }
        case FXP_EXTENDED:
          return extended(id, reader)
        default:
          stats.requests.push(`unknown:${type}`)
          return status(id, Status.OP_UNSUPPORTED)
      }
    }

    const handlePacket = (packet: Uint8Array): Uint8Array | undefined => {
      const type = packet[0]
      const reader = new Reader(packet, 1)
      if (type === FXP_INIT) {
        stats.clientVersion = reader.uint32()
        stats.sessions++
        const writer = new Writer().byte(FXP_VERSION).uint32(3)
        for (const extension of extensions) writer.string(extension).string("1")
        return writer.finish()
      }
      if (packet.length < 5) return undefined
      const id = reader.uint32()
      try {
        return dispatch(type, id, reader).finish()
      } catch (cause) {
        if (cause instanceof SystemError) return status(id, errnoToStatus(cause.errno)).finish()
        if (cause instanceof WireError) return status(id, Status.BAD_MESSAGE).finish()
        throw cause
      }
    }

    const frame = (payload: Uint8Array) => {
      const out = new Uint8Array(payload.length + 4)
      new DataView(out.buffer).setUint32(0, payload.length)
      out.set(payload, 4)
      return out
    }

    let buffer: Uint8Array = new Uint8Array(0)
    const onChunk = (chunk: Uint8Array) =>
      Effect.suspend(() => {
        buffer = buffer.length === 0 ? chunk : concat([buffer, chunk])
        const responses: Array<Uint8Array> = []
        while (buffer.length >= 4) {
          const length = new DataView(buffer.buffer, buffer.byteOffset, 4).getUint32(0)
          if (buffer.length < 4 + length) break
          const packet = buffer.subarray(4, 4 + length)
          buffer = buffer.subarray(4 + length)
          if (length === 0) continue
          const response = handlePacket(packet)
          if (response !== undefined) responses.push(frame(response))
        }
        if (responses.length === 0) return Effect.void
        if (options.reorderResponses === true) responses.reverse()
        const out = concat(responses)
        const size = options.responseChunkSize
        if (size === undefined) return channel.write(out)
        const parts: Array<Uint8Array> = []
        for (let start = 0; start < out.length; start += size) parts.push(out.subarray(start, start + size))
        return Effect.forEach(parts, (part) => channel.write(part), { discard: true })
      })

    return Stream.runForEach(Stream.fromQueue(channel.input), onChunk).pipe(
      Effect.ensuring(Effect.sync(() => {
        for (const id of sessionHandles) handles.delete(id)
        sessionHandles.clear()
      })),
      Effect.andThen(channel.close)
    )
  }

  return {
    fs,
    stats,
    openHandles: () => handles.size,
    serve,
    onSession: (channel, start) =>
      start.type === "subsystem" && start.value === "sftp"
        ? serve(channel)
        : Effect.andThen(channel.exit(127), channel.close)
  }
}
