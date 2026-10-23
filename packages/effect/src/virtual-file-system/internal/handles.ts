import * as BytePath from "../../BytePath.ts"
import type * as ByteSize from "../../ByteSize.ts"
import * as Effect from "../../Effect.ts"
import type * as Result from "../../Result.ts"
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

const zero = BigInt(0)

const maxSafe = BigInt(Number.MAX_SAFE_INTEGER)

type HandleBody<A> = (tx: E.Transaction) => A

const effects = new WeakMap<E.FileState, M.FileHandle>()

const synchronous = new WeakMap<E.FileState, M.SyncFileHandle>()

interface DirectoryState {
  readonly caller: E.Caller
  readonly resource: R.Resource
  readonly id: bigint
}

const directoryEffects = new WeakMap<DirectoryState, M.DirectoryHandle>()

const directorySynchronous = new WeakMap<DirectoryState, M.SyncDirectoryHandle>()

const node = (tx: E.Transaction, state: E.FileState): E.FileNode => {
  const value = tx.get(state.id)
  return value.kind === "file" ? value : tx.wrongKind()
}

const grant = (tx: E.Transaction, allowed: boolean): void => {
  if (!allowed) throw new M.AccessDenied({ operation: tx.operation, reason: "permission" })
}

const io = (work: R.Work, length: number): void => {
  if (BigInt(length) > work.ticket.runtime.limits.ioBytes) return R.limit(work.operation, "io", "admission")
}

const candidate = (tx: E.Transaction, length: bigint): number => {
  if (length > tx.engine.runtime.limits.fileBytes) return R.limit(tx.operation, "file", "publication")
  if (length > maxSafe) return R.invalid(tx.operation, "length", "range")
  tx.reserve(length)
  return Number(length)
}

const position = (value: unknown, operation: string): bigint => {
  if (typeof value !== "bigint" || value < zero) return R.invalid(operation, "position", "range")
  return value
}

const revisionOptions = (options: M.RevisionCondition | undefined, operation: string): M.RevisionCondition => {
  E.checkOptions(options, ["expectedRevision"], operation)
  return { expectedRevision: options?.expectedRevision }
}

const readOptions = (options: M.ReadOptions | undefined, operation: string): M.ReadOptions => {
  E.checkOptions(options, ["position"], operation)
  const input = options?.position
  if (input !== undefined) position(input, operation)
  return { position: input }
}

const writeOptions = (options: M.WriteOptions | undefined, operation: string): M.WriteOptions => {
  E.checkOptions(options, ["position", "expectedRevision"], operation)
  const input = options?.position
  if (input !== undefined) position(input, operation)
  return { position: input, expectedRevision: options?.expectedRevision }
}

// -----------------------------------------------------------------------------
// Transaction invocation
// -----------------------------------------------------------------------------

const run = <A>(
  state: E.FileState,
  operation: string,
  snapshot: (work: R.Work) => HandleBody<A>,
  validate: () => void = () => {}
): Effect.Effect<A, M.OperationError> =>
  state.caller.runtime.run(state.resource, operation, () => {
    validate()
    return {
      bytes: zero,
      snapshot: (work) => {
        const body = snapshot(work)
        return {
          execute: () => {
            const tx = new E.Transaction(state.caller, work)
            return tx.transition(body(tx))
          }
        }
      }
    }
  })

const runSync = <A>(
  state: E.FileState,
  operation: string,
  snapshot: (work: R.Work) => HandleBody<A>
): Result.Result<A, M.OperationError> =>
  R.result(() =>
    state.caller.runtime.sync(state.resource, operation, (work) => {
      const body = snapshot(work)
      const tx = new E.Transaction(state.caller, work)
      return tx.transition(body(tx))
    })
  )

// -----------------------------------------------------------------------------
// Operation preparation
// -----------------------------------------------------------------------------

function prepareRead(
  state: E.FileState,
  work: R.Work,
  countInput: number,
  options: M.ReadOptions | undefined,
  destination: Uint8Array
): HandleBody<number>
function prepareRead(
  state: E.FileState,
  work: R.Work,
  countInput: number,
  options: M.ReadOptions | undefined
): HandleBody<Uint8Array>
function prepareRead(
  state: E.FileState,
  work: R.Work,
  countInput: number,
  options: M.ReadOptions | undefined,
  destination?: Uint8Array
): HandleBody<Uint8Array | number> {
  const count = R.count(countInput, work.operation, "count")
  const fixed = readOptions(options, work.operation)
  io(work, count)
  work.reserve(BigInt(count))
  const borrowed = destination === undefined ? undefined : {
    view: destination,
    backing: Reflect.get(Uint8Array.prototype, "buffer", destination),
    offset: Reflect.get(Uint8Array.prototype, "byteOffset", destination),
    count
  }
  return (tx) => {
    grant(tx, state.read)
    const file = node(tx, state)
    const start = fixed.position ?? state.position
    const available = start >= BigInt(file.data.length) ? 0 : file.data.length - Number(start)
    const actual = Math.min(count, available)
    const value = file.data.slice(
      Number(start > maxSafe ? zero : start),
      Number(start > maxSafe ? zero : start) + actual
    )
    if (count > 0) tx.touch(file.id, ["atime"])
    const cursor = fixed.position === undefined && actual > 0 ? start + BigInt(actual) : state.position
    tx.stagePosition(state, cursor)
    if (borrowed === undefined) return value
    tx.stageBorrowedRead(borrowed, value)
    return actual
  }
}

const prepareWrite = (
  state: E.FileState,
  work: R.Work,
  source: Uint8Array,
  options?: M.WriteOptions
): HandleBody<void> => {
  const fixedOptions = writeOptions(options, work.operation)
  if (state.append && fixedOptions.position !== undefined) return R.invalid(work.operation, "position")
  const input = P.snapshotInput(work, source)
  const length = input.length
  return (tx) => {
    grant(tx, state.write)
    const file = node(tx, state)
    tx.revision(file, fixedOptions)
    if (length === 0) {
      candidate(tx, BigInt(file.data.length))
      return
    }
    const start = state.append ? BigInt(file.data.length) : fixedOptions.position ?? state.position
    const end = start + BigInt(length)
    const total = end > BigInt(file.data.length) ? end : BigInt(file.data.length)
    const output = new Uint8Array(candidate(tx, total))
    output.set(file.data)
    output.set(input, Number(start))
    const edited = tx.edit(file.id)
    if (edited.kind !== "file") return tx.wrongKind()
    edited.data = output
    tx.changed(file.id, ["mtime", "ctime"])
    const next = state.append
      ? state.appendCursor === "advance" ? end : state.position
      : fixedOptions.position === undefined
      ? end
      : state.position
    tx.stagePosition(state, next)
  }
}

const prepareTruncate = (
  state: E.FileState,
  work: R.Work,
  input: ByteSize.Input,
  options?: M.RevisionCondition
): HandleBody<void> => {
  const length = R.size(input, work.operation, "length")
  const fixedOptions = revisionOptions(options, work.operation)
  return (tx) => {
    grant(tx, state.write)
    const file = node(tx, state)
    tx.revision(file, fixedOptions)
    const size = candidate(tx, length)
    if (file.data.length !== size) {
      const output = new Uint8Array(size)
      output.set(file.data.subarray(0, size))
      const edited = tx.edit(file.id)
      if (edited.kind !== "file") return tx.wrongKind()
      edited.data = output
      tx.changed(file.id, ["mtime", "ctime"])
    }
    const next = state.truncateCursor === "clamp" && state.position > length ? length : state.position
    tx.stagePosition(state, next)
  }
}

const checkSeek = (seek: M.Seek, operation: string): void => {
  E.checkOptions(seek, ["from", "offset"], operation)
  if (
    seek === undefined || (seek.from !== "start" && seek.from !== "current" && seek.from !== "end") ||
    typeof seek.offset !== "bigint"
  ) return R.invalid(operation, "seek")
}

const prepareSeek = (state: E.FileState, work: R.Work, seek: M.Seek): HandleBody<bigint> => {
  checkSeek(seek, work.operation)
  const from = seek.from
  const offset = seek.offset
  return (tx) => {
    const base = from === "start" ? zero : from === "current" ? state.position : BigInt(node(tx, state).data.length)
    const next = position(base + offset, work.operation)
    tx.stagePosition(state, next)
    return next
  }
}

const prepareAttributes = (
  state: E.FileState,
  work: R.Work,
  attributes: M.Attributes,
  options?: M.RevisionCondition
): HandleBody<void> => {
  A.validateAttributes(attributes, work.operation)
  const fixed = P.snapshotAttributes(attributes, work.operation)
  const revision = revisionOptions(options, work.operation)
  return (tx) => {
    A.attributesFor(tx, node(tx, state), fixed, revision)
  }
}

// -----------------------------------------------------------------------------
// File handle views
// -----------------------------------------------------------------------------

const effectFileHandle = (state: E.FileState): M.FileHandle => {
  const prior = effects.get(state)
  if (prior !== undefined) return prior
  const handle: M.FileHandle = Object.freeze<M.FileHandle>({
    [M.FileHandleTypeId]: M.FileHandleTypeId,
    stat: () => R.readOnly(run(state, "handle.stat", () => (tx) => tx.observation(node(tx, state)))),
    read: (destination, options) =>
      R.readOnly(
        run(state, "handle.read", (work) =>
          prepareRead(state, work, E.bufferLength(destination, work.operation), options, destination), () => {
          E.bufferLength(destination, "handle.read")
          readOptions(options, "handle.read")
        })
      ),
    readAlloc: (count, options) =>
      R.readOnly(run(state, "handle.readAlloc", (work) => prepareRead(state, work, count, options), () => {
        R.count(count, "handle.readAlloc", "count")
        readOptions(options, "handle.readAlloc")
      })),
    write: (source, options) =>
      run(state, "handle.write", (work) => prepareWrite(state, work, source, options), () => {
        E.bufferLength(source, "handle.write")
        writeOptions(options, "handle.write")
        if (state.append && options?.position !== undefined) R.invalid("handle.write", "position")
      }),
    seek: (seek) =>
      run(state, "handle.seek", (work) => prepareSeek(state, work, seek), () => checkSeek(seek, "handle.seek")),
    position: () => R.readOnly(run(state, "handle.position", () => () => state.position)),
    truncate: (length, options) =>
      run(state, "handle.truncate", (work) => prepareTruncate(state, work, length, options), () => {
        R.size(length, "handle.truncate", "length")
        revisionOptions(options, "handle.truncate")
      }),
    setAttributes: (attributes, options) =>
      run(state, "handle.setAttributes", (work) => prepareAttributes(state, work, attributes, options), () => {
        A.validateAttributes(attributes, "handle.setAttributes")
        revisionOptions(options, "handle.setAttributes")
      }),
    close: () => state.resource.close,
    sync: () =>
      run(state, "handle.sync", () => () => {
        if (!state.caller.runtime.limits.synchronous) {
          throw new M.CapabilityUnavailable({ operation: "handle.sync", reason: "syncDisabled" })
        }
        return syncFileHandle(state)
      })
  })
  effects.set(state, handle)
  return handle
}

const syncFileHandle = (state: E.FileState): M.SyncFileHandle => {
  const prior = synchronous.get(state)
  if (prior !== undefined) return prior
  const handle = Object.freeze<M.SyncFileHandle>({
    [M.FileHandleTypeId]: M.FileHandleTypeId,
    effect: effectFileHandle(state),
    stat: () => R.readOnlyResult(runSync(state, "handle.stat", () => (tx) => tx.observation(node(tx, state)))),
    read: (destination, options) =>
      R.readOnlyResult(
        runSync(state, "handle.read", (work) =>
          prepareRead(state, work, E.bufferLength(destination, work.operation), options, destination))
      ),
    readAlloc: (count, options) =>
      R.readOnlyResult(
        runSync(state, "handle.readAlloc", (work) => prepareRead(state, work, count, options))
      ),
    write: (source, options) => runSync(state, "handle.write", (work) => prepareWrite(state, work, source, options)),
    seek: (seek) => runSync(state, "handle.seek", (work) => prepareSeek(state, work, seek)),
    position: () => R.readOnlyResult(runSync(state, "handle.position", () => () => state.position)),
    truncate: (length, options) =>
      runSync(state, "handle.truncate", (work) => prepareTruncate(state, work, length, options)),
    setAttributes: (attributes, options) =>
      runSync(state, "handle.setAttributes", (work) => prepareAttributes(state, work, attributes, options)),
    close: () => R.result(() => state.caller.runtime.closeSync(state.resource, "handle.close"))
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
) => {
  E.checkOptions(options, [
    "access",
    "create",
    "append",
    "truncate",
    "appendCursor",
    "truncateCursor",
    "noFollow",
    "mode",
    "conditions",
    "expectedRevision"
  ], operation)
  const access = options?.access ?? "read"
  const create = options?.create ?? "existing"
  const appendCursor = options?.appendCursor ?? "advance"
  const truncateCursor = options?.truncateCursor ?? "preserve"
  if (access !== "read" && access !== "write" && access !== "readwrite") return R.invalid(operation, "access")
  if (create !== "existing" && create !== "ifmissing" && create !== "exclusive") return R.invalid(operation, "create")
  if (appendCursor !== "advance" && appendCursor !== "preserve") return R.invalid(operation, "appendCursor")
  if (truncateCursor !== "preserve" && truncateCursor !== "clamp") return R.invalid(operation, "truncateCursor")
  for (const field of ["append", "truncate", "noFollow"] as const) {
    if (options?.[field] !== undefined && typeof options[field] !== "boolean") return R.invalid(operation, field)
  }
  if ((options?.append || options?.truncate) && access === "read") return R.invalid(operation, "access")
  if (options?.expectedRevision !== undefined && (!options.truncate || create === "exclusive")) {
    return R.invalid(operation, "expectedRevision")
  }
  if (options?.mode !== undefined) E.mode(options.mode, "file", operation)
  if (
    M.isToken(target) &&
    (options?.conditions !== undefined || options?.mode !== undefined || create !== "existing")
  ) return R.invalid(operation, "options")
  if ((typeof target === "string" || BytePath.isBytePath(target)) && options?.conditions !== undefined) {
    return R.invalid(operation, "conditions")
  }
  A.condition(options?.conditions, operation)
  const conditions = P.snapshotConditions(options?.conditions, operation)
  A.condition(conditions, operation)
  return {
    mode: options?.mode,
    conditions,
    expectedRevision: options?.expectedRevision,
    access,
    create,
    appendCursor,
    truncateCursor,
    append: options?.append ?? false,
    truncate: options?.truncate ?? false,
    noFollow: options?.noFollow ?? false
  }
}

const openNode = (tx: E.Transaction, target: M.Target, options: ReturnType<typeof validateOpen>): E.FileNode => {
  const permission = options.access === "read"
    ? E.READ_PERMISSION
    : options.access === "write"
    ? E.WRITE_PERMISSION
    : (E.READ_PERMISSION | E.WRITE_PERMISSION)
  const resolution: E.ResolutionState = { follows: 0 }
  let selected: E.Node
  if (M.isToken(target)) {
    selected = tx.target(target, true, resolution).object
    if (selected.kind !== "file") return tx.wrongKind()
    tx.require(selected, permission)
    tx.revision(selected, options)
  } else {
    if (typeof target === "string" || BytePath.isBytePath(target)) {
      const bytes = BytePath.toBytes(E.pathValue(target, tx.operation))
      let end = bytes.length
      while (end > 0 && bytes[end - 1] === CHAR_FORWARD_SLASH) end--
      let start = end
      while (start > 0 && bytes[start - 1] !== CHAR_FORWARD_SLASH) start--
      const length = end - start
      if (
        length === 0 || (length === 1 && bytes[start] === CHAR_DOT) ||
        (length === 2 && bytes[start] === CHAR_DOT && bytes[start + 1] === CHAR_DOT)
      ) {
        tx.target(target, !options.noFollow, resolution)
        return tx.wrongKind()
      }
    }
    const initial = tx.slot(target, undefined, resolution)
    if (options.create === "exclusive") {
      tx.require(initial.parent, E.WRITE_PERMISSION | E.EXECUTE_PERMISSION)
      tx.conditions(initial.parent, initial.binding, options.conditions)
      if (initial.binding !== undefined) throw new M.AlreadyExists({ operation: tx.operation, reason: "occupiedEntry" })
    }
    const slot = tx.followFinalSlot(initial, resolution, options.noFollow)
    if (slot.binding !== undefined) {
      selected = tx.get(slot.binding.object)
      if (selected.kind !== "file") return tx.wrongKind()
      tx.require(selected, permission)
      tx.conditions(initial.parent, initial.binding, options.conditions)
      tx.revision(selected, options)
    } else {
      if (options.create === "existing") {
        tx.conditions(initial.parent, initial.binding, options.conditions)
        throw new M.NotFound({ operation: tx.operation, reason: "missingEntry" })
      }
      tx.require(slot.parent, E.WRITE_PERMISSION | E.EXECUTE_PERMISSION)
      tx.conditions(initial.parent, initial.binding, options.conditions)
      if (options.expectedRevision !== undefined) {
        throw new M.ConditionFailed({ operation: tx.operation, reason: "objectRevision" })
      }
      selected = tx.create("file", slot.parent, options.mode)
      tx.insert(slot.parent.id, slot.name, selected.id)
    }
  }
  if (selected.kind !== "file") return tx.wrongKind()
  if (
    (typeof target === "string" || BytePath.isBytePath(target)) &&
    BytePath.toBytes(E.pathValue(target, tx.operation)).at(-1) === CHAR_FORWARD_SLASH
  ) return tx.wrongKind()
  if (options.truncate) {
    candidate(tx, zero)
    if (selected.data.length > 0) {
      const edited = tx.edit(selected.id)
      if (edited.kind !== "file") return tx.wrongKind()
      edited.data = new Uint8Array(0)
      tx.changed(selected.id, ["mtime", "ctime"])
    }
  }
  return selected
}

const fileState = (
  caller: E.Caller,
  resource: R.Resource,
  file: E.FileNode,
  options: ReturnType<typeof validateOpen>
): E.FileState => {
  const engine = E.resolveEngine(caller)
  engine.retainObjects(resource, [file.id])
  return {
    caller: E.createCaller(engine, caller.policy, resource),
    resource,
    id: file.id,
    read: options.access !== "write",
    write: options.access !== "read",
    append: options.append,
    appendCursor: options.appendCursor,
    truncateCursor: options.truncateCursor,
    position: zero
  }
}

export const open = Effect.fnUntraced(
  function*(
    caller: E.Caller,
    target: M.Target,
    options?: M.OpenOptions
  ): Effect.fn.Return<M.FileHandle, M.OperationError, Scope.Scope> {
    const scope = yield* Scope.Scope
    return yield* caller.runtime.run(caller.resource, "open", () => {
      validateOpen(target, options, "open")
      return {
        bytes: E.addressBytes(target, "open", caller.runtime.limits),
        snapshot: (work) => {
          const fixed = validateOpen(target, options, "open")
          const selected = E.snapshotTarget(target)
          const acquired = work.acquireResource("handle")
          return {
            enroll: acquired.enroll(scope, "open"),
            execute: () => {
              if (acquired.state !== "open") throw R.closed("open", acquired.state)
              const tx = new E.Transaction(caller, work)
              const state = fileState(caller, acquired, openNode(tx, selected, fixed), fixed)
              return tx.transition(effectFileHandle(state))
            }
          }
        }
      }
    })
  }
)

export const openSync = (
  caller: E.Caller,
  owner: R.Resource,
  target: M.Target,
  options?: M.OpenOptions
): Result.Result<M.SyncFileHandle, M.OperationError> =>
  R.result(() =>
    caller.runtime.sync(owner, "open", (work) => {
      const fixed = validateOpen(target, options, "open")
      work.reserve(E.addressBytes(target, "open", caller.runtime.limits))
      const selected = E.snapshotTarget(target)
      const resource = work.acquireResource("handle", owner)
      const tx = new E.Transaction(caller, work)
      const state = fileState(caller, resource, openNode(tx, selected, fixed), fixed)
      return tx.transition(syncFileHandle(state))
    })
  )

// -----------------------------------------------------------------------------
// Directory handles
// -----------------------------------------------------------------------------

const effectDirectoryHandle = (state: DirectoryState): M.DirectoryHandle => {
  const prior = directoryEffects.get(state)
  if (prior !== undefined) return prior
  const value = Object.freeze<M.DirectoryHandle>({
    [M.DirectoryHandleTypeId]: M.DirectoryHandleTypeId,
    stat: () =>
      R.readOnly(
        state.caller.runtime.run(
          state.resource,
          "directory.stat",
          () => ({
            bytes: zero,
            snapshot: (work) => ({
              execute: () => {
                const tx = new E.Transaction(state.caller, work)
                const observation = tx.observation(tx.get(state.id))
                if (observation.kind !== "directory") return tx.wrongKind()
                return tx.transition(observation)
              }
            })
          })
        )
      ),
    close: () => state.resource.close,
    sync: () =>
      state.caller.runtime.run(state.resource, "directory.sync", () => ({
        bytes: zero,
        snapshot: () => ({
          execute: () => {
            if (!state.caller.runtime.limits.synchronous) {
              throw new M.CapabilityUnavailable({ operation: "directory.sync", reason: "syncDisabled" })
            }
            return { value: syncDirectoryHandle(state) }
          }
        })
      }))
  })
  directoryEffects.set(state, value)
  E.registerDirectoryHandle(value, state)
  return value
}

const syncDirectoryHandle = (state: DirectoryState): M.SyncDirectoryHandle => {
  const prior = directorySynchronous.get(state)
  if (prior !== undefined) return prior
  const value = Object.freeze<M.SyncDirectoryHandle>({
    [M.DirectoryHandleTypeId]: M.DirectoryHandleTypeId,
    effect: effectDirectoryHandle(state),
    stat: () =>
      R.readOnlyResult(R.result(() =>
        state.caller.runtime.sync(state.resource, "directory.stat", (work) => {
          const tx = new E.Transaction(state.caller, work)
          const observation = tx.observation(tx.get(state.id))
          if (observation.kind !== "directory") return tx.wrongKind()
          return tx.transition(observation)
        })
      )),
    close: () => R.result(() => state.caller.runtime.closeSync(state.resource, "directory.close"))
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
): DirectoryState => {
  const found = tx.target(target).object
  if (found.kind !== "directory") return tx.wrongKind()
  tx.require(found, E.EXECUTE_PERMISSION)
  tx.engine.retainObjects(resource, [found.id])
  return { caller: E.createCaller(tx.engine, caller.policy, resource), resource, id: found.id }
}

export const openDirectory = Effect.fnUntraced(
  function*(caller: E.Caller, target: M.Target): Effect.fn.Return<M.DirectoryHandle, M.OperationError, Scope.Scope> {
    const scope = yield* Scope.Scope
    return yield* caller.runtime.run(caller.resource, "openDirectory", () => ({
      bytes: E.addressBytes(target, "openDirectory", caller.runtime.limits),
      snapshot: (work) => {
        const selected = E.snapshotTarget(target)
        const acquired = work.acquireResource("handle")
        return {
          enroll: acquired.enroll(scope, "openDirectory"),
          execute: () => {
            if (acquired.state !== "open") throw R.closed("openDirectory", acquired.state)
            const tx = new E.Transaction(caller, work)
            return tx.transition(effectDirectoryHandle(acquireDirectory(caller, acquired, tx, selected)))
          }
        }
      }
    }))
  }
)

export const openDirectorySync = (
  caller: E.Caller,
  owner: R.Resource,
  target: M.Target
): Result.Result<M.SyncDirectoryHandle, M.OperationError> =>
  R.result(() =>
    caller.runtime.sync(owner, "openDirectory", (work) => {
      work.reserve(E.addressBytes(target, "openDirectory", caller.runtime.limits))
      const selected = E.snapshotTarget(target)
      const resource = work.acquireResource("handle", owner)
      const tx = new E.Transaction(caller, work)
      return tx.transition(syncDirectoryHandle(acquireDirectory(caller, resource, tx, selected)))
    })
  )
