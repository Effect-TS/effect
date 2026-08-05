import * as Brand from "../Brand.ts"
import type * as Cause from "../Cause.ts"
import * as Data from "../Data.ts"
import * as DateTime from "../DateTime.ts"
import * as Effect from "../Effect.ts"
import * as FileSystem from "../FileSystem.ts"
import * as HashMap from "../HashMap.ts"
import * as Layer from "../Layer.ts"
import * as Option from "../Option.ts"
import { badArgument, type PlatformError, systemError, type SystemErrorTag } from "../PlatformError.ts"
import * as Queue from "../Queue.ts"
import * as Semaphore from "../Semaphore.ts"
import * as Stream from "../Stream.ts"

const MAX_LINK_TRAVERSAL = 40
const DEFAULT_UID = 0
const DEFAULT_GID = 0
const FILE_MODE = 0o100644
const FILE_TYPE_MODE = 0o100000
const DIR_MODE = 0o40755
const DIR_TYPE_MODE = 0o040000
const LINK_MODE = 0o120777
const PERMISSION_MODE = 0o7777
const DIR_SELF_LINK_COUNT = 1
const DIR_LINK_COUNT = 2
const FIRST_INODE = 2
const FIRST_DESCRIPTOR = 3
const FIRST_TEMP = 1
const TEMP_DIR = "/tmp"

// =============================================================================
// models
// =============================================================================

type Inode = Brand.Branded<number, "MemoryFileSystemInode">

const Inode: Brand.Constructor<Inode> = Brand.nominal<Inode>()

const RootInode = Inode(1)

type FileDescriptor = Brand.Branded<number, "MemoryFileSystemFileDescriptor">

const FileDescriptor: Brand.Constructor<FileDescriptor> = Brand.nominal<FileDescriptor>()

interface InodeMetadata {
  readonly ino: Inode
  readonly mode: number
  readonly uid: number
  readonly gid: number
  readonly nlink: number
  readonly openCount: number
  readonly atime: DateTime.Utc
  readonly mtime: DateTime.Utc
  readonly ctime: DateTime.Utc
  readonly birthtime: DateTime.Utc
}

interface FileInode extends InodeMetadata {
  readonly _tag: "File"
  readonly data: Uint8Array
}

interface DirectoryInode extends InodeMetadata {
  readonly _tag: "Directory"
  readonly entries: HashMap.HashMap<string, Inode>
}

interface SymbolicLinkInode extends InodeMetadata {
  readonly _tag: "SymbolicLink"
  readonly target: string
}

type InodeEntry = FileInode | DirectoryInode | SymbolicLinkInode

const InodeEntry = Data.taggedEnum<InodeEntry>()

interface WatchSubscription {
  readonly path: string
  readonly recursive: boolean
  queue: Queue.Enqueue<FileSystem.WatchEvent, PlatformError | Cause.Done> | undefined
  readonly pending: Array<FileSystem.WatchEvent>
}

interface TransitionResult<A> {
  readonly state: State
  readonly value: A
  readonly events: ReadonlyArray<FileSystem.WatchEvent>
}

const transitionResult = <A>(
  state: State,
  value: A,
  events: ReadonlyArray<FileSystem.WatchEvent> = []
): TransitionResult<A> => ({ state, value, events })

interface State {
  readonly inodes: HashMap.HashMap<Inode, InodeEntry>
  readonly nextInode: number
  readonly descriptors: HashMap.HashMap<FileDescriptor, OpenFileDescriptor>
  readonly nextDescriptor: number
  readonly nextTemporary: number
}

interface Volume {
  readonly watchers: Set<WatchSubscription>
  readonly withState: <A, E, R>(
    use: (state: State) => Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E, R>
  readonly mutate: <A, E, R>(
    use: (state: State) => Effect.Effect<TransitionResult<A>, E, R>
  ) => Effect.Effect<A, E, R>
  readonly mutateInterruptibly: <A, E, R>(
    use: (state: State) => Effect.Effect<TransitionResult<A>, E, R>
  ) => Effect.Effect<A, E, R>
}

interface OpenFileDescriptor {
  readonly fd: FileDescriptor
  readonly inode: Inode
  readonly readable: boolean
  readonly writable: boolean
  readonly append: boolean
  readonly position: FileSystem.Size
}

interface ResolveOptions {
  readonly followFinalSymbolicLink?: boolean | undefined
  readonly method?: string | undefined
}

interface ResolvedInode {
  readonly inode: Inode
  readonly entry: InodeEntry
  readonly path: string
}

interface ResolvedEntry {
  readonly parent: DirectoryInode
  readonly name: string
  readonly entry: InodeEntry
  readonly path: string
}

interface CloneContext {
  readonly method: string
  readonly sourcePath: string
  readonly preserveTimestamps: boolean
}

// =============================================================================
// state
// =============================================================================

const fileSystemError = (options: {
  readonly _tag: SystemErrorTag
  readonly method: string
  readonly pathOrDescriptor?: string | number | undefined
  readonly description?: string | undefined
  readonly syscall?: string | undefined
  readonly cause?: unknown
}): PlatformError => systemError({ module: "FileSystem", ...options })

const invalidData = (method: string, path: string, description: string): PlatformError =>
  fileSystemError({ _tag: "InvalidData", method, pathOrDescriptor: path, description })

const alreadyExists = (method: string, path: string): PlatformError =>
  fileSystemError({ _tag: "AlreadyExists", method, pathOrDescriptor: path })

const permissionDenied = (method: string, path: string, description: string): PlatformError =>
  fileSystemError({ _tag: "PermissionDenied", method, pathOrDescriptor: path, description })

const badResource = (
  method: string,
  pathOrDescriptor: string | number,
  description?: string
): PlatformError => fileSystemError({ _tag: "BadResource", method, pathOrDescriptor, description })

const notFound = (method: string, path: string): PlatformError =>
  fileSystemError({ _tag: "NotFound", method, pathOrDescriptor: path })

const argumentError = (method: string, description: string): PlatformError =>
  badArgument({ module: "FileSystem", method, description })

const findInode = (state: State, inode: Inode): InodeEntry | undefined =>
  Option.getOrUndefined(HashMap.get(state.inodes, inode))

const findEntry = (directory: DirectoryInode, name: string): Inode | undefined =>
  Option.getOrUndefined(HashMap.get(directory.entries, name))

const setInode = (state: State, entry: InodeEntry): State => ({
  ...state,
  inodes: HashMap.set(state.inodes, entry.ino, entry)
})

const getInode = Effect.fnUntraced(function*(
  state: State,
  inode: Inode,
  method: string,
  path: string
) {
  const entry = findInode(state, inode)
  if (entry === undefined) {
    return yield* notFound(method, path)
  }
  return entry
})

const validateEntryName = Effect.fnUntraced(function*(
  method: string,
  name: string,
  pathOrDescriptor: string = name
) {
  const invalidName = name.length === 0 || name === "." || name === ".." || name.includes("/") || name.includes("\0")
  if (invalidName) {
    return yield* invalidData(method, pathOrDescriptor, "Invalid directory entry name")
  }
  return
})

const getDirectory = Effect.fnUntraced(function*(
  state: State,
  inode: Inode,
  method: string,
  path: string
) {
  const entry = yield* getInode(state, inode, method, path)
  if (entry._tag !== "Directory") {
    return yield* badResource(method, path)
  }
  return entry
})

const touchNamespaceMutation = (
  state: State,
  directory: DirectoryInode,
  target: InodeEntry,
  now: DateTime.Utc
): State => ({
  ...state,
  inodes: HashMap.set(
    HashMap.set(state.inodes, directory.ino, { ...directory, mtime: now, ctime: now }),
    target.ino,
    { ...target, ctime: now }
  )
})

const childPath = (parent: string, name: string): string => parent === "/" ? `/${name}` : `${parent}/${name}`

const includesWatchPath = (watchedPath: string, recursive: boolean, eventPath: string): boolean =>
  eventPath === watchedPath ||
  recursive && (watchedPath === "/" || eventPath.startsWith(`${watchedPath}/`)) ||
  (eventPath !== "/" && watchedPath.startsWith(`${eventPath}/`))

const publishWatchEvents = (
  watchers: Set<WatchSubscription>,
  events: ReadonlyArray<FileSystem.WatchEvent>
) =>
  Effect.sync(() => {
    for (const watcher of watchers) {
      for (const event of events) {
        if (includesWatchPath(watcher.path, watcher.recursive, event.path)) {
          if (watcher.queue === undefined) {
            watcher.pending.push(event)
          } else {
            Queue.offerUnsafe(watcher.queue, event)
          }
        }
      }
    }
  })

const collectInodePaths = (
  state: State,
  inode: Inode,
  directory: DirectoryInode,
  parent = "/"
): Array<string> => {
  const paths: Array<string> = []
  for (const [name, childInode] of directory.entries) {
    const path = childPath(parent, name)
    if (childInode === inode) paths.push(path)
    const child = findInode(state, childInode)
    if (child?._tag === "Directory") {
      paths.push(...collectInodePaths(state, inode, child, path))
    }
  }
  return paths
}

const inodeUpdateEvents = (
  state: State,
  inode: Inode
): ReadonlyArray<FileSystem.WatchEvent.Update> => {
  const root = findInode(state, RootInode)
  if (root?._tag !== "Directory") return []
  if (inode === RootInode) return [{ _tag: "Update", path: "/" }]
  // NOTE: An inode may be reachable through multiple hard-link aliases, each of
  // which must receive an update event.
  return collectInodePaths(state, inode, root)
    .sort()
    .map((path) => ({ _tag: "Update", path }))
}

const reclaimInode = (state: State, entry: InodeEntry): State =>
  entry.nlink === 0 && entry.openCount === 0
    ? { ...state, inodes: HashMap.remove(state.inodes, entry.ino) }
    : state

// =============================================================================
// inode creation and linking
// =============================================================================

const createFile = Effect.fnUntraced(function*(
  state: State,
  data: Uint8Array = new Uint8Array()
) {
  const now = yield* DateTime.now
  const ino = Inode(state.nextInode)
  return [
    {
      ...state,
      nextInode: state.nextInode + 1,
      inodes: HashMap.set(
        state.inodes,
        ino,
        InodeEntry.File({
          ino,
          mode: FILE_MODE,
          uid: DEFAULT_UID,
          gid: DEFAULT_GID,
          nlink: 0,
          openCount: 0,
          atime: now,
          mtime: now,
          ctime: now,
          birthtime: now,
          data: data.slice()
        })
      )
    },
    ino
  ] as const
})

const createDirectory = Effect.fnUntraced(function*(state: State) {
  const now = yield* DateTime.now
  const ino = Inode(state.nextInode)
  return [
    {
      ...state,
      nextInode: state.nextInode + 1,
      inodes: HashMap.set(
        state.inodes,
        ino,
        InodeEntry.Directory({
          ino,
          mode: DIR_MODE,
          uid: DEFAULT_UID,
          gid: DEFAULT_GID,
          nlink: DIR_SELF_LINK_COUNT,
          openCount: 0,
          atime: now,
          mtime: now,
          ctime: now,
          birthtime: now,
          entries: HashMap.empty()
        })
      )
    },
    ino
  ] as const
})

const createSymbolicLink = Effect.fnUntraced(function*(
  state: State,
  target: string
) {
  const now = yield* DateTime.now
  const ino = Inode(state.nextInode)
  return [
    {
      ...state,
      nextInode: state.nextInode + 1,
      inodes: HashMap.set(
        state.inodes,
        ino,
        InodeEntry.SymbolicLink({
          ino,
          mode: LINK_MODE,
          uid: DEFAULT_UID,
          gid: DEFAULT_GID,
          nlink: 0,
          openCount: 0,
          atime: now,
          mtime: now,
          ctime: now,
          birthtime: now,
          target
        })
      )
    },
    ino
  ] as const
})

const attachDirectory = Effect.fnUntraced(function*(
  state: State,
  parent: Inode,
  name: string,
  inode: Inode,
  method = "makeDirectory"
) {
  yield* validateEntryName(method, name)
  const parentEntry = yield* getDirectory(state, parent, method, name)
  if (HashMap.has(parentEntry.entries, name)) {
    return yield* alreadyExists(method, name)
  }
  const entry = yield* getInode(state, inode, method, name)
  const expectedUnlinkedLinks = entry._tag === "Directory"
    ? DIR_SELF_LINK_COUNT +
      [...HashMap.values(entry.entries)].filter((child) => findInode(state, child)?._tag === "Directory").length
    : 0
  if (entry._tag !== "Directory" || parent === inode || entry.nlink !== expectedUnlinkedLinks) {
    return yield* permissionDenied(method, name, "Cannot attach this directory")
  }
  const now = yield* DateTime.now
  const nextParent = {
    ...parentEntry,
    entries: HashMap.set(parentEntry.entries, name, inode),
    nlink: parentEntry.nlink + 1
  }
  const nextEntry = { ...entry, nlink: entry.nlink + 1 }
  return touchNamespaceMutation(state, nextParent, nextEntry, now)
})

const linkInode = Effect.fnUntraced(function*(
  state: State,
  parent: Inode,
  name: string,
  inode: Inode,
  method = "link"
) {
  yield* validateEntryName(method, name)
  const parentEntry = yield* getDirectory(state, parent, method, name)
  if (HashMap.has(parentEntry.entries, name)) {
    return yield* alreadyExists(method, name)
  }
  const entry = yield* getInode(state, inode, method, name)
  if (entry._tag === "Directory") {
    return yield* permissionDenied(method, name, "Cannot create a hard link to a directory")
  }
  const now = yield* DateTime.now
  const nextParent = { ...parentEntry, entries: HashMap.set(parentEntry.entries, name, inode) }
  const nextEntry = { ...entry, nlink: entry.nlink + 1 }
  return touchNamespaceMutation(state, nextParent, nextEntry, now)
})

// =============================================================================
// path resolution
// =============================================================================

// NOTE: Relative paths resolve from the virtual POSIX root because `FileSystem` has
// no `chdir` operation or mutable working-directory state.
const resolve = Effect.fnUntraced(function*(
  state: State,
  path: string,
  options?: ResolveOptions
) {
  const method = options?.method ?? "resolve"
  const originalPath = path
  if (path.length === 0 || path.includes("\0")) {
    return yield* notFound(method, path)
  }
  let components = path.split("/")
  const stack: Array<Inode> = [RootInode]
  const names: Array<string> = []
  let symbolicLinkTraversals = 0

  while (components.length > 0) {
    const component = components.shift()
    if (component === undefined) {
      continue
    }
    if (component.length === 0) {
      if (components.length === 0) {
        yield* getDirectory(state, stack[stack.length - 1], method, originalPath)
      }
      continue
    }
    if (component === ".") {
      yield* getDirectory(state, stack[stack.length - 1], method, originalPath)
      continue
    }
    if (component === "..") {
      yield* getDirectory(state, stack[stack.length - 1], method, originalPath)
      if (stack.length > 1) {
        stack.pop()
        names.pop()
      }
      continue
    }

    const parent = yield* getDirectory(state, stack[stack.length - 1], method, originalPath)
    const inode = findEntry(parent, component)
    if (inode === undefined) {
      return yield* notFound(method, originalPath)
    }
    const entry = yield* getInode(state, inode, method, originalPath)
    const shouldFollow = entry._tag === "SymbolicLink" &&
      (components.length > 0 || options?.followFinalSymbolicLink !== false)
    if (shouldFollow) {
      symbolicLinkTraversals += 1
      if (symbolicLinkTraversals > MAX_LINK_TRAVERSAL) {
        return yield* badResource(method, originalPath, "Too many symbolic links")
      }
      if (entry.target.length === 0) {
        return yield* notFound(method, originalPath)
      }
      if (entry.target.startsWith("/")) {
        stack.splice(1)
        names.splice(0)
      }
      components = entry.target.split("/").concat(components)
      continue
    }

    stack.push(inode)
    names.push(component)
  }

  const inode = stack[stack.length - 1]
  const entry = yield* getInode(state, inode, method, originalPath)
  return { inode, entry, path: names.length === 0 ? "/" : `/${names.join("/")}` } satisfies ResolvedInode
})

interface OpenMode {
  readonly readable: boolean
  readonly writable: boolean
  readonly append: boolean
  readonly create: boolean
  readonly exclusive: boolean
  readonly truncate: boolean
}

interface OpenOptions {
  readonly flag?: FileSystem.OpenFlag | undefined
  readonly mode?: number | undefined
}

// =============================================================================
// descriptors
// =============================================================================

const isOpenFlag = (flag: unknown): flag is FileSystem.OpenFlag =>
  flag === "r" ||
  flag === "r+" ||
  flag === "w" ||
  flag === "wx" ||
  flag === "w+" ||
  flag === "wx+" ||
  flag === "a" ||
  flag === "ax" ||
  flag === "a+" ||
  flag === "ax+"

const openMode = (flag: FileSystem.OpenFlag): OpenMode => ({
  readable: flag === "r" || flag.endsWith("+"),
  writable: flag !== "r",
  append: flag.startsWith("a"),
  create: flag.startsWith("w") || flag.startsWith("a"),
  exclusive: flag.includes("x"),
  truncate: flag.startsWith("w")
})

const descriptorError = (
  fd: FileDescriptor,
  method: string,
  description?: string
): PlatformError => badResource(method, fd, description)

const allocateBytes = (
  length: number,
  fd: FileDescriptor,
  method: string
) =>
  Effect.try({
    try: () => new Uint8Array(length),
    catch: () => descriptorError(fd, method, "Unable to allocate file bytes")
  })

const getOpenFile = (
  state: State,
  fd: FileDescriptor,
  method: string,
  access?: "readable" | "writable"
): Effect.Effect<readonly [OpenFileDescriptor, FileInode], PlatformError> =>
  Effect.suspend(() => {
    const descriptor = Option.getOrUndefined(HashMap.get(state.descriptors, fd))
    if (descriptor === undefined) {
      return Effect.fail(descriptorError(fd, method, "File descriptor is closed"))
    }
    if (access !== undefined && !descriptor[access]) {
      return Effect.fail(descriptorError(fd, method, `File descriptor is not ${access}`))
    }
    const entry = findInode(state, descriptor.inode)
    if (entry === undefined || entry._tag !== "File") {
      return Effect.fail(descriptorError(fd, method, "File descriptor does not refer to a file"))
    }
    return Effect.succeed([descriptor, entry])
  })

const withSystemErrorPath = (error: PlatformError, method: string, path: string): PlatformError =>
  error.reason._tag === "BadArgument"
    ? error
    : fileSystemError({
      _tag: error.reason._tag,
      method,
      pathOrDescriptor: path,
      description: error.reason.description,
      syscall: error.reason.syscall,
      cause: error.reason.cause
    })

const withOperationError = (error: PlatformError, method: string, path: string): PlatformError =>
  error.reason._tag === "BadArgument"
    ? badArgument({
      module: error.reason.module,
      method,
      description: error.reason.description,
      cause: error.reason.cause
    })
    : withSystemErrorPath(error, method, path)

const symbolicLinkTargetPath = (linkPath: string, target: string): string => {
  if (target.startsWith("/")) {
    return target
  }
  const separator = linkPath.lastIndexOf("/")
  const directory = separator <= 0 ? "/" : linkPath.slice(0, separator)
  return `${directory}/${target}`
}

// =============================================================================
// entry resolution and removal
// =============================================================================

const resolveParent = Effect.fnUntraced(function*(
  state: State,
  path: string,
  method: string,
  errorPath: string = path
) {
  if (path.length === 0 || path === "/" || path.endsWith("/") || path.includes("\0")) {
    return yield* badResource(method, errorPath)
  }
  const components = path.split("/").filter((component) => component.length > 0)
  const name = components.pop()
  if (name === undefined) {
    return yield* badResource(method, errorPath)
  }
  yield* validateEntryName(method, name, errorPath)
  const parentPath = components.length === 0
    ? "/"
    : `${path.startsWith("/") ? "/" : ""}${components.join("/")}`
  const parent = yield* resolve(state, parentPath, { method }).pipe(
    Effect.mapError((error) => withSystemErrorPath(error, method, errorPath))
  )
  if (parent.entry._tag !== "Directory") {
    return yield* badResource(method, errorPath)
  }
  return { inode: parent.inode, entry: parent.entry, name, path: parent.path }
})

const resolveEntry = Effect.fnUntraced(function*(
  state: State,
  path: string,
  method: string
) {
  const parent = yield* resolveParent(state, path, method)
  const inode = findEntry(parent.entry, parent.name)
  if (inode === undefined) {
    return yield* notFound(method, path)
  }
  return {
    parent: parent.entry,
    name: parent.name,
    entry: yield* getInode(state, inode, method, path),
    path: childPath(parent.path, parent.name)
  } satisfies ResolvedEntry
})

const validateMode = (method: string, mode: number | undefined) =>
  mode === undefined || Number.isInteger(mode) && mode >= 0 && mode <= 0xffff_ffff
    ? Effect.void
    : Effect.fail(argumentError(method, "mode must be an unsigned 32-bit integer"))

const detachEntry: (
  state: State,
  target: ResolvedEntry,
  now: DateTime.Utc,
  recursive: boolean,
  method: string,
  path: string
) => Effect.Effect<State, PlatformError> = Effect.fnUntraced(function*(
  state,
  target,
  now,
  recursive,
  method,
  path
) {
  if (target.entry._tag === "Directory" && HashMap.size(target.entry.entries) > 0 && !recursive) {
    return yield* badResource(method, path, "Directory is not empty")
  }
  let nextState = state
  if (target.entry._tag === "Directory") {
    const children = [...target.entry.entries].sort(([left], [right]) => left.localeCompare(right))
    for (const [childName, childInode] of children) {
      const directory = yield* getDirectory(nextState, target.entry.ino, method, path)
      const child = yield* getInode(nextState, childInode, method, path)
      nextState = yield* detachEntry(
        nextState,
        {
          parent: directory,
          name: childName,
          entry: child,
          path: childPath(target.path, childName)
        },
        now,
        true,
        method,
        path
      )
    }
  }
  const parent = yield* getDirectory(nextState, target.parent.ino, method, path)
  const entry = yield* getInode(nextState, target.entry.ino, method, path)
  const nextParent = {
    ...parent,
    entries: HashMap.remove(parent.entries, target.name),
    nlink: entry._tag === "Directory" ? parent.nlink - 1 : parent.nlink
  }
  const nextEntry = {
    ...entry,
    nlink: entry.nlink - (entry._tag === "Directory" ? DIR_LINK_COUNT : 1)
  }
  return reclaimInode(
    touchNamespaceMutation(nextState, nextParent, nextEntry, now),
    nextEntry
  )
})

// =============================================================================
// directory operations
// =============================================================================

const makeDirectory = (volume: Volume) =>
  Effect.fnUntraced(function*(
    path: string,
    options?: { readonly recursive?: boolean | undefined; readonly mode?: number | undefined }
  ) {
    const method = "makeDirectory"
    yield* validateMode(method, options?.mode)
    return yield* volume.mutate((state) =>
      Effect.gen(function*() {
        let nextState = state
        const recursive = options?.recursive === true
        const pieces = path.split("/").filter((piece) => piece.length > 0)
        if (pieces.length === 0 || path.includes("\0")) {
          return yield* badResource(method, path)
        }
        const prefix = path.startsWith("/") ? "/" : ""
        const createdPaths: Array<string> = []
        for (let index = 0; index < pieces.length; index++) {
          const candidate = `${prefix}${pieces.slice(0, index + 1).join("/")}`
          const existing = yield* Effect.result(resolve(nextState, candidate, { method }))
          if (existing._tag === "Success") {
            if (existing.success.entry._tag !== "Directory") {
              return yield* alreadyExists(method, path)
            }
            if (index === pieces.length - 1) {
              return recursive
                ? transitionResult(nextState, undefined)
                : yield* alreadyExists(method, path)
            }
            continue
          }
          if (!recursive && index !== pieces.length - 1) {
            return yield* withSystemErrorPath(existing.failure, method, path)
          }
          const parent = yield* resolveParent(nextState, candidate, method, path)
          if (HashMap.has(parent.entry.entries, parent.name)) {
            return yield* alreadyExists(method, path)
          }
          const [createdState, inode] = yield* createDirectory(nextState)
          nextState = createdState
          let entry = yield* getDirectory(nextState, inode, method, path)
          if (options?.mode !== undefined) {
            entry = {
              ...entry,
              mode: DIR_TYPE_MODE | (options.mode & PERMISSION_MODE)
            }
            nextState = setInode(nextState, entry)
          }
          nextState = yield* attachDirectory(nextState, parent.inode, parent.name, inode, method).pipe(
            Effect.mapError((error) => withSystemErrorPath(error, method, path))
          )
          createdPaths.push(childPath(parent.path, parent.name))
        }
        return transitionResult(
          nextState,
          undefined,
          createdPaths.map((path) => ({ _tag: "Create", path }))
        )
      })
    )
  })

const link = (volume: Volume) =>
  Effect.fnUntraced(function*(fromPath: string, toPath: string) {
    const method = "link"
    return yield* volume.mutate((state) =>
      Effect.gen(function*() {
        const source = yield* resolve(state, fromPath, { method }).pipe(
          Effect.mapError((error) => withSystemErrorPath(error, method, fromPath))
        )
        const destination = yield* resolveParent(state, toPath, method)
        const nextState = yield* linkInode(state, destination.inode, destination.name, source.inode, method).pipe(
          Effect.mapError((error) => withSystemErrorPath(error, method, toPath))
        )
        return transitionResult(nextState, undefined, [{
          _tag: "Create",
          path: childPath(destination.path, destination.name)
        }])
      })
    )
  })

const symlink = (volume: Volume) =>
  Effect.fnUntraced(function*(target: string, path: string) {
    const method = "symlink"
    return yield* volume.mutate((state) =>
      Effect.gen(function*() {
        const parent = yield* resolveParent(state, path, method)
        if (target.includes("\0")) {
          return yield* argumentError(method, "target must not contain a null byte")
        }
        const [createdState, inode] = yield* createSymbolicLink(state, target)
        const nextState = yield* linkInode(createdState, parent.inode, parent.name, inode, method).pipe(
          Effect.mapError((error) => withSystemErrorPath(error, method, path))
        )
        return transitionResult(nextState, undefined, [{
          _tag: "Create",
          path: childPath(parent.path, parent.name)
        }])
      })
    )
  })

const readLink = (volume: Volume) =>
  Effect.fnUntraced(function*(path: string) {
    return yield* volume.withState((state) =>
      Effect.gen(function*() {
        const resolved = yield* resolve(state, path, { followFinalSymbolicLink: false, method: "readLink" })
        if (resolved.entry._tag !== "SymbolicLink") {
          return yield* badResource("readLink", path)
        }
        return resolved.entry.target
      })
    )
  })

const realPath = (volume: Volume) =>
  Effect.fnUntraced(function*(path: string) {
    return yield* volume.withState((state) => Effect.map(resolve(state, path, { method: "realPath" }), (_) => _.path))
  })

const remove = (volume: Volume) =>
  Effect.fnUntraced(function*(
    path: string,
    options?: { readonly recursive?: boolean | undefined; readonly force?: boolean | undefined }
  ) {
    const method = "remove"
    return yield* volume.mutate((state) =>
      Effect.gen(function*() {
        const target = yield* Effect.result(resolveEntry(state, path, method))
        if (target._tag === "Failure") {
          if (options?.force && target.failure.reason._tag === "NotFound") {
            return transitionResult(state, undefined)
          }
          return yield* target.failure
        }
        const now = yield* DateTime.now
        const nextState = yield* detachEntry(
          state,
          target.success,
          now,
          options?.recursive === true,
          method,
          path
        )
        return transitionResult(nextState, undefined, [{ _tag: "Remove", path: target.success.path }])
      })
    )
  })

const containsDirectory = (state: State, ancestor: Inode, candidate: Inode): boolean => {
  if (ancestor === candidate) return true
  const entry = findInode(state, ancestor)
  if (entry === undefined || entry._tag !== "Directory") return false
  for (const inode of HashMap.values(entry.entries)) {
    if (findInode(state, inode)?._tag === "Directory" && containsDirectory(state, inode, candidate)) {
      return true
    }
  }
  return false
}

const rename = (volume: Volume) =>
  Effect.fnUntraced(function*(
    oldPath: string,
    newPath: string
  ) {
    const method = "rename"
    return yield* volume.mutate((state) =>
      Effect.gen(function*() {
        const source = yield* resolveEntry(state, oldPath, method)
        const destinationParent = yield* resolveParent(state, newPath, method)
        if (source.parent.ino === destinationParent.inode && source.name === destinationParent.name) {
          return transitionResult(state, undefined)
        }
        if (source.entry._tag === "Directory" && containsDirectory(state, source.entry.ino, destinationParent.inode)) {
          return yield* badResource(method, newPath, "Cannot move a directory into itself")
        }
        const destinationInode = findEntry(destinationParent.entry, destinationParent.name)
        if (destinationInode === source.entry.ino) return transitionResult(state, undefined)
        let destination: ResolvedEntry | undefined
        if (destinationInode !== undefined) {
          destination = {
            parent: destinationParent.entry,
            name: destinationParent.name,
            entry: yield* getInode(state, destinationInode, method, newPath),
            path: childPath(destinationParent.path, destinationParent.name)
          }
          if (source.entry._tag === "Directory" && destination.entry._tag !== "Directory") {
            return yield* badResource(method, newPath, "Cannot replace a non-directory with a directory")
          }
          if (source.entry._tag !== "Directory" && destination.entry._tag === "Directory") {
            return yield* badResource(method, newPath, "Cannot replace a directory with a non-directory")
          }
          if (destination.entry._tag === "Directory" && HashMap.size(destination.entry.entries) > 0) {
            return yield* badResource(method, newPath, "Directory is not empty")
          }
        }
        const now = yield* DateTime.now
        let nextState = state
        if (destination !== undefined) {
          nextState = yield* detachEntry(nextState, destination, now, false, method, newPath)
        }

        const sourceParent = yield* getDirectory(nextState, source.parent.ino, method, oldPath)
        const moved = yield* getInode(nextState, source.entry.ino, method, oldPath)
        if (sourceParent.ino === destinationParent.inode) {
          nextState = setInode(nextState, {
            ...sourceParent,
            entries: HashMap.set(
              HashMap.remove(sourceParent.entries, source.name),
              destinationParent.name,
              moved.ino
            ),
            mtime: now,
            ctime: now
          })
        } else {
          const nextDestinationParent = yield* getDirectory(nextState, destinationParent.inode, method, newPath)
          nextState = setInode(nextState, {
            ...sourceParent,
            entries: HashMap.remove(sourceParent.entries, source.name),
            nlink: moved._tag === "Directory" ? sourceParent.nlink - 1 : sourceParent.nlink,
            mtime: now,
            ctime: now
          })
          nextState = setInode(nextState, {
            ...nextDestinationParent,
            entries: HashMap.set(nextDestinationParent.entries, destinationParent.name, moved.ino),
            nlink: moved._tag === "Directory" ? nextDestinationParent.nlink + 1 : nextDestinationParent.nlink,
            mtime: now,
            ctime: now
          })
        }
        nextState = setInode(nextState, { ...moved, ctime: now })
        return transitionResult(nextState, undefined, [
          { _tag: "Remove", path: source.path },
          { _tag: "Create", path: childPath(destinationParent.path, destinationParent.name) }
        ])
      })
    )
  })

// =============================================================================
// copy operations
// =============================================================================

const cloneInode: (
  state: State,
  source: InodeEntry,
  context: CloneContext
) => Effect.Effect<readonly [State, Inode], PlatformError> = Effect.fnUntraced(
  function*(state, source, context) {
    const { method, sourcePath: path, preserveTimestamps } = context
    const applyMetadata = (state: State, entry: InodeEntry): State =>
      setInode(state, {
        ...entry,
        mode: source.mode,
        mtime: preserveTimestamps ? source.mtime : entry.mtime
      })
    return yield* InodeEntry.$match(source, {
      File: (source) =>
        Effect.gen(function*() {
          const [createdState, inode] = yield* createFile(state, source.data)
          const nextState = applyMetadata(
            createdState,
            yield* getInode(createdState, inode, method, path)
          )
          return [nextState, inode] as const
        }),
      SymbolicLink: (source) =>
        Effect.gen(function*() {
          const [createdState, inode] = yield* createSymbolicLink(state, source.target)
          const nextState = applyMetadata(
            createdState,
            yield* getInode(createdState, inode, method, path)
          )
          return [nextState, inode] as const
        }),
      Directory: (source) =>
        Effect.gen(function*() {
          let [nextState, inode] = yield* createDirectory(state)
          const children = [...source.entries].sort(([left], [right]) => left.localeCompare(right))
          for (const [name, childInode] of children) {
            const child = yield* getInode(nextState, childInode, method, path)
            const [clonedState, clone] = yield* cloneInode(nextState, child, context)
            nextState = clonedState
            if (child._tag === "Directory") {
              nextState = yield* attachDirectory(nextState, inode, name, clone, method)
            } else {
              nextState = yield* linkInode(nextState, inode, name, clone, method)
            }
          }
          nextState = applyMetadata(nextState, yield* getDirectory(nextState, inode, method, path))
          return [nextState, inode] as const
        })
    })
  }
)

const validateCopyDirectoryContents: (
  state: State,
  source: DirectoryInode,
  destination: DirectoryInode,
  overwrite: boolean,
  method: string,
  path: string
) => Effect.Effect<void, PlatformError> = Effect.fnUntraced(
  function*(state, source, destination, overwrite, method, path) {
    for (const [name, sourceInode] of source.entries) {
      const sourceEntry = yield* getInode(state, sourceInode, method, path)
      const destinationInode = findEntry(destination, name)
      if (destinationInode === undefined) continue
      const destinationEntry = yield* getInode(state, destinationInode, method, path)
      if (sourceEntry._tag === "Directory" && destinationEntry._tag === "Directory") {
        yield* validateCopyDirectoryContents(state, sourceEntry, destinationEntry, overwrite, method, path)
        continue
      }
      if (!overwrite) return yield* alreadyExists(method, path)
      if (sourceEntry._tag === "Directory" || destinationEntry._tag === "Directory") {
        return yield* badResource(method, path, "Cannot replace a directory with a non-directory")
      }
    }
  }
)

const copyDirectoryContents: (
  state: State,
  source: DirectoryInode,
  destination: DirectoryInode,
  method: string,
  path: string,
  preserveTimestamps: boolean
) => Effect.Effect<State, PlatformError> = Effect.fnUntraced(function*(
  state,
  source,
  destination,
  method,
  path,
  preserveTimestamps
) {
  let nextState = state
  const cloneContext = { method, sourcePath: path, preserveTimestamps } satisfies CloneContext
  const children = [...source.entries].sort(([left], [right]) => left.localeCompare(right))
  for (const [name, sourceInode] of children) {
    const sourceEntry = yield* getInode(nextState, sourceInode, method, path)
    const currentDestination = yield* getDirectory(nextState, destination.ino, method, path)
    const destinationInode = findEntry(currentDestination, name)
    if (sourceEntry._tag === "Directory" && destinationInode !== undefined) {
      const destinationEntry = yield* getInode(nextState, destinationInode, method, path)
      if (destinationEntry._tag === "Directory") {
        nextState = yield* copyDirectoryContents(
          nextState,
          sourceEntry,
          destinationEntry,
          method,
          path,
          preserveTimestamps
        )
        continue
      }
    }
    if (destinationInode !== undefined) {
      const destinationEntry = yield* getInode(nextState, destinationInode, method, path)
      const now = yield* DateTime.now
      nextState = yield* detachEntry(
        nextState,
        {
          parent: currentDestination,
          name,
          entry: destinationEntry,
          path: childPath(path, name)
        },
        now,
        false,
        method,
        path
      )
    }
    const [clonedState, clone] = yield* cloneInode(nextState, sourceEntry, cloneContext)
    nextState = clonedState
    if (sourceEntry._tag === "Directory") {
      nextState = yield* attachDirectory(nextState, destination.ino, name, clone, method)
    } else {
      nextState = yield* linkInode(nextState, destination.ino, name, clone, method)
    }
  }
  return nextState
})

const resolveCopyFileDestination = Effect.fnUntraced(function*(
  state: State,
  path: string,
  method: string
) {
  let candidate = path
  while (true) {
    const unresolved = yield* Effect.result(resolve(state, candidate, {
      followFinalSymbolicLink: false,
      method
    }))
    if (unresolved._tag === "Failure") {
      if (unresolved.failure.reason._tag === "NotFound") {
        return yield* resolveParent(state, candidate, method, path)
      }
      return yield* withSystemErrorPath(unresolved.failure, method, path)
    }
    if (unresolved.success.entry._tag !== "SymbolicLink") {
      return yield* resolveParent(state, unresolved.success.path, method, path)
    }
    const resolved = yield* Effect.result(resolve(state, candidate, { method }))
    if (resolved._tag === "Success") {
      return yield* resolveParent(state, resolved.success.path, method, path)
    }
    if (resolved.failure.reason._tag !== "NotFound" || unresolved.success.entry.target.length === 0) {
      return yield* withSystemErrorPath(resolved.failure, method, path)
    }
    candidate = symbolicLinkTargetPath(unresolved.success.path, unresolved.success.entry.target)
  }
})

const copyFileUnlocked = Effect.fnUntraced(function*(
  state: State,
  fromPath: string,
  toPath: string
) {
  const method = "copyFile"
  const source = yield* resolve(state, fromPath, { method }).pipe(
    Effect.mapError((error) => withSystemErrorPath(error, method, fromPath))
  )
  if (source.entry._tag !== "File") {
    return yield* badResource(method, fromPath, "Source is not a file")
  }
  const sourceFile = source.entry
  const destination = yield* resolveCopyFileDestination(state, toPath, method)
  const existingInode = findEntry(destination.entry, destination.name)
  if (existingInode === source.inode) return [state, false] as const

  if (existingInode !== undefined) {
    const existing = yield* getInode(state, existingInode, method, toPath)
    if (existing._tag !== "File") {
      return yield* badResource(method, toPath, "Destination is a directory")
    }
    const data = yield* Effect.try({
      try: () => sourceFile.data.slice(),
      catch: () => badResource(method, toPath, "Unable to allocate file bytes")
    })
    const now = yield* DateTime.now
    return [
      setInode(state, {
        ...existing,
        data,
        mode: sourceFile.mode,
        mtime: now,
        ctime: now
      }),
      true
    ] as const
  }

  const [clonedState, inode] = yield* cloneInode(state, sourceFile, {
    method,
    sourcePath: fromPath,
    preserveTimestamps: false
  })
  const nextState = yield* linkInode(clonedState, destination.inode, destination.name, inode, method)
  return [nextState, true] as const
})

const copyEntryUnlocked = Effect.fnUntraced(function*(
  state: State,
  fromPath: string,
  toPath: string,
  overwrite: boolean,
  preserveTimestamps: boolean
) {
  const method = "copy"
  const source = yield* resolve(state, fromPath, {
    followFinalSymbolicLink: false,
    method
  }).pipe(Effect.mapError((error) => withSystemErrorPath(error, method, fromPath)))
  const destination = yield* resolveParent(state, toPath, method)
  if (source.entry._tag === "Directory" && containsDirectory(state, source.inode, destination.inode)) {
    return yield* badResource(method, toPath, "Cannot copy a directory into itself")
  }

  const existingInode = findEntry(destination.entry, destination.name)
  let existing: InodeEntry | undefined
  if (existingInode !== undefined) {
    if (!overwrite) return yield* alreadyExists(method, fromPath)
    existing = yield* getInode(state, existingInode, method, toPath)
    if (existingInode === source.inode) {
      return source.entry._tag === "Directory"
        ? yield* badResource(method, toPath, "Cannot copy a directory onto itself")
        : [state, false] as const
    }
  }

  if (source.entry._tag === "Directory" && existing !== undefined) {
    if (existing._tag !== "Directory") {
      return yield* badResource(method, toPath, "Destination is not a directory")
    }
    yield* validateCopyDirectoryContents(state, source.entry, existing, overwrite, method, toPath)
    const nextState = yield* copyDirectoryContents(state, source.entry, existing, method, toPath, preserveTimestamps)
    return [nextState, true] as const
  }
  if (source.entry._tag !== "Directory" && existing?._tag === "Directory") {
    return yield* badResource(method, toPath, "Destination is a directory")
  }

  let [nextState, inode] = yield* cloneInode(state, source.entry, {
    method,
    sourcePath: fromPath,
    preserveTimestamps
  })
  const entry = yield* getInode(nextState, inode, method, toPath)
  const now = yield* DateTime.now
  if (existing !== undefined) {
    nextState = yield* detachEntry(
      nextState,
      {
        parent: destination.entry,
        name: destination.name,
        entry: existing,
        path: childPath(destination.path, destination.name)
      },
      now,
      true,
      method,
      toPath
    )
  }
  if (entry._tag === "Directory") {
    nextState = yield* attachDirectory(nextState, destination.inode, destination.name, inode, method)
  } else {
    nextState = yield* linkInode(nextState, destination.inode, destination.name, inode, method)
  }
  return [nextState, true] as const
})

const copyFile = (volume: Volume) =>
  Effect.fnUntraced(
    function*(fromPath: string, toPath: string) {
      return yield* volume.mutate((state) =>
        Effect.gen(function*() {
          const existing = yield* Effect.result(resolve(state, toPath, { method: "copyFile" }))
          const [nextState, changed] = yield* copyFileUnlocked(state, fromPath, toPath)
          if (!changed) return transitionResult(nextState, undefined)
          const destination = yield* resolve(nextState, toPath, { method: "copyFile" })
          return transitionResult(
            nextState,
            undefined,
            existing._tag === "Success"
              ? inodeUpdateEvents(nextState, destination.inode)
              : [{ _tag: "Create", path: destination.path }]
          )
        })
      )
    }
  )

const copy = (volume: Volume) =>
  Effect.fnUntraced(function*(
    fromPath: string,
    toPath: string,
    options?: { readonly overwrite?: boolean | undefined; readonly preserveTimestamps?: boolean | undefined }
  ) {
    return yield* volume.mutate((state) =>
      Effect.gen(function*() {
        const existing = yield* Effect.result(resolve(state, toPath, {
          followFinalSymbolicLink: false,
          method: "copy"
        }))
        const [nextState, changed] = yield* copyEntryUnlocked(
          state,
          fromPath,
          toPath,
          options?.overwrite === true,
          options?.preserveTimestamps === true
        )
        if (!changed) return transitionResult(nextState, undefined)
        const destination = yield* resolve(nextState, toPath, {
          followFinalSymbolicLink: false,
          method: "copy"
        })
        return transitionResult(nextState, undefined, [{
          _tag: existing._tag === "Success" ? "Update" : "Create",
          path: destination.path
        }])
      })
    )
  })

// =============================================================================
// open file descriptors
// =============================================================================

const openDescriptorUnlocked: (
  state: State,
  path: string,
  options?: OpenOptions
) => Effect.Effect<readonly [State, OpenFileDescriptor], PlatformError> = Effect.fnUntraced(
  function*(state, path, options) {
    const flag = options?.flag ?? "r"
    if (!isOpenFlag(flag)) {
      return yield* argumentError("open", "flag must be a supported file-open flag")
    }
    const mode = openMode(flag)
    yield* validateMode("open", options?.mode)
    let entry: FileInode | undefined
    let candidatePath = path
    let nextState = state

    while (entry === undefined) {
      const unresolved = yield* Effect.result(resolve(nextState, candidatePath, {
        followFinalSymbolicLink: false,
        method: "open"
      }))

      if (unresolved._tag === "Success") {
        if (mode.exclusive) {
          return yield* alreadyExists("open", path)
        }
        const resolved = yield* Effect.result(resolve(nextState, candidatePath, { method: "open" }))
        if (resolved._tag === "Failure") {
          if (
            unresolved.success.entry._tag === "SymbolicLink" &&
            unresolved.success.entry.target.length > 0 &&
            resolved.failure.reason._tag === "NotFound" &&
            mode.create
          ) {
            candidatePath = symbolicLinkTargetPath(unresolved.success.path, unresolved.success.entry.target)
            continue
          }
          return yield* withSystemErrorPath(resolved.failure, "open", path)
        }
        if (resolved.success.entry._tag !== "File") {
          return yield* badResource("open", path)
        }
        entry = resolved.success.entry
        if (mode.truncate) {
          const now = yield* DateTime.now
          entry = {
            ...entry,
            data: new Uint8Array(),
            mtime: now,
            ctime: now
          }
          nextState = setInode(nextState, entry)
        }
        continue
      }

      if (unresolved.failure.reason._tag !== "NotFound" || !mode.create) {
        return yield* withSystemErrorPath(unresolved.failure, "open", path)
      }
      const parent = yield* resolveParent(nextState, candidatePath, "open", path)
      if (HashMap.has(parent.entry.entries, parent.name)) {
        continue
      }
      const [createdState, inode] = yield* createFile(nextState)
      nextState = createdState
      let created = yield* getInode(nextState, inode, "open", path)
      if (created._tag !== "File") {
        return yield* Effect.die(new Error("MemoryFileSystem.createFile produced a non-file inode"))
      }
      if (options?.mode !== undefined) {
        created = {
          ...created,
          mode: FILE_TYPE_MODE | (options.mode & PERMISSION_MODE)
        }
        nextState = setInode(nextState, created)
      }
      const linked = yield* Effect.result(linkInode(nextState, parent.inode, parent.name, inode, "open"))
      if (linked._tag === "Failure") {
        nextState = reclaimInode(nextState, created)
        if (linked.failure.reason._tag === "AlreadyExists" && !mode.exclusive) {
          continue
        }
        return yield* linked.failure
      }
      nextState = linked.success
      const linkedEntry = yield* getInode(nextState, inode, "open", path)
      if (linkedEntry._tag !== "File") {
        return yield* Effect.die(new Error("MemoryFileSystem.linkInode produced a non-file inode"))
      }
      entry = linkedEntry
    }

    const fd = FileDescriptor(nextState.nextDescriptor)
    const descriptor: OpenFileDescriptor = {
      fd,
      inode: entry.ino,
      readable: mode.readable,
      writable: mode.writable,
      append: mode.append,
      position: FileSystem.Size(0)
    }
    return [
      {
        ...nextState,
        nextDescriptor: nextState.nextDescriptor + 1,
        descriptors: HashMap.set(nextState.descriptors, fd, descriptor),
        inodes: HashMap.set(nextState.inodes, entry.ino, {
          ...entry,
          openCount: entry.openCount + 1
        })
      },
      descriptor
    ] as const
  }
)

const openDescriptor: (
  volume: Volume,
  path: string,
  options?: OpenOptions
) => Effect.Effect<FileDescriptor, PlatformError> = Effect.fnUntraced(
  function*(volume, path, options) {
    return yield* volume.mutate((state) =>
      Effect.gen(function*() {
        const existing = yield* Effect.result(resolve(state, path, { method: "open" }))
        const [nextState, descriptor] = yield* openDescriptorUnlocked(state, path, options)
        const mode = openMode(options?.flag ?? "r")
        const tag = existing._tag === "Failure" ? "Create" : mode.truncate ? "Update" : undefined
        if (tag === undefined) return transitionResult(nextState, descriptor.fd)
        const resolved = yield* resolve(nextState, path, { method: "open" })
        return transitionResult(
          nextState,
          descriptor.fd,
          tag === "Update"
            ? inodeUpdateEvents(nextState, descriptor.inode)
            : [{ _tag: "Create", path: resolved.path }]
        )
      })
    )
  }
)

const closeDescriptorUnlocked = (
  state: State,
  fd: FileDescriptor
): State => {
  const descriptor = Option.getOrUndefined(HashMap.get(state.descriptors, fd))
  if (descriptor === undefined) return state
  let nextState = {
    ...state,
    descriptors: HashMap.remove(state.descriptors, fd)
  }
  const entry = findInode(nextState, descriptor.inode)
  if (entry === undefined) return nextState
  const nextEntry = { ...entry, openCount: entry.openCount - 1 }
  nextState = setInode(nextState, nextEntry)
  return reclaimInode(nextState, nextEntry)
}

// NOTE: Closing is idempotent so a scope finalizer cannot decrement an inode's
// open-reference count more than once.
const closeDescriptor = Effect.fnUntraced(function*(
  volume: Volume,
  fd: FileDescriptor
) {
  return yield* volume.mutate((state) =>
    Effect.succeed(transitionResult(closeDescriptorUnlocked(state, fd), undefined))
  )
})

const fileInfo = (entry: InodeEntry): FileSystem.File.Info => ({
  type: entry._tag,
  mtime: Option.some(DateTime.toDateUtc(entry.mtime)),
  atime: Option.some(DateTime.toDateUtc(entry.atime)),
  birthtime: Option.some(DateTime.toDateUtc(entry.birthtime)),
  dev: 0,
  ino: Option.some(entry.ino),
  mode: entry.mode,
  nlink: Option.some(entry.nlink),
  uid: Option.some(entry.uid),
  gid: Option.some(entry.gid),
  rdev: Option.some(0),
  size: FileSystem.Size(
    entry._tag === "File"
      ? entry.data.length
      : entry._tag === "SymbolicLink"
      ? new TextEncoder().encode(entry.target).length
      : 0
  ),
  blksize: Option.none(),
  blocks: Option.none()
})

const readDescriptorUnlocked = Effect.fnUntraced(function*(
  state: State,
  fd: FileDescriptor,
  length: number,
  method: string
) {
  const [descriptor, entry] = yield* getOpenFile(state, fd, method, "readable")
  if (length === 0) {
    return {
      state,
      bytes: entry.data.subarray(0, 0),
      size: FileSystem.Size(0)
    }
  }
  const position = Number(descriptor.position)
  if (!Number.isSafeInteger(position) || position < 0) {
    return yield* descriptorError(fd, method, "Invalid file position")
  }
  const now = yield* DateTime.now
  const bytesRead = Math.min(length, Math.max(0, entry.data.length - position))
  return {
    state: {
      ...state,
      descriptors: HashMap.set(state.descriptors, fd, {
        ...descriptor,
        position: FileSystem.Size(position + bytesRead)
      }),
      inodes: HashMap.set(state.inodes, entry.ino, { ...entry, atime: now })
    },
    bytes: entry.data.subarray(position, position + bytesRead),
    size: FileSystem.Size(bytesRead)
  }
})

const readDescriptor = (
  volume: Volume,
  fd: FileDescriptor,
  buffer: Uint8Array,
  method: string
) =>
  volume.mutate((state) =>
    Effect.map(
      readDescriptorUnlocked(state, fd, buffer.length, method),
      (result) => {
        buffer.set(result.bytes)
        return transitionResult(result.state, result.size)
      }
    )
  )

const writeDescriptorUnlocked = Effect.fnUntraced(function*(
  state: State,
  fd: FileDescriptor,
  buffer: Uint8Array,
  method: string
) {
  const [descriptor, entry] = yield* getOpenFile(state, fd, method, "writable")
  if (buffer.length === 0) {
    return [state, FileSystem.Size(0)] as const
  }
  const position = descriptor.append ? entry.data.length : Number(descriptor.position)
  if (!Number.isSafeInteger(position) || position < 0) {
    return yield* descriptorError(fd, method, "Invalid file position")
  }
  const length = position + buffer.length
  if (!Number.isSafeInteger(length)) {
    return yield* descriptorError(fd, method, "File is too large")
  }
  const now = yield* DateTime.now
  const data = length > entry.data.length
    ? yield* allocateBytes(length, fd, method)
    : entry.data
  const descriptors = descriptor.append
    ? state.descriptors
    : HashMap.set(state.descriptors, fd, {
      ...descriptor,
      position: FileSystem.Size(length)
    })
  const nextState = {
    ...state,
    descriptors,
    inodes: HashMap.set(state.inodes, entry.ino, {
      ...entry,
      data,
      mtime: now,
      ctime: now
    })
  }
  if (data !== entry.data) {
    data.set(entry.data)
  }
  // NOTE: This is the only mutation of committed file bytes. All typed failure and
  // allocation points have completed, and the volume permit excludes readers.
  data.set(buffer, position)
  return [
    nextState,
    FileSystem.Size(buffer.length)
  ] as const
})

const writeDescriptor = (
  volume: Volume,
  fd: FileDescriptor,
  buffer: Uint8Array,
  method: string
) =>
  volume.mutate((state) =>
    Effect.gen(function*() {
      const [nextState, written] = yield* writeDescriptorUnlocked(state, fd, buffer, method)
      if (written === FileSystem.Size(0)) return transitionResult(nextState, written)
      const descriptor = Option.getOrUndefined(HashMap.get(nextState.descriptors, fd))
      return transitionResult(
        nextState,
        written,
        descriptor === undefined ? [] : inodeUpdateEvents(nextState, descriptor.inode)
      )
    })
  )

// =============================================================================
// file handles
// =============================================================================

class MemoryFile implements FileSystem.File {
  readonly [FileSystem.FileTypeId]: typeof FileSystem.FileTypeId = FileSystem.FileTypeId
  readonly fd: FileDescriptor
  private readonly volume: Volume

  constructor(volume: Volume, fd: FileDescriptor) {
    this.volume = volume
    this.fd = fd
  }

  get stat(): Effect.Effect<FileSystem.File.Info, PlatformError> {
    return this.volume.withState((state) =>
      Effect.map(getOpenFile(state, this.fd, "stat"), ([, entry]) => fileInfo(entry))
    )
  }

  get sync(): Effect.Effect<void, PlatformError> {
    return this.volume.withState((state) => Effect.asVoid(getOpenFile(state, this.fd, "sync")))
  }

  seek(offset: FileSystem.SizeInput, from: FileSystem.SeekMode): Effect.Effect<FileSystem.Size> {
    return this.volume.mutate((state) =>
      Effect.sync(() => {
        const descriptor = Option.getOrUndefined(HashMap.get(state.descriptors, this.fd))
        if (descriptor === undefined) return transitionResult(state, FileSystem.Size(0))
        const size = FileSystem.Size(offset)
        const position = from === "start"
          ? size
          : FileSystem.Size(descriptor.position + size)
        return transitionResult({
          ...state,
          descriptors: HashMap.set(state.descriptors, this.fd, {
            ...descriptor,
            position
          })
        }, position)
      })
    )
  }

  read(buffer: Uint8Array): Effect.Effect<FileSystem.Size, PlatformError> {
    return readDescriptor(this.volume, this.fd, buffer, "read")
  }

  readAlloc(size: FileSystem.SizeInput): Effect.Effect<Option.Option<Uint8Array>, PlatformError> {
    const length = Number(size)
    if (!Number.isSafeInteger(length) || length < 0) {
      return Effect.fail(argumentError("readAlloc", "size must be a non-negative safe integer"))
    }
    return Effect.flatMap(
      allocateBytes(length, this.fd, "readAlloc"),
      (buffer) =>
        Effect.map(
          readDescriptor(this.volume, this.fd, buffer, "readAlloc"),
          (bytesRead) =>
            bytesRead === FileSystem.Size(0)
              ? Option.none()
              : Option.some(bytesRead === FileSystem.Size(length) ? buffer : buffer.slice(0, Number(bytesRead)))
        )
    )
  }

  truncate(length: FileSystem.SizeInput = 0): Effect.Effect<void, PlatformError> {
    const volume = this.volume
    const fd = this.fd
    return Effect.flatMap(validateSize("truncate", length), (size) =>
      volume.mutate((state) =>
        Effect.gen(function*() {
          const [descriptor, entry] = yield* getOpenFile(state, fd, "truncate", "writable")
          const now = yield* DateTime.now
          const data = yield* allocateBytes(size, fd, "truncate")
          data.set(entry.data.subarray(0, size))
          const nextState = {
            ...state,
            descriptors: !descriptor.append && descriptor.position > FileSystem.Size(size)
              ? HashMap.set(state.descriptors, fd, { ...descriptor, position: FileSystem.Size(size) })
              : state.descriptors,
            inodes: HashMap.set(state.inodes, entry.ino, {
              ...entry,
              data,
              mtime: now,
              ctime: now
            })
          }
          return transitionResult(nextState, undefined, inodeUpdateEvents(nextState, descriptor.inode))
        })
      ))
  }

  write(buffer: Uint8Array): Effect.Effect<FileSystem.Size, PlatformError> {
    return writeDescriptor(this.volume, this.fd, buffer, "write")
  }

  writeAll(buffer: Uint8Array): Effect.Effect<void, PlatformError> {
    return Effect.asVoid(writeDescriptor(this.volume, this.fd, buffer, "writeAll"))
  }
}

const open = (volume: Volume) =>
(
  path: string,
  options?: OpenOptions
) =>
  Effect.acquireRelease(
    openDescriptor(volume, path, options),
    (fd) => closeDescriptor(volume, fd)
  ).pipe(
    Effect.map((fd) => new MemoryFile(volume, fd))
  )

// =============================================================================
// filesystem operations
// =============================================================================

// NOTE: Permission bits are metadata only until the adapter models a virtual process
// identity, so `access` deliberately checks existence rather than permissions.
const access = (volume: Volume) =>
  Effect.fnUntraced(function*(path: string) {
    yield* volume.withState((state) => Effect.asVoid(resolve(state, path, { method: "access" })))
  })

const collectDirectoryEntries = (
  state: State,
  directory: DirectoryInode,
  recursive: boolean,
  prefix = ""
): Array<string> => {
  const output: Array<string> = []
  for (const name of [...HashMap.keys(directory.entries)].sort()) {
    const relativePath = prefix.length === 0 ? name : `${prefix}/${name}`
    output.push(relativePath)
    if (!recursive) continue
    const inode = findEntry(directory, name)
    const child = inode === undefined ? undefined : findInode(state, inode)
    if (child?._tag === "Directory") {
      output.push(...collectDirectoryEntries(state, child, true, relativePath))
    }
  }
  return output
}

const readDirectory = (volume: Volume) =>
  Effect.fnUntraced(function*(
    path: string,
    options?: { readonly recursive?: boolean | undefined }
  ) {
    return yield* volume.mutate((state) =>
      Effect.gen(function*() {
        const resolved = yield* resolve(state, path, { method: "readDirectory" })
        if (resolved.entry._tag !== "Directory") {
          return yield* badResource("readDirectory", path)
        }
        const nextState = setInode(state, { ...resolved.entry, atime: yield* DateTime.now })
        return transitionResult(
          nextState,
          collectDirectoryEntries(nextState, resolved.entry, options?.recursive === true)
        )
      })
    )
  })

const readFile = (volume: Volume) =>
  Effect.fnUntraced(function*(path: string) {
    return yield* volume.mutate((state) =>
      Effect.gen(function*() {
        const resolved = yield* resolve(state, path, { method: "readFile" })
        if (resolved.entry._tag !== "File") {
          return yield* badResource("readFile", path)
        }
        const nextState = setInode(state, { ...resolved.entry, atime: yield* DateTime.now })
        return transitionResult(nextState, resolved.entry.data.slice())
      })
    )
  })

const writeFile = (volume: Volume) =>
(
  path: string,
  data: Uint8Array,
  options?: { readonly flag?: FileSystem.OpenFlag | undefined; readonly mode?: number | undefined }
): Effect.Effect<void, PlatformError> =>
  volume.mutate((state) =>
    Effect.gen(function*() {
      const existing = yield* Effect.result(resolve(state, path, { method: "writeFile" }))
      let [nextState, descriptor] = yield* openDescriptorUnlocked(state, path, {
        flag: options?.flag ?? "w",
        mode: options?.mode
      })
      const [writtenState] = yield* writeDescriptorUnlocked(nextState, descriptor.fd, data, "writeAll")
      nextState = writtenState
      nextState = closeDescriptorUnlocked(nextState, descriptor.fd)
      const mode = openMode(options?.flag ?? "w")
      const tag = existing._tag === "Failure"
        ? "Create"
        : mode.truncate || data.length > 0
        ? "Update"
        : undefined
      if (tag === undefined) return transitionResult(nextState, undefined)
      const resolved = yield* resolve(nextState, path, { method: "writeFile" })
      return transitionResult(
        nextState,
        undefined,
        tag === "Update"
          ? inodeUpdateEvents(nextState, resolved.inode)
          : [{ _tag: "Create", path: resolved.path }]
      )
    })
  ).pipe(
    Effect.mapError((error) => withOperationError(error, "writeFile", path))
  )

const validateSize = (
  method: string,
  size: FileSystem.SizeInput | undefined
) => {
  const value = Number(size ?? 0)
  return Number.isSafeInteger(value) && value >= 0
    ? Effect.succeed(value)
    : Effect.fail(argumentError(method, "size must be a non-negative safe integer"))
}

const allocatePathBytes = (
  length: number,
  method: string,
  path: string
) =>
  Effect.try({
    try: () => new Uint8Array(length),
    catch: () => badResource(method, path, "Unable to allocate file bytes")
  })

const truncate = (volume: Volume) =>
  Effect.fnUntraced(function*(
    path: string,
    length?: FileSystem.SizeInput
  ) {
    const size = yield* validateSize("truncate", length)
    return yield* volume.mutate((state) =>
      Effect.gen(function*() {
        const resolved = yield* resolve(state, path, { method: "truncate" })
        if (resolved.entry._tag !== "File") {
          return yield* badResource("truncate", path)
        }
        const data = yield* allocatePathBytes(size, "truncate", path)
        const now = yield* DateTime.now
        data.set(resolved.entry.data.subarray(0, size))
        const nextState = setInode(state, {
          ...resolved.entry,
          data,
          mtime: now,
          ctime: now
        })
        return transitionResult(nextState, undefined, inodeUpdateEvents(nextState, resolved.inode))
      })
    )
  })

const stat = (volume: Volume) =>
  Effect.fnUntraced(function*(path: string) {
    return yield* volume.withState((state) =>
      Effect.map(resolve(state, path, { method: "stat" }), ({ entry }) => fileInfo(entry))
    )
  })

const chmod = (volume: Volume) =>
  Effect.fnUntraced(function*(path: string, mode: number) {
    yield* validateMode("chmod", mode)
    return yield* volume.mutate((state) =>
      Effect.gen(function*() {
        const resolved = yield* resolve(state, path, { method: "chmod" })
        const now = yield* DateTime.now
        const nextState = setInode(state, {
          ...resolved.entry,
          mode: (resolved.entry.mode & ~PERMISSION_MODE) | (mode & PERMISSION_MODE),
          ctime: now
        })
        return transitionResult(nextState, undefined, inodeUpdateEvents(nextState, resolved.inode))
      })
    )
  })

const validateOwner = (method: string, name: string, value: number) =>
  Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff
    ? Effect.void
    : Effect.fail(argumentError(method, `${name} must be an unsigned 32-bit integer`))

const chown = (volume: Volume) =>
  Effect.fnUntraced(function*(
    path: string,
    uid: number,
    gid: number
  ) {
    yield* validateOwner("chown", "uid", uid)
    yield* validateOwner("chown", "gid", gid)
    return yield* volume.mutate((state) =>
      Effect.gen(function*() {
        const resolved = yield* resolve(state, path, { method: "chown" })
        const now = yield* DateTime.now
        const nextState = setInode(state, {
          ...resolved.entry,
          uid,
          gid,
          ctime: now
        })
        return transitionResult(nextState, undefined, inodeUpdateEvents(nextState, resolved.inode))
      })
    )
  })

const dateTimeInput = (
  method: string,
  name: string,
  value: Date | number
) => {
  const milliseconds = typeof value === "number" ? value * 1000 : value.getTime()
  if (!Number.isFinite(milliseconds)) {
    return Effect.fail(argumentError(method, `${name} must be a valid Date or epoch-seconds number`))
  }
  const parsed = DateTime.make(milliseconds)
  return Option.isSome(parsed)
    ? Effect.succeed(parsed.value)
    : Effect.fail(argumentError(method, `${name} is outside the supported date range`))
}

const utimes = (volume: Volume) =>
  Effect.fnUntraced(function*(
    path: string,
    atime: Date | number,
    mtime: Date | number
  ) {
    const accessTime = yield* dateTimeInput("utimes", "atime", atime)
    const modificationTime = yield* dateTimeInput("utimes", "mtime", mtime)
    return yield* volume.mutate((state) =>
      Effect.gen(function*() {
        const resolved = yield* resolve(state, path, { method: "utimes" })
        const now = yield* DateTime.now
        const nextState = setInode(state, {
          ...resolved.entry,
          atime: accessTime,
          mtime: modificationTime,
          ctime: now
        })
        return transitionResult(nextState, undefined, inodeUpdateEvents(nextState, resolved.inode))
      })
    )
  })

// =============================================================================
// temporary resources
// =============================================================================

const validateTemporaryFragment = (
  method: string,
  name: string,
  value: string
) =>
  value.includes("/") || value.includes("\0")
    ? Effect.fail(argumentError(method, `${name} must be a file-name fragment`))
    : Effect.void

const allocateTemporaryToken = (state: State): readonly [State, string] => [
  { ...state, nextTemporary: state.nextTemporary + 1 },
  state.nextTemporary.toString(36).padStart(8, "0")
]

const allocateTempDirectory = Effect.fnUntraced(function*(
  state: State,
  method: string,
  parentPath: string,
  prefix: string
) {
  const parent = yield* resolve(state, parentPath, { method })
  if (parent.entry._tag !== "Directory") {
    return yield* badResource(method, parentPath)
  }
  let nextState = state
  while (true) {
    const [allocatedState, token] = allocateTemporaryToken(nextState)
    nextState = allocatedState
    const name = `${prefix}${token}`
    const currentParent = yield* getDirectory(nextState, parent.inode, method, parentPath)
    if (HashMap.has(currentParent.entries, name)) continue
    const [createdState, inode] = yield* createDirectory(nextState)
    nextState = createdState
    nextState = yield* attachDirectory(nextState, parent.inode, name, inode, method)
    return [
      nextState,
      {
        inode,
        path: childPath(parent.path, name)
      }
    ] as const
  }
})

const makeTempDirectoryWithMethod = Effect.fnUntraced(
  function*(
    volume: Volume,
    method: string,
    options?: { readonly directory?: string | undefined; readonly prefix?: string | undefined }
  ) {
    const prefix = options?.prefix ?? ""
    yield* validateTemporaryFragment(method, "prefix", prefix)
    return yield* volume.mutate((state) =>
      Effect.map(
        allocateTempDirectory(state, method, options?.directory ?? TEMP_DIR, prefix),
        ([nextState, directory]) =>
          transitionResult(nextState, directory.path, [{ _tag: "Create", path: directory.path }])
      )
    )
  }
)

const makeTempDirectory = (volume: Volume) =>
(
  options?: { readonly directory?: string | undefined; readonly prefix?: string | undefined }
) => makeTempDirectoryWithMethod(volume, "makeTempDirectory", options)

const makeTempDirectoryScoped = (volume: Volume) =>
(
  options?: { readonly directory?: string | undefined; readonly prefix?: string | undefined }
) =>
  Effect.acquireRelease(
    makeTempDirectoryWithMethod(volume, "makeTempDirectoryScoped", options),
    (path) => Effect.orDie(remove(volume)(path, { recursive: true, force: true }))
  )

const makeTempFileWithMethod = Effect.fnUntraced(
  function*(
    volume: Volume,
    method: string,
    options?: {
      readonly directory?: string | undefined
      readonly prefix?: string | undefined
      readonly suffix?: string | undefined
    }
  ) {
    const prefix = options?.prefix ?? ""
    const suffix = options?.suffix ?? ""
    yield* validateTemporaryFragment(method, "prefix", prefix)
    yield* validateTemporaryFragment(method, "suffix", suffix)
    return yield* volume.mutateInterruptibly((state) =>
      Effect.gen(function*() {
        let [nextState, directory] = yield* allocateTempDirectory(
          state,
          method,
          options?.directory ?? TEMP_DIR,
          prefix
        )
        const [allocatedState, token] = allocateTemporaryToken(nextState)
        nextState = allocatedState
        const name = `${token}${suffix}`
        const [createdState, inode] = yield* createFile(nextState)
        nextState = createdState
        nextState = yield* linkInode(nextState, directory.inode, name, inode, method)
        const path = childPath(directory.path, name)
        return transitionResult(nextState, path, [{ _tag: "Create", path }])
      }).pipe(
        Effect.mapError((error) => withOperationError(error, method, options?.directory ?? TEMP_DIR))
      )
    )
  }
)

const makeTempFile = (volume: Volume) =>
(
  options?: {
    readonly directory?: string | undefined
    readonly prefix?: string | undefined
    readonly suffix?: string | undefined
  }
) => makeTempFileWithMethod(volume, "makeTempFile", options)

const makeTempFileScoped = (volume: Volume) =>
(
  options?: {
    readonly directory?: string | undefined
    readonly prefix?: string | undefined
    readonly suffix?: string | undefined
  }
) =>
  Effect.acquireRelease(
    makeTempFileWithMethod(volume, "makeTempFileScoped", options),
    (path) => {
      const separator = path.lastIndexOf("/")
      const directory = separator <= 0 ? "/" : path.slice(0, separator)
      return Effect.orDie(remove(volume)(directory, { recursive: true, force: true }))
    }
  )

// =============================================================================
// globbing
// =============================================================================

const MAX_BRACE_EXPANSIONS = 256

interface GlobLiteral {
  readonly _tag: "Literal"
  readonly value: string
}

interface GlobStar {
  readonly _tag: "Star"
}

interface GlobOne {
  readonly _tag: "One"
}

interface GlobCharacterClass {
  readonly _tag: "CharacterClass"
  readonly negated: boolean
  readonly ranges: ReadonlyArray<readonly [string, string]>
  readonly literals: ReadonlyArray<string>
}

type GlobToken = GlobLiteral | GlobStar | GlobOne | GlobCharacterClass

const GlobToken = Data.taggedEnum<GlobToken>()

interface GlobSegment {
  readonly _tag: "Segment"
  readonly tokens: ReadonlyArray<GlobToken>
  readonly startsWithDot: boolean
}

interface GlobGlobstar {
  readonly _tag: "Globstar"
}

type CompiledGlobSegment = GlobSegment | GlobGlobstar

interface CompiledGlobPattern {
  readonly segments: ReadonlyArray<CompiledGlobSegment>
  readonly directoryOnly: boolean
}

interface BraceExpansion {
  readonly start: number
  readonly end: number
  readonly alternatives: ReadonlyArray<string>
}

interface GlobCharacterClassAtom {
  readonly value: string
  readonly escaped: boolean
}

const globSyntaxCharacters = new Set(["*", "?", "[", "]", "{", "}", ",", "\\"])

const findBraceExpansion = (pattern: string): BraceExpansion | undefined => {
  for (let start = 0; start < pattern.length; start++) {
    if (pattern[start] === "\\") {
      start += 1
      continue
    }
    if (pattern[start] !== "{") continue
    let depth = 1
    let characterClass = false
    let closed = false
    const commas: Array<number> = []
    for (let end = start + 1; end < pattern.length; end++) {
      if (pattern[end] === "\\") {
        end += 1
        continue
      }
      if (pattern[end] === "[") {
        characterClass = true
      } else if (pattern[end] === "]") {
        characterClass = false
      } else if (!characterClass && pattern[end] === "{") {
        depth += 1
      } else if (!characterClass && pattern[end] === "}") {
        depth -= 1
        if (depth === 0) {
          closed = true
          if (commas.length === 0) {
            const nested = findBraceExpansion(pattern.slice(start + 1, end))
            if (nested !== undefined) {
              return {
                start: start + nested.start + 1,
                end: start + nested.end + 1,
                alternatives: nested.alternatives
              }
            }
            start = end
            break
          }
          const alternatives: Array<string> = []
          let alternativeStart = start + 1
          for (const comma of [...commas, end]) {
            alternatives.push(pattern.slice(alternativeStart, comma))
            alternativeStart = comma + 1
          }
          return { start, end, alternatives }
        }
      } else if (!characterClass && pattern[end] === "," && depth === 1) {
        commas.push(end)
      }
    }
    if (!closed) return undefined
  }
  return undefined
}

const expandBraces = (method: string, pattern: string) => {
  let patterns = [pattern]
  while (true) {
    const index = patterns.findIndex((pattern) => findBraceExpansion(pattern) !== undefined)
    if (index === -1) return Effect.succeed(patterns)
    const current = patterns[index]
    const expansion = findBraceExpansion(current)
    if (expansion === undefined) return Effect.succeed(patterns)
    if (patterns.length - 1 + expansion.alternatives.length > MAX_BRACE_EXPANSIONS) {
      return Effect.fail(argumentError(method, `brace expansion exceeds ${MAX_BRACE_EXPANSIONS} alternatives`))
    }
    patterns = [
      ...patterns.slice(0, index),
      ...expansion.alternatives.map((alternative) =>
        `${current.slice(0, expansion.start)}${alternative}${current.slice(expansion.end + 1)}`
      ),
      ...patterns.slice(index + 1)
    ]
  }
}

const parseCharacterClass = (method: string, segment: string, start: number) => {
  let index = start + 1
  const negated = segment[index] === "!"
  if (negated) index += 1
  const characters: Array<GlobCharacterClassAtom> = []
  while (index < segment.length) {
    if (segment[index] === "]" && characters.length > 0) break
    let escaped = false
    if (segment[index] === "\\") {
      escaped = true
      index += 1
      if (index === segment.length) {
        return argumentError(method, "character classes must not end with an escape")
      }
    }
    characters.push({ value: segment[index], escaped })
    index += 1
  }
  if (index === segment.length || characters.length === 0) {
    return argumentError(method, "character classes must be closed and non-empty")
  }
  const literals: Array<string> = []
  const ranges: Array<readonly [string, string]> = []
  for (let characterIndex = 0; characterIndex < characters.length; characterIndex++) {
    const character = characters[characterIndex]
    if (
      characterIndex + 2 < characters.length &&
      characters[characterIndex + 1].value === "-" &&
      !characters[characterIndex + 1].escaped &&
      characters[characterIndex + 2].value !== "-"
    ) {
      const end = characters[characterIndex + 2].value
      if (character.value > end) {
        return argumentError(method, "character class ranges must be ascending")
      }
      ranges.push([character.value, end])
      characterIndex += 2
    } else {
      literals.push(character.value)
    }
  }
  return Effect.succeed([GlobToken.CharacterClass({ negated, ranges, literals }), index + 1] as const)
}

const parseGlobSegment = Effect.fnUntraced(function*(method: string, segment: string) {
  if (segment === "**") return { _tag: "Globstar" } satisfies GlobGlobstar
  const tokens: Array<GlobToken> = []
  let index = 0
  while (index < segment.length) {
    const character = segment[index]
    if (character === "\\") {
      index += 1
      if (index === segment.length) {
        return yield* argumentError(method, "patterns must not end with an escape")
      }
      const value = segment[index]
      if (globSyntaxCharacters.has(value)) {
        tokens.push(GlobToken.Literal({ value }))
      } else {
        tokens.push(GlobToken.Literal({ value: "\\" }))
        index -= 1
      }
    } else if (character === "*") {
      tokens.push(GlobToken.Star())
    } else if (character === "?") {
      tokens.push(GlobToken.One())
    } else if (character === "[") {
      const parsed = yield* parseCharacterClass(method, segment, index)
      tokens.push(parsed[0])
      index = parsed[1] - 1
    } else {
      tokens.push(GlobToken.Literal({ value: character }))
    }
    index += 1
  }
  return {
    _tag: "Segment",
    tokens,
    startsWithDot: tokens[0]?._tag === "Literal" && tokens[0].value === "." ||
      tokens[0]?._tag === "CharacterClass" &&
        !tokens[0].negated &&
        (tokens[0].literals.includes(".") ||
          tokens[0].ranges.some(([start, end]) => start <= "." && "." <= end))
  } satisfies GlobSegment
})

const compileGlobPattern = Effect.fnUntraced(function*(method: string, pattern: string) {
  if (pattern.length === 0 || pattern.includes("\0") || pattern.startsWith("/")) {
    return yield* argumentError(method, "pattern must be a root-relative POSIX glob")
  }
  const directoryOnly = pattern.endsWith("/")
  const path = directoryOnly ? pattern.slice(0, -1) : pattern
  const segments = path.split("/")
  if (segments.includes("") || segments.includes(".") || segments.includes("..")) {
    return yield* argumentError(method, "pattern must not contain empty or dot path segments")
  }
  const compiled = yield* Effect.forEach(segments, (segment) => parseGlobSegment(method, segment))
  return { segments: compiled, directoryOnly } satisfies CompiledGlobPattern
})

const compileGlobPatterns = Effect.fnUntraced(function*(method: string, pattern: string) {
  const expanded = yield* expandBraces(method, pattern)
  return yield* Effect.forEach(expanded, (alternative) => compileGlobPattern(method, alternative))
})

const matchesGlobToken = (token: GlobToken, value: string): boolean =>
  GlobToken.$match(token, {
    Literal: (token) => token.value === value,
    Star: () => false,
    One: () => true,
    CharacterClass: (token) => {
      const matches = token.literals.includes(value) ||
        token.ranges.some(([start, end]) => start <= value && value <= end)
      return token.negated ? !matches : matches
    }
  })

const matchesGlobSegment = (pattern: GlobSegment, value: string): boolean => {
  if (value.startsWith(".") && !pattern.startsWithDot) return false
  let patternIndex = 0
  let valueIndex = 0
  let starIndex = -1
  let starValueIndex = -1
  while (valueIndex < value.length) {
    const token = pattern.tokens[patternIndex]
    if (token !== undefined && token._tag !== "Star" && matchesGlobToken(token, value[valueIndex])) {
      patternIndex += 1
      valueIndex += 1
    } else if (token?._tag === "Star") {
      starIndex = patternIndex
      starValueIndex = valueIndex
      patternIndex += 1
    } else if (starIndex !== -1) {
      patternIndex = starIndex + 1
      starValueIndex += 1
      valueIndex = starValueIndex
    } else {
      return false
    }
  }
  while (pattern.tokens[patternIndex]?._tag === "Star") {
    patternIndex += 1
  }
  return patternIndex === pattern.tokens.length
}

const matchesGlob = (pattern: CompiledGlobPattern, path: ReadonlyArray<string>, directory: boolean): boolean => {
  if (pattern.directoryOnly && !directory) return false
  let next = Array.from({ length: path.length + 1 }, (_, index) => index === path.length)
  for (let patternIndex = pattern.segments.length - 1; patternIndex >= 0; patternIndex--) {
    const current = Array.from({ length: path.length + 1 }, () => false)
    const segment = pattern.segments[patternIndex]
    if (segment._tag === "Globstar") {
      for (let pathIndex = path.length; pathIndex >= 0; pathIndex--) {
        current[pathIndex] = next[pathIndex] ||
          pathIndex < path.length &&
            !path[pathIndex].startsWith(".") &&
            current[pathIndex + 1]
      }
    } else {
      for (let pathIndex = path.length - 1; pathIndex >= 0; pathIndex--) {
        current[pathIndex] = matchesGlobSegment(segment, path[pathIndex]) && next[pathIndex + 1]
      }
    }
    next = current
  }
  return next[0]
}

const glob = (volume: Volume) =>
  Effect.fnUntraced(function*(
    pattern: string,
    options?: { readonly root?: string | undefined; readonly exclude?: ReadonlyArray<string> | undefined }
  ) {
    const includes = yield* compileGlobPatterns("glob", pattern)
    const excludes = yield* Effect.forEach(
      options?.exclude ?? [],
      (excluded) => compileGlobPatterns("glob", excluded)
    ).pipe(Effect.map((patterns) => patterns.flat()))
    const rootPath = options?.root ?? "/"
    return yield* volume.withState((state) =>
      Effect.gen(function*() {
        const resolved = yield* resolve(state, rootPath, { method: "glob" })
        if (resolved.entry._tag !== "Directory") {
          return yield* badResource("glob", rootPath)
        }
        const rootExcluded = excludes.some((pattern) => matchesGlob(pattern, [], true))
        if (rootExcluded) return []
        const matches: Array<string> = includes.some((pattern) => matchesGlob(pattern, [], true)) ? ["."] : []
        const pending: Array<readonly [DirectoryInode, ReadonlyArray<string>]> = [[resolved.entry, []]]
        while (pending.length > 0) {
          const next = pending.pop()
          if (next === undefined) break
          const [directory, parent] = next
          for (const name of [...HashMap.keys(directory.entries)].sort()) {
            const path = [...parent, name]
            const inode = findEntry(directory, name)
            const entry = inode === undefined ? undefined : findInode(state, inode)
            const isDirectory = entry?._tag === "Directory"
            const excluded = excludes.some((pattern) => matchesGlob(pattern, path, isDirectory))
            if (!excluded && includes.some((pattern) => matchesGlob(pattern, path, isDirectory))) {
              matches.push(path.join("/"))
            }
            if (excluded) continue
            if (entry?._tag === "Directory") pending.push([entry, path])
          }
        }
        return matches.sort()
      })
    )
  })

// =============================================================================
// volume
// =============================================================================

const makeVolume = Effect.gen(function*() {
  const now = yield* DateTime.now
  // NOTE: One permit covers a transition, its state assignment, and event publication;
  // acquiring that permit remains interruptible.
  const lock = yield* Semaphore.make(1)
  const watchers = new Set<WatchSubscription>()

  let state: State = {
    inodes: HashMap.make([
      RootInode,
      {
        _tag: "Directory",
        ino: RootInode,
        mode: DIR_MODE,
        uid: DEFAULT_UID,
        gid: DEFAULT_GID,
        nlink: DIR_LINK_COUNT,
        openCount: 0,
        atime: now,
        mtime: now,
        ctime: now,
        birthtime: now,
        entries: HashMap.empty()
      } satisfies DirectoryInode
    ]),
    nextInode: FIRST_INODE,
    descriptors: HashMap.empty(),
    nextDescriptor: FIRST_DESCRIPTOR,
    nextTemporary: FIRST_TEMP
  }

  const commitResult = <A>(result: TransitionResult<A>): Effect.Effect<A> =>
    Effect.sync(() => {
      state = result.state
    }).pipe(
      Effect.andThen(publishWatchEvents(watchers, result.events)),
      Effect.as(result.value)
    )

  const commit = <A, E, R>(
    use: (state: State) => Effect.Effect<TransitionResult<A>, E, R>
  ): Effect.Effect<A, E, R> =>
    Effect.flatMap(
      Effect.suspend(() => use(state)),
      commitResult
    )

  const withState: Volume["withState"] = (use) => lock.withPermit(Effect.suspend(() => use(state)))
  const mutate: Volume["mutate"] = (use) => lock.withPermit(Effect.uninterruptible(commit(use)))
  const mutateInterruptibly: Volume["mutateInterruptibly"] = (use) =>
    lock.withPermit(
      Effect.uninterruptibleMask((restore) =>
        Effect.flatMap(
          restore(Effect.suspend(() => use(state))),
          commitResult
        )
      )
    )

  return { mutate, mutateInterruptibly, watchers, withState } satisfies Volume
})

// =============================================================================
// watching
// =============================================================================

const watch = (volume: Volume) => (path: string) =>
  Stream.unwrap(
    Effect.map(
      Effect.acquireRelease(
        volume.withState((state) =>
          Effect.gen(function*() {
            const resolved = yield* resolve(state, path, { method: "stat" })
            const subscription: WatchSubscription = {
              path: resolved.path,
              recursive: resolved.entry._tag === "Directory",
              queue: undefined,
              // NOTE: `Stream.callback` attaches its queue after subscription
              // registration, so retain matching events across that handoff.
              pending: []
            }
            volume.watchers.add(subscription)
            return subscription
          })
        ),
        (subscription) =>
          volume.withState(() =>
            Effect.sync(() => {
              volume.watchers.delete(subscription)
            })
          )
      ),
      (subscription) =>
        Stream.callback<FileSystem.WatchEvent, PlatformError>((queue) =>
          Effect.sync(() => {
            subscription.queue = queue
            for (const event of subscription.pending) {
              Queue.offerUnsafe(queue, event)
            }
            subscription.pending.length = 0
          })
        )
    )
  )

// =============================================================================
// exports
// =============================================================================

/** @internal */
export const make = Effect.gen(function*() {
  const volume = yield* makeVolume
  yield* Effect.orDie(makeDirectory(volume)(TEMP_DIR, { recursive: true }))
  return FileSystem.make({
    access: access(volume),
    copy: copy(volume),
    copyFile: copyFile(volume),
    chmod: chmod(volume),
    chown: chown(volume),
    glob: glob(volume),
    link: link(volume),
    makeDirectory: makeDirectory(volume),
    makeTempDirectory: makeTempDirectory(volume),
    makeTempDirectoryScoped: makeTempDirectoryScoped(volume),
    makeTempFile: makeTempFile(volume),
    makeTempFileScoped: makeTempFileScoped(volume),
    open: open(volume),
    readDirectory: readDirectory(volume),
    readFile: readFile(volume),
    readLink: readLink(volume),
    realPath: realPath(volume),
    remove: remove(volume),
    rename: rename(volume),
    stat: stat(volume),
    symlink: symlink(volume),
    truncate: truncate(volume),
    utimes: utimes(volume),
    watch: watch(volume),
    writeFile: writeFile(volume)
  })
})

/** @internal */
export const layer = Layer.effect(FileSystem.FileSystem, make)
