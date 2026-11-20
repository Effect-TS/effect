import * as BytePath from "../../BytePath.ts"
import type * as ByteSize from "../../ByteSize.ts"
import * as Effect from "../../Effect.ts"
import * as Result from "../../Result.ts"
import * as Schema from "../../Schema.ts"
import * as Scope from "../../Scope.ts"
import * as A from "./atomic.ts"
import * as E from "./engine.ts"
import * as M from "./model.ts"
import * as P from "./preparation.ts"
import * as R from "./runtime.ts"

// -----------------------------------------------------------------------------
// Handle state and validation
// -----------------------------------------------------------------------------

const CHAR_DOT = 46
const CHAR_FORWARD_SLASH = 47

const isUnixNano = Schema.is(Schema.UnixNano)

const zero = BigInt(0)
const maxSafe = BigInt(Number.MAX_SAFE_INTEGER)

type HandleBody<A> = (tx: E.Transaction) => Result.Result<A, M.OperationError>

const effects = new WeakMap<E.FileState, M.FileHandle>()
const states = new WeakMap<object, E.FileState>()
export const cleanupError = (handle: M.FileHandle | M.DirectoryHandle) =>
  (states.get(handle) ?? E.directoryHandleState(handle))?.resource.cleanupError
const synchronous = new WeakMap<E.FileState, M.SyncFileHandle>()

interface DirectoryState {
  readonly caller: E.Caller
  readonly resource: R.Resource
  readonly id: bigint
}

const directoryEffects = new WeakMap<DirectoryState, M.DirectoryHandle>()
const directorySynchronous = new WeakMap<DirectoryState, M.SyncDirectoryHandle>()

const node = (tx: E.Transaction, state: E.FileState) =>
  Result.flatMap(tx.getResult(state.id), (value) =>
    value.kind === "file"
      ? Result.succeed(value)
      : Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" })))

const io = (work: R.Work, length: number) =>
  BigInt(length) > work.ticket.runtime.limits.ioBytes
    ? Result.fail(new M.LimitExceeded({ operation: work.operation, domain: "io", stage: "admission" }))
    : Result.succeed(undefined)

const position = (value: unknown, operation: string) =>
  typeof value !== "bigint" || value < zero
    ? Result.fail(new M.InvalidInput({ operation, field: "position", reason: "range" }))
    : Result.succeed(value)

const revisionOptions = (
  options: M.RevisionCondition | undefined,
  operation: string
) =>
  Result.map(
    E.checkOptionsResult(options, ["expectedRevision"], operation),
    () => ({ expectedRevision: options?.expectedRevision })
  )

const readOptions = (
  options: M.ReadOptions | undefined,
  operation: string
) =>
  Result.gen(function*() {
    yield* E.checkOptionsResult(options, ["position"], operation)
    const input = options?.position
    if (input !== undefined) yield* position(input, operation)
    return { position: input }
  })

const writeOptions = (
  options: M.WriteOptions | undefined,
  operation: string
) =>
  Result.gen(function*() {
    yield* E.checkOptionsResult(options, ["position", "expectedRevision"], operation)
    const input = options?.position
    if (input !== undefined) yield* position(input, operation)
    return { position: input, expectedRevision: options?.expectedRevision }
  })

// -----------------------------------------------------------------------------
// Transaction invocation
// -----------------------------------------------------------------------------

const run = <A>(
  state: Pick<E.FileState, "caller" | "resource">,
  operation: string,
  snapshot: (work: R.Work) => Result.Result<HandleBody<A>, M.OperationError>,
  validate?: () => Result.Result<void, M.OperationError>
) =>
  state.caller.runtime.runResult(state.resource, operation, () =>
    Result.gen(function*() {
      if (validate !== undefined) yield* validate()
      const plan: R.ResultPreparation<A> = {
        bytes: zero,
        snapshot: (work) =>
          Result.map(snapshot(work), (body) => ({
            execute: () => {
              const tx = new E.Transaction(state.caller, work)
              return Result.flatMap(body(tx), (value) => tx.transitionResult(value))
            }
          }))
      }
      return plan
    }))

const runSync = <A>(
  state: Pick<E.FileState, "caller" | "resource">,
  operation: string,
  snapshot: (work: R.Work) => Result.Result<HandleBody<A>, M.OperationError>
) =>
  state.caller.runtime.syncResult(state.resource, operation, (work) =>
    Result.gen(function*() {
      const body = yield* snapshot(work)
      const tx = new E.Transaction(state.caller, work)
      const value = yield* body(tx)
      return yield* tx.transitionResult(value)
    }))

// -----------------------------------------------------------------------------
// Operation preparation
// -----------------------------------------------------------------------------

function prepareRead(
  state: E.FileState,
  work: R.Work,
  countInput: number,
  options: M.ReadOptions | undefined,
  destination: Uint8Array
): Result.Result<HandleBody<number>, M.OperationError>
function prepareRead(
  state: E.FileState,
  work: R.Work,
  countInput: number,
  options: M.ReadOptions | undefined
): Result.Result<HandleBody<Uint8Array>, M.OperationError>
function prepareRead(
  state: E.FileState,
  work: R.Work,
  countInput: number,
  options: M.ReadOptions | undefined,
  destination?: Uint8Array
): Result.Result<HandleBody<Uint8Array | number>, M.OperationError> {
  return Result.gen(function*() {
    const count = yield* R.countResult(countInput, work.operation, "count")
    const fixed = yield* readOptions(options, work.operation)
    yield* io(work, count)
    yield* work.reserveResult(BigInt(count))
    const borrowed = destination === undefined ? undefined : {
      view: destination,
      backing: Reflect.get(Uint8Array.prototype, "buffer", destination),
      offset: Reflect.get(Uint8Array.prototype, "byteOffset", destination),
      count
    }
    return (tx) =>
      Result.gen(function*() {
        if (!state.read) {
          return yield* Result.fail(new M.AccessDenied({ operation: tx.operation, reason: "permission" }))
        }
        const file = yield* node(tx, state)
        const start = fixed.position ?? state.position
        const available = start >= BigInt(file.data.length) ? 0 : file.data.length - Number(start)
        const actual = Math.min(count, available)
        const value = file.data.slice(
          Number(start > maxSafe ? zero : start),
          Number(start > maxSafe ? zero : start) + actual
        )
        if (count > 0) yield* tx.touchResult(file.id, ["atime"])
        const cursor = fixed.position === undefined && actual > 0 ? start + BigInt(actual) : state.position
        tx.stagePosition(state, cursor)
        if (borrowed === undefined) return value
        tx.stageBorrowedRead(borrowed, value)
        return actual
      })
  })
}

const prepareWrite = (
  state: E.FileState,
  work: R.Work,
  source: Uint8Array,
  options?: M.WriteOptions,
  synchronous = false
) =>
  Result.gen(function*() {
    const fixedOptions = yield* writeOptions(options, work.operation)
    if (state.append && fixedOptions.position !== undefined) {
      return yield* Result.fail(
        new M.InvalidInput({ operation: work.operation, field: "position", reason: "malformed" })
      )
    }
    const input = yield* P.snapshotHandleInput(
      work,
      source,
      synchronous && !state.append && (fixedOptions.position ?? state.position) === zero &&
        E.resolveEngine(state.caller).offer === undefined
    )
    const length = input.length
    return (tx: E.Transaction) =>
      Result.gen(function*() {
        if (!state.write) {
          return yield* Result.fail(new M.AccessDenied({ operation: tx.operation, reason: "permission" }))
        }
        const file = yield* node(tx, state)
        yield* tx.revisionResult(file, fixedOptions)
        if (length === 0) {
          yield* A.reserveFile(tx, BigInt(file.data.length))
          return
        }
        const start = state.append ? BigInt(file.data.length) : fixedOptions.position ?? state.position
        const end = start + BigInt(length)
        const total = end > BigInt(file.data.length) ? end : BigInt(file.data.length)
        const size = yield* A.reserveFile(tx, total)
        const paged = tx.engine.offer === undefined && (
          file.data instanceof E.PagedFileData ||
          start === BigInt(file.data.length) && length >= 64 * 1024 &&
            (file.data.length > 0 || length >= E.pagedFileThreshold)
        )
        let output: E.FileNode["data"]
        if (input instanceof E.PagedFileData && start === zero && total === end) {
          output = input
        } else {
          const bytes = input instanceof E.PagedFileData ? input.slice() : input
          if (paged) {
            output = file.data.length === 0
              ? E.PagedFileData.from(bytes)
              : E.PagedFileData.from(file.data).write(Number(start), bytes)
          } else {
            output = new Uint8Array(size)
            E.copyFileData(output, file.data)
            output.set(bytes, Number(start))
          }
        }
        const edited = yield* tx.editResult(file.id)
        if (edited.kind !== "file") {
          return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
        }
        edited.mode &= ~E.SET_ID_BITS
        edited.data = output
        tx.recordUpdate(file.id)
        yield* tx.changedResult(file.id, ["mtime", "ctime"])
        const next = state.append
          ? state.appendCursor === "advance" ? end : state.position
          : fixedOptions.position === undefined
          ? end
          : state.position
        tx.stagePosition(state, next)
      })
  })

const prepareTruncate = (
  state: E.FileState,
  work: R.Work,
  input: ByteSize.Input,
  options?: M.RevisionCondition
) =>
  Result.gen(function*() {
    const length = yield* R.sizeResult(input, work.operation, "length")
    const fixedOptions = yield* revisionOptions(options, work.operation)
    return (tx: E.Transaction) =>
      Result.gen(function*() {
        if (!state.write) {
          return yield* Result.fail(new M.AccessDenied({ operation: tx.operation, reason: "permission" }))
        }
        const file = yield* node(tx, state)
        yield* tx.revisionResult(file, fixedOptions)
        const size = yield* A.reserveFile(tx, length)
        tx.recordUpdate(file.id)
        if (file.data.length !== size || (file.mode & E.SET_ID_BITS) !== 0) {
          const output = new Uint8Array(size)
          E.copyFileData(output, file.data)
          const edited = yield* tx.editResult(file.id)
          if (edited.kind !== "file") {
            return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
          }
          edited.mode &= ~E.SET_ID_BITS
          edited.data = output
          yield* tx.changedResult(file.id, ["mtime", "ctime"])
        }
        const next = state.truncateCursor === "clamp" && state.position > length ? length : state.position
        tx.stagePosition(state, next)
      })
  })

const checkSeek = (seek: M.Seek, operation: string) =>
  Result.gen(function*() {
    yield* E.checkOptionsResult(seek, ["from", "offset"], operation)
    if (
      seek === undefined || (seek.from !== "start" && seek.from !== "current" && seek.from !== "end") ||
      typeof seek.offset !== "bigint"
    ) return yield* Result.fail(new M.InvalidInput({ operation, field: "seek", reason: "malformed" }))
  })

const prepareSeek = (
  state: E.FileState,
  work: R.Work,
  seek: M.Seek
) =>
  Result.gen(function*() {
    yield* checkSeek(seek, work.operation)
    const from = seek.from
    const offset = seek.offset
    return (tx: E.Transaction) =>
      Result.gen(function*() {
        const base = from === "start"
          ? zero
          : from === "current"
          ? state.position
          : BigInt((yield* node(tx, state)).data.length)
        const next = yield* position(base + offset, work.operation)
        tx.stagePosition(state, next)
        return next
      })
  })

const prepareAttributes = (
  state: E.FileState,
  work: R.Work,
  attributes: M.Attributes,
  options?: M.RevisionCondition
) =>
  Result.gen(function*() {
    yield* A.validateAttributes(attributes, work.operation)
    const fixed = yield* P.snapshotAttributes(attributes, work.operation)
    const revision = yield* revisionOptions(options, work.operation)
    return (tx: E.Transaction) =>
      Result.flatMap(node(tx, state), (file) => A.attributesFor(tx, file, fixed, revision, state.write))
  })

/** @internal */
export const prepareCallerAttributes = (
  handle: M.FileHandle | M.DirectoryHandle,
  attributes: M.Attributes,
  options: M.RevisionCondition | undefined,
  work: R.Work
) =>
  Result.gen(function*() {
    const operation = work.operation
    const state = states.get(handle) ?? E.directoryHandleState(handle)
    if (state === undefined) {
      return yield* Result.fail(new M.InvalidInput({ operation, field: "handle", reason: "malformed" }))
    }
    if (state.caller.runtime !== work.ticket.runtime) {
      return yield* Result.fail(new M.InvalidResource({ operation, reason: "foreign" }))
    }
    const fixed = yield* P.snapshotAttributes(attributes, operation)
    const revision = yield* revisionOptions(options, operation)
    return (tx: E.Transaction) =>
      Result.gen(function*() {
        yield* work.borrowResult(state.resource)
        const object = yield* tx.getResult(state.id)
        const checkVisibility = (view: E.Transaction) =>
          Result.gen(function*() {
            if (object.nlink !== zero) {
              yield* view.referenceRouteResult(view.engine.reference(object.id))
              return
            }
            yield* view.authorityResult()
            if (view.caller.policy.root !== view.engine.root) {
              return yield* Result.fail(new M.AccessDenied({ operation, reason: "confinement" }))
            }
          })
        yield* checkVisibility(tx)
        if (tx.caller.policy !== state.caller.policy) yield* checkVisibility(new E.Transaction(state.caller, work))
        yield* A.attributesFor(tx, object, fixed, revision)
      })
  })

// -----------------------------------------------------------------------------
// File handle views
// -----------------------------------------------------------------------------

const effectFileHandle = (state: E.FileState) => {
  const prior = effects.get(state)
  if (prior !== undefined) return prior
  const handle: M.FileHandle = Object.freeze<M.FileHandle>({
    [M.FileHandleTypeId]: M.FileHandleTypeId,
    stat: () =>
      R.readOnly(
        run(state, "handle.stat", () =>
          Result.succeed((tx) =>
            Result.map(node(tx, state), (file) => tx.observation(file))
          ))
      ),
    read: (destination, options) =>
      R.readOnly(
        run(state, "handle.read", (work) =>
          Result.flatMap(E.bufferLengthResult(destination, work.operation), (length) =>
            prepareRead(state, work, length, options, destination)), () =>
          Result.gen(function*() {
            yield* E.bufferLengthResult(destination, "handle.read")
            yield* readOptions(options, "handle.read")
          }))
      ),
    readAlloc: (count, options) =>
      R.readOnly(
        run(state, "handle.readAlloc", (work) => prepareRead(state, work, count, options), () =>
          Result.gen(function*() {
            yield* R.countResult(count, "handle.readAlloc", "count")
            yield* readOptions(options, "handle.readAlloc")
          }))
      ),
    write: (source, options) =>
      run(state, "handle.write", (work) => prepareWrite(state, work, source, options), () =>
        Result.gen(function*() {
          yield* E.bufferLengthResult(source, "handle.write")
          yield* writeOptions(options, "handle.write")
          if (state.append && options?.position !== undefined) {
            return yield* Result.fail(
              new M.InvalidInput({ operation: "handle.write", field: "position", reason: "malformed" })
            )
          }
        })),
    seek: (seek) =>
      run(state, "handle.seek", (work) => prepareSeek(state, work, seek), () => checkSeek(seek, "handle.seek")),
    position: () =>
      R.readOnly(run(state, "handle.position", () => Result.succeed(() => Result.succeed(state.position)))),
    truncate: (length, options) =>
      run(
        state,
        "handle.truncate",
        (work) => prepareTruncate(state, work, length, options),
        () =>
          Result.gen(function*() {
            yield* R.sizeResult(length, "handle.truncate", "length")
            yield* revisionOptions(options, "handle.truncate")
          })
      ),
    setAttributes: (attributes, options) =>
      run(
        state,
        "handle.setAttributes",
        (work) => prepareAttributes(state, work, attributes, options),
        () =>
          Result.gen(function*() {
            yield* A.validateAttributes(attributes, "handle.setAttributes")
            yield* revisionOptions(options, "handle.setAttributes")
          })
      ),
    close: () => state.resource.close,
    sync: () =>
      run(state, "handle.sync", () =>
        Result.succeed(() =>
          !state.caller.runtime.limits.synchronous
            ? Result.fail(new M.CapabilityUnavailable({ operation: "handle.sync", reason: "syncDisabled" }))
            : Result.succeed(syncFileHandle(state))
        ))
  })
  effects.set(state, handle)
  states.set(handle, state)
  return handle
}

const syncFileHandle = (state: E.FileState) => {
  const prior = synchronous.get(state)
  if (prior !== undefined) return prior
  const handle = Object.freeze<M.SyncFileHandle>({
    [M.FileHandleTypeId]: M.FileHandleTypeId,
    effect: effectFileHandle(state),
    stat: () =>
      R.readOnlyResult(
        runSync(state, "handle.stat", () =>
          Result.succeed((tx) =>
            Result.map(node(tx, state), (file) => tx.observation(file))
          ))
      ),
    read: (destination, options) =>
      R.readOnlyResult(
        runSync(state, "handle.read", (work) =>
          Result.flatMap(E.bufferLengthResult(destination, work.operation), (length) =>
            prepareRead(state, work, length, options, destination)))
      ),
    readAlloc: (count, options) =>
      R.readOnlyResult(runSync(state, "handle.readAlloc", (work) => prepareRead(state, work, count, options))),
    write: (source, options) =>
      runSync(state, "handle.write", (work) => prepareWrite(state, work, source, options, true)),
    seek: (seek) => runSync(state, "handle.seek", (work) => prepareSeek(state, work, seek)),
    position: () =>
      R.readOnlyResult(runSync(state, "handle.position", () => Result.succeed(() => Result.succeed(state.position)))),
    truncate: (length, options) =>
      runSync(state, "handle.truncate", (work) => prepareTruncate(state, work, length, options)),
    setAttributes: (attributes, options) =>
      runSync(state, "handle.setAttributes", (work) => prepareAttributes(state, work, attributes, options)),
    close: () => state.caller.runtime.closeSyncResult(state.resource, "handle.close")
  })
  synchronous.set(state, handle)
  return handle
}

// -----------------------------------------------------------------------------
// File acquisition
// -----------------------------------------------------------------------------

const validateOpen = (
  target: M.Target,
  options: M.OpenOptions | undefined,
  operation: string
) =>
  Result.gen(function*() {
    if (options !== undefined) {
      yield* P.checkShape(options, [
        "access",
        "create",
        "append",
        "truncate",
        "appendCursor",
        "truncateCursor",
        "noFollow",
        "mode",
        "initialSize",
        "owner",
        "preserveTimes",
        "conditions",
        "expectedRevision"
      ], operation)
    }
    const access = options?.access ?? "read"
    const create = options?.create ?? "existing"
    const appendCursor = options?.appendCursor ?? "advance"
    const truncateCursor = options?.truncateCursor ?? "preserve"
    if (!M.isOpenAccess(access)) {
      return yield* Result.fail(new M.InvalidInput({ operation, field: "access", reason: "malformed" }))
    }
    if (!M.isCreation(create)) {
      return yield* Result.fail(new M.InvalidInput({ operation, field: "create", reason: "malformed" }))
    }
    if (appendCursor !== "advance" && appendCursor !== "preserve") {
      return yield* Result.fail(new M.InvalidInput({ operation, field: "appendCursor", reason: "malformed" }))
    }
    if (truncateCursor !== "preserve" && truncateCursor !== "clamp") {
      return yield* Result.fail(new M.InvalidInput({ operation, field: "truncateCursor", reason: "malformed" }))
    }
    const flags = { append: options?.append, truncate: options?.truncate, noFollow: options?.noFollow }
    for (const field of ["append", "truncate", "noFollow"] as const) {
      const value = flags[field]
      if (value !== undefined && typeof value !== "boolean") {
        return yield* Result.fail(new M.InvalidInput({ operation, field, reason: "malformed" }))
      }
    }
    if ((flags.append || flags.truncate) && access === "read") {
      return yield* Result.fail(new M.InvalidInput({ operation, field: "access", reason: "malformed" }))
    }
    const expectedRevision = options?.expectedRevision
    if (expectedRevision !== undefined && (!flags.truncate || create === "exclusive")) {
      return yield* Result.fail(new M.InvalidInput({ operation, field: "expectedRevision", reason: "malformed" }))
    }
    const mode = options?.mode
    if (mode !== undefined) yield* E.modeResult(mode, operation)
    const owner = options?.owner
    if (owner !== undefined) {
      yield* P.checkShape(owner, ["uid", "gid"], operation)
      if (create === "existing") {
        return yield* Result.fail(new M.InvalidInput({ operation, field: "owner", reason: "malformed" }))
      }
    }
    const uid = owner?.uid
    if (uid !== undefined) yield* E.identityResult(uid, operation, "uid")
    const gid = owner?.gid
    if (gid !== undefined) yield* E.identityResult(gid, operation, "gid")
    const initialSize = options?.initialSize
    if (initialSize !== undefined && create === "existing") {
      return yield* Result.fail(new M.InvalidInput({ operation, field: "initialSize", reason: "malformed" }))
    }
    const preserveTimes = yield* P.snapshotTimes(options?.preserveTimes, operation)
    if (preserveTimes !== undefined) {
      if (!isUnixNano(preserveTimes.atime) || !isUnixNano(preserveTimes.mtime) || create === "existing") {
        return yield* Result.fail(new M.InvalidInput({ operation, field: "preserveTimes", reason: "malformed" }))
      }
    }
    const entryConditions = options?.conditions
    if (M.isToken(target) && (entryConditions !== undefined || mode !== undefined || create !== "existing")) {
      return yield* Result.fail(new M.InvalidInput({ operation, field: "options", reason: "malformed" }))
    }
    if ((typeof target === "string" || BytePath.isBytePath(target)) && entryConditions !== undefined) {
      return yield* Result.fail(new M.InvalidInput({ operation, field: "conditions", reason: "malformed" }))
    }
    const conditions = yield* P.snapshotConditions(entryConditions, operation)
    yield* A.condition(conditions, operation)
    return {
      mode,
      uid,
      gid,
      initialSize,
      preserveTimes,
      conditions,
      expectedRevision,
      access,
      create,
      appendCursor,
      truncateCursor,
      append: flags.append ?? false,
      truncate: flags.truncate ?? false,
      noFollow: flags.noFollow ?? false
    }
  })

const openNode = (
  tx: E.Transaction,
  target: M.Target,
  options: Result.Result.Success<ReturnType<typeof validateOpen>>
) =>
  Result.gen(function*() {
    const permission = options.access === "read"
      ? E.READ_PERMISSION
      : options.access === "write"
      ? E.WRITE_PERMISSION
      : (E.READ_PERMISSION | E.WRITE_PERMISSION)
    const resolution: E.ResolutionState = { follows: 0 }
    let created = false
    let selected: E.Node
    if (M.isToken(target)) {
      selected = (yield* tx.targetResult(target, true, resolution)).object
      if (selected.kind !== "file") {
        return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
      }
      yield* tx.requireResult(selected, permission)
      yield* tx.revisionResult(selected, options)
    } else {
      if (typeof target === "string" || BytePath.isBytePath(target)) {
        const path = yield* E.pathValueResult(target, tx.operation)
        const bytes = BytePath.toBytes(path)
        let end = bytes.length
        while (end > 0 && bytes[end - 1] === CHAR_FORWARD_SLASH) end--
        let start = end
        while (start > 0 && bytes[start - 1] !== CHAR_FORWARD_SLASH) start--
        const length = end - start
        if (
          length === 0 || (length === 1 && bytes[start] === CHAR_DOT) ||
          (length === 2 && bytes[start] === CHAR_DOT && bytes[start + 1] === CHAR_DOT)
        ) {
          yield* tx.targetResult(target, !options.noFollow, resolution)
          return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
        }
      }
      const initial = yield* tx.slotResult(target, undefined, resolution)
      if (options.create === "exclusive") {
        yield* tx.requireResult(initial.parent, E.WRITE_PERMISSION | E.EXECUTE_PERMISSION)
        yield* tx.conditionsResult(initial.parent, initial.binding, options.conditions)
        if (initial.binding !== undefined) {
          return yield* Result.fail(new M.AlreadyExists({ operation: tx.operation, reason: "occupiedEntry" }))
        }
      }
      const slot = yield* tx.followFinalSlotResult(initial, resolution, options.noFollow)
      if (slot.binding !== undefined) {
        selected = yield* tx.getResult(slot.binding.object)
        if (selected.kind !== "file") {
          return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
        }
        yield* tx.requireResult(selected, permission)
        yield* tx.conditionsResult(initial.parent, initial.binding, options.conditions)
        yield* tx.revisionResult(selected, options)
      } else {
        if (options.create === "existing") {
          yield* tx.conditionsResult(initial.parent, initial.binding, options.conditions)
          return yield* Result.fail(new M.NotFound({ operation: tx.operation, reason: "missingEntry" }))
        }
        yield* tx.requireResult(slot.parent, E.WRITE_PERMISSION | E.EXECUTE_PERMISSION)
        yield* tx.conditionsResult(initial.parent, initial.binding, options.conditions)
        if (options.expectedRevision !== undefined) {
          return yield* Result.fail(new M.ConditionFailed({ operation: tx.operation, reason: "objectRevision" }))
        }
        const policy = tx.caller.policy
        if (
          !policy.privileged && (
            (options.uid !== undefined && options.uid !== policy.uid) ||
            (options.gid !== undefined && options.gid !== policy.gid && !policy.groups.includes(options.gid))
          )
        ) return yield* Result.fail(new M.AccessDenied({ operation: tx.operation, reason: "ownership" }))
        selected = yield* tx.createResult("file", slot.parent, options.mode, undefined, options)
        created = true
        if (options.initialSize !== undefined && selected.kind === "file") {
          const size = yield* R.sizeResult(options.initialSize, tx.operation, "initialSize")
          selected.data = new Uint8Array(yield* A.reserveFile(tx, size))
        }
        if (options.preserveTimes !== undefined) {
          yield* tx.explicitTimeResult(selected.id, "atime", options.preserveTimes.atime)
          yield* tx.explicitTimeResult(selected.id, "mtime", options.preserveTimes.mtime)
        }
        yield* tx.insertResult(slot.parent.id, slot.name, selected.id)
      }
    }
    if (selected.kind !== "file") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    if (typeof target === "string" || BytePath.isBytePath(target)) {
      const path = yield* E.pathValueResult(target, tx.operation)
      if (BytePath.toBytes(path).at(-1) === CHAR_FORWARD_SLASH) {
        return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
      }
    }
    if (options.truncate && !created) {
      tx.recordUpdate(selected.id)
      yield* A.reserveFile(tx, zero)
      if (selected.data.length > 0 || (selected.mode & E.SET_ID_BITS) !== 0) {
        const edited = yield* tx.editResult(selected.id)
        if (edited.kind !== "file") {
          return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
        }
        edited.mode &= ~E.SET_ID_BITS
        edited.data = new Uint8Array(0)
        yield* tx.changedResult(selected.id, ["mtime", "ctime"])
      }
    }
    return selected
  })

const fileState = (
  caller: E.Caller,
  resource: R.Resource,
  file: E.FileNode,
  options: Result.Result.Success<ReturnType<typeof validateOpen>>
) =>
  Result.gen(function*() {
    const engine = E.resolveEngine(caller)
    yield* engine.retainObjectsResult(resource, [file.id])
    return {
      caller: yield* E.createCallerResult(engine, caller.policy, resource),
      resource,
      id: file.id,
      read: options.access !== "write",
      write: options.access !== "read",
      append: options.append,
      appendCursor: options.appendCursor,
      truncateCursor: options.truncateCursor,
      position: zero
    }
  })

/** @internal */
export const open = Effect.fnUntraced(
  function*(
    caller: E.Caller,
    target: M.Target,
    options?: M.OpenOptions
  ) {
    const scope = yield* Scope.Scope
    return yield* caller.runtime.runResult(caller.resource, "open", () =>
      Result.gen(function*() {
        yield* validateOpen(target, options, "open")
        const bytes = yield* E.addressBytesResult(target, "open", caller.runtime.limits)
        const plan: R.ResultPreparation<M.FileHandle> = {
          bytes,
          snapshot: (work) =>
            Result.gen(function*() {
              const fixed = yield* validateOpen(target, options, "open")
              const selected = yield* E.snapshotTargetResult(target)
              const acquired = yield* work.acquireResourceResult("handle")
              // Work owns rollback until the storage decision completes. A closing scope
              // must not wait on the storage turn held by its own pending open.
              const durable = E.resolveEngine(caller).offer !== undefined
              let deciding = false
              let abandoned = false
              return {
                enroll: acquired.enroll(
                  scope,
                  "open",
                  durable ?
                    Effect.suspend(() => {
                      if (!deciding) return acquired.close
                      abandoned = true
                      return Effect.void
                    }) :
                    acquired.close
                ),
                execute: () =>
                  Result.gen(function*() {
                    yield* acquired.checkOpenResult("open")
                    const tx = new E.Transaction(caller, work)
                    const file = yield* openNode(tx, selected, fixed)
                    const state = yield* fileState(caller, acquired, file, fixed)
                    // A linked read handle only adds a volatile pin. Creation still offers its staged changes.
                    const forceOffer = durable && (fixed.access !== "read" || file.nlink === zero)
                    const transition = yield* tx.transitionResult(effectFileHandle(state), forceOffer)
                    if (!durable) return transition
                    deciding = true
                    return {
                      ...transition,
                      publish: () =>
                        Result.flatMap(transition.publish(), () => {
                          deciding = false
                          return abandoned ? Result.fail(R.closed("open")) : Result.succeed(undefined)
                        })
                    }
                  })
              }
            })
        }
        return plan
      }))
  }
)

/** @internal */
export const openSync = (
  caller: E.Caller,
  owner: R.Resource,
  target: M.Target,
  options?: M.OpenOptions
) =>
  caller.runtime.syncResult(owner, "open", (work) =>
    Result.gen(function*() {
      const fixed = yield* validateOpen(target, options, "open")
      const bytes = yield* E.addressBytesResult(target, "open", caller.runtime.limits)
      yield* work.reserveResult(bytes)
      const selected = yield* E.snapshotTargetResult(target)
      const resource = yield* work.acquireResourceResult("handle", owner)
      const tx = new E.Transaction(caller, work)
      const file = yield* openNode(tx, selected, fixed)
      const state = yield* fileState(caller, resource, file, fixed)
      return yield* tx.transitionResult(syncFileHandle(state))
    }))

// -----------------------------------------------------------------------------
// Directory handles
// -----------------------------------------------------------------------------

const directoryObservation = (
  tx: E.Transaction,
  state: DirectoryState
) =>
  Result.gen(function*() {
    const found = yield* tx.getResult(state.id)
    const observation = tx.observation(found)
    if (observation.kind !== "directory") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    return observation
  })

const effectDirectoryHandle = (state: DirectoryState): M.DirectoryHandle => {
  const prior = directoryEffects.get(state)
  if (prior !== undefined) return prior
  const value = Object.freeze<M.DirectoryHandle>({
    [M.DirectoryHandleTypeId]: M.DirectoryHandleTypeId,
    stat: () => R.readOnly(run(state, "directory.stat", () => Result.succeed((tx) => directoryObservation(tx, state)))),
    close: () => state.resource.close,
    sync: () =>
      state.caller.runtime.runResult(state.resource, "directory.sync", () =>
        Result.succeed({
          bytes: zero,
          snapshot: () =>
            Result.succeed({
              execute: () =>
                !state.caller.runtime.limits.synchronous
                  ? Result.fail(new M.CapabilityUnavailable({ operation: "directory.sync", reason: "syncDisabled" }))
                  : Result.succeed({ value: syncDirectoryHandle(state) })
            })
        }))
  })
  directoryEffects.set(state, value)
  E.registerDirectoryHandle(value, state)
  return value
}

const syncDirectoryHandle = (state: DirectoryState) => {
  const prior = directorySynchronous.get(state)
  if (prior !== undefined) return prior
  const value = Object.freeze<M.SyncDirectoryHandle>({
    [M.DirectoryHandleTypeId]: M.DirectoryHandleTypeId,
    effect: effectDirectoryHandle(state),
    stat: () =>
      R.readOnlyResult(runSync(state, "directory.stat", () => Result.succeed((tx) => directoryObservation(tx, state)))),
    close: () => state.caller.runtime.closeSyncResult(state.resource, "directory.close")
  })
  directorySynchronous.set(state, value)
  E.registerDirectoryHandle(value, state)
  return value
}

const acquireDirectory = (
  caller: E.Caller,
  resource: R.Resource,
  tx: E.Transaction,
  target: M.Target
) =>
  Result.gen(function*() {
    const found = yield* tx.objectResult(target)
    if (found.kind !== "directory") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    yield* tx.requireResult(found, E.EXECUTE_PERMISSION)
    yield* tx.engine.retainObjectsResult(resource, [found.id])
    return { caller: yield* E.createCallerResult(tx.engine, caller.policy, resource), resource, id: found.id }
  })

/** @internal */
export const openDirectory = Effect.fnUntraced(
  function*(caller: E.Caller, target: M.Target) {
    const scope = yield* Scope.Scope
    return yield* caller.runtime.runResult(caller.resource, "openDirectory", () =>
      Result.gen(function*() {
        const bytes = yield* E.addressBytesResult(target, "openDirectory", caller.runtime.limits)
        const plan: R.ResultPreparation<M.DirectoryHandle> = {
          bytes,
          snapshot: (work) =>
            Result.gen(function*() {
              const selected = yield* E.snapshotTargetResult(target)
              const acquired = yield* work.acquireResourceResult("handle")
              return {
                enroll: acquired.enroll(scope, "openDirectory"),
                execute: () =>
                  Result.gen(function*() {
                    yield* acquired.checkOpenResult("openDirectory")
                    const tx = new E.Transaction(caller, work)
                    const state = yield* acquireDirectory(caller, acquired, tx, selected)
                    return yield* tx.transitionResult(effectDirectoryHandle(state))
                  })
              }
            })
        }
        return plan
      }))
  }
)

/** @internal */
export const openDirectorySync = (
  caller: E.Caller,
  owner: R.Resource,
  target: M.Target
) =>
  caller.runtime.syncResult(owner, "openDirectory", (work) =>
    Result.gen(function*() {
      const bytes = yield* E.addressBytesResult(target, "openDirectory", caller.runtime.limits)
      yield* work.reserveResult(bytes)
      const selected = yield* E.snapshotTargetResult(target)
      const resource = yield* work.acquireResourceResult("handle", owner)
      const tx = new E.Transaction(caller, work)
      const state = yield* acquireDirectory(caller, resource, tx, selected)
      return yield* tx.transitionResult(syncDirectoryHandle(state))
    }))
