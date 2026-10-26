import * as BytePath from "../../BytePath.ts"
import type * as ByteSize from "../../ByteSize.ts"
import * as Match from "../../Match.ts"
import * as Option from "../../Option.ts"
import * as Result from "../../Result.ts"
import * as Schema from "../../Schema.ts"
import * as E from "./engine.ts"
import * as M from "./model.ts"
import * as R from "./runtime.ts"

// -----------------------------------------------------------------------------
// Option validation
// -----------------------------------------------------------------------------

const CHAR_FORWARD_SLASH = 47

const zero = BigInt(0)

const isBoolean = Schema.is(Schema.Boolean)
const isUnixNano = Schema.is(Schema.UnixNano)
const isRecord: (input: unknown) => boolean = Schema.is(Schema.Record(Schema.String, Schema.Unknown))
const isPlacement = Schema.is(Schema.Literals(["replace", "start", "append"]))
const isExpectation = Schema.is(Schema.Literals(["absent", "present", "binding"]))

/** @internal */
export interface OptionsByOperation {
  readonly access: M.AccessOptions | undefined
  readonly writeFile: M.WriteFileOptions | undefined
  readonly createFile: M.CreateOptions | undefined
  readonly makeDirectory: M.MkdirOptions | undefined
  readonly makeDirectoryEntry: M.CreateOptions | undefined
  readonly makeSymlink: M.AbsentConditions | undefined
  readonly makeHardLink: M.AbsentConditions | undefined
  readonly unlink: M.EntryConditions | undefined
  readonly removeDirectory: M.EntryConditions | undefined
  readonly rename: M.RenameOptions | undefined
  readonly setAttributes: M.AttributeOptions | undefined
  readonly truncate: M.RevisionCondition | undefined
  readonly publishCopiedFile: M.AtomicCopyOptions | undefined
  readonly publishCopiedSymlink: M.AtomicSymlinkCopyOptions | undefined
}

/** @internal */
export type Operation = keyof OptionsByOperation

/** @internal */
export const optionFields = {
  access: ["read", "write", "execute"],
  writeFile: ["placement", "access", "create", "mode", "conditions", "expectedRevision"],
  createFile: ["mode", "conditions"],
  makeDirectory: ["mode", "conditions", "recursive"],
  makeDirectoryEntry: ["mode", "conditions"],
  makeSymlink: ["entry", "parentNamespace"],
  makeHardLink: ["entry", "parentNamespace"],
  unlink: ["entry", "parentNamespace"],
  removeDirectory: ["entry", "parentNamespace"],
  rename: ["source", "destination"],
  setAttributes: ["followFinalSymlink", "expectedRevision"],
  truncate: ["expectedRevision"],
  publishCopiedFile: ["overwrite", "preserveTimes", "mode", "destination", "expectedRevision"],
  publishCopiedSymlink: ["overwrite", "preserveTimes", "destination"]
} as const satisfies { readonly [Key in Operation]: ReadonlyArray<keyof NonNullable<OptionsByOperation[Key]>> }

/** @internal */
export const conditionFields = ["entry", "parentNamespace"] as const

/** @internal */
export const slotFields = ["expected", "object", "binding"] as const

/** @internal */
export const slotVariantFields = {
  present: ["expected", "object"],
  binding: ["expected", "binding"],
  absent: ["expected"]
} as const

/** @internal */
export const timeFields = ["atime", "mtime"] as const

/** @internal */
export const attributeFields = ["mode", "uid", "gid", "atime", "mtime"] as const

/** @internal */
export const hardLinkSourceFields = {
  reference: ["reference"],
  entry: ["entry", "conditions"]
} as const

/** @internal */
export const condition = (
  input: unknown,
  operation: string,
  absent = false
) =>
  Result.gen(function*() {
    const object = yield* E.checkOptionsResult(input, conditionFields, operation)
    const entry = object?.entry
    if (entry === undefined) return undefined
    const fields = yield* E.checkOptionsResult(entry, slotFields, operation)
    const expected = fields?.expected
    if (expected !== undefined && (absent ? expected !== "absent" : !isExpectation(expected))) {
      return yield* Result.fail(new M.InvalidInput({ operation, field: "expected", reason: "malformed" }))
    }
    if (fields === undefined) {
      return yield* Result.fail(new M.InvalidInput({ operation, field: "expected", reason: "malformed" }))
    }
    yield* Match.value(fields).pipe(
      Match.when((fields) => fields.expected === "present", () =>
        Result.gen(function*() {
          yield* E.checkOptionsResult(entry, slotVariantFields.present, operation)
          if (M.tokenInfo(fields.object)?.kind !== "object") {
            return yield* Result.fail(new M.InvalidInput({ operation, field: "object", reason: "malformed" }))
          }
        })),
      Match.when((fields) => fields.expected === "binding", () =>
        Result.gen(function*() {
          yield* E.checkOptionsResult(entry, slotVariantFields.binding, operation)
          if (M.tokenInfo(fields.binding)?.kind !== "binding") {
            return yield* Result.fail(new M.InvalidInput({ operation, field: "binding", reason: "malformed" }))
          }
        })),
      Match.when((fields) => fields.expected === "absent", () =>
        Result.map(E.checkOptionsResult(entry, slotVariantFields.absent, operation), () => undefined)),
      Match.orElse(() =>
        Result.fail(new M.InvalidInput({ operation, field: "expected", reason: "malformed" }))
      )
    )
    return fields
  })

/**
 * Validates scalar options before admission. Token-domain checks remain authorized execution checks.
 *
 * @internal
 */
export const validate = (operation: Operation, options: unknown): Result.Result<void, M.InvalidInput> =>
  Match.value(operation).pipe(
    Match.when("access", () =>
      Result.gen(function*() {
        const object = yield* E.checkOptionsResult(options, optionFields.access, operation)
        for (const field of ["read", "write", "execute"] as const) {
          const input = object?.[field]
          if (input !== undefined && !isBoolean(input)) {
            return yield* Result.fail(new M.InvalidInput({ operation, field, reason: "malformed" }))
          }
        }
      })),
    Match.when("writeFile", () =>
      Result.gen(function*() {
        const object = yield* E.checkOptionsResult(options, optionFields.writeFile, operation)
        const placement = object?.placement
        if (placement !== undefined && !isPlacement(placement)) {
          return yield* Result.fail(new M.InvalidInput({ operation, field: "placement", reason: "malformed" }))
        }
        const access = object?.access
        if (access !== undefined && !M.isWriteAccess(access)) {
          return yield* Result.fail(new M.InvalidInput({ operation, field: "access", reason: "malformed" }))
        }
        const create = object?.create
        if (create !== undefined && !M.isCreation(create)) {
          return yield* Result.fail(new M.InvalidInput({ operation, field: "create", reason: "malformed" }))
        }
        if (object?.mode !== undefined) yield* E.modeResult(object.mode, "file", operation)
        yield* condition(object?.conditions, operation)
        if (object?.create === "exclusive" && object.expectedRevision !== undefined) {
          return yield* Result.fail(new M.InvalidInput({ operation, field: "expectedRevision", reason: "malformed" }))
        }
      })),
    Match.whenOr("createFile", "makeDirectory", "makeDirectoryEntry", (operation) =>
      Result.gen(function*() {
        const object = yield* E.checkOptionsResult(options, optionFields[operation], operation)
        if (object?.mode !== undefined) {
          yield* E.modeResult(object.mode, operation === "createFile" ? "file" : "directory", operation)
        }
        if (operation === "makeDirectory") {
          const recursive = object?.recursive
          if (recursive !== undefined && !isBoolean(recursive)) {
            return yield* Result.fail(new M.InvalidInput({ operation, field: "recursive", reason: "malformed" }))
          }
        }
        yield* condition(object?.conditions, operation, true)
      })),
    Match.whenOr("makeSymlink", "makeHardLink", () => Result.map(condition(options, operation, true), () => undefined)),
    Match.whenOr("unlink", "removeDirectory", () =>
      Result.gen(function*() {
        const fields = yield* condition(options, operation)
        if (fields?.expected === "absent") {
          return yield* Result.fail(new M.InvalidInput({ operation, field: "expected", reason: "malformed" }))
        }
      })),
    Match.when("rename", () =>
      Result.gen(function*() {
        const object = yield* E.checkOptionsResult(options, optionFields.rename, operation)
        const source = yield* condition(object?.source, operation)
        if (source?.expected === "absent") {
          return yield* Result.fail(new M.InvalidInput({ operation, field: "expected", reason: "malformed" }))
        }
        yield* condition(object?.destination, operation)
      })),
    Match.when("setAttributes", () =>
      Result.gen(function*() {
        const object = yield* E.checkOptionsResult(options, optionFields.setAttributes, operation)
        const followFinalSymlink = object?.followFinalSymlink
        if (followFinalSymlink !== undefined && !isBoolean(followFinalSymlink)) {
          return yield* Result.fail(new M.InvalidInput({ operation, field: "followFinalSymlink", reason: "malformed" }))
        }
      })),
    Match.when(
      "truncate",
      () => Result.map(E.checkOptionsResult(options, optionFields.truncate, operation), () => undefined)
    ),
    Match.whenOr("publishCopiedFile", "publishCopiedSymlink", (operation) =>
      Result.gen(function*() {
        const object = yield* E.checkOptionsResult(options, optionFields[operation], operation)
        const overwrite = object?.overwrite
        if (overwrite !== undefined && !isBoolean(overwrite)) {
          return yield* Result.fail(new M.InvalidInput({ operation, field: "overwrite", reason: "malformed" }))
        }
        if (object?.mode !== undefined) yield* E.modeResult(object.mode, "file", operation)
        yield* condition(object?.destination, operation)
        const times = yield* E.checkOptionsResult(object?.preserveTimes, timeFields, operation)
        if (object?.preserveTimes !== undefined && (!isUnixNano(times?.atime) || !isUnixNano(times?.mtime))) {
          return yield* Result.fail(new M.InvalidInput({ operation, field: "preserveTimes", reason: "malformed" }))
        }
      })),
    Match.orElse((operation: never) =>
      Result.fail(new M.InvalidInput({ operation, field: "operation", reason: "malformed" }))
    )
  )

// -----------------------------------------------------------------------------
// Transaction helpers
// -----------------------------------------------------------------------------

const authorizeCreate = (
  tx: E.Transaction,
  parent: E.DirectoryNode,
  requested: number | undefined,
  kind: E.Node["kind"]
) =>
  Result.gen(function*() {
    yield* tx.requireResult(parent, E.WRITE_PERMISSION | E.EXECUTE_PERMISSION)
    if (requested !== undefined) yield* E.modeResult(requested, kind, tx.operation)
    if (
      kind === "directory" && requested !== undefined && (requested & E.SET_GID_BIT) !== 0 &&
      !tx.caller.policy.privileged
    ) {
      const gid = (parent.mode & E.SET_GID_BIT) !== 0 ? parent.gid : tx.caller.policy.gid
      if (gid !== tx.caller.policy.gid && !tx.caller.policy.groups.includes(gid)) {
        return yield* Result.fail(new M.AccessDenied({ operation: tx.operation, reason: "ownership" }))
      }
    }
  })

const reserveFile = (tx: E.Transaction, amount: bigint): Result.Result<void, M.OperationError> =>
  Result.gen(function*() {
    if (amount > BigInt(Number.MAX_SAFE_INTEGER)) {
      return yield* Result.fail(new M.InvalidInput({ operation: tx.operation, field: "length", reason: "range" }))
    }
    if (amount > tx.engine.runtime.limits.fileBytes) {
      return yield* Result.fail(new M.LimitExceeded({ operation: tx.operation, domain: "file", stage: "publication" }))
    }
    yield* tx.reserveResult(amount)
  })

// -----------------------------------------------------------------------------
// Read operations
// -----------------------------------------------------------------------------

/** @internal */
export const lookup = (tx: E.Transaction, target: M.Target): Result.Result<M.ObjectReference, M.OperationError> =>
  Result.map(tx.targetResult(target), (route) => tx.engine.reference(route.object.id))

/** @internal */
export const stat = (tx: E.Transaction, target: M.Target): Result.Result<M.ObjectObservation, M.OperationError> =>
  Result.map(tx.targetResult(target), (route) => tx.observation(route.object))

/** @internal */
export const linkStat = (
  tx: E.Transaction,
  target: M.EntryTarget
): Result.Result<M.ObjectObservation, M.OperationError> =>
  Result.map(tx.targetResult(target, false), (route) => tx.observation(route.object))

/** @internal */
export const access = (
  tx: E.Transaction,
  target: M.Target,
  options?: M.AccessOptions
): Result.Result<void, M.OperationError> =>
  Result.gen(function*() {
    yield* validate("access", options)
    const { object: node } = yield* tx.targetResult(target)
    yield* tx.requireResult(
      node,
      (options?.read ? E.READ_PERMISSION : 0) | (options?.write ? E.WRITE_PERMISSION : 0) |
        (options?.execute ? E.EXECUTE_PERMISSION : 0)
    )
  })

/** @internal */
export const observeEntry = (
  tx: E.Transaction,
  address: M.EntryAddress
): Result.Result<M.EntryObservation, M.OperationError> =>
  Result.gen(function*() {
    const slot = yield* tx.slotResult(address)
    yield* tx.reserveResult(BigInt(BytePath.byteLength(slot.name)))
    return yield* tx.entryResult(slot.parent, slot.name, slot.binding)
  })

/** @internal */
export const observeRouteParent = (
  tx: E.Transaction,
  input: M.Path
): Result.Result<Option.Option<M.PresentEntry>, M.OperationError> =>
  Result.gen(function*() {
    const route = yield* tx.targetResult(input, false)
    if (route.object.id === tx.caller.policy.root) return Option.none()
    let parent = route.parent
    let binding = route.binding
    if (parent === undefined || binding === undefined) {
      if (route.object.kind !== "directory" || route.object.parent === undefined) {
        return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
      }
      parent = yield* tx.directoryResult(route.object.parent)
      yield* tx.requireResult(parent, E.EXECUTE_PERMISSION)
      yield* tx.visitResult()
      binding = yield* tx.findBindingResult(parent, route.object.id)
    }
    if (binding === undefined) {
      return yield* Result.fail(new M.NotFound({ operation: tx.operation, reason: "missingRoute" }))
    }
    yield* tx.reserveResult(BigInt(BytePath.byteLength(binding.name)))
    const entry = yield* tx.entryResult(parent, binding.name, binding)
    return entry.state === "present" ? Option.some(entry) : Option.none()
  })

/** @internal */
export const realPath = (tx: E.Transaction, input: M.Path): Result.Result<BytePath.BytePath, M.OperationError> =>
  Result.gen(function*() {
    const route = yield* tx.targetResult(input)
    const components: Array<BytePath.BytePath> = []
    let id = route.object.id
    if (route.object.kind !== "directory") {
      if (route.parent === undefined || route.binding === undefined) {
        return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
      }
      components.push(route.binding.name)
      id = route.parent.id
    }
    while (id !== tx.caller.policy.root) {
      yield* tx.visitResult()
      const directory = yield* tx.directoryResult(id)
      if (directory.parent === undefined) {
        return yield* Result.fail(new M.AccessDenied({ operation: tx.operation, reason: "confinement" }))
      }
      const parent = yield* tx.directoryResult(directory.parent)
      const binding = yield* tx.findBindingResult(parent, id)
      if (binding === undefined) {
        return yield* Result.fail(new M.AccessDenied({ operation: tx.operation, reason: "confinement" }))
      }
      components.push(binding.name)
      id = parent.id
    }
    const length = components.reduce((total, component) => total + BytePath.byteLength(component) + 1, 0) || 1
    yield* tx.reserveResult(BigInt(length))
    const bytes = new Uint8Array(length)
    let offset = 0
    for (let index = components.length - 1; index >= 0; index--) {
      bytes[offset++] = CHAR_FORWARD_SLASH
      const component = BytePath.toBytes(components[index])
      bytes.set(component, offset)
      offset += component.length
    }
    if (components.length === 0) bytes[0] = CHAR_FORWARD_SLASH
    return Result.getOrThrow(BytePath.fromBytes(bytes))
  })

/** @internal */
export const readFileObserved = (
  tx: E.Transaction,
  target: M.Target
): Result.Result<M.ObservedRead<Uint8Array>, M.OperationError> =>
  Result.gen(function*() {
    const { object: node } = yield* tx.targetResult(target)
    if (node.kind !== "file") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    yield* tx.requireResult(node, E.READ_PERMISSION)
    const length = BigInt(node.data.length)
    if (length > tx.engine.runtime.limits.ioBytes) {
      return yield* Result.fail(new M.LimitExceeded({ operation: tx.operation, domain: "io", stage: "reservation" }))
    }
    if (length > tx.engine.runtime.limits.fileBytes) {
      return yield* Result.fail(new M.LimitExceeded({ operation: tx.operation, domain: "file", stage: "reservation" }))
    }
    yield* tx.reserveResult(length)
    const value = node.data.slice()
    const accessTimeBeforeRead = node.atime
    yield* tx.touchResult(node.id, ["atime"])
    return { value, object: tx.observation(yield* tx.getResult(node.id)), accessTimeBeforeRead }
  })

/** @internal */
export const readFile = (tx: E.Transaction, target: M.Target): Result.Result<Uint8Array, M.OperationError> =>
  Result.map(readFileObserved(tx, target), (read) => read.value)

/** @internal */
export const readLinkObserved = (
  tx: E.Transaction,
  target: M.EntryTarget | M.ObjectReference
): Result.Result<M.ObservedRead<BytePath.BytePath>, M.OperationError> =>
  Result.gen(function*() {
    const { object: node } = yield* tx.targetResult(target, false)
    if (node.kind !== "symlink") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    yield* tx.reserveResult(BigInt(BytePath.byteLength(node.target)))
    const accessTimeBeforeRead = node.atime
    yield* tx.touchResult(node.id, ["atime"])
    return { value: node.target, object: tx.observation(yield* tx.getResult(node.id)), accessTimeBeforeRead }
  })

/** @internal */
export const readLink = (
  tx: E.Transaction,
  target: M.EntryTarget | M.ObjectReference
): Result.Result<BytePath.BytePath, M.OperationError> => Result.map(readLinkObserved(tx, target), (read) => read.value)

/** @internal */
export const readDirectory = (tx: E.Transaction, target: M.Target): Result.Result<M.NameListing, M.OperationError> =>
  Result.gen(function*() {
    const { object: node } = yield* tx.targetResult(target)
    if (node.kind !== "directory") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    yield* tx.requireResult(node, E.READ_PERMISSION)
    const entries = yield* tx.listBindingsResult(node)
    yield* tx.reserveResult(entries.reduce((total, entry) => total + BigInt(BytePath.byteLength(entry.name)), zero))
    yield* tx.touchResult(node.id, ["atime"])
    const directory = tx.observation(yield* tx.getResult(node.id))
    if (directory.kind !== "directory") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    return { directory, names: entries.map((entry) => entry.name) }
  })

/** @internal */
export const readDirectoryEntries = (
  tx: E.Transaction,
  target: M.Target
): Result.Result<M.EntryListing, M.OperationError> =>
  Result.gen(function*() {
    const { object: node } = yield* tx.targetResult(target)
    if (node.kind !== "directory") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    yield* tx.requireResult(node, E.READ_PERMISSION | E.EXECUTE_PERMISSION)
    const entries = yield* tx.listBindingsResult(node)
    yield* tx.reserveResult(entries.reduce((total, entry) => total + BigInt(BytePath.byteLength(entry.name)), zero))
    yield* tx.touchResult(node.id, ["atime"])
    const directory = tx.observation(yield* tx.getResult(node.id))
    if (directory.kind !== "directory") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    const observed: Array<M.ListedEntry> = []
    for (const entry of entries) {
      observed.push({
        name: entry.name,
        binding: M.issueToken("binding", tx.engine.runtime.instanceNumber, node.id, entry.version),
        object: tx.observation(yield* tx.getResult(entry.object))
      })
    }
    return { directory, entries: observed }
  })

// -----------------------------------------------------------------------------
// File writes and attributes
// -----------------------------------------------------------------------------

/** Resolves final symlinks without losing the explicit original entry condition. */
const writable = (
  tx: E.Transaction,
  target: M.Target,
  options: M.WriteFileOptions
) =>
  Result.gen(function*() {
    if (M.isToken(target)) {
      if (
        options.conditions !== undefined || options.mode !== undefined ||
        (options.create !== undefined && options.create !== "existing")
      ) {
        return yield* Result.fail(
          new M.InvalidInput({ operation: tx.operation, field: "options", reason: "malformed" })
        )
      }
      const { object: node } = yield* tx.targetResult(target)
      yield* tx.requireResult(
        node,
        options.access === "readwrite" ? (E.READ_PERMISSION | E.WRITE_PERMISSION) : E.WRITE_PERMISSION
      )
      yield* tx.revisionResult(node, options)
      if (node.kind !== "file") {
        return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
      }
      return node
    }
    if ((typeof target === "string" || BytePath.isBytePath(target)) && options.conditions !== undefined) {
      return yield* Result.fail(
        new M.InvalidInput({ operation: tx.operation, field: "conditions", reason: "malformed" })
      )
    }
    const state: E.ResolutionState = { follows: 0 }
    const initial = yield* tx.slotResult(target, undefined, state)
    let selected = initial
    const create = options.create ?? "ifmissing"
    if (create === "exclusive") {
      yield* authorizeCreate(tx, initial.parent, options.mode, "file")
      yield* tx.conditionsResult(initial.parent, initial.binding, options.conditions)
      if (initial.binding !== undefined) {
        return yield* Result.fail(new M.AlreadyExists({ operation: tx.operation, reason: "occupiedEntry" }))
      }
    } else {
      selected = yield* tx.followFinalSlotResult(initial, state)
      if (selected.binding !== undefined) {
        const node = yield* tx.getResult(selected.binding.object)
        yield* tx.requireResult(
          node,
          options.access === "readwrite" ? (E.READ_PERMISSION | E.WRITE_PERMISSION) : E.WRITE_PERMISSION
        )
        yield* tx.conditionsResult(initial.parent, initial.binding, options.conditions)
        yield* tx.revisionResult(node, options)
        if (node.kind !== "file") {
          return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
        }
        return node
      }
      if (create === "existing") {
        yield* tx.conditionsResult(initial.parent, initial.binding, options.conditions)
        return yield* Result.fail(new M.NotFound({ operation: tx.operation, reason: "missingEntry" }))
      }
      yield* authorizeCreate(tx, selected.parent, options.mode, "file")
      yield* tx.conditionsResult(initial.parent, initial.binding, options.conditions)
    }
    if (options.expectedRevision !== undefined) {
      return yield* Result.fail(new M.ConditionFailed({ operation: tx.operation, reason: "objectRevision" }))
    }
    const node = yield* tx.createResult("file", selected.parent, options.mode)
    if (node.kind !== "file") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    yield* tx.insertResult(selected.parent.id, selected.name, node.id)
    return node
  })

/** @internal */
export const writeFile = (
  tx: E.Transaction,
  target: M.Target,
  data: Uint8Array,
  options?: M.WriteFileOptions
) =>
  Result.gen(function*() {
    yield* validate("writeFile", options)
    const node = yield* writable(tx, target, options ?? {})
    if (BigInt(data.length) > tx.engine.runtime.limits.ioBytes) {
      return yield* Result.fail(new M.LimitExceeded({ operation: tx.operation, domain: "io", stage: "reservation" }))
    }
    const placement = options?.placement ?? "replace"
    const length = placement === "replace"
      ? data.length
      : placement === "start"
      ? Math.max(node.data.length, data.length)
      : node.data.length + data.length
    yield* reserveFile(tx, BigInt(length))
    if (data.length === 0 && (placement !== "replace" || node.data.length === 0)) return
    const next = new Uint8Array(length)
    if (placement !== "replace") next.set(node.data)
    next.set(data, placement === "append" ? node.data.length : 0)
    const edited = yield* tx.editResult(node.id)
    if (edited.kind !== "file") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    edited.data = next
    yield* tx.changedResult(node.id, ["mtime", "ctime"])
  })

/** @internal */
export const truncate = (
  tx: E.Transaction,
  target: M.Target,
  length: ByteSize.Input,
  options?: M.RevisionCondition
): Result.Result<void, M.OperationError> =>
  Result.gen(function*() {
    yield* validate("truncate", options)
    const requested = yield* R.sizeResult(length, tx.operation, "length")
    const { object: node } = yield* tx.targetResult(target)
    if (node.kind !== "file") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    yield* tx.requireResult(node, E.WRITE_PERMISSION)
    yield* tx.revisionResult(node, options)
    yield* reserveFile(tx, requested)
    if (requested === BigInt(node.data.length)) return
    const data = new Uint8Array(Number(requested))
    data.set(node.data.subarray(0, data.length))
    const edited = yield* tx.editResult(node.id)
    if (edited.kind !== "file") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    edited.data = data
    yield* tx.changedResult(node.id, ["mtime", "ctime"])
  })

/** @internal */
export const validateAttributes = (
  attributes: M.Attributes,
  operation: string
) =>
  Result.gen(function*() {
    yield* E.checkOptionsResult(attributes, attributeFields, operation)
    if (attributes === undefined) {
      return yield* Result.fail(new M.InvalidInput({ operation, field: "attributes", reason: "malformed" }))
    }
    if (attributes.mode !== undefined) yield* E.modeResult(attributes.mode, "directory", operation)
    if (attributes.uid !== undefined) yield* E.identityResult(attributes.uid, operation, "uid")
    if (attributes.gid !== undefined) yield* E.identityResult(attributes.gid, operation, "gid")
    if (attributes.atime !== undefined && !isUnixNano(attributes.atime)) {
      return yield* Result.fail(new M.InvalidInput({ operation, field: "atime", reason: "malformed" }))
    }
    if (attributes.mtime !== undefined && !isUnixNano(attributes.mtime)) {
      return yield* Result.fail(new M.InvalidInput({ operation, field: "mtime", reason: "malformed" }))
    }
  })

/**
 * Authorizes all requested fields against the same prestate. Also used by retained handles.
 *
 * @internal
 */
export const attributesFor = (
  tx: E.Transaction,
  node: E.Node,
  attributes: M.Attributes,
  options?: M.RevisionCondition
) =>
  Result.gen(function*() {
    yield* validateAttributes(attributes, tx.operation)
    if (attributes.mode !== undefined) {
      if (node.kind === "symlink") {
        return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
      }
      yield* E.modeResult(attributes.mode, node.kind, tx.operation)
      yield* tx.ownsResult(node)
      if (
        node.kind === "directory" && (attributes.mode & E.SET_GID_BIT) !== 0 && (node.mode & E.SET_GID_BIT) === 0 &&
        !tx.caller.policy.privileged && node.gid !== tx.caller.policy.gid && !tx.caller.policy.groups.includes(node.gid)
      ) return yield* Result.fail(new M.AccessDenied({ operation: tx.operation, reason: "ownership" }))
    }
    if (attributes.uid !== undefined && !tx.caller.policy.privileged) {
      return yield* Result.fail(new M.AccessDenied({ operation: tx.operation, reason: "ownership" }))
    }
    if (attributes.gid !== undefined) {
      yield* tx.ownsResult(node)
      if (
        !tx.caller.policy.privileged && attributes.gid !== tx.caller.policy.gid &&
        !tx.caller.policy.groups.includes(attributes.gid)
      ) return yield* Result.fail(new M.AccessDenied({ operation: tx.operation, reason: "ownership" }))
    }
    if (attributes.atime !== undefined || attributes.mtime !== undefined) yield* tx.ownsResult(node)
    yield* tx.revisionResult(node, options)
    let changed = false
    const edited = yield* tx.editResult(node.id)
    for (const field of attributeFields) {
      const value = attributes[field]
      if (value === undefined) continue
      if (value !== node[field]) changed = true
      if (field === "atime" || field === "mtime") {
        const requested = attributes[field]
        if (requested !== undefined) yield* tx.explicitTimeResult(node.id, field, requested)
      } else Object.assign(edited, { [field]: value })
    }
    if (changed) yield* tx.changedResult(node.id, ["ctime"])
  })

/** @internal */
export const setAttributes = (
  tx: E.Transaction,
  target: M.Target,
  attributes: M.Attributes,
  options?: M.AttributeOptions
) =>
  Result.gen(function*() {
    yield* validate("setAttributes", options)
    yield* validateAttributes(attributes, tx.operation)
    const { object: node } = yield* tx.targetResult(target, options?.followFinalSymlink !== false)
    yield* attributesFor(tx, node, attributes, options)
  })

// -----------------------------------------------------------------------------
// Namespace changes
// -----------------------------------------------------------------------------

/** @internal */
export const createFile = (
  tx: E.Transaction,
  target: M.EntryTarget,
  options?: M.CreateOptions
) =>
  Result.gen(function*() {
    yield* validate("createFile", options)
    const slot = yield* tx.slotResult(target)
    yield* authorizeCreate(tx, slot.parent, options?.mode, "file")
    yield* tx.conditionsResult(slot.parent, slot.binding, options?.conditions)
    if (slot.binding !== undefined) {
      return yield* Result.fail(new M.AlreadyExists({ operation: tx.operation, reason: "occupiedEntry" }))
    }
    const node = yield* tx.createResult("file", slot.parent, options?.mode)
    yield* tx.insertResult(slot.parent.id, slot.name, node.id)
    return tx.observation(node)
  })

const mkdirOne = (
  tx: E.Transaction,
  target: M.EntryTarget,
  options: M.MkdirOptions,
  final = true
) =>
  Result.gen(function*() {
    const slot = yield* tx.slotResult(target, undefined, undefined, true)
    if (slot.binding !== undefined && options.recursive) {
      const node = yield* tx.getResult(slot.binding.object)
      if (final) yield* tx.conditionsResult(slot.parent, slot.binding, options.conditions)
      if (node.kind === "directory") return node
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    yield* authorizeCreate(tx, slot.parent, options.mode, "directory")
    if (final) yield* tx.conditionsResult(slot.parent, slot.binding, options.conditions)
    if (slot.binding !== undefined) {
      return yield* Result.fail(new M.AlreadyExists({ operation: tx.operation, reason: "occupiedEntry" }))
    }
    const node = yield* tx.createResult("directory", slot.parent, options.mode)
    if (node.kind !== "directory") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    yield* tx.insertResult(slot.parent.id, slot.name, node.id)
    return node
  })

/** @internal */
export const makeDirectory = (
  tx: E.Transaction,
  target: M.EntryTarget,
  options?: M.MkdirOptions
) =>
  Result.gen(function*() {
    yield* validate("makeDirectory", options)
    let node: E.Node
    if (!options?.recursive || (typeof target !== "string" && !BytePath.isBytePath(target))) {
      node = yield* mkdirOne(tx, target, options ?? {})
    } else {
      const bytes = BytePath.toBytes(yield* E.pathValueResult(target, tx.operation))
      let end = bytes.length
      while (end > 0 && bytes[end - 1] === CHAR_FORWARD_SLASH) end--
      if (end === 0) node = (yield* tx.targetResult(target, false)).object
      else {
        let first = end - 1
        while (first >= 0 && bytes[first] !== CHAR_FORWARD_SLASH) first--
        yield* E.nameValueResult(Result.getOrThrow(BytePath.fromBytes(bytes.subarray(first + 1, end))), tx.operation)
        node = yield* tx.directoryResult(tx.caller.policy.cwd)
        for (let index = 0; index <= end; index++) {
          if (index < end && bytes[index] !== CHAR_FORWARD_SLASH) continue
          if (index === 0 || bytes[index - 1] === CHAR_FORWARD_SLASH) continue
          const prefix = Result.getOrThrow(BytePath.fromBytes(bytes.subarray(0, index)))
          const final = index === end
          const resolved = Result.gen(function*() {
            const { object } = yield* tx.resolveResult(prefix, !final)
            if (object.kind !== "directory") {
              return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
            }
            if (final && options.conditions !== undefined) {
              const slot = yield* tx.slotResult(prefix)
              yield* tx.conditionsResult(slot.parent, slot.binding, options.conditions)
            }
            return object
          })
          if (Result.isFailure(resolved) && resolved.failure instanceof M.NotFound) {
            node = yield* mkdirOne(tx, prefix, options, final)
          } else node = yield* resolved
        }
      }
    }
    const observation = tx.observation(node)
    if (observation.kind !== "directory") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    return observation
  })

/** @internal */
export const makeDirectoryEntry = (
  tx: E.Transaction,
  target: M.EntryTarget,
  options?: M.CreateOptions
) =>
  Result.gen(function*() {
    const directory = yield* makeDirectory(tx, target, options)
    const slot = yield* tx.slotResult(target)
    yield* tx.reserveResult(BigInt(BytePath.byteLength(slot.name)))
    const parent = yield* tx.directoryResult(slot.parent.id)
    const entry = yield* tx.entryResult(parent, slot.name, slot.binding)
    // NOTE: Creation and observation share a transaction, so a missing binding is an internal defect.
    if (entry.state !== "present" || entry.object.kind !== "directory") {
      throw new TypeError("Created directory has no binding")
    }
    return { ...entry, object: directory }
  })

/** @internal */
export const makeSymlink = (
  tx: E.Transaction,
  target: M.EntryTarget,
  linkTarget: M.Path,
  options?: M.AbsentConditions
) =>
  Result.gen(function*() {
    yield* validate("makeSymlink", options)
    const spelling = yield* E.pathValueResult(linkTarget, tx.operation)
    if (BytePath.byteLength(spelling) === 0) {
      return yield* Result.fail(
        new M.InvalidInput({ operation: tx.operation, field: "linkTarget", reason: "malformed" })
      )
    }
    if (BigInt(BytePath.byteLength(spelling)) > tx.engine.runtime.limits.pathBytes) {
      return yield* Result.fail(new M.LimitExceeded({ operation: tx.operation, domain: "path", stage: "resolution" }))
    }
    const slot = yield* tx.slotResult(target)
    yield* authorizeCreate(tx, slot.parent, undefined, "symlink")
    yield* tx.conditionsResult(slot.parent, slot.binding, options)
    if (slot.binding !== undefined) {
      return yield* Result.fail(
        new M.AlreadyExists({ operation: tx.operation, reason: "occupiedEntry" })
      )
    }
    const node = yield* tx.createResult("symlink", slot.parent, undefined, spelling)
    yield* tx.insertResult(slot.parent.id, slot.name, node.id)
    return tx.observation(node)
  })

/** @internal */
export const makeHardLink = (
  tx: E.Transaction,
  source: M.HardLinkSource,
  destination: M.EntryTarget,
  options?: M.AbsentConditions
) =>
  Result.gen(function*() {
    yield* validate("makeHardLink", options)
    if (!isRecord(source)) {
      return yield* Result.fail(new M.InvalidInput({ operation: tx.operation, field: "source", reason: "malformed" }))
    }
    yield* E.checkOptionsResult(
      source,
      "reference" in source ? hardLinkSourceFields.reference : hardLinkSourceFields.entry,
      tx.operation
    )
    let node: E.Node
    if ("reference" in source) node = (yield* tx.targetResult(source.reference, false)).object
    else {
      const selected = yield* tx.slotResult(source.entry)
      const fields = yield* condition(source.conditions, tx.operation)
      if (fields?.expected === "absent") {
        return yield* Result.fail(
          new M.InvalidInput({ operation: tx.operation, field: "expected", reason: "malformed" })
        )
      }
      yield* tx.conditionsResult(selected.parent, selected.binding, source.conditions)
      if (selected.binding === undefined) {
        return yield* Result.fail(
          new M.NotFound({ operation: tx.operation, reason: "missingEntry" })
        )
      }
      node = yield* tx.getResult(selected.binding.object)
    }
    if (node.kind === "directory") {
      return yield* Result.fail(
        new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" })
      )
    }
    const slot = yield* tx.slotResult(destination)
    yield* authorizeCreate(tx, slot.parent, undefined, node.kind)
    yield* tx.conditionsResult(slot.parent, slot.binding, options)
    if (slot.binding !== undefined) {
      return yield* Result.fail(
        new M.AlreadyExists({ operation: tx.operation, reason: "occupiedEntry" })
      )
    }
    yield* tx.hardLinkResult(node, slot)
    return tx.observation(yield* tx.getResult(node.id))
  })

/** @internal */
export const unlink = (
  tx: E.Transaction,
  target: M.EntryTarget,
  options?: M.EntryConditions
) =>
  Result.gen(function*() {
    yield* validate("unlink", options)
    const slot = yield* tx.slotResult(target)
    if (slot.binding === undefined) {
      yield* tx.requireResult(slot.parent, E.WRITE_PERMISSION | E.EXECUTE_PERMISSION)
      yield* tx.conditionsResult(slot.parent, undefined, options)
    }
    if (slot.binding === undefined) {
      return yield* Result.fail(new M.NotFound({ operation: tx.operation, reason: "missingEntry" }))
    }
    const binding = slot.binding
    const node = yield* tx.getResult(binding.object)
    yield* tx.stickyResult(slot.parent, node)
    yield* tx.conditionsResult(slot.parent, binding, options)
    if (node.kind === "directory") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    yield* tx.removeResult(slot.parent, binding)
  })

/** @internal */
export const removeDirectory = (
  tx: E.Transaction,
  target: M.EntryTarget,
  options?: M.EntryConditions
) =>
  Result.gen(function*() {
    yield* validate("removeDirectory", options)
    const slot = yield* tx.slotResult(target)
    if (slot.binding === undefined) {
      yield* tx.requireResult(slot.parent, E.WRITE_PERMISSION | E.EXECUTE_PERMISSION)
      yield* tx.conditionsResult(slot.parent, undefined, options)
    }
    if (slot.binding === undefined) {
      return yield* Result.fail(new M.NotFound({ operation: tx.operation, reason: "missingEntry" }))
    }
    const binding = slot.binding
    const node = yield* tx.getResult(binding.object)
    yield* tx.stickyResult(slot.parent, node)
    yield* tx.conditionsResult(slot.parent, binding, options)
    if (node.kind !== "directory") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    if (node.entries.size !== 0) {
      return yield* Result.fail(new M.Busy({ operation: tx.operation, reason: "nonemptyDirectory" }))
    }
    yield* tx.removeResult(slot.parent, binding)
  })

/** @internal */
export const rename = (
  tx: E.Transaction,
  source: M.EntryTarget,
  destination: M.EntryTarget,
  options?: M.RenameOptions
) =>
  Result.gen(function*() {
    yield* validate("rename", options)
    const from = yield* tx.slotResult(source)
    if (from.binding === undefined) {
      yield* tx.requireResult(from.parent, E.WRITE_PERMISSION | E.EXECUTE_PERMISSION)
      yield* tx.conditionsResult(from.parent, undefined, options?.source)
    }
    if (from.binding === undefined) {
      return yield* Result.fail(new M.NotFound({ operation: tx.operation, reason: "missingEntry" }))
    }
    const binding = from.binding
    const node = yield* tx.getResult(binding.object)
    yield* tx.stickyResult(from.parent, node)
    yield* tx.conditionsResult(from.parent, binding, options?.source)
    const to = yield* tx.slotResult(destination, undefined, undefined, node.kind === "directory")
    const victim = to.binding === undefined ? undefined : yield* tx.getResult(to.binding.object)
    if (victim === undefined) yield* tx.requireResult(to.parent, E.WRITE_PERMISSION | E.EXECUTE_PERMISSION)
    else yield* tx.stickyResult(to.parent, victim)
    yield* tx.conditionsResult(to.parent, to.binding, options?.destination)
    if (victim?.id === node.id) return
    if (victim !== undefined && ((node.kind === "directory") !== (victim.kind === "directory"))) {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    if (victim?.kind === "directory" && victim.entries.size !== 0) {
      return yield* Result.fail(
        new M.Busy({ operation: tx.operation, reason: "nonemptyDirectory" })
      )
    }
    if (node.kind === "directory" && (yield* tx.containedResult(to.parent.id, node.id))) {
      return yield* Result.fail(
        new M.AccessDenied({ operation: tx.operation, reason: "confinement" })
      )
    }
    yield* tx.moveResult(from, to, node)
  })

// -----------------------------------------------------------------------------
// Copy publication
// -----------------------------------------------------------------------------

/** @internal */
export const publishCopiedFile = (
  tx: E.Transaction,
  destination: M.EntryTarget,
  data: Uint8Array,
  options?: M.AtomicCopyOptions
) =>
  Result.gen(function*() {
    yield* validate("publishCopiedFile", options)
    const slot = yield* tx.slotResult(destination)
    const existing = slot.binding === undefined ? undefined : yield* tx.getResult(slot.binding.object)
    if (existing === undefined) yield* authorizeCreate(tx, slot.parent, options?.mode, "file")
    else yield* tx.requireResult(existing, E.WRITE_PERMISSION)
    if (existing !== undefined && options?.preserveTimes !== undefined) yield* tx.ownsResult(existing)
    yield* tx.conditionsResult(slot.parent, slot.binding, options?.destination)
    if (existing !== undefined) yield* tx.revisionResult(existing, options)
    else if (options?.expectedRevision !== undefined) {
      return yield* Result.fail(new M.ConditionFailed({ operation: tx.operation, reason: "objectRevision" }))
    }
    if (existing !== undefined && !options?.overwrite) {
      return yield* Result.fail(new M.AlreadyExists({ operation: tx.operation, reason: "occupiedEntry" }))
    }
    if (existing !== undefined && existing.kind !== "file") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    if (BigInt(data.length) > tx.engine.runtime.limits.ioBytes) {
      return yield* Result.fail(new M.LimitExceeded({ operation: tx.operation, domain: "io", stage: "reservation" }))
    }
    yield* reserveFile(tx, BigInt(data.length))
    const node = existing ?? (yield* tx.createResult("file", slot.parent, options?.mode))
    const next = yield* tx.editResult(node.id)
    if (next.kind !== "file") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    next.data = data.slice()
    if (existing === undefined) yield* tx.insertResult(slot.parent.id, slot.name, node.id)
    if (data.length > 0 || (existing !== undefined && existing.data.length !== 0)) {
      yield* tx.changedResult(node.id, ["mtime", "ctime"])
    }
    if (options?.preserveTimes !== undefined) {
      yield* attributesFor(tx, yield* tx.getResult(node.id), options.preserveTimes)
    }
    return tx.observation(yield* tx.getResult(node.id))
  })

/** @internal */
export const publishCopiedSymlink = (
  tx: E.Transaction,
  destination: M.EntryTarget,
  target: BytePath.BytePath,
  options?: M.AtomicSymlinkCopyOptions
) =>
  Result.gen(function*() {
    yield* validate("publishCopiedSymlink", options)
    if (!BytePath.isBytePath(target) || BytePath.byteLength(target) === 0) {
      return yield* Result.fail(new M.InvalidInput({ operation: tx.operation, field: "target", reason: "malformed" }))
    }
    if (BigInt(BytePath.byteLength(target)) > tx.engine.runtime.limits.pathBytes) {
      return yield* Result.fail(new M.LimitExceeded({ operation: tx.operation, domain: "path", stage: "resolution" }))
    }
    const slot = yield* tx.slotResult(destination)
    const existing = slot.binding === undefined ? undefined : yield* tx.getResult(slot.binding.object)
    if (existing === undefined) yield* tx.requireResult(slot.parent, E.WRITE_PERMISSION | E.EXECUTE_PERMISSION)
    else yield* tx.stickyResult(slot.parent, existing)
    yield* tx.conditionsResult(slot.parent, slot.binding, options?.destination)
    if (existing !== undefined && !options?.overwrite) {
      return yield* Result.fail(new M.AlreadyExists({ operation: tx.operation, reason: "occupiedEntry" }))
    }
    if (existing?.kind === "directory") {
      return yield* Result.fail(new M.InvalidResource({ operation: tx.operation, reason: "wrongKind" }))
    }
    if (slot.binding !== undefined) yield* tx.removeResult(slot.parent, slot.binding)
    const node = yield* tx.createResult("symlink", slot.parent, undefined, target)
    yield* tx.insertResult(slot.parent.id, slot.name, node.id)
    if (options?.preserveTimes !== undefined) yield* attributesFor(tx, node, options.preserveTimes)
    return tx.observation(yield* tx.getResult(node.id))
  })
