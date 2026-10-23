import * as BytePath from "../../BytePath.ts"
import * as Bytes from "../../Bytes.ts"
import * as ByteSize from "../../ByteSize.ts"
import * as Clock from "../../Clock.ts"
import * as Effect from "../../Effect.ts"
import * as Result from "../../Result.ts"
import * as Schema from "../../Schema.ts"
import * as Stream from "../../Stream.ts"
import * as E from "./engine.ts"
import * as M from "./model.ts"
import * as R from "./runtime.ts"

// -----------------------------------------------------------------------------
// Capture records and validation
// -----------------------------------------------------------------------------

const CAPTURE_TRAVERSAL_DEFAULTS = {
  records: 131072,
  payloadBytes: ByteSize.mebibytes(128),
  stagingBytes: ByteSize.mebibytes(256)
}

const zero = BigInt(0)

const one = BigInt(1)

const two = BigInt(2)

type SnapshotRecord =
  | Exclude<M.CaptureRecord, M.FileRecord>
  | (Omit<M.FileRecord, "data"> & { readonly data: Uint8Array<ArrayBuffer> })

type PrimaryRecord = Exclude<SnapshotRecord, M.AliasRecord>

type Graph = ReadonlyArray<SnapshotRecord>

// Only captureValue registers captures. Restore probes raw candidates without claiming issued identity first.
const captures = new WeakMap<object, Graph>()

function invalidRestore(reason: M.InvalidRestore["reason"]): never {
  throw new M.InvalidRestore({ operation: "restore", reason })
}

const evaluate = <A>(body: () => A): Effect.Effect<A, M.VirtualFileSystemError> =>
  Effect.try({
    try: body,
    catch: (error) => {
      if (error instanceof M.InvalidRestore || R.expected(error)) return error
      // NOTE: Restore preserves unexpected producer/runtime exceptions as defects.
      throw error
    }
  })

const traversalEvaluate = <A>(body: () => A): Effect.Effect<A, M.InvalidInput | M.InvalidResource | M.LimitExceeded> =>
  Effect.try({
    try: body,
    catch: (error) => {
      if (error instanceof M.InvalidInput || error instanceof M.InvalidResource || error instanceof M.LimitExceeded) {
        return error
      }
      // NOTE: Record traversal has a narrower failure contract than whole-filesystem restore.
      throw error
    }
  })

const semantic = (node: E.Node): M.SemanticMetadata =>
  Object.freeze({
    objectNumber: node.id,
    uid: node.uid,
    gid: node.gid,
    mode: node.mode,
    atime: node.atime,
    mtime: node.mtime,
    ctime: node.ctime,
    birthtime: node.birthtime
  })

const dataLength = (input: unknown): number => {
  const length = byteViewLength(input)
  return length === undefined ? invalidRestore("record") : length
}

const payload = (record: M.CaptureRecord): bigint => {
  const name = record._tag === "root" ? zero : BigInt(BytePath.byteLength(record.name))
  return name +
    (record._tag === "file"
      ? BigInt(dataLength(record.data))
      : record._tag === "symlink"
      ? BigInt(BytePath.byteLength(record.target))
      : zero)
}

const copyBytes = (input: Uint8Array): Uint8Array<ArrayBuffer> => {
  const output = new Uint8Array(dataLength(input))
  Uint8Array.prototype.set.call(output, input)
  return output
}

const copy = (record: M.CaptureRecord): SnapshotRecord => {
  if (record._tag === "alias") return { ...record }
  if (record._tag === "file") return { ...record, metadata: { ...record.metadata }, data: copyBytes(record.data) }
  return { ...record, metadata: { ...record.metadata } }
}

const records = (
  graph: Graph,
  options?: M.CaptureTraversalOptions
): Stream.Stream<M.CaptureRecord, M.InvalidInput | M.InvalidResource | M.LimitExceeded> =>
  Stream.unwrap(traversalEvaluate(() => {
    const operation = "capture.records"
    E.checkOptions(options, ["records", "payloadBytes", "stagingBytes"], operation)
    const maxRecords = options?.records === undefined
      ? CAPTURE_TRAVERSAL_DEFAULTS.records
      : R.count(options.records, operation, "records")
    const maxPayload = options?.payloadBytes === undefined
      ? CAPTURE_TRAVERSAL_DEFAULTS.payloadBytes
      : R.size(options.payloadBytes, operation, "payloadBytes")
    const maxStaging = options?.stagingBytes === undefined
      ? CAPTURE_TRAVERSAL_DEFAULTS.stagingBytes
      : R.size(options.stagingBytes, operation, "stagingBytes")
    return Stream.unfold({ index: 0, bytes: zero }, (state) =>
      traversalEvaluate(() => {
        if (state.index >= graph.length) return undefined
        if (state.index >= maxRecords) R.limit(operation, "records", "traversal")
        const record = graph[state.index]
        const bytes = payload(record)
        if (bytes > maxPayload - state.bytes) R.limit(operation, "payload", "traversal")
        if (bytes > maxStaging) R.limit(operation, "transient", "reservation")
        return [copy(record), { index: state.index + 1, bytes: state.bytes + bytes }] as const
      }))
  }))

const captureValue = (graph: Graph): M.Capture => {
  const value: M.Capture = Object.freeze<M.Capture>({
    [M.CaptureTypeId]: M.CaptureTypeId,
    records: (options?: M.CaptureTraversalOptions) => records(graph, options)
  })
  captures.set(value, graph)
  return value
}

// -----------------------------------------------------------------------------
// Graph capture
// -----------------------------------------------------------------------------

interface Pending {
  readonly object: bigint
  readonly parentId?: bigint | undefined
  readonly name?: BytePath.BytePath | undefined
}

interface Planned {
  readonly node: E.Node
  readonly id: bigint
  readonly parentId?: bigint | undefined
  readonly name?: BytePath.BytePath | undefined
  readonly alias: boolean
}

export const capture = (engine: E.Engine): Effect.Effect<M.Capture, M.OperationError> =>
  Effect.acquireUseRelease(
    R.evaluate(() => engine.runtime.resource("lease", "capture")),
    (receiver) =>
      engine.runtime.run(receiver, "capture", () => ({
        bytes: zero,
        snapshot: (work) => ({
          execute: () => {
            const stack: Array<Pending> = [{ object: engine.root }]
            const ids = new Map<bigint, bigint>()
            const plan: Array<Planned> = []
            let bytes = zero
            for (let pending = stack.pop(); pending !== undefined; pending = stack.pop()) {
              engine.runtime.visit(work.ticket, "capture")
              const node = engine.nodes.get(pending.object)
              if (node === undefined) throw new TypeError("Unreachable VFS binding during capture")
              const prior = ids.get(node.id)
              const id = prior ?? BigInt(ids.size + 1)
              plan.push({ ...pending, node, id, alias: prior !== undefined })
              if (pending.name !== undefined) bytes += BigInt(BytePath.byteLength(pending.name))
              if (prior !== undefined) continue
              ids.set(node.id, id)
              if (node.kind === "file") bytes += BigInt(node.data.length)
              else if (node.kind === "symlink") bytes += BigInt(BytePath.byteLength(node.target))
              else {
                const entries = Array.from(node.entries.values()).sort((a, b) => BytePath.Order(a.name, b.name))
                for (let index = entries.length - 1; index >= 0; index--) {
                  const entry = entries[index]
                  stack.push({ object: entry.object, parentId: id, name: entry.name })
                }
              }
            }
            work.reserve(bytes)
            const graph: Array<SnapshotRecord> = []
            for (const item of plan) {
              const node = item.node
              if (item.parentId === undefined) {
                if (node.kind !== "directory") throw new TypeError("The VFS root must be a directory")
                graph.push(Object.freeze({ _tag: "root", id: item.id, metadata: semantic(node) }))
              } else {
                if (item.name === undefined) throw new TypeError("A VFS entry must have a name")
                if (item.alias) {
                  graph.push(
                    Object.freeze({ _tag: "alias", parentId: item.parentId, name: item.name, targetId: item.id })
                  )
                } else if (node.kind === "directory") {
                  graph.push(
                    Object.freeze({
                      _tag: "directory",
                      id: item.id,
                      parentId: item.parentId,
                      name: item.name,
                      metadata: semantic(node)
                    })
                  )
                } else if (node.kind === "file") {
                  graph.push(
                    Object.freeze({
                      _tag: "file",
                      id: item.id,
                      parentId: item.parentId,
                      name: item.name,
                      metadata: semantic(node),
                      data: node.data.slice()
                    })
                  )
                } else {graph.push(
                    Object.freeze({
                      _tag: "symlink",
                      id: item.id,
                      parentId: item.parentId,
                      name: item.name,
                      metadata: semantic(node),
                      target: node.target
                    })
                  )}
              }
            }
            return { value: captureValue(Object.freeze(graph)) }
          }
        })
      })),
    (receiver) => receiver.close
  )

// -----------------------------------------------------------------------------
// Restore validation and construction
// -----------------------------------------------------------------------------

class Candidate extends R.ChargedBytes {
  readonly nodes = new Map<bigint, PrimaryRecord>()
  readonly objectNumbers = new Set<bigint>()
  readonly entries: Array<Exclude<M.CaptureRecord, M.RootRecord>> = []
  readonly names = new Set<string>()
  root: M.RootRecord | undefined
  consumedRecords = 0
  consumedPayload = zero
  content = zero

  constructor(runtime: R.Runtime) {
    super(runtime, "restore")
  }

  accept(input: unknown): void {
    const limits = this.runtime.limits
    this.consumedRecords++
    if (this.consumedRecords > limits.restoreRecords) R.limit("restore", "records", "restore")
    if (typeof input !== "object" || input === null) invalidRestore("record")
    const raw: Record<string, unknown> = { ...input }
    // Keep unknown own fields for excess-field validation. Fill the record's declared fields
    // from inherited/non-enumerable properties without reading an own getter a second time.
    if (!Object.hasOwn(raw, "_tag") && "_tag" in input) raw._tag = input._tag
    if (raw._tag === "root" || raw._tag === "directory" || raw._tag === "file" || raw._tag === "symlink") {
      if (!Object.hasOwn(raw, "id") && "id" in input) raw.id = input.id
      if (!Object.hasOwn(raw, "metadata") && "metadata" in input) raw.metadata = input.metadata
    }
    if (raw._tag === "directory" || raw._tag === "file" || raw._tag === "symlink" || raw._tag === "alias") {
      if (!Object.hasOwn(raw, "parentId") && "parentId" in input) raw.parentId = input.parentId
      if (!Object.hasOwn(raw, "name") && "name" in input) raw.name = input.name
    }
    if (raw._tag === "file" && !Object.hasOwn(raw, "data") && "data" in input) raw.data = input.data
    if (raw._tag === "symlink" && !Object.hasOwn(raw, "target") && "target" in input) raw.target = input.target
    if (raw._tag === "alias" && !Object.hasOwn(raw, "targetId") && "targetId" in input) raw.targetId = input.targetId
    let bytes = zero
    if (BytePath.isBytePath(raw.name)) bytes += BigInt(BytePath.byteLength(raw.name))
    if (BytePath.isBytePath(raw.target)) bytes += BigInt(BytePath.byteLength(raw.target))
    if (raw.data !== undefined) bytes += BigInt(dataLength(raw.data))
    if (bytes > limits.restorePayloadBytes - this.consumedPayload) R.limit("restore", "payload", "restore")
    this.consumedPayload += bytes
    this.reserve(bytes)
    try {
      if (raw.metadata !== undefined && !Schema.is(M.SemanticMetadata)(raw.metadata)) invalidRestore("metadata")
      if (
        (raw._tag === "directory" || raw._tag === "file" || raw._tag === "symlink" || raw._tag === "alias") &&
        !Schema.is(M.DirectoryRecord.fields.name)(raw.name)
      ) invalidRestore("name")
      if (raw._tag === "file" && !Schema.is(M.FileRecord.fields.metadata)(raw.metadata)) invalidRestore("metadata")
      if (raw._tag === "symlink" && !Schema.is(M.SymlinkRecord.fields.metadata)(raw.metadata)) {
        invalidRestore("metadata")
      }
      const decoded = Schema.decodeUnknownResult(M.CaptureRecord, { onExcessProperty: "error" })(raw)
      if (Result.isFailure(decoded)) invalidRestore("record")
      const decodedRecord = decoded.success
      const record = decodedRecord._tag === "alias"
        ? { ...decodedRecord }
        : { ...decodedRecord, metadata: { ...decodedRecord.metadata } }
      if (record._tag !== "root") {
        if (BigInt(BytePath.byteLength(record.name)) > limits.nameBytes) R.limit("restore", "name", "restore")
        const entryKey = `${record.parentId}/${E.key(record.name)}`
        if (this.names.has(entryKey)) invalidRestore("duplicateEntry")
        if (this.entries.length >= limits.entries) R.limit("restore", "entries", "restore")
        this.names.add(entryKey)
      }
      if (record._tag !== "alias") {
        if (this.nodes.has(record.id)) invalidRestore("duplicateId")
        if (this.objectNumbers.has(record.metadata.objectNumber)) invalidRestore("duplicateObjectNumber")
        if (this.nodes.size >= limits.objects) R.limit("restore", "objects", "restore")
        if (record._tag === "root" && this.root !== undefined) invalidRestore("root")
        const content = record._tag === "file"
          ? BigInt(dataLength(record.data))
          : record._tag === "symlink"
          ? BigInt(BytePath.byteLength(record.target))
          : zero
        if (record._tag === "file" && content > limits.fileBytes) R.limit("restore", "file", "restore")
        if (record._tag === "symlink" && content > limits.pathBytes) R.limit("restore", "path", "restore")
        if (content > limits.contentBytes - this.content) R.limit("restore", "content", "restore")
        this.content += content
        this.objectNumbers.add(record.metadata.objectNumber)
      }
      // Metadata observation may resize a supplied view. Reconcile that growth
      // before the raw staging and candidate roles coexist during the copy.
      const currentBytes = payload(record)
      if (currentBytes > bytes) {
        const growth = currentBytes - bytes
        if (growth > limits.restorePayloadBytes - this.consumedPayload) R.limit("restore", "payload", "restore")
        this.reserve(growth)
        this.consumedPayload += growth
        bytes = currentBytes
      }
      this.reserve(bytes)
      const snapshot = copy(record)
      if (snapshot._tag !== "root") this.entries.push(snapshot)
      if (snapshot._tag !== "alias") this.nodes.set(snapshot.id, snapshot)
      if (snapshot._tag === "root") this.root = snapshot
    } finally {
      // NOTE: The copied candidate has its own charge; release raw-record staging on every outcome.
      this.release(bytes)
    }
  }

  build(): E.Engine {
    const root = this.root
    if (root === undefined) invalidRestore("root")
    for (const record of this.entries) {
      const parent = this.nodes.get(record.parentId)
      if (parent === undefined || (parent._tag !== "root" && parent._tag !== "directory")) invalidRestore("parent")
      if (record._tag === "alias") {
        const target = this.nodes.get(record.targetId)
        if (target === undefined) invalidRestore("record")
        if (target._tag === "root" || target._tag === "directory") invalidRestore("directoryAlias")
      }
    }
    // Every directory has one valid parent. Checking every component for cycles
    // therefore also establishes root reachability.
    const checked = new Set<bigint>([root.id])
    for (const record of this.nodes.values()) {
      if (record._tag !== "directory") continue
      let current: PrimaryRecord = record
      const route = new Set<bigint>()
      while (!checked.has(current.id)) {
        if (route.has(current.id)) invalidRestore("cycle")
        route.add(current.id)
        if (current._tag === "root") break
        const parent = this.nodes.get(current.parentId)
        if (parent === undefined || (parent._tag !== "directory" && parent._tag !== "root")) invalidRestore("parent")
        current = parent
      }
      for (const id of route) checked.add(id)
    }
    const engine = new E.Engine(this.runtime, root.metadata, root.metadata.objectNumber)
    engine.nodes.clear()
    let maxObject = zero
    for (const record of this.nodes.values()) {
      const metadata = record.metadata
      const base = {
        id: metadata.objectNumber,
        uid: metadata.uid,
        gid: metadata.gid,
        mode: metadata.mode,
        atime: metadata.atime,
        mtime: metadata.mtime,
        ctime: metadata.ctime,
        birthtime: metadata.birthtime,
        nlink: zero,
        revision: one
      }
      if (base.id > maxObject) maxObject = base.id
      let node: E.Node
      if (record._tag === "file") node = { ...base, kind: "file", data: record.data }
      else if (record._tag === "symlink") node = { ...base, kind: "symlink", target: record.target }
      else {
        const parent = record._tag === "root" ? undefined : this.nodes.get(record.parentId)
        if (record._tag !== "root" && parent === undefined) invalidRestore("parent")
        node = {
          ...base,
          kind: "directory",
          parent: parent?.metadata.objectNumber,
          entries: new Map(),
          namespace: one,
          nlink: two
        }
      }
      engine.nodes.set(node.id, node)
    }
    for (const record of this.entries) {
      const parentRecord = this.nodes.get(record.parentId)
      const targetRecord = this.nodes.get(record._tag === "alias" ? record.targetId : record.id)
      if (parentRecord === undefined || targetRecord === undefined) invalidRestore("parent")
      const parent = engine.nodes.get(parentRecord.metadata.objectNumber)
      const node = engine.nodes.get(targetRecord.metadata.objectNumber)
      if (parent === undefined || parent.kind !== "directory" || node === undefined) invalidRestore("parent")
      parent.entries.set(E.key(record.name), { name: record.name, object: node.id, version: engine.nextBinding++ })
      if (node.kind === "directory") parent.nlink++
      else node.nlink++
    }
    engine.nextObject = maxObject + one
    return engine
  }
}

// -----------------------------------------------------------------------------
// Restore entry point
// -----------------------------------------------------------------------------

const isRecordStream = <Error, Requirements>(
  source: M.Capture | Stream.Stream<M.CaptureRecord, Error, Requirements>
): source is Stream.Stream<M.CaptureRecord, Error, Requirements> => Stream.isStream(source)

// NOTE: The explicit signature retains record aliases and generic defaults in emitted declarations.
export const restoreEngine: <Error = never, Requirements = never>(
  source: M.Capture | Stream.Stream<M.CaptureRecord, Error, Requirements>,
  options?: M.RestoreOptions
) => Effect.Effect<E.Engine, M.VirtualFileSystemError | Error, Requirements | Clock.Clock> = Effect.fnUntraced(
  function*<Error = never, Requirements = never>(
    source: M.Capture | Stream.Stream<M.CaptureRecord, Error, Requirements>,
    options?: M.RestoreOptions
  ): Effect.fn.Return<E.Engine, M.VirtualFileSystemError | Error, Requirements | Clock.Clock> {
    const state = yield* evaluate(() => {
      E.checkOptions(options, ["limits"], "restore")
      return {
        limits: R.configure(options?.limits),
        graph: typeof source === "object" && source !== null ? captures.get(source) : undefined
      }
    })
    const clock = yield* Clock.Clock
    const runtime = yield* evaluate(() => new R.Runtime(state.limits, clock))
    const candidate = new Candidate(runtime)
    const stream = yield* evaluate((): Stream.Stream<M.CaptureRecord, Error, Requirements> => {
      if (state.graph !== undefined) return Stream.fromIterable(state.graph)
      if (isRecordStream(source)) return source
      return R.invalid("restore", "source")
    })
    return yield* Effect.gen(function*() {
      yield* Effect.scoped(Stream.runForEach(stream, (record) => evaluate(() => candidate.accept(record))))
      return yield* evaluate(() => candidate.build())
    }).pipe(Effect.ensuring(Effect.sync(() => candidate.clear())))
  }
)
