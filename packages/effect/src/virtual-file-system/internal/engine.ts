import * as BytePath from "../../BytePath.ts"
import * as Bytes from "../../Bytes.ts"
import * as ByteSize from "../../ByteSize.ts"
import * as DateTime from "../../DateTime.ts"
import type * as Effect from "../../Effect.ts"
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
  entries: Map<string, Binding>
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

export const createCaller = (engine: Engine, policy: Policy, resource: R.Resource): Caller => ({
  runtime: engine.runtime,
  inputLimits: engine.inputLimits,
  engineCell: resource.retainContext(engine),
  policy,
  resource
})

export const resolveEngine = (caller: Caller): Engine => {
  const engine = caller.engineCell.value
  if (engine === undefined) throw new Error("VFS Engine released before admitted execution finished")
  return engine
}

const weakSweep = (ref: WeakRef<Engine>): () => void => () => ref.deref()?.sweep()

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
  readonly object: Node
  readonly parent?: DirectoryNode
  readonly binding?: Binding
  readonly support?: ReadonlyArray<RouteEdge>
}

export const routeEdge = (parent: bigint, binding: Binding): RouteEdge => ({
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
): void => {
  directoryHandles.set(value, state)
}

const directoryHandleState = (candidate: unknown): DirectoryHandleState | undefined =>
  typeof candidate === "object" && candidate !== null ? directoryHandles.get(candidate) : undefined

// NOTE: Registration records issued views. Membership proves identity, while the
// retrieved resource and runtime are still checked before the handle is used.
export const isDirectoryHandle = (candidate: unknown): candidate is M.DirectoryHandle | M.SyncDirectoryHandle =>
  directoryHandleState(candidate) !== undefined

// -----------------------------------------------------------------------------
// Input validation and path values
// -----------------------------------------------------------------------------

const U32 = Schema.Number.check(Schema.isUint32())

const PermissionMode = Schema.Number.check(Schema.isInt(), Schema.isBetween({ minimum: 0, maximum: 0o3777 }))

const BooleanOptions = Schema.Record(Schema.String, Schema.Unknown)

export const checkOptions = (
  input: unknown,
  allowed: ReadonlyArray<string>,
  operation: string
): Record<string, unknown> | undefined => {
  if (input === undefined) return
  if (!Schema.is(BooleanOptions)(input)) return R.invalid(operation, "options")
  for (const key of Object.keys(input)) if (!allowed.includes(key)) return R.invalid(operation, key, "excessField")
  return input
}

export const identity = (input: unknown, operation: string, field: string): number => {
  if (!Schema.is(U32)(input)) return R.invalid(operation, field, "range")
  return input
}

export const mode = (input: unknown, kind: Node["kind"], operation: string): number => {
  if (!Schema.is(PermissionMode)(input) || (kind !== "directory" && input > 0o777)) {
    return R.invalid(operation, "mode", "unsupportedBits")
  }
  return input
}

export const bufferLength = (input: Uint8Array, operation: string): number => {
  const length = byteViewLength(input)
  return length === undefined ? R.invalid(operation, "data", "invalidBuffer") : length
}

const pathLength = (path: M.Path, operation: string): number => {
  if (BytePath.isBytePath(path)) return BytePath.byteLength(path)
  if (!Schema.is(Schema.String)(path)) return R.invalid(operation, "path")
  let total = 0
  for (let i = 0; i < path.length; i++) {
    const unit = path.charCodeAt(i)
    if (unit === 0) return R.invalid(operation, "path")
    if (unit < 128) total++
    else if (unit < 2048) total += 2
    else if (unit >= 0xd800 && unit <= 0xdbff) {
      const low = path.charCodeAt(++i)
      if (!(low >= 0xdc00 && low <= 0xdfff)) return R.invalid(operation, "path")
      total += 4
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return R.invalid(operation, "path")
    else total += 3
  }
  return total
}

export const pathValue = (path: M.Path, operation: string): BytePath.BytePath => {
  if (BytePath.isBytePath(path)) return path
  const result = BytePath.fromString(path)
  if (Result.isFailure(result)) return R.invalid(operation, "path")
  return result.success
}

export const key = (name: BytePath.BytePath): string => Hex.encode(BytePath.toBytes(name))

const dot = (bytes: Uint8Array): boolean => bytes.length === 1 && bytes[0] === CHAR_DOT

const dotdot = (bytes: Uint8Array): boolean => bytes.length === 2 && bytes[0] === CHAR_DOT && bytes[1] === CHAR_DOT

export const nameValue = (input: M.Path, operation: string): BytePath.BytePath => {
  const name = pathValue(input, operation)
  if (!Schema.is(M.Name)(name)) return R.invalid(operation, "name")
  return name
}

const fromBytes = (bytes: Uint8Array): BytePath.BytePath => Result.getOrThrow(BytePath.fromBytes(bytes))

export const asciiPath = (path: string): BytePath.BytePath => Result.getOrThrow(BytePath.fromString(path))

// -----------------------------------------------------------------------------
// Filesystem state
// -----------------------------------------------------------------------------

export class Engine {
  readonly runtime: R.Runtime
  readonly inputLimits: Readonly<Pick<M.Limits, "ioBytes" | "pathBytes">>
  readonly root: bigint
  readonly nodes = new Map<bigint, Node>()
  readonly pins = new Map<bigint, number>()
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

  now(): DateTime.UnixNano {
    const value = this.runtime.clock.currentTimeNanosUnsafe()
    if (!Schema.is(Schema.BigInt)(value)) throw new TypeError("Clock.currentTimeNanosUnsafe must return bigint")
    return DateTime.unixNanoFromNanoseconds(value)
  }

  pin(id: bigint): void {
    this.pins.set(id, (this.pins.get(id) ?? 0) + 1)
  }

  unpin(id: bigint): void {
    const n = this.pins.get(id)
    if (n === undefined) return
    if (n === 1) this.pins.delete(id)
    else this.pins.set(id, n - 1)
  }

  sweep(): void {
    for (const [id, node] of this.nodes) if (node.nlink === BigInt("0") && !this.pins.has(id)) this.nodes.delete(id)
  }

  retain(policy: Policy, resource: R.Resource): void {
    this.retainObjects(resource, [policy.root, policy.cwd, ...policy.boundaries])
  }

  retainObjects(resource: R.Resource, ids: Iterable<bigint>): void {
    const retained = new Set(ids)
    resource.releaseWith(() => {
      for (const id of retained) this.unpin(id)
    })
    for (const id of retained) this.pin(id)
  }

  usage(): M.Usage {
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

  metadata(node: Node): M.Metadata {
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

  reference(id: bigint): M.ObjectReference {
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

  get engine(): Engine {
    return resolveEngine(this.caller)
  }

  get operation(): string {
    return this.work.operation
  }

  // ---------------------------------------------------------------------------
  // Staged changes and observations
  // ---------------------------------------------------------------------------

  stagePosition(state: FileState, next: bigint): void {
    this.pendingPosition = { state, next }
  }

  stageBorrowedRead(destination: BorrowedDestination, bytes: Uint8Array): void {
    this.pendingRead = { destination, bytes }
  }

  stageCallerRetention(caller: Caller): void {
    this.pendingCaller = caller
  }

  get(id: bigint): Node {
    const node = this.changes.get(id) ?? this.engine.nodes.get(id)
    if (node === undefined) {
      throw new M.InvalidResource({ operation: this.operation, reason: "stale" })
    }
    return node
  }

  edit(id: bigint): Node {
    let node = this.changes.get(id)
    if (node !== undefined) return node
    const before = this.get(id)
    node = before.kind === "directory" ? { ...before, entries: new Map(before.entries) } : { ...before }
    this.changes.set(id, node)
    return node
  }

  directory(id: bigint): DirectoryNode {
    const node = this.get(id)
    if (node.kind !== "directory") return this.wrongKind()
    return node
  }

  private editDirectory(id: bigint): DirectoryNode {
    const node = this.edit(id)
    if (node.kind !== "directory") return this.wrongKind()
    return node
  }

  wrongKind(): never {
    throw new M.InvalidResource({ operation: this.operation, reason: "wrongKind" })
  }

  visit(amount = 1): void {
    this.engine.runtime.visit(this.work.ticket, this.operation, amount)
  }

  findBinding(directory: DirectoryNode, object: bigint): Binding | undefined {
    for (const binding of directory.entries.values()) {
      this.visit()
      if (binding.object === object) return binding
    }
  }

  listBindings(directory: DirectoryNode): ReadonlyArray<Binding> {
    this.visit(directory.entries.size)
    return Array.from(directory.entries.values()).sort((left, right) => BytePath.Order(left.name, right.name))
  }

  reserve(bytes: bigint): void {
    this.work.reserve(bytes)
  }

  observation(node: Node): M.ObjectObservation {
    const value = this.engine.observation(node)
    this.products.push({ node, value })
    return value
  }

  explicitTime(id: bigint, field: "atime" | "mtime", value: DateTime.UnixNano): void {
    this.edit(id)[field] = value
    this.timeRequests.get(id)?.delete(field)
  }

  touch(id: bigint, fields: ReadonlyArray<"atime" | "mtime" | "ctime">): void {
    this.edit(id)
    let requested = this.timeRequests.get(id)
    if (requested === undefined) {
      requested = new Set()
      this.timeRequests.set(id, requested)
    }
    for (const field of fields) requested.add(field)
  }

  changed(id: bigint, fields: ReadonlyArray<"atime" | "mtime" | "ctime">): void {
    this.edit(id).revision++
    this.touch(id, fields)
  }

  private childChanged(id: bigint): void {
    this.editDirectory(id).namespace++
    this.changed(id, ["mtime", "ctime"])
  }

  // ---------------------------------------------------------------------------
  // Authority and path resolution
  // ---------------------------------------------------------------------------

  token(value: unknown, kind: M.TokenKind, id?: bigint): M.TokenInfo {
    const info = M.tokenInfo(value)
    if (info === undefined || info.kind !== kind) return R.invalid(this.operation, "token")
    if (info.instance !== this.engine.runtime.instanceNumber) {
      throw new M.InvalidResource({ operation: this.operation, reason: "foreign" })
    }
    if (id !== undefined && info.object !== id) return R.invalid(this.operation, "token", "wrongObjectToken")
    return info
  }

  permission(node: Node, requested: number): boolean {
    const p = this.caller.policy
    if (p.privileged) return true
    const shift = node.uid === p.uid ? 6 : node.gid === p.gid || p.groups.includes(node.gid) ? 3 : 0
    return (((node.mode >> shift) & requested) === requested)
  }

  require(node: Node, requested: number): void {
    if (!this.permission(node, requested)) throw new M.AccessDenied({ operation: this.operation, reason: "permission" })
  }

  owns(node: Node): void {
    if (!this.caller.policy.privileged && this.caller.policy.uid !== node.uid) {
      throw new M.AccessDenied({ operation: this.operation, reason: "ownership" })
    }
  }

  contained(id: bigint, root: bigint): boolean {
    const seen = new Set<bigint>()
    while (true) {
      this.visit()
      if (id === root) return true
      if (seen.has(id)) return false
      seen.add(id)
      const node = this.get(id)
      if (node.kind !== "directory" || node.parent === undefined) return false
      id = node.parent
    }
  }

  authority(relative = false): void {
    const p = this.caller.policy
    if (
      !this.contained(p.root, this.engine.root) || p.boundaries.some((boundary) => !this.contained(p.root, boundary)) ||
      (relative && !this.contained(p.cwd, p.root))
    ) throw new M.AccessDenied({ operation: this.operation, reason: "confinement" })
  }

  referenceRoute(value: M.ObjectReference): Route {
    const info = this.token(value, "object")
    this.get(info.object)
    this.authority()
    const stack: Array<{ readonly node: DirectoryNode; readonly support: ReadonlyArray<RouteEdge> }> = [{
      node: this.directory(this.caller.policy.root),
      support: []
    }]
    const seen = new Set<bigint>()
    for (let pending = stack.pop(); pending !== undefined; pending = stack.pop()) {
      const { node: dir, support } = pending
      this.visit()
      if (dir.id === info.object) return { object: dir, support }
      if (seen.has(dir.id)) continue
      seen.add(dir.id)
      if (!this.permission(dir, EXECUTE_PERMISSION)) continue
      for (const binding of dir.entries.values()) {
        this.visit()
        const node = this.get(binding.object)
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
    throw new M.AccessDenied({ operation: this.operation, reason: "temporarilyInaccessibleReference" })
  }

  selectDirectoryRoute(
    selector: M.DirectorySelector,
    state: ResolutionState = { follows: 0 }
  ): Route & { readonly object: DirectoryNode } {
    let route: Route
    if (Schema.is(Schema.String)(selector) || BytePath.isBytePath(selector)) {
      route = this.resolve(pathValue(selector, this.operation), true, undefined, state.follows, [], state)
    } else if (M.isToken(selector)) {
      route = this.referenceRoute(selector)
    } else {
      const handle = directoryHandleState(selector)
      if (handle === undefined) return R.invalid(this.operation, "directory")
      if (handle.caller.runtime !== this.caller.runtime) {
        throw new M.InvalidResource({ operation: this.operation, reason: "foreign" })
      }
      if (handle.resource.state !== "open") throw R.closed(this.operation, handle.resource.state)
      this.work.borrow(handle.resource)
      route = this.referenceRoute(this.engine.reference(handle.id))
    }
    if (route.object.kind !== "directory") return this.wrongKind()
    return { ...route, object: route.object }
  }

  selectDirectory(selector: M.DirectorySelector, state: ResolutionState = { follows: 0 }): DirectoryNode {
    return this.selectDirectoryRoute(selector, state).object
  }

  consumeLink(state: ResolutionState): void {
    if (++state.follows > this.engine.runtime.limits.symlinkFollows) {
      throw new M.InvalidResource({ operation: this.operation, reason: "symlinkLimit" })
    }
  }

  resolve(
    path: BytePath.BytePath,
    followFinal: boolean,
    start?: bigint,
    follows = 0,
    inherited: ReadonlyArray<RouteEdge> = [],
    state: ResolutionState = { follows }
  ): Route {
    if (state.follows > this.engine.runtime.limits.symlinkFollows) {
      throw new M.InvalidResource({ operation: this.operation, reason: "symlinkLimit" })
    }
    let charge = BigInt(BytePath.byteLength(path))
    if (charge === BigInt("0")) return R.invalid(this.operation, "path")
    if (follows === 0 && charge > this.engine.runtime.limits.pathBytes) {
      return R.limit(this.operation, "path", "resolution")
    }
    if (charge > this.engine.runtime.limits.expandedPathBytes) {
      return R.limit(this.operation, "expandedPath", "resolution")
    }
    this.reserve(charge)
    try {
      let bytes = BytePath.toBytes(path)
      let base = start
      const support = [...inherited]
      while (true) {
        const absolute = bytes[0] === CHAR_FORWARD_SLASH
        this.authority(!absolute && base === undefined)
        let id = absolute ? this.caller.policy.root : base ?? this.caller.policy.cwd
        const components: Array<Uint8Array> = []
        for (let first = 0, i = 0; i <= bytes.length; i++) {
          if (i === bytes.length || bytes[i] === CHAR_FORWARD_SLASH) {
            if (i > first) components.push(bytes.subarray(first, i))
            first = i + 1
          }
        }
        let route: Route = { object: this.directory(id), support }
        this.visit()
        let expanded = false
        for (let index = 0; index < components.length; index++) {
          const component = components[index]
          const directory = this.directory(id)
          this.require(directory, EXECUTE_PERMISSION)
          this.visit()
          if (dot(component)) {
            route = { object: directory, support }
            continue
          }
          if (dotdot(component)) {
            this.visit()
            id = id === this.caller.policy.root ? id : directory.parent ?? id
            route = { object: this.directory(id), support }
            continue
          }
          const name = fromBytes(component)
          const binding = directory.entries.get(key(name))
          if (binding === undefined) throw new M.NotFound({ operation: this.operation, reason: "missingEntry" })
          const node = this.get(binding.object)
          support.push({ parent: directory.id, name: binding.name, version: binding.version, object: node.id })
          route = { object: node, parent: directory, binding, support }
          const terminal = index === components.length - 1
          if (node.kind === "symlink" && (!terminal || followFinal)) {
            this.consumeLink(state)
            let length = BytePath.byteLength(node.target)
            for (let rest = index + 1; rest < components.length; rest++) length += 1 + components[rest].length
            if (bytes[bytes.length - 1] === CHAR_FORWARD_SLASH) length++
            const nextCharge = BigInt(length)
            if (nextCharge > this.engine.runtime.limits.expandedPathBytes) {
              return R.limit(this.operation, "expandedPath", "resolution")
            }
            if (nextCharge > charge) this.reserve(nextCharge - charge)
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
          if (!terminal && node.kind !== "directory") return this.wrongKind()
        }
        if (expanded) continue
        if (bytes[bytes.length - 1] === CHAR_FORWARD_SLASH && route.object.kind !== "directory") return this.wrongKind()
        return route
      }
    } finally {
      this.work.release(charge)
    }
  }

  // ---------------------------------------------------------------------------
  // Retained routes and target selection
  // ---------------------------------------------------------------------------

  retainRoute(
    owner: R.Resource,
    request:
      | { readonly kind: "traversal"; readonly route: Route; readonly outputBytes: bigint }
      | { readonly kind: "frame"; readonly route: Route | SavedRoute }
  ): { readonly route: SavedRoute; readonly resource: R.Resource } {
    const route = request.route
    const id = "object" in route ? route.object.id : route.id
    const support = "object" in route ? route.support ?? [] : route.support
    const frameResource = request.kind === "frame" ? this.work.acquireResource("lease", owner) : undefined
    const framePins = request.kind === "frame" ? new Set(support.map((edge) => edge.parent)) : undefined
    if (framePins !== undefined && this.engine.nodes.get(id)?.kind === "directory") framePins.add(id)
    let bytes = request.kind === "traversal" ? request.outputBytes : BigInt("0")
    for (const edge of support) bytes += BigInt(BytePath.byteLength(edge.name))
    this.reserve(bytes)
    const resource = frameResource ?? this.work.acquireResource("lease", owner)
    this.work.retain(bytes, resource)
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
        if (this.get(edge.object).kind !== "file") identities.add(edge.object)
      }
      if (request.route.object.kind !== "file") identities.add(id)
    }
    this.engine.retainObjects(resource, identities)
    return { route: saved, resource }
  }

  validateRoute(saved: SavedRoute): Route {
    this.authority()
    let final: Route | undefined
    for (const edge of saved.support) {
      this.visit()
      const parentNode = this.engine.nodes.get(edge.parent)
      if (parentNode === undefined || parentNode.kind !== "directory") {
        throw new M.NamespaceChanged({ operation: this.operation, reason: "selectedBindingLost" })
      }
      const parent = this.directory(edge.parent)
      if (!this.contained(parent.id, this.caller.policy.root)) {
        throw new M.AccessDenied({ operation: this.operation, reason: "confinement" })
      }
      this.require(parent, EXECUTE_PERMISSION)
      const binding = parent.entries.get(key(edge.name))
      if (binding?.version !== edge.version || binding.object !== edge.object) {
        throw new M.NamespaceChanged({ operation: this.operation, reason: "selectedBindingLost" })
      }
      final = { object: this.get(binding.object), parent, binding, support: saved.support }
    }
    const node = this.get(saved.id)
    if (node.kind === "directory" && !this.contained(node.id, this.caller.policy.root)) {
      throw new M.AccessDenied({ operation: this.operation, reason: "confinement" })
    }
    if (final?.object.id === saved.id) return final
    return { object: node, support: saved.support }
  }

  childRoute(saved: SavedRoute, name: BytePath.BytePath, followFinal = false): Route {
    const route = this.validateRoute(saved)
    if (route.object.kind !== "directory") return this.wrongKind()
    return this.resolve(name, followFinal, route.object.id, 0, saved.support)
  }

  followRoute(saved: SavedRoute): Route {
    const route = this.validateRoute(saved)
    if (route.object.kind !== "symlink") return route
    if (route.parent === undefined) return this.wrongKind()
    const state: ResolutionState = { follows: 0 }
    this.consumeLink(state)
    return this.resolve(route.object.target, true, route.parent.id, state.follows, saved.support, state)
  }

  target(target: M.Target, followFinal = true, state: ResolutionState = { follows: 0 }): Route {
    if (Schema.is(Schema.String)(target) || BytePath.isBytePath(target)) {
      return this.resolve(pathValue(target, this.operation), followFinal, undefined, state.follows, [], state)
    }
    if (M.isToken(target)) return this.referenceRoute(target)
    const address = target
    if (!Schema.is(BooleanOptions)(address)) return R.invalid(this.operation, "target")
    const directory = this.selectDirectory(address.directory, state)
    this.require(directory, EXECUTE_PERMISSION)
    const name = nameValue(address.name, this.operation)
    this.visit()
    const binding = directory.entries.get(key(name))
    if (binding === undefined) throw new M.NotFound({ operation: this.operation, reason: "missingEntry" })
    const node = this.get(binding.object)
    if (node.kind === "symlink" && followFinal) {
      this.consumeLink(state)
      return this.resolve(node.target, true, directory.id, state.follows, [{
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
  }

  slot(
    target: M.EntryTarget,
    start?: bigint,
    state: ResolutionState = { follows: 0 },
    allowMissingDirectory = false
  ): EntrySlot {
    let parent: DirectoryNode
    let name: BytePath.BytePath
    if (Schema.is(Schema.String)(target) || BytePath.isBytePath(target)) {
      const bytes = BytePath.toBytes(pathValue(target, this.operation))
      let end = bytes.length
      while (end > 0 && bytes[end - 1] === CHAR_FORWARD_SLASH) end--
      if (end === 0) throw new M.AccessDenied({ operation: this.operation, reason: "confinement" })
      let slash = end - 1
      while (slash >= 0 && bytes[slash] !== CHAR_FORWARD_SLASH) slash--
      name = nameValue(fromBytes(bytes.subarray(slash + 1, end)), this.operation)
      const parentPath = slash < 0 ? asciiPath(".") : slash === 0 ? asciiPath("/") : fromBytes(bytes.subarray(0, slash))
      const node = this.resolve(parentPath, true, start, state.follows, [], state).object
      if (node.kind !== "directory") return this.wrongKind()
      parent = node
    } else {
      if (!Schema.is(BooleanOptions)(target)) return R.invalid(this.operation, "target")
      parent = this.selectDirectory(target.directory, state)
      name = nameValue(target.name, this.operation)
    }
    if (BigInt(BytePath.byteLength(name)) > this.engine.runtime.limits.nameBytes) {
      return R.limit(this.operation, "name", "resolution")
    }
    this.require(parent, EXECUTE_PERMISSION)
    this.visit()
    const binding = parent.entries.get(key(name))
    if ((Schema.is(Schema.String)(target) || BytePath.isBytePath(target))) {
      const bytes = BytePath.toBytes(pathValue(target, this.operation))
      if (bytes[bytes.length - 1] === CHAR_FORWARD_SLASH) {
        if (binding === undefined && !allowMissingDirectory) {
          throw new M.NotFound({ operation: this.operation, reason: "missingEntry" })
        }
        if (binding !== undefined && this.get(binding.object).kind !== "directory") return this.wrongKind()
      }
    }
    return { parent, name, binding }
  }

  followFinalSlot(initial: EntrySlot, state: ResolutionState, noFollow = false): EntrySlot {
    let slot = initial
    const seen = new Set<string>()
    while (slot.binding !== undefined) {
      const node = this.get(slot.binding.object)
      if (node.kind !== "symlink") break
      if (noFollow) throw new M.InvalidResource({ operation: this.operation, reason: "refusedSymlink" })
      const routeKey = `${node.id}:${slot.parent.id}`
      if (seen.has(routeKey)) throw new M.InvalidResource({ operation: this.operation, reason: "symlinkCycle" })
      seen.add(routeKey)
      this.consumeLink(state)
      const bytes = BytePath.toBytes(node.target)
      let start = bytes.length
      while (start > 0 && bytes[start - 1] !== CHAR_FORWARD_SLASH) start--
      const length = bytes.length - start
      if (
        bytes.at(-1) === CHAR_FORWARD_SLASH || (length === 1 && bytes[start] === CHAR_DOT) ||
        (length === 2 && bytes[start] === CHAR_DOT && bytes[start + 1] === CHAR_DOT)
      ) {
        this.resolve(node.target, false, slot.parent.id, state.follows, [], state)
        return this.wrongKind()
      }
      slot = this.slot(node.target, slot.parent.id, state)
    }
    return slot
  }

  entry(parent: DirectoryNode, name: BytePath.BytePath, binding: Binding | undefined): M.EntryObservation {
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
    if (binding === undefined) return { ...context, state: "absent" }
    return {
      ...context,
      state: "present",
      binding: M.issueToken("binding", this.engine.runtime.instanceNumber, parent.id, binding.version),
      object: this.observation(this.get(binding.object))
    }
  }

  // ---------------------------------------------------------------------------
  // Conditions and namespace changes
  // ---------------------------------------------------------------------------

  conditions(
    parent: DirectoryNode,
    binding: Binding | undefined,
    options: M.DestinationConditions | M.EntryConditions | undefined
  ): void {
    if (options?.parentNamespace !== undefined) {
      const token = this.token(options.parentNamespace, "namespace", parent.id)
      if (token.version !== parent.namespace) {
        throw new M.ConditionFailed({ operation: this.operation, reason: "parentNamespaceRevision" })
      }
    }
    const guard = options?.entry
    if (guard === undefined) return
    if (guard.expected === "absent") {
      if (binding !== undefined) throw new M.ConditionFailed({ operation: this.operation, reason: "absence" })
    } else if (guard.expected === "present") {
      const token = this.token(guard.object, "object")
      if (binding?.object !== token.object) throw new M.ConditionFailed({ operation: this.operation, reason: "object" })
    } else if (guard.expected === "binding") {
      const token = this.token(guard.binding, "binding", parent.id)
      if (binding?.version !== token.version) {
        throw new M.ConditionFailed({ operation: this.operation, reason: "binding" })
      }
    } else return R.invalid(this.operation, "conditions")
  }

  revision(node: Node, condition: M.RevisionCondition | undefined): void {
    if (condition?.expectedRevision === undefined) return
    const token = this.token(condition.expectedRevision, "revision", node.id)
    if (token.version !== node.revision) {
      throw new M.ConditionFailed({ operation: this.operation, reason: "objectRevision" })
    }
  }

  sticky(parent: DirectoryNode, victim: Node): void {
    this.require(parent, WRITE_PERMISSION | EXECUTE_PERMISSION)
    if (
      (parent.mode & STICKY_BIT) !== 0 && !this.caller.policy.privileged && this.caller.policy.uid !== parent.uid &&
      this.caller.policy.uid !== victim.uid
    ) {
      throw new M.AccessDenied({ operation: this.operation, reason: "ownership" })
    }
  }

  insert(parentId: bigint, name: BytePath.BytePath, object: bigint): Binding {
    this.reserve(BigInt(BytePath.byteLength(name)))
    const binding = { name, object, version: this.engine.nextBinding++ }
    this.editDirectory(parentId).entries.set(key(name), binding)
    this.childChanged(parentId)
    return binding
  }

  hardLink(node: FileNode | SymlinkNode, destination: EntrySlot): void {
    this.edit(node.id).nlink++
    this.changed(node.id, ["ctime"])
    this.insert(destination.parent.id, destination.name, node.id)
  }

  move(from: EntrySlot, to: EntrySlot, node: Node): void {
    if (to.binding !== undefined) this.remove(to.parent, to.binding)
    this.editDirectory(from.parent.id).entries.delete(key(from.name))
    this.childChanged(from.parent.id)
    if (node.kind === "directory" && from.parent.id !== to.parent.id) {
      this.editDirectory(from.parent.id).nlink--
      this.changed(from.parent.id, ["ctime"])
      this.editDirectory(to.parent.id).nlink++
      this.changed(to.parent.id, ["ctime"])
      const moved = this.edit(node.id)
      if (moved.kind !== "directory") return this.wrongKind()
      moved.parent = to.parent.id
    }
    this.insert(to.parent.id, to.name, node.id)
    this.changed(node.id, ["ctime"])
  }

  create(kind: Node["kind"], parent: DirectoryNode, modeInput: number | undefined, payload?: BytePath.BytePath): Node {
    const policy = this.caller.policy
    const requested = mode(modeInput ?? (kind === "directory" ? 0o777 : 0o666), kind, this.operation)
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
      const edited = this.editDirectory(parent.id)
      edited.nlink++
      this.changed(parent.id, ["ctime"])
    } else if (kind === "file") node = { ...common, kind, data: new Uint8Array(0) }
    else {
      if (payload === undefined || BytePath.byteLength(payload) === 0) return R.invalid(this.operation, "target")
      this.reserve(BigInt(BytePath.byteLength(payload)))
      node = { ...common, kind, target: payload }
    }
    this.changes.set(node.id, node)
    this.timeRequests.set(node.id, new Set(["atime", "mtime", "ctime", "birthtime"]))
    return node
  }

  remove(parent: DirectoryNode, binding: Binding): void {
    const node = this.edit(binding.object)
    this.editDirectory(parent.id).entries.delete(key(binding.name))
    this.childChanged(parent.id)
    if (node.kind === "directory") {
      node.nlink = BigInt("0")
      node.parent = undefined
      this.editDirectory(parent.id).nlink--
      this.changed(parent.id, ["ctime"])
    } else node.nlink--
    this.changed(node.id, ["ctime"])
  }

  // ---------------------------------------------------------------------------
  // Atomic publication
  // ---------------------------------------------------------------------------

  transition<A>(value: A): R.Transition<A> {
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
    let all: Map<bigint, Node> | undefined
    if (!capacityUnchanged) {
      let objects = engine.nodes.size
      let entries = 0
      let content = BigInt("0")
      all = new Map(engine.nodes)
      for (const [id, node] of this.changes) all.set(id, node)
      for (const [id, node] of all) if (node.nlink === BigInt("0") && !engine.pins.has(id)) all.delete(id)
      objects = all.size
      for (const node of all.values()) {
        if (node.kind === "directory") entries += node.entries.size
        else if (node.kind === "file") content += BigInt(node.data.length)
        else content += BigInt(BytePath.byteLength(node.target))
      }
      const limits = engine.runtime.limits
      if (objects > limits.objects) return R.limit(this.operation, "objects", "publication")
      if (entries > limits.entries) return R.limit(this.operation, "entries", "publication")
      if (content > limits.contentBytes) return R.limit(this.operation, "content", "publication")
    }
    if (this.timeRequests.size > 0) {
      const now = engine.now()
      for (const [id, fields] of this.timeRequests) {
        const node = this.edit(id)
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
    for (const product of this.products) Object.assign(product.value, engine.observation(this.get(product.node.id)))
    const read = this.pendingRead
    const position = this.pendingPosition
    const caller = this.pendingCaller
    return {
      value,
      publish: () => {
        // NOTE: Clock may have changed the borrowed view. Validate before any publication.
        if (read !== undefined) {
          const destination = read.destination
          if (
            bufferLength(destination.view, this.operation) !== destination.count ||
            Reflect.get(Uint8Array.prototype, "buffer", destination.view) !== destination.backing ||
            Reflect.get(Uint8Array.prototype, "byteOffset", destination.view) !== destination.offset
          ) return R.invalid(this.operation, "destination", "invalidBuffer")
        }
        if (caller !== undefined) engine.retain(caller.policy, caller.resource)
        if (all !== undefined) {
          for (const id of engine.nodes.keys()) if (!all.has(id)) engine.nodes.delete(id)
        }
        for (const [id, node] of this.changes) if (all === undefined || all.has(id)) engine.nodes.set(id, node)
        if (read !== undefined) Uint8Array.prototype.set.call(read.destination.view, read.bytes)
        if (position !== undefined) position.state.position = position.next
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Admission and request snapshots
// -----------------------------------------------------------------------------

export const addressBytes = (target: M.Target | M.DirectorySelector, operation: string, limits: M.Limits): bigint => {
  if (Schema.is(Schema.String)(target) || BytePath.isBytePath(target)) {
    const n = pathLength(target, operation)
    if (n === 0) return R.invalid(operation, "path")
    if (BigInt(n) > limits.pathBytes) return R.limit(operation, "path", "admission")
    return BigInt(n)
  }
  if (M.isToken(target) || isDirectoryHandle(target)) return BigInt("0")
  const entry = target
  if (!Schema.is(BooleanOptions)(entry) || entry.directory === undefined || entry.name === undefined) {
    return R.invalid(operation, "target")
  }
  return addressBytes(entry.directory, operation, limits) + BigInt(pathLength(entry.name, operation))
}

// Entry snapshots retain the public address shape, not arbitrary structural
// extras or prototype members supplied by a narrower caller type.
export type TargetSnapshot<T extends M.Target> = T extends M.Path ? M.Path :
  T extends M.EntryAddress ? M.EntryAddress
  : T extends M.ObjectReference ? M.ObjectReference
  : M.Target

export function snapshotTarget<T extends M.Target>(target: T): TargetSnapshot<T>
export function snapshotTarget(target: M.Target): M.Target {
  if (Schema.is(Schema.String)(target) || BytePath.isBytePath(target) || M.isToken(target)) {
    return target
  }
  return { directory: target.directory, name: target.name }
}

// NOTE: Validate scalars and size addresses before admission. Snapshot after reservation;
// resolve the namespace and current authority in the selected transaction.
export const runAtomic = <A>(
  caller: Caller,
  operation: string,
  targets: ReadonlyArray<M.Target | M.DirectorySelector> | (() => ReadonlyArray<M.Target | M.DirectorySelector>),
  validate: () => void,
  snapshot: (work: R.Work) => (tx: Transaction) => A,
  receiver: R.Resource = caller.resource,
  ticket?: R.Ticket
): Effect.Effect<A, M.OperationError> =>
  caller.runtime.run(receiver, operation, () => {
    validate()
    const supplied = typeof targets === "function" ? targets() : targets
    return {
      bytes: supplied.reduce(
        (total, target) => total + addressBytes(target, operation, caller.runtime.limits),
        BigInt("0")
      ),
      snapshot: (work) => {
        const body = snapshot(work)
        return {
          execute: () => {
            const tx = new Transaction(caller, work)
            return tx.transition(body(tx))
          }
        }
      }
    }
  }, ticket)
