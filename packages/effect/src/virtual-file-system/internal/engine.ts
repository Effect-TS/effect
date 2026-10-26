import * as BytePath from "../../BytePath.ts"
import * as Bytes from "../../Bytes.ts"
import * as ByteSize from "../../ByteSize.ts"
import * as DateTime from "../../DateTime.ts"
import * as Hex from "../../encoding/Hex.ts"
import * as Result from "../../Result.ts"
import * as Schema from "../../Schema.ts"
import * as M from "./model.ts"
import * as R from "./runtime.ts"

// -----------------------------------------------------------------------------
// Namespace types and caller state
// -----------------------------------------------------------------------------

const CHAR_DOT = 46
const CHAR_FORWARD_SLASH = 47
export const READ_PERMISSION = 4
export const WRITE_PERMISSION = 2
// NOTE: Execute permission on a directory grants search through its entries.
export const EXECUTE_PERMISSION = 1
const STICKY_BIT = 0o1000
export const SET_GID_BIT = 0o2000

export interface Binding {
  readonly name: BytePath.BytePath
  readonly object: bigint
  readonly version: bigint
}

interface DirectoryEntries {
  readonly size: number
  get(name: string): Binding | undefined
  set(name: string, binding: Binding): void
  delete(name: string): boolean
  entries(): IterableIterator<[string, Binding]>
  values(): IterableIterator<Binding>
}

class DirectoryDraft implements DirectoryEntries {
  private readonly changes = new Map<string, Binding | undefined>()
  private readonly appended = new Map<string, Binding>()
  size: number
  private readonly base: DirectoryEntries
  constructor(base: DirectoryEntries) {
    this.base = base
    this.size = base.size
  }
  get(name: string): Binding | undefined {
    return this.appended.get(name) ?? (this.changes.has(name) ? this.changes.get(name) : this.base.get(name))
  }
  set(name: string, binding: Binding): void {
    if (this.get(name) === undefined) {
      this.size++
      this.changes.set(name, undefined)
      this.appended.set(name, binding)
    } else if (this.appended.has(name)) this.appended.set(name, binding)
    else this.changes.set(name, binding)
  }
  delete(name: string): boolean {
    if (this.get(name) === undefined) return false
    this.size--
    this.appended.delete(name)
    this.changes.set(name, undefined)
    return true
  }
  *entries(): IterableIterator<[string, Binding]> {
    for (const [name, binding] of this.base.entries()) {
      if (!this.changes.has(name)) yield [name, binding]
      else {
        const replacement = this.changes.get(name)
        if (replacement !== undefined) yield [name, replacement]
      }
    }
    yield* this.appended.entries()
  }
  *values(): IterableIterator<Binding> {
    for (const [, binding] of this.entries()) yield binding
  }
  publish(): DirectoryEntries {
    for (const [name, binding] of this.changes) {
      if (binding === undefined) this.base.delete(name)
      else this.base.set(name, binding)
    }
    for (const [name, binding] of this.appended) this.base.set(name, binding)
    return this.base
  }
}

interface Base {
  readonly id: bigint
  uid: number
  gid: number
  mode: number
  nlink: bigint
  atime: DateTime.UnixNano
  mtime: DateTime.UnixNano
  ctime: DateTime.UnixNano
  birthtime: DateTime.UnixNano
  revision: bigint
}

export interface FileNode extends Base {
  readonly kind: "file"
  data: Uint8Array<ArrayBuffer>
}

export interface DirectoryNode extends Base {
  readonly kind: "directory"
  entries: DirectoryEntries
  parent: bigint | undefined
  namespace: bigint
}

interface SymlinkNode extends Base {
  readonly kind: "symlink"
  target: BytePath.BytePath
}

export type Node = FileNode | DirectoryNode | SymlinkNode

export interface Policy {
  readonly uid: number
  readonly gid: number
  readonly groups: ReadonlyArray<number>
  readonly privileged: boolean
  readonly umask: number
  readonly root: bigint
  readonly cwd: bigint
  readonly boundaries: ReadonlyArray<bigint>
}

export interface Caller {
  readonly runtime: R.Runtime
  readonly inputLimits: Engine["inputLimits"]
  readonly engineCell: R.ContextCell<Engine>
  readonly policy: Policy
  readonly resource: R.Resource
}

/** @internal */
export const createCallerResult = (
  engine: Engine,
  policy: Policy,
  resource: R.Resource
) =>
  Result.map(resource.retainContextResult(engine), (engineCell) => ({
    runtime: engine.runtime,
    inputLimits: engine.inputLimits,
    engineCell,
    policy,
    resource
  }))

export const resolveEngine = (caller: Caller) => {
  const engine = caller.engineCell.value
  if (engine === undefined) throw new Error("VFS Engine released before admitted execution finished")
  return engine
}

const weakSweep = (ref: WeakRef<Engine>) => () => ref.deref()?.sweep()

export interface RouteEdge {
  readonly parent: bigint
  readonly name: BytePath.BytePath
  readonly version: bigint
  readonly object: bigint
}

export interface ResolutionState {
  follows: number
}

export interface SavedRoute {
  readonly id: bigint
  readonly support: ReadonlyArray<RouteEdge>
}

export interface Route {
  readonly mkdirPrefixEnd?: number
  readonly object: Node
  readonly parent?: DirectoryNode
  readonly binding?: Binding
  readonly support?: ReadonlyArray<RouteEdge>
}

export const routeEdge = (parent: bigint, binding: Binding) => ({
  parent,
  name: binding.name,
  version: binding.version,
  object: binding.object
})

interface EntrySlot {
  readonly parent: DirectoryNode
  readonly name: BytePath.BytePath
  readonly binding: Binding | undefined
}

export interface FileState {
  readonly caller: Caller
  readonly resource: R.Resource
  readonly id: bigint
  readonly read: boolean
  readonly write: boolean
  readonly append: boolean
  readonly appendCursor: "advance" | "preserve"
  readonly truncateCursor: "preserve" | "clamp"
  position: bigint
}

export const callers = new WeakMap<M.VirtualFileSystem, Caller>()

interface DirectoryHandleState {
  readonly caller: Caller
  readonly resource: R.Resource
  readonly id: bigint
}

const directoryHandles = new WeakMap<object, DirectoryHandleState>()

export const registerDirectoryHandle = (
  value: M.DirectoryHandle | M.SyncDirectoryHandle,
  state: DirectoryHandleState
) => {
  directoryHandles.set(value, state)
}

const directoryHandleState = (candidate: unknown) =>
  typeof candidate === "object" && candidate !== null ? directoryHandles.get(candidate) : undefined

// NOTE: Registration records issued views. Membership proves identity, while the
// retrieved resource and runtime are still checked before the handle is used.
export const isDirectoryHandle = (candidate: unknown): candidate is M.DirectoryHandle | M.SyncDirectoryHandle =>
  directoryHandleState(candidate) !== undefined

// -----------------------------------------------------------------------------
// Input validation and path values
// -----------------------------------------------------------------------------

const BooleanOptions = Schema.Record(Schema.String, Schema.Unknown)

const isOptions = Schema.is(BooleanOptions)
const isString = Schema.is(Schema.String)
const isName = Schema.is(M.Name)
const isBigInt = Schema.is(Schema.BigInt)

/** @internal */
export const checkOptionsResult = (
  input: unknown,
  allowed: ReadonlyArray<string>,
  operation: string
) => {
  if (input === undefined) return Result.succeed(undefined)
  if (!isOptions(input)) return Result.fail(new M.InvalidInput({ operation, field: "options", reason: "malformed" }))
  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) {
      return Result.fail(new M.InvalidInput({ operation, field: key, reason: "excessField" }))
    }
  }
  return Result.succeed(input)
}

/** @internal */
export const identityResult = (
  input: unknown,
  operation: string,
  field: string
) =>
  M.isUint32(input)
    ? Result.succeed(input)
    : Result.fail(new M.InvalidInput({ operation, field, reason: "range" }))

/** @internal */
export const modeResult = (
  input: unknown,
  kind: Node["kind"],
  operation: string
) => {
  if (!M.isPermissionMode(input) || (kind !== "directory" && input > 0o777)) {
    return Result.fail(new M.InvalidInput({ operation, field: "mode", reason: "unsupportedBits" }))
  }
  return Result.succeed(input)
}

/** @internal */
export const bufferLengthResult = (input: Uint8Array, operation: string) =>
  Result.mapError(
    Bytes.byteLength(input),
    () => new M.InvalidInput({ operation, field: "data", reason: "invalidBuffer" })
  )

/** @internal */
export const pathLengthResult = (path: M.Path, operation: string) => {
  if (BytePath.isBytePath(path)) return Result.succeed(BytePath.byteLength(path))
  if (!isString(path)) return Result.fail(new M.InvalidInput({ operation, field: "path", reason: "malformed" }))
  let total = 0
  for (let i = 0; i < path.length; i++) {
    const unit = path.charCodeAt(i)
    if (unit === 0) return Result.fail(new M.InvalidInput({ operation, field: "path", reason: "malformed" }))
    if (unit < 128) total++
    else if (unit < 2048) total += 2
    else if (unit >= 0xd800 && unit <= 0xdbff) {
      const low = path.charCodeAt(++i)
      if (!(low >= 0xdc00 && low <= 0xdfff)) {
        return Result.fail(new M.InvalidInput({ operation, field: "path", reason: "malformed" }))
      }
      total += 4
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return Result.fail(new M.InvalidInput({ operation, field: "path", reason: "malformed" }))
    } else total += 3
  }
  return Result.succeed(total)
}

/** @internal */
export const pathValueResult = (
  path: M.Path,
  operation: string
) => {
  if (BytePath.isBytePath(path)) return Result.succeed(path)
  return Result.mapError(
    BytePath.fromString(path),
    () => new M.InvalidInput({ operation, field: "path", reason: "malformed" })
  )
}

export const key = (name: BytePath.BytePath) => Hex.encode(BytePath.toBytes(name))
const isDot = (bytes: Uint8Array) => bytes.length === 1 && bytes[0] === CHAR_DOT
const isDotDot = (bytes: Uint8Array) => bytes.length === 2 && bytes[0] === CHAR_DOT && bytes[1] === CHAR_DOT

/** @internal */
export const nameValueResult = (input: M.Path, operation: string) =>
  Result.gen(function*() {
    const name = yield* pathValueResult(input, operation)
    if (!isName(name)) return yield* Result.fail(new M.InvalidInput({ operation, field: "name", reason: "malformed" }))
    return name
  })

export const asciiPath = (path: string) => Result.getOrThrow(BytePath.fromString(path))

// -----------------------------------------------------------------------------
// Filesystem state
// -----------------------------------------------------------------------------

export class Engine {
  readonly runtime: R.Runtime
  readonly inputLimits: Readonly<Pick<M.Limits, "ioBytes" | "pathBytes">>
  readonly root: bigint
  readonly nodes = new Map<bigint, Node>()
  readonly pins = new Map<bigint, number>()
  private readonly releaseCandidates = new Set<bigint>()
  entryCount = 0
  contentBytes = BigInt("0")
  nextObject = BigInt("2")
  nextBinding = BigInt("1")

  constructor(
    runtime: R.Runtime,
    root: { readonly uid: number; readonly gid: number; readonly mode: number },
    rootId = BigInt("1")
  ) {
    this.runtime = runtime
    this.inputLimits = Object.freeze({ ioBytes: runtime.limits.ioBytes, pathBytes: runtime.limits.pathBytes })
    this.root = rootId
    this.nextObject = rootId + BigInt("1")
    const now = this.now()
    this.nodes.set(this.root, {
      ...root,
      id: this.root,
      kind: "directory",
      nlink: BigInt("2"),
      entries: new Map(),
      parent: undefined,
      namespace: BigInt("1"),
      revision: BigInt("1"),
      atime: now,
      mtime: now,
      ctime: now,
      birthtime: now
    })
    runtime.onRelease = weakSweep(new WeakRef(this))
  }

  now() {
    const value = this.runtime.clock.currentTimeNanosUnsafe()
    if (!isBigInt(value)) throw new TypeError("Clock.currentTimeNanosUnsafe must return bigint")
    return DateTime.unixNanoFromNanoseconds(value)
  }

  pin(id: bigint) {
    this.pins.set(id, (this.pins.get(id) ?? 0) + 1)
  }

  unpin(id: bigint): void {
    const n = this.pins.get(id)
    if (n === undefined) return
    if (n === 1) {
      this.pins.delete(id)
      this.releaseCandidates.add(id)
    } else this.pins.set(id, n - 1)
  }
  *releasedObjects(): IterableIterator<Node> {
    for (const id of this.releaseCandidates) {
      const node = this.nodes.get(id)
      if (node !== undefined && node.nlink === BigInt("0") && !this.pins.has(id)) yield node
    }
  }
  reclaim(id: bigint): void {
    const node = this.nodes.get(id)
    if (node !== undefined && node.nlink === BigInt("0") && !this.pins.has(id)) {
      this.nodes.delete(id)
      if (node.kind === "directory") this.entryCount -= node.entries.size
      else {this.contentBytes -= node.kind === "file"
          ? BigInt(node.data.length)
          : BigInt(BytePath.byteLength(node.target))}
    }
    this.releaseCandidates.delete(id)
  }
  sweep(): void {
    for (const id of this.releaseCandidates) this.reclaim(id)
  }
  publishNode(node: Node): void {
    // Entry maps change only during publication. Snapshots must copy entries rather than retain this map.
    if (node.kind === "directory" && node.entries instanceof DirectoryDraft) node.entries = node.entries.publish()
    this.nodes.set(node.id, node)
    if (node.nlink === BigInt("0")) this.releaseCandidates.add(node.id)
  }
  initializeCapacity(): void {
    const usage = this.usage()
    this.entryCount = usage.entries
    this.contentBytes = usage.contentBytes
  }
  retainResult(policy: Policy, resource: R.Resource) {
    return this.retainObjectsResult(resource, [policy.root, policy.cwd, ...policy.boundaries])
  }

  retainObjectsResult(resource: R.Resource, ids: Iterable<bigint>) {
    const retained = new Set(ids)
    return Result.map(
      resource.releaseWithResult(() => {
        for (const id of retained) this.unpin(id)
      }),
      () => {
        for (const id of retained) this.pin(id)
      }
    )
  }

  usage() {
    let content = BigInt("0")
    let entries = 0
    let retained = 0
    let retainedContent = BigInt("0")
    for (const node of this.nodes.values()) {
      const bytes = node.kind === "file"
        ? BigInt(node.data.length)
        : node.kind === "symlink"
        ? BigInt(BytePath.byteLength(node.target))
        : BigInt("0")
      content += bytes
      if (node.kind === "directory") entries += node.entries.size
      if (node.nlink === BigInt("0")) {
        retained++
        retainedContent += bytes
      }
    }
    return {
      liveObjects: this.nodes.size,
      entries,
      contentBytes: ByteSize.bytes(content),
      unreachableRetainedObjects: retained,
      unreachableRetainedContentBytes: ByteSize.bytes(retainedContent),
      callers: this.runtime.callers,
      handles: this.runtime.handles,
      operations: this.runtime.ordinary,
      reservedTransientBytes: ByteSize.bytes(this.runtime.payload)
    }
  }

  metadata(node: Node) {
    return {
      kind: node.kind,
      objectNumber: node.id,
      uid: node.uid,
      gid: node.gid,
      mode: node.mode,
      nlink: node.nlink,
      size: ByteSize.bytes(
        node.kind === "file" ? node.data.length : node.kind === "symlink" ? BytePath.byteLength(node.target) : 0
      ),
      atime: node.atime,
      mtime: node.mtime,
      ctime: node.ctime,
      birthtime: node.birthtime
    }
  }

  reference(id: bigint) {
    return M.issueToken("object", this.runtime.instanceNumber, id, BigInt("0"))
  }

  observation(node: Node): M.ObjectObservation {
    const common = {
      reference: this.reference(node.id),
      revision: M.issueToken("revision", this.runtime.instanceNumber, node.id, node.revision)
    }
    const metadata = this.metadata(node)
    if (node.kind === "directory") {
      return {
        ...common,
        kind: "directory",
        metadata: { ...metadata, kind: "directory" },
        namespaceRevision: M.issueToken("namespace", this.runtime.instanceNumber, node.id, node.namespace)
      }
    }
    if (node.kind === "file") return { ...common, kind: "file", metadata: { ...metadata, kind: "file" } }
    return { ...common, kind: "symlink", metadata: { ...metadata, kind: "symlink" } }
  }
}

// -----------------------------------------------------------------------------
// Transactions
// -----------------------------------------------------------------------------

interface BorrowedDestination {
  readonly view: Uint8Array
  readonly backing: ArrayBufferLike
  readonly offset: number
  readonly count: number
}

export class Transaction {
  readonly changes = new Map<bigint, Node>()
  private readonly timeRequests = new Map<bigint, Set<"atime" | "mtime" | "ctime" | "birthtime">>()
  private readonly products: Array<{ readonly node: Node; readonly value: M.ObjectObservation }> = []
  private pendingPosition: { readonly state: FileState; readonly next: bigint } | undefined
  private pendingRead: { readonly destination: BorrowedDestination; readonly bytes: Uint8Array } | undefined
  private pendingCaller: Caller | undefined
  readonly caller: Caller
  readonly work: R.Work

  constructor(caller: Caller, work: R.Work) {
    this.caller = caller
    this.work = work
  }

  get engine() {
    return resolveEngine(this.caller)
  }

  get operation() {
    return this.work.operation
  }

  // ---------------------------------------------------------------------------
  // Staged changes and observations
  // ---------------------------------------------------------------------------

  stagePosition(state: FileState, next: bigint) {
    this.pendingPosition = { state, next }
  }

  stageBorrowedRead(destination: BorrowedDestination, bytes: Uint8Array) {
    this.pendingRead = { destination, bytes }
  }

  stageCallerRetention(caller: Caller) {
    this.pendingCaller = caller
  }

  getResult(id: bigint) {
    const node = this.changes.get(id) ?? this.engine.nodes.get(id)
    return node === undefined
      ? Result.fail(new M.InvalidResource({ operation: this.operation, reason: "stale" }))
      : Result.succeed(node)
  }

  editResult(id: bigint) {
    const node = this.changes.get(id)
    if (node !== undefined) return Result.succeed(node)
    return Result.map(this.getResult(id), (before) => {
      const edited = { ...before }
      this.changes.set(id, edited)
      return edited
    })
  }

  directoryResult(id: bigint) {
    return Result.flatMap(this.getResult(id), (node) =>
      node.kind === "directory"
        ? Result.succeed(node)
        : Result.fail(new M.InvalidResource({ operation: this.operation, reason: "wrongKind" })))
  }

  private editDirectoryResult(id: bigint) {
    return Result.flatMap(this.editResult(id), (node) => {
      if (node.kind !== "directory") {
        return Result.fail(new M.InvalidResource({ operation: this.operation, reason: "wrongKind" }))
      }
      if (this.engine.nodes.has(id) && !(node.entries instanceof DirectoryDraft)) {
        node.entries = new DirectoryDraft(node.entries)
      }
      return Result.succeed(node)
    })
  }

  visitResult(amount = 1) {
    return this.engine.runtime.visitResult(this.work.ticket, this.operation, amount)
  }

  findBindingResult(directory: DirectoryNode, object: bigint) {
    return Result.gen(this, function*() {
      for (const binding of directory.entries.values()) {
        yield* this.visitResult()
        if (binding.object === object) return binding
      }
    })
  }

  listBindingsResult(directory: DirectoryNode) {
    return Result.map(
      this.visitResult(directory.entries.size),
      () => Array.from(directory.entries.values()).sort((left, right) => BytePath.Order(left.name, right.name))
    )
  }

  reserveResult(bytes: bigint) {
    return this.work.reserveResult(bytes)
  }

  observation(node: Node) {
    const value = this.engine.observation(node)
    this.products.push({ node, value })
    return value
  }

  explicitTimeResult(
    id: bigint,
    field: "atime" | "mtime",
    value: DateTime.UnixNano
  ) {
    return Result.map(this.editResult(id), (node) => {
      node[field] = value
      this.timeRequests.get(id)?.delete(field)
    })
  }

  touchResult(id: bigint, fields: ReadonlyArray<"atime" | "mtime" | "ctime">) {
    return Result.map(this.editResult(id), () => {
      let requested = this.timeRequests.get(id)
      if (requested === undefined) {
        requested = new Set()
        this.timeRequests.set(id, requested)
      }
      for (const field of fields) requested.add(field)
    })
  }

  changedResult(id: bigint, fields: ReadonlyArray<"atime" | "mtime" | "ctime">) {
    return Result.flatMap(this.editResult(id), (node) => {
      node.revision++
      return this.touchResult(id, fields)
    })
  }

  private childChangedResult(id: bigint) {
    return Result.flatMap(this.editDirectoryResult(id), (node) => {
      node.namespace++
      return this.changedResult(id, ["mtime", "ctime"])
    })
  }

  // ---------------------------------------------------------------------------
  // Authority and path resolution
  // ---------------------------------------------------------------------------

  tokenResult(value: unknown, kind: M.TokenKind, id?: bigint) {
    const info = M.tokenInfo(value)
    if (info === undefined || info.kind !== kind) {
      return Result.fail(new M.InvalidInput({ operation: this.operation, field: "token", reason: "malformed" }))
    }
    if (info.instance !== this.engine.runtime.instanceNumber) {
      return Result.fail(new M.InvalidResource({ operation: this.operation, reason: "foreign" }))
    }
    if (id !== undefined && info.object !== id) {
      return Result.fail(new M.InvalidInput({ operation: this.operation, field: "token", reason: "wrongObjectToken" }))
    }
    return Result.succeed(info)
  }

  permission(node: Node, requested: number) {
    const p = this.caller.policy
    if (p.privileged) return true
    const shift = node.uid === p.uid ? 6 : node.gid === p.gid || p.groups.includes(node.gid) ? 3 : 0
    return (((node.mode >> shift) & requested) === requested)
  }

  requireResult(node: Node, requested: number) {
    return this.permission(node, requested)
      ? Result.succeed(undefined)
      : Result.fail(new M.AccessDenied({ operation: this.operation, reason: "permission" }))
  }

  authorizeCreateResult(parent: DirectoryNode, requested: number | undefined, kind: Node["kind"]) {
    return Result.gen(this, function*() {
      yield* this.requireResult(parent, WRITE_PERMISSION | EXECUTE_PERMISSION)
      if (requested !== undefined) yield* modeResult(requested, kind, this.operation)
      if (
        kind === "directory" && requested !== undefined && (requested & SET_GID_BIT) !== 0 &&
        !this.caller.policy.privileged
      ) {
        const policy = this.caller.policy
        const gid = (parent.mode & SET_GID_BIT) !== 0 ? parent.gid : policy.gid
        if (gid !== policy.gid && !policy.groups.includes(gid)) {
          return yield* Result.fail(new M.AccessDenied({ operation: this.operation, reason: "ownership" }))
        }
      }
    })
  }

  ownsResult(node: Node) {
    return !this.caller.policy.privileged && this.caller.policy.uid !== node.uid
      ? Result.fail(new M.AccessDenied({ operation: this.operation, reason: "ownership" }))
      : Result.succeed(undefined)
  }

  containedResult(id: bigint, root: bigint) {
    return Result.gen(this, function*() {
      const seen = new Set<bigint>()
      while (true) {
        yield* this.visitResult()
        if (id === root) return true
        if (seen.has(id)) return false
        seen.add(id)
        const node = yield* this.getResult(id)
        if (node.kind !== "directory" || node.parent === undefined) return false
        id = node.parent
      }
    })
  }

  authorityResult(relative = false) {
    return Result.gen(this, function*() {
      const p = this.caller.policy
      if (!(yield* this.containedResult(p.root, this.engine.root))) {
        return yield* Result.fail(new M.AccessDenied({ operation: this.operation, reason: "confinement" }))
      }
      for (const boundary of p.boundaries) {
        if (!(yield* this.containedResult(p.root, boundary))) {
          return yield* Result.fail(new M.AccessDenied({ operation: this.operation, reason: "confinement" }))
        }
      }
      if (relative && !(yield* this.containedResult(p.cwd, p.root))) {
        return yield* Result.fail(new M.AccessDenied({ operation: this.operation, reason: "confinement" }))
      }
    })
  }

  referenceRouteResult(value: M.ObjectReference) {
    return Result.gen(this, function*() {
      const info = yield* this.tokenResult(value, "object")
      yield* this.getResult(info.object)
      yield* this.authorityResult()
      const stack: Array<{ readonly node: DirectoryNode; readonly support: ReadonlyArray<RouteEdge> }> = [{
        node: yield* this.directoryResult(this.caller.policy.root),
        support: []
      }]
      const seen = new Set<bigint>()
      for (let pending = stack.pop(); pending !== undefined; pending = stack.pop()) {
        const { node: dir, support } = pending
        yield* this.visitResult()
        if (dir.id === info.object) return { object: dir, support }
        if (seen.has(dir.id)) continue
        seen.add(dir.id)
        if (!this.permission(dir, EXECUTE_PERMISSION)) continue
        for (const binding of dir.entries.values()) {
          yield* this.visitResult()
          const node = yield* this.getResult(binding.object)
          const routeSupport = [...support, {
            parent: dir.id,
            name: binding.name,
            version: binding.version,
            object: node.id
          }]
          if (node.id === info.object) return { object: node, parent: dir, binding, support: routeSupport }
          if (node.kind === "directory") stack.push({ node, support: routeSupport })
        }
      }
      return yield* Result.fail(
        new M.AccessDenied({ operation: this.operation, reason: "temporarilyInaccessibleReference" })
      )
    })
  }

  selectDirectoryRouteResult(
    selector: M.DirectorySelector,
    state: ResolutionState = { follows: 0 }
  ) {
    return Result.gen(this, function*() {
      let route: Route
      if (isString(selector) || BytePath.isBytePath(selector)) {
        const path = yield* pathValueResult(selector, this.operation)
        route = yield* this.resolveResult(path, true, undefined, state.follows, [], state)
      } else if (M.isToken(selector)) {
        route = yield* this.referenceRouteResult(selector)
      } else {
        const handle = directoryHandleState(selector)
        if (handle === undefined) {
          return yield* Result.fail(
            new M.InvalidInput({ operation: this.operation, field: "directory", reason: "malformed" })
          )
        }
        if (handle.caller.runtime !== this.caller.runtime) {
          return yield* Result.fail(new M.InvalidResource({ operation: this.operation, reason: "foreign" }))
        }
        if (handle.resource.state !== "open") return yield* Result.fail(R.closed(this.operation, handle.resource.state))
        yield* this.work.borrowResult(handle.resource)
        route = yield* this.referenceRouteResult(this.engine.reference(handle.id))
      }
      if (route.object.kind !== "directory") {
        return yield* Result.fail(new M.InvalidResource({ operation: this.operation, reason: "wrongKind" }))
      }
      return { ...route, object: route.object }
    })
  }

  selectDirectoryResult(
    selector: M.DirectorySelector,
    state: ResolutionState = { follows: 0 }
  ) {
    return Result.map(this.selectDirectoryRouteResult(selector, state), (route) => route.object)
  }

  consumeLinkResult(state: ResolutionState) {
    return ++state.follows > this.engine.runtime.limits.symlinkFollows
      ? Result.fail(new M.InvalidResource({ operation: this.operation, reason: "symlinkLimit" }))
      : Result.succeed(undefined)
  }

  resolveResult(
    path: BytePath.BytePath,
    followFinal: boolean,
    start?: bigint,
    follows = 0,
    inherited: ReadonlyArray<RouteEdge> = [],
    state: ResolutionState = { follows },
    mkdir?: M.MkdirOptions
  ) {
    if (state.follows > this.engine.runtime.limits.symlinkFollows) {
      return Result.fail(new M.InvalidResource({ operation: this.operation, reason: "symlinkLimit" }))
    }
    let charge = BigInt(BytePath.byteLength(path))
    if (charge === BigInt("0")) {
      return Result.fail(new M.InvalidInput({ operation: this.operation, field: "path", reason: "malformed" }))
    }
    if (follows === 0 && charge > this.engine.runtime.limits.pathBytes) {
      return Result.fail(new M.LimitExceeded({ operation: this.operation, domain: "path", stage: "resolution" }))
    }
    if (charge > this.engine.runtime.limits.expandedPathBytes) {
      return Result.fail(
        new M.LimitExceeded({ operation: this.operation, domain: "expandedPath", stage: "resolution" })
      )
    }
    const reserved = this.reserveResult(charge)
    if (Result.isFailure(reserved)) return Result.fail(reserved.failure)
    try {
      return Result.gen(this, function*() {
        let bytes = BytePath.toBytes(path)
        let base = start
        const support = [...inherited]
        while (true) {
          const absolute = bytes[0] === CHAR_FORWARD_SLASH
          yield* this.authorityResult(!absolute && base === undefined)
          let id = absolute ? this.caller.policy.root : base ?? this.caller.policy.cwd
          const components: Array<Uint8Array> = []
          for (let first = 0, i = 0; i <= bytes.length; i++) {
            if (i === bytes.length || bytes[i] === CHAR_FORWARD_SLASH) {
              if (i > first) components.push(bytes.subarray(first, i))
              first = i + 1
            }
          }
          let route: Route = { object: yield* this.directoryResult(id), support }
          yield* this.visitResult()
          let expanded = false
          for (let index = 0; index < components.length; index++) {
            const component = components[index]
            const directory = yield* this.directoryResult(id)
            yield* this.requireResult(directory, EXECUTE_PERMISSION)
            yield* this.visitResult()
            if (isDot(component)) {
              route = { object: directory, support }
              continue
            }
            if (isDotDot(component)) {
              yield* this.visitResult()
              id = id === this.caller.policy.root ? id : directory.parent ?? id
              route = { object: yield* this.directoryResult(id), support }
              continue
            }
            const name = yield* Result.mapError(
              BytePath.fromBytes(component),
              () => new M.InvalidInput({ operation: this.operation, field: "path", reason: "malformed" })
            )
            let binding = directory.entries.get(key(name))
            if (binding === undefined) {
              if (mkdir === undefined) {
                return yield* Result.fail(new M.NotFound({ operation: this.operation, reason: "missingEntry" }))
              }
              yield* nameValueResult(name, this.operation)
              if (BigInt(BytePath.byteLength(name)) > this.engine.runtime.limits.nameBytes) {
                return yield* Result.fail(
                  new M.LimitExceeded({ operation: this.operation, domain: "name", stage: "resolution" })
                )
              }
              yield* this.authorizeCreateResult(directory, mkdir.mode, "directory")
              if (index === components.length - 1) yield* this.conditionsResult(directory, undefined, mkdir.conditions)
              const created = yield* this.createResult("directory", directory, mkdir.mode)
              binding = yield* this.insertResult(directory.id, name, created.id)
            } else if (mkdir !== undefined && index === components.length - 1) {
              if ((yield* this.getResult(binding.object)).kind !== "directory") {
                return yield* Result.fail(new M.InvalidResource({ operation: this.operation, reason: "wrongKind" }))
              }
              yield* this.conditionsResult(directory, binding, mkdir.conditions)
            }
            const node = yield* this.getResult(binding.object)
            support.push({ parent: directory.id, name: binding.name, version: binding.version, object: node.id })
            route = { object: node, parent: directory, binding, support }
            const terminal = index === components.length - 1
            if (mkdir !== undefined && node.kind === "symlink" && !terminal) {
              return { ...route, mkdirPrefixEnd: component.byteOffset - bytes.byteOffset + component.length }
            }
            if (node.kind === "symlink" && (!terminal || followFinal)) {
              yield* this.consumeLinkResult(state)
              let length = BytePath.byteLength(node.target)
              for (let rest = index + 1; rest < components.length; rest++) length += 1 + components[rest].length
              if (bytes[bytes.length - 1] === CHAR_FORWARD_SLASH) length++
              const nextCharge = BigInt(length)
              if (nextCharge > this.engine.runtime.limits.expandedPathBytes) {
                return yield* Result.fail(
                  new M.LimitExceeded({ operation: this.operation, domain: "expandedPath", stage: "resolution" })
                )
              }
              if (nextCharge > charge) yield* this.reserveResult(nextCharge - charge)
              else this.work.release(charge - nextCharge)
              charge = nextCharge
              const target = BytePath.toBytes(node.target)
              const joined = new Uint8Array(length)
              joined.set(target)
              let offset = target.length
              for (let rest = index + 1; rest < components.length; rest++) {
                joined[offset++] = CHAR_FORWARD_SLASH
                joined.set(components[rest], offset)
                offset += components[rest].length
              }
              if (bytes[bytes.length - 1] === CHAR_FORWARD_SLASH) joined[offset] = CHAR_FORWARD_SLASH
              bytes = joined
              base = directory.id
              expanded = true
              break
            }
            id = node.id
            if (!terminal && node.kind !== "directory") {
              return yield* Result.fail(new M.InvalidResource({ operation: this.operation, reason: "wrongKind" }))
            }
          }
          if (expanded) continue
          if (bytes[bytes.length - 1] === CHAR_FORWARD_SLASH && route.object.kind !== "directory") {
            return yield* Result.fail(new M.InvalidResource({ operation: this.operation, reason: "wrongKind" }))
          }
          return route
        }
      })
    } finally {
      this.work.release(charge)
    }
  }

  // ---------------------------------------------------------------------------
  // Retained routes and target selection
  // ---------------------------------------------------------------------------

  retainRouteResult(
    owner: R.Resource,
    request:
      | { readonly kind: "traversal"; readonly route: Route; readonly outputBytes: bigint }
      | { readonly kind: "frame"; readonly route: Route | SavedRoute }
  ) {
    return Result.gen(this, function*() {
      const route = request.route
      const id = "object" in route ? route.object.id : route.id
      const support = "object" in route ? route.support ?? [] : route.support
      const frameResource = request.kind === "frame"
        ? yield* this.work.acquireResourceResult("lease", owner)
        : undefined
      const framePins = request.kind === "frame" ? new Set(support.map((edge) => edge.parent)) : undefined
      if (framePins !== undefined && this.engine.nodes.get(id)?.kind === "directory") framePins.add(id)
      let bytes = request.kind === "traversal" ? request.outputBytes : BigInt("0")
      for (const edge of support) bytes += BigInt(BytePath.byteLength(edge.name))
      yield* this.reserveResult(bytes)
      const resource = frameResource ?? (yield* this.work.acquireResourceResult("lease", owner))
      yield* this.work.retainResult(bytes, resource)
      const saved: SavedRoute = request.kind === "traversal"
        ? Object.freeze({
          id,
          support: Object.freeze(support.map((edge) => Object.freeze({ ...edge })))
        })
        : "object" in route
        ? { id, support }
        : route
      const identities = framePins ?? new Set<bigint>()
      if (request.kind === "traversal") {
        for (const edge of saved.support) {
          identities.add(edge.parent)
          if ((yield* this.getResult(edge.object)).kind !== "file") identities.add(edge.object)
        }
        if (request.route.object.kind !== "file") identities.add(id)
      }
      yield* this.engine.retainObjectsResult(resource, identities)
      return { route: saved, resource }
    })
  }

  validateRouteResult(saved: SavedRoute) {
    return Result.gen(this, function*() {
      yield* this.authorityResult()
      let final: Route | undefined
      for (const edge of saved.support) {
        yield* this.visitResult()
        const parentNode = this.engine.nodes.get(edge.parent)
        if (parentNode === undefined || parentNode.kind !== "directory") {
          return yield* Result.fail(
            new M.NamespaceChanged({ operation: this.operation, reason: "selectedBindingLost" })
          )
        }
        const parent = yield* this.directoryResult(edge.parent)
        if (!(yield* this.containedResult(parent.id, this.caller.policy.root))) {
          return yield* Result.fail(new M.AccessDenied({ operation: this.operation, reason: "confinement" }))
        }
        yield* this.requireResult(parent, EXECUTE_PERMISSION)
        const binding = parent.entries.get(key(edge.name))
        if (binding?.version !== edge.version || binding.object !== edge.object) {
          return yield* Result.fail(
            new M.NamespaceChanged({ operation: this.operation, reason: "selectedBindingLost" })
          )
        }
        final = { object: yield* this.getResult(binding.object), parent, binding, support: saved.support }
      }
      const node = yield* this.getResult(saved.id)
      if (node.kind === "directory" && !(yield* this.containedResult(node.id, this.caller.policy.root))) {
        return yield* Result.fail(new M.AccessDenied({ operation: this.operation, reason: "confinement" }))
      }
      if (final?.object.id === saved.id) return final
      return { object: node, support: saved.support }
    })
  }

  childRouteResult(
    saved: SavedRoute,
    name: BytePath.BytePath,
    followFinal = false
  ) {
    return Result.gen(this, function*() {
      const route = yield* this.validateRouteResult(saved)
      if (route.object.kind !== "directory") {
        return yield* Result.fail(new M.InvalidResource({ operation: this.operation, reason: "wrongKind" }))
      }
      return yield* this.resolveResult(name, followFinal, route.object.id, 0, saved.support)
    })
  }

  followRouteResult(saved: SavedRoute) {
    return Result.gen(this, function*() {
      const route = yield* this.validateRouteResult(saved)
      if (route.object.kind !== "symlink") return route
      if (route.parent === undefined) {
        return yield* Result.fail(new M.InvalidResource({ operation: this.operation, reason: "wrongKind" }))
      }
      const state: ResolutionState = { follows: 0 }
      yield* this.consumeLinkResult(state)
      return yield* this.resolveResult(route.object.target, true, route.parent.id, state.follows, saved.support, state)
    })
  }

  targetResult(
    target: M.Target,
    followFinal = true,
    state: ResolutionState = { follows: 0 }
  ) {
    return Result.gen(this, function*() {
      if (isString(target) || BytePath.isBytePath(target)) {
        const path = yield* pathValueResult(target, this.operation)
        return yield* this.resolveResult(path, followFinal, undefined, state.follows, [], state)
      }
      if (M.isToken(target)) return yield* this.referenceRouteResult(target)
      const address = target
      if (!isOptions(address)) {
        return yield* Result.fail(
          new M.InvalidInput({ operation: this.operation, field: "target", reason: "malformed" })
        )
      }
      const directory = yield* this.selectDirectoryResult(address.directory, state)
      yield* this.requireResult(directory, EXECUTE_PERMISSION)
      const name = yield* nameValueResult(address.name, this.operation)
      yield* this.visitResult()
      const binding = directory.entries.get(key(name))
      if (binding === undefined) {
        return yield* Result.fail(new M.NotFound({ operation: this.operation, reason: "missingEntry" }))
      }
      const node = yield* this.getResult(binding.object)
      if (node.kind === "symlink" && followFinal) {
        yield* this.consumeLinkResult(state)
        return yield* this.resolveResult(node.target, true, directory.id, state.follows, [{
          parent: directory.id,
          name: binding.name,
          version: binding.version,
          object: node.id
        }], state)
      }
      return {
        object: node,
        parent: directory,
        binding,
        support: [{ parent: directory.id, name: binding.name, version: binding.version, object: node.id }]
      }
    })
  }

  slotResult(
    target: M.EntryTarget,
    start?: bigint,
    state: ResolutionState = { follows: 0 },
    allowMissingDirectory = false
  ) {
    return Result.gen(this, function*() {
      let parent: DirectoryNode
      let name: BytePath.BytePath
      if (isString(target) || BytePath.isBytePath(target)) {
        const path = yield* pathValueResult(target, this.operation)
        const bytes = BytePath.toBytes(path)
        let end = bytes.length
        while (end > 0 && bytes[end - 1] === CHAR_FORWARD_SLASH) end--
        if (end === 0) {
          return yield* Result.fail(new M.AccessDenied({ operation: this.operation, reason: "confinement" }))
        }
        let slash = end - 1
        while (slash >= 0 && bytes[slash] !== CHAR_FORWARD_SLASH) slash--
        const component = yield* Result.mapError(
          BytePath.fromBytes(bytes.subarray(slash + 1, end)),
          () => new M.InvalidInput({ operation: this.operation, field: "path", reason: "malformed" })
        )
        name = yield* nameValueResult(component, this.operation)
        const parentPath = yield* Result.mapError(
          slash < 0
            ? BytePath.fromString(".")
            : slash === 0
            ? BytePath.fromString("/")
            : BytePath.fromBytes(bytes.subarray(0, slash)),
          () => new M.InvalidInput({ operation: this.operation, field: "path", reason: "malformed" })
        )
        const { object: node } = yield* this.resolveResult(parentPath, true, start, state.follows, [], state)
        if (node.kind !== "directory") {
          return yield* Result.fail(new M.InvalidResource({ operation: this.operation, reason: "wrongKind" }))
        }
        parent = node
      } else {
        if (!isOptions(target)) {
          return yield* Result.fail(
            new M.InvalidInput({ operation: this.operation, field: "target", reason: "malformed" })
          )
        }
        parent = yield* this.selectDirectoryResult(target.directory, state)
        name = yield* nameValueResult(target.name, this.operation)
      }
      if (BigInt(BytePath.byteLength(name)) > this.engine.runtime.limits.nameBytes) {
        return yield* Result.fail(
          new M.LimitExceeded({ operation: this.operation, domain: "name", stage: "resolution" })
        )
      }
      yield* this.requireResult(parent, EXECUTE_PERMISSION)
      yield* this.visitResult()
      const binding = parent.entries.get(key(name))
      if (isString(target) || BytePath.isBytePath(target)) {
        const path = yield* pathValueResult(target, this.operation)
        const bytes = BytePath.toBytes(path)
        if (bytes[bytes.length - 1] === CHAR_FORWARD_SLASH) {
          if (binding === undefined && !allowMissingDirectory) {
            return yield* Result.fail(new M.NotFound({ operation: this.operation, reason: "missingEntry" }))
          }
          if (binding !== undefined && (yield* this.getResult(binding.object)).kind !== "directory") {
            return yield* Result.fail(new M.InvalidResource({ operation: this.operation, reason: "wrongKind" }))
          }
        }
      }
      return { parent, name, binding }
    })
  }

  followFinalSlotResult(
    initial: EntrySlot,
    state: ResolutionState,
    noFollow = false
  ) {
    return Result.gen(this, function*() {
      let slot = initial
      const seen = new Set<string>()
      while (slot.binding !== undefined) {
        const node = yield* this.getResult(slot.binding.object)
        if (node.kind !== "symlink") break
        if (noFollow) {
          return yield* Result.fail(new M.InvalidResource({ operation: this.operation, reason: "refusedSymlink" }))
        }
        const routeKey = `${node.id}:${slot.parent.id}`
        if (seen.has(routeKey)) {
          return yield* Result.fail(new M.InvalidResource({ operation: this.operation, reason: "symlinkCycle" }))
        }
        seen.add(routeKey)
        yield* this.consumeLinkResult(state)
        const bytes = BytePath.toBytes(node.target)
        let start = bytes.length
        while (start > 0 && bytes[start - 1] !== CHAR_FORWARD_SLASH) start--
        const length = bytes.length - start
        if (
          bytes.at(-1) === CHAR_FORWARD_SLASH || (length === 1 && bytes[start] === CHAR_DOT) ||
          (length === 2 && bytes[start] === CHAR_DOT && bytes[start + 1] === CHAR_DOT)
        ) {
          yield* this.resolveResult(node.target, false, slot.parent.id, state.follows, [], state)
          return yield* Result.fail(new M.InvalidResource({ operation: this.operation, reason: "wrongKind" }))
        }
        slot = yield* this.slotResult(node.target, slot.parent.id, state)
      }
      return slot
    })
  }

  entryResult(
    parent: DirectoryNode,
    name: BytePath.BytePath,
    binding: Binding | undefined
  ) {
    return Result.gen(this, function*() {
      const context = {
        parent: this.engine.reference(parent.id),
        parentNamespaceRevision: M.issueToken(
          "namespace",
          this.engine.runtime.instanceNumber,
          parent.id,
          parent.namespace
        ),
        name
      }
      if (binding === undefined) return { ...context, state: "absent" as const }
      const token = M.issueToken("binding", this.engine.runtime.instanceNumber, parent.id, binding.version)
      const node = yield* this.getResult(binding.object)
      return { ...context, state: "present" as const, binding: token, object: this.observation(node) }
    })
  }

  // ---------------------------------------------------------------------------
  // Conditions and namespace changes
  // ---------------------------------------------------------------------------

  conditionsResult(
    parent: DirectoryNode,
    binding: Binding | undefined,
    options: M.DestinationConditions | M.EntryConditions | undefined
  ) {
    return Result.gen(this, function*() {
      if (options?.parentNamespace !== undefined) {
        const token = yield* this.tokenResult(options.parentNamespace, "namespace", parent.id)
        if (token.version !== parent.namespace) {
          return yield* Result.fail(
            new M.ConditionFailed({ operation: this.operation, reason: "parentNamespaceRevision" })
          )
        }
      }
      const guard = options?.entry
      if (guard === undefined) return
      if (guard.expected === "absent") {
        if (binding !== undefined) {
          return yield* Result.fail(new M.ConditionFailed({ operation: this.operation, reason: "absence" }))
        }
      } else if (guard.expected === "present") {
        const token = yield* this.tokenResult(guard.object, "object")
        if (binding?.object !== token.object) {
          return yield* Result.fail(new M.ConditionFailed({ operation: this.operation, reason: "object" }))
        }
      } else if (guard.expected === "binding") {
        const token = yield* this.tokenResult(guard.binding, "binding", parent.id)
        if (binding?.version !== token.version) {
          return yield* Result.fail(new M.ConditionFailed({ operation: this.operation, reason: "binding" }))
        }
      } else {
        return yield* Result.fail(
          new M.InvalidInput({ operation: this.operation, field: "conditions", reason: "malformed" })
        )
      }
    })
  }

  revisionResult(node: Node, condition: M.RevisionCondition | undefined) {
    return Result.gen(this, function*() {
      if (condition?.expectedRevision === undefined) return
      const token = yield* this.tokenResult(condition.expectedRevision, "revision", node.id)
      if (token.version !== node.revision) {
        return yield* Result.fail(new M.ConditionFailed({ operation: this.operation, reason: "objectRevision" }))
      }
    })
  }

  stickyResult(parent: DirectoryNode, victim: Node) {
    return Result.gen(this, function*() {
      yield* this.requireResult(parent, WRITE_PERMISSION | EXECUTE_PERMISSION)
      if (
        (parent.mode & STICKY_BIT) !== 0 && !this.caller.policy.privileged && this.caller.policy.uid !== parent.uid &&
        this.caller.policy.uid !== victim.uid
      ) {
        return yield* Result.fail(new M.AccessDenied({ operation: this.operation, reason: "ownership" }))
      }
    })
  }

  insertResult(parentId: bigint, name: BytePath.BytePath, object: bigint) {
    return Result.gen(this, function*() {
      yield* this.reserveResult(BigInt(BytePath.byteLength(name)))
      const binding = { name, object, version: this.engine.nextBinding++ }
      const parent = yield* this.editDirectoryResult(parentId)
      parent.entries.set(key(name), binding)
      yield* this.childChangedResult(parentId)
      return binding
    })
  }

  hardLinkResult(node: FileNode | SymlinkNode, destination: EntrySlot) {
    return Result.gen(this, function*() {
      const edited = yield* this.editResult(node.id)
      edited.nlink++
      yield* this.changedResult(node.id, ["ctime"])
      yield* this.insertResult(destination.parent.id, destination.name, node.id)
    })
  }

  moveResult(from: EntrySlot, to: EntrySlot, node: Node) {
    return Result.gen(this, function*() {
      if (to.binding !== undefined) yield* this.removeResult(to.parent, to.binding)
      const source = yield* this.editDirectoryResult(from.parent.id)
      source.entries.delete(key(from.name))
      yield* this.childChangedResult(from.parent.id)
      if (node.kind === "directory" && from.parent.id !== to.parent.id) {
        const before = yield* this.editDirectoryResult(from.parent.id)
        before.nlink--
        yield* this.changedResult(from.parent.id, ["ctime"])
        const after = yield* this.editDirectoryResult(to.parent.id)
        after.nlink++
        yield* this.changedResult(to.parent.id, ["ctime"])
        const moved = yield* this.editResult(node.id)
        if (moved.kind !== "directory") {
          return yield* Result.fail(new M.InvalidResource({ operation: this.operation, reason: "wrongKind" }))
        }
        moved.parent = to.parent.id
      }
      yield* this.insertResult(to.parent.id, to.name, node.id)
      yield* this.changedResult(node.id, ["ctime"])
    })
  }

  createResult(
    kind: Node["kind"],
    parent: DirectoryNode,
    modeInput: number | undefined,
    payload?: BytePath.BytePath
  ) {
    return Result.gen(this, function*() {
      const policy = this.caller.policy
      const requested = yield* modeResult(modeInput ?? (kind === "directory" ? 0o777 : 0o666), kind, this.operation)
      const now = DateTime.unixNanoFromNanoseconds(BigInt("0"))
      const common: Base = {
        id: this.engine.nextObject++,
        uid: policy.uid,
        gid: (parent.mode & SET_GID_BIT) !== 0 ? parent.gid : policy.gid,
        mode: kind === "symlink" ? 0o777 : requested & ~policy.umask,
        nlink: kind === "directory" ? BigInt("2") : BigInt("1"),
        revision: BigInt("1"),
        atime: now,
        mtime: now,
        ctime: now,
        birthtime: now
      }
      let node: Node
      if (kind === "directory") {
        if ((parent.mode & SET_GID_BIT) !== 0) common.mode |= SET_GID_BIT
        node = { ...common, kind, entries: new Map(), namespace: BigInt("1"), parent: parent.id }
        const edited = yield* this.editDirectoryResult(parent.id)
        edited.nlink++
        yield* this.changedResult(parent.id, ["ctime"])
      } else if (kind === "file") node = { ...common, kind, data: new Uint8Array(0) }
      else {
        if (payload === undefined || BytePath.byteLength(payload) === 0) {
          return yield* Result.fail(
            new M.InvalidInput({ operation: this.operation, field: "target", reason: "malformed" })
          )
        }
        yield* this.reserveResult(BigInt(BytePath.byteLength(payload)))
        node = { ...common, kind, target: payload }
      }
      this.changes.set(node.id, node)
      this.timeRequests.set(node.id, new Set(["atime", "mtime", "ctime", "birthtime"]))
      return node
    })
  }

  removeResult(parent: DirectoryNode, binding: Binding) {
    return Result.gen(this, function*() {
      const node = yield* this.editResult(binding.object)
      const directory = yield* this.editDirectoryResult(parent.id)
      directory.entries.delete(key(binding.name))
      yield* this.childChangedResult(parent.id)
      if (node.kind === "directory") {
        node.nlink = BigInt("0")
        node.parent = undefined
        const edited = yield* this.editDirectoryResult(parent.id)
        edited.nlink--
        yield* this.changedResult(parent.id, ["ctime"])
      } else node.nlink--
      yield* this.changedResult(node.id, ["ctime"])
    })
  }

  // ---------------------------------------------------------------------------
  // Atomic publication
  // ---------------------------------------------------------------------------

  transitionResult<A>(value: A) {
    return Result.gen(this, function*() {
      const engine = this.engine
      let capacityUnchanged = true
      for (const [id, node] of this.changes) {
        const before = engine.nodes.get(id)
        if (before === undefined || before.kind !== node.kind || before.nlink !== node.nlink) {
          capacityUnchanged = false
          break
        }
        const sameSize = before.kind === "directory" && node.kind === "directory"
          ? before.entries.size === node.entries.size
          : before.kind === "file" && node.kind === "file"
          ? before.data.length === node.data.length
          : before.kind === "symlink" && node.kind === "symlink" &&
            BytePath.byteLength(before.target) === BytePath.byteLength(node.target)
        if (!sameSize) {
          capacityUnchanged = false
          break
        }
      }
      // Completed releases sweep unlinked, unpinned nodes. Unchanged per-node
      // contributions therefore preserve the live map's membership and capacity.
      let removed: Set<bigint> | undefined
      let released: Set<bigint> | undefined
      let releasedEntries = 0
      let releasedContent = BigInt("0")
      let objectDelta = 0
      let entryDelta = 0
      let contentDelta = BigInt("0")
      if (!capacityUnchanged) {
        for (const [id, node] of this.changes) {
          const before = engine.nodes.get(id)
          const keep = node.nlink !== BigInt("0") || engine.pins.has(id)
          objectDelta += Number(keep) - Number(before !== undefined)
          if (before !== undefined) {
            if (before.kind === "directory") entryDelta -= before.entries.size
            else {contentDelta -= before.kind === "file"
                ? BigInt(before.data.length)
                : BigInt(BytePath.byteLength(before.target))}
          }
          if (keep) {
            if (node.kind === "directory") entryDelta += node.entries.size
            else {contentDelta += node.kind === "file"
                ? BigInt(node.data.length)
                : BigInt(BytePath.byteLength(node.target))}
          } else {
            removed ??= new Set()
            removed.add(id)
          }
        }
        for (const node of engine.releasedObjects()) {
          if (this.changes.has(node.id)) continue
          released ??= new Set()
          released.add(node.id)
          if (node.kind === "directory") releasedEntries += node.entries.size
          else {releasedContent += node.kind === "file"
              ? BigInt(node.data.length)
              : BigInt(BytePath.byteLength(node.target))}
        }
        const limits = engine.runtime.limits
        if (engine.nodes.size + objectDelta - (released?.size ?? 0) > limits.objects) {
          return yield* Result.fail(
            new M.LimitExceeded({ operation: this.operation, domain: "objects", stage: "publication" })
          )
        }
        if (engine.entryCount + entryDelta - releasedEntries > limits.entries) {
          return yield* Result.fail(
            new M.LimitExceeded({ operation: this.operation, domain: "entries", stage: "publication" })
          )
        }
        if (engine.contentBytes + contentDelta - releasedContent > limits.contentBytes) {
          return yield* Result.fail(
            new M.LimitExceeded({ operation: this.operation, domain: "content", stage: "publication" })
          )
        }
      }
      if (this.timeRequests.size > 0) {
        const now = engine.now()
        for (const [id, fields] of this.timeRequests) {
          const node = yield* this.editResult(id)
          let changed = false
          for (const field of fields) {
            if (node[field] !== now) {
              node[field] = now
              changed = true
            }
          }
          if (changed) node.revision++
        }
      }
      for (const product of this.products) {
        const node = yield* this.getResult(product.node.id)
        Object.assign(product.value, engine.observation(node))
      }
      const read = this.pendingRead
      const position = this.pendingPosition
      const caller = this.pendingCaller
      return {
        value,
        publish: () =>
          Result.gen(this, function*() {
            // NOTE: Clock may have changed the borrowed view. Validate before any publication.
            if (read !== undefined) {
              const destination = read.destination
              const length = yield* bufferLengthResult(destination.view, this.operation)
              if (
                length !== destination.count ||
                Reflect.get(Uint8Array.prototype, "buffer", destination.view) !== destination.backing ||
                Reflect.get(Uint8Array.prototype, "byteOffset", destination.view) !== destination.offset
              ) {
                return yield* Result.fail(
                  new M.InvalidInput({ operation: this.operation, field: "destination", reason: "invalidBuffer" })
                )
              }
            }
            if (caller !== undefined) yield* engine.retainResult(caller.policy, caller.resource)
            // A Clock callback may already have reclaimed a staged release candidate.
            if (released !== undefined) { for (const id of released) engine.reclaim(id) }
            if (removed !== undefined) { for (const id of removed) engine.nodes.delete(id) }
            for (const [id, node] of this.changes) if (!removed?.has(id)) engine.publishNode(node)
            engine.entryCount += entryDelta
            engine.contentBytes += contentDelta
            if (read !== undefined) Uint8Array.prototype.set.call(read.destination.view, read.bytes)
            if (position !== undefined) position.state.position = position.next
          })
      }
    })
  }
}

// -----------------------------------------------------------------------------
// Admission and request snapshots
// -----------------------------------------------------------------------------

/** @internal */
export const addressBytesResult = (
  target: M.Target | M.DirectorySelector,
  operation: string,
  limits: M.Limits
): Result.Result<bigint, M.InvalidInput | M.LimitExceeded> =>
  Result.gen(function*() {
    if (isString(target) || BytePath.isBytePath(target)) {
      const n = yield* pathLengthResult(target, operation)
      if (n === 0) return yield* Result.fail(new M.InvalidInput({ operation, field: "path", reason: "malformed" }))
      if (BigInt(n) > limits.pathBytes) {
        return yield* Result.fail(new M.LimitExceeded({ operation, domain: "path", stage: "admission" }))
      }
      return BigInt(n)
    }
    if (M.isToken(target) || isDirectoryHandle(target)) return BigInt("0")
    const entry = target
    if (!isOptions(entry) || entry.directory === undefined || entry.name === undefined) {
      return yield* Result.fail(new M.InvalidInput({ operation, field: "target", reason: "malformed" }))
    }
    const directory = yield* addressBytesResult(entry.directory, operation, limits)
    const name = yield* pathLengthResult(entry.name, operation)
    return directory + BigInt(name)
  })

// Entry snapshots retain the public address shape, not arbitrary structural
// extras or prototype members supplied by a narrower caller type.
export type TargetSnapshot<T extends M.Target> = T extends M.Path ? M.Path :
  T extends M.EntryAddress ? M.EntryAddress
  : T extends M.ObjectReference ? M.ObjectReference
  : M.Target

/** @internal */
export function snapshotTargetResult<T extends M.Target>(target: T): Result.Result<TargetSnapshot<T>>
export function snapshotTargetResult(target: M.Target) {
  if (isString(target) || BytePath.isBytePath(target) || M.isToken(target)) return Result.succeed(target)
  return Result.succeed({ directory: target.directory, name: target.name })
}

// NOTE: Validate scalars and size addresses before admission. Snapshot after reservation;
// resolve the namespace and current authority in the selected transaction.
/** @internal */
export const runAtomicResult = <A>(
  caller: Caller,
  operation: string,
  targets:
    | ReadonlyArray<M.Target | M.DirectorySelector>
    | (() => Result.Result<ReadonlyArray<M.Target | M.DirectorySelector>, M.OperationError>),
  validate: () => Result.Result<void, M.OperationError>,
  snapshot: (work: R.Work) => Result.Result<(tx: Transaction) => Result.Result<A, M.OperationError>, M.OperationError>,
  receiver: R.Resource = caller.resource,
  ticket?: R.Ticket
) =>
  caller.runtime.runResult(receiver, operation, () =>
    Result.gen(function*() {
      yield* validate()
      const supplied = typeof targets === "function" ? yield* targets() : targets
      let bytes = BigInt("0")
      for (const target of supplied) bytes += yield* addressBytesResult(target, operation, caller.runtime.limits)
      return {
        bytes,
        snapshot: (work) =>
          Result.map(snapshot(work), (body) => ({
            execute: () => {
              const tx = new Transaction(caller, work)
              return Result.flatMap(body(tx), (value) => tx.transitionResult(value))
            }
          }))
      }
    }), ticket)
