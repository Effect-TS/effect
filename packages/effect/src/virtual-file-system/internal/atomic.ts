import * as BytePath from "../../BytePath.ts"
import type * as ByteSize from "../../ByteSize.ts"
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

const path = (bytes: Uint8Array): BytePath.BytePath => Result.getOrThrow(BytePath.fromBytes(bytes))

const boolean = (input: unknown, operation: string, field: string): void => {
  if (input !== undefined && !Schema.is(Schema.Boolean)(input)) R.invalid(operation, field)
}

const enumeration = (input: unknown, values: ReadonlyArray<string>, operation: string, field: string): void => {
  if (input !== undefined && (typeof input !== "string" || !values.includes(input))) R.invalid(operation, field)
}

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

export type Operation = keyof OptionsByOperation

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

export const conditionFields = ["entry", "parentNamespace"] as const

export const slotFields = ["expected", "object", "binding"] as const

export const slotVariantFields = {
  present: ["expected", "object"],
  binding: ["expected", "binding"],
  absent: ["expected"]
} as const

export const timeFields = ["atime", "mtime"] as const

export const attributeFields = ["mode", "uid", "gid", "atime", "mtime"] as const

export const hardLinkSourceFields = {
  reference: ["reference"],
  entry: ["entry", "conditions"]
} as const

export const condition = (
  input: unknown,
  operation: string,
  absent = false
): Record<string, unknown> | undefined => {
  const object = E.checkOptions(input, conditionFields, operation)
  const entry = object?.entry
  if (entry === undefined) return
  const fields = E.checkOptions(entry, slotFields, operation)
  enumeration(fields?.expected, absent ? ["absent"] : ["absent", "present", "binding"], operation, "expected")
  if (fields?.expected === "present") {
    E.checkOptions(entry, slotVariantFields.present, operation)
    if (M.tokenInfo(fields.object)?.kind !== "object") R.invalid(operation, "object")
  } else if (fields?.expected === "binding") {
    E.checkOptions(entry, slotVariantFields.binding, operation)
    if (M.tokenInfo(fields.binding)?.kind !== "binding") R.invalid(operation, "binding")
  } else if (fields?.expected === "absent") E.checkOptions(entry, slotVariantFields.absent, operation)
  else R.invalid(operation, "expected")
  return fields
}

/** Validates scalar options before admission. Token-domain checks remain authorized execution checks. */
export const validate = (operation: Operation, options: unknown): void => {
  switch (operation) {
    case "access": {
      const object = E.checkOptions(options, optionFields[operation], operation)
      boolean(object?.read, operation, "read")
      boolean(object?.write, operation, "write")
      boolean(object?.execute, operation, "execute")
      return
    }
    case "writeFile": {
      const object = E.checkOptions(options, optionFields[operation], operation)
      enumeration(object?.placement, ["replace", "start", "append"], operation, "placement")
      enumeration(object?.access, ["write", "readwrite"], operation, "access")
      enumeration(object?.create, ["existing", "ifmissing", "exclusive"], operation, "create")
      if (object?.mode !== undefined) E.mode(object.mode, "file", operation)
      condition(object?.conditions, operation)
      if (object?.create === "exclusive" && object.expectedRevision !== undefined) {
        R.invalid(operation, "expectedRevision")
      }
      return
    }
    case "createFile":
    case "makeDirectory":
    case "makeDirectoryEntry": {
      const object = E.checkOptions(options, optionFields[operation], operation)
      if (object?.mode !== undefined) E.mode(object.mode, operation === "createFile" ? "file" : "directory", operation)
      if (operation === "makeDirectory") boolean(object?.recursive, operation, "recursive")
      condition(object?.conditions, operation, true)
      return
    }
    case "makeSymlink":
    case "makeHardLink":
      condition(options, operation, true)
      return
    case "unlink":
    case "removeDirectory":
      if (condition(options, operation)?.expected === "absent") R.invalid(operation, "expected")
      return
    case "rename": {
      const object = E.checkOptions(options, optionFields[operation], operation)
      if (condition(object?.source, operation)?.expected === "absent") R.invalid(operation, "expected")
      condition(object?.destination, operation)
      return
    }
    case "setAttributes": {
      const object = E.checkOptions(options, optionFields[operation], operation)
      boolean(object?.followFinalSymlink, operation, "followFinalSymlink")
      return
    }
    case "truncate":
      E.checkOptions(options, optionFields[operation], operation)
      return
    case "publishCopiedFile":
    case "publishCopiedSymlink": {
      const object = E.checkOptions(options, optionFields[operation], operation)
      boolean(object?.overwrite, operation, "overwrite")
      if (object?.mode !== undefined) E.mode(object.mode, "file", operation)
      condition(object?.destination, operation)
      const times = E.checkOptions(object?.preserveTimes, timeFields, operation)
      if (
        object?.preserveTimes !== undefined &&
        (!Schema.is(Schema.UnixNano)(times?.atime) || !Schema.is(Schema.UnixNano)(times?.mtime))
      ) {
        R.invalid(operation, "preserveTimes")
      }
      return
    }
    default:
      return R.invalid(operation satisfies never, "operation")
  }
}

// -----------------------------------------------------------------------------
// Transaction helpers
// -----------------------------------------------------------------------------

const file = (tx: E.Transaction, node: E.Node): E.FileNode => node.kind === "file" ? node : tx.wrongKind()

const authorizeCreate = (
  tx: E.Transaction,
  parent: E.DirectoryNode,
  requested: number | undefined,
  kind: E.Node["kind"]
): void => {
  tx.require(parent, E.WRITE_PERMISSION | E.EXECUTE_PERMISSION)
  if (requested !== undefined) E.mode(requested, kind, tx.operation)
  if (
    kind === "directory" && requested !== undefined && (requested & E.SET_GID_BIT) !== 0 && !tx.caller.policy.privileged
  ) {
    const gid = (parent.mode & E.SET_GID_BIT) !== 0 ? parent.gid : tx.caller.policy.gid
    if (gid !== tx.caller.policy.gid && !tx.caller.policy.groups.includes(gid)) {
      throw new M.AccessDenied({ operation: tx.operation, reason: "ownership" })
    }
  }
}

const absent = (tx: E.Transaction, binding: E.Binding | undefined): void => {
  if (binding !== undefined) throw new M.AlreadyExists({ operation: tx.operation, reason: "occupiedEntry" })
}

const required = (tx: E.Transaction, binding: E.Binding | undefined): E.Binding => {
  if (binding === undefined) throw new M.NotFound({ operation: tx.operation, reason: "missingEntry" })
  return binding
}

const io = (tx: E.Transaction, amount: bigint): void => {
  if (amount > tx.engine.runtime.limits.ioBytes) R.limit(tx.operation, "io", "reservation")
}

const candidate = (tx: E.Transaction, amount: bigint): void => {
  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) return R.invalid(tx.operation, "length", "range")
  if (amount > tx.engine.runtime.limits.fileBytes) R.limit(tx.operation, "file", "publication")
  tx.reserve(amount)
}

// -----------------------------------------------------------------------------
// Read operations
// -----------------------------------------------------------------------------

export const lookup = (tx: E.Transaction, target: M.Target): M.ObjectReference =>
  tx.engine.reference(tx.target(target).object.id)

export const stat = (tx: E.Transaction, target: M.Target): M.ObjectObservation =>
  tx.observation(tx.target(target).object)

export const linkStat = (tx: E.Transaction, target: M.EntryTarget): M.ObjectObservation =>
  tx.observation(tx.target(target, false).object)

export const access = (tx: E.Transaction, target: M.Target, options?: M.AccessOptions): void => {
  validate("access", options)
  const node = tx.target(target).object
  tx.require(
    node,
    (options?.read ? E.READ_PERMISSION : 0) | (options?.write ? E.WRITE_PERMISSION : 0) |
      (options?.execute ? E.EXECUTE_PERMISSION : 0)
  )
}

export const observeEntry = (tx: E.Transaction, address: M.EntryAddress): M.EntryObservation => {
  const slot = tx.slot(address)
  tx.reserve(BigInt(BytePath.byteLength(slot.name)))
  return tx.entry(slot.parent, slot.name, slot.binding)
}

export const observeRouteParent = (tx: E.Transaction, input: M.Path): Option.Option<M.PresentEntry> => {
  const route = tx.target(input, false)
  if (route.object.id === tx.caller.policy.root) return Option.none()
  let parent = route.parent
  let binding = route.binding
  if (parent === undefined || binding === undefined) {
    if (route.object.kind !== "directory" || route.object.parent === undefined) return tx.wrongKind()
    parent = tx.directory(route.object.parent)
    tx.require(parent, E.EXECUTE_PERMISSION)
    tx.visit()
    binding = tx.findBinding(parent, route.object.id)
  }
  if (binding === undefined) throw new M.NotFound({ operation: tx.operation, reason: "missingRoute" })
  tx.reserve(BigInt(BytePath.byteLength(binding.name)))
  const entry = tx.entry(parent, binding.name, binding)
  return entry.state === "present" ? Option.some(entry) : Option.none()
}

export const realPath = (tx: E.Transaction, input: M.Path): BytePath.BytePath => {
  const route = tx.target(input)
  const components: Array<BytePath.BytePath> = []
  let id = route.object.id
  if (route.object.kind !== "directory") {
    if (route.parent === undefined || route.binding === undefined) return tx.wrongKind()
    components.push(route.binding.name)
    id = route.parent.id
  }
  while (id !== tx.caller.policy.root) {
    tx.visit()
    const directory = tx.directory(id)
    if (directory.parent === undefined) throw new M.AccessDenied({ operation: tx.operation, reason: "confinement" })
    const parent = tx.directory(directory.parent)
    const binding = tx.findBinding(parent, id)
    if (binding === undefined) throw new M.AccessDenied({ operation: tx.operation, reason: "confinement" })
    components.push(binding.name)
    id = parent.id
  }
  const length = components.reduce((total, component) => total + BytePath.byteLength(component) + 1, 0) || 1
  tx.reserve(BigInt(length))
  const bytes = new Uint8Array(length)
  let offset = 0
  for (let index = components.length - 1; index >= 0; index--) {
    bytes[offset++] = CHAR_FORWARD_SLASH
    const component = BytePath.toBytes(components[index])
    bytes.set(component, offset)
    offset += component.length
  }
  if (components.length === 0) bytes[0] = CHAR_FORWARD_SLASH
  return path(bytes)
}

export const readFileObserved = (tx: E.Transaction, target: M.Target): M.ObservedRead<Uint8Array> => {
  const node = file(tx, tx.target(target).object)
  tx.require(node, E.READ_PERMISSION)
  const length = BigInt(node.data.length)
  io(tx, length)
  if (length > tx.engine.runtime.limits.fileBytes) R.limit(tx.operation, "file", "reservation")
  tx.reserve(length)
  const value = node.data.slice()
  const accessTimeBeforeRead = node.atime
  tx.touch(node.id, ["atime"])
  return { value, object: tx.observation(tx.get(node.id)), accessTimeBeforeRead }
}

export const readFile = (tx: E.Transaction, target: M.Target): Uint8Array => readFileObserved(tx, target).value

export const readLinkObserved = (
  tx: E.Transaction,
  target: M.EntryTarget | M.ObjectReference
): M.ObservedRead<BytePath.BytePath> => {
  const node = tx.target(target, false).object
  if (node.kind !== "symlink") return tx.wrongKind()
  tx.reserve(BigInt(BytePath.byteLength(node.target)))
  const accessTimeBeforeRead = node.atime
  tx.touch(node.id, ["atime"])
  return { value: node.target, object: tx.observation(tx.get(node.id)), accessTimeBeforeRead }
}

export const readLink = (tx: E.Transaction, target: M.EntryTarget | M.ObjectReference): BytePath.BytePath =>
  readLinkObserved(tx, target).value

export const readDirectory = (tx: E.Transaction, target: M.Target): M.NameListing => {
  const node = tx.target(target).object
  if (node.kind !== "directory") return tx.wrongKind()
  tx.require(node, E.READ_PERMISSION)
  const entries = tx.listBindings(node)
  tx.reserve(entries.reduce((total, entry) => total + BigInt(BytePath.byteLength(entry.name)), zero))
  tx.touch(node.id, ["atime"])
  const directory = tx.observation(tx.get(node.id))
  if (directory.kind !== "directory") return tx.wrongKind()
  return { directory, names: entries.map((entry) => entry.name) }
}

export const readDirectoryEntries = (tx: E.Transaction, target: M.Target): M.EntryListing => {
  const node = tx.target(target).object
  if (node.kind !== "directory") return tx.wrongKind()
  tx.require(node, E.READ_PERMISSION | E.EXECUTE_PERMISSION)
  const entries = tx.listBindings(node)
  tx.reserve(entries.reduce((total, entry) => total + BigInt(BytePath.byteLength(entry.name)), zero))
  tx.touch(node.id, ["atime"])
  const directory = tx.observation(tx.get(node.id))
  if (directory.kind !== "directory") return tx.wrongKind()
  return {
    directory,
    entries: entries.map((entry) => ({
      name: entry.name,
      binding: M.issueToken("binding", tx.engine.runtime.instanceNumber, node.id, entry.version),
      object: tx.observation(tx.get(entry.object))
    }))
  }
}

// -----------------------------------------------------------------------------
// File writes and attributes
// -----------------------------------------------------------------------------

/** Resolves final symlinks without losing the explicit original entry condition. */
const writable = (tx: E.Transaction, target: M.Target, options: M.WriteFileOptions): E.FileNode => {
  if (M.isToken(target)) {
    if (
      options.conditions !== undefined || options.mode !== undefined ||
      (options.create !== undefined && options.create !== "existing")
    ) R.invalid(tx.operation, "options")
    const node = tx.target(target).object
    tx.require(node, options.access === "readwrite" ? (E.READ_PERMISSION | E.WRITE_PERMISSION) : E.WRITE_PERMISSION)
    tx.revision(node, options)
    return file(tx, node)
  }
  if ((typeof target === "string" || BytePath.isBytePath(target)) && options.conditions !== undefined) {
    R.invalid(tx.operation, "conditions")
  }
  const state: E.ResolutionState = { follows: 0 }
  const initial = tx.slot(target, undefined, state)
  let selected = initial
  const create = options.create ?? "ifmissing"
  if (create === "exclusive") {
    authorizeCreate(tx, initial.parent, options.mode, "file")
    tx.conditions(initial.parent, initial.binding, options.conditions)
    absent(tx, initial.binding)
  } else {
    selected = tx.followFinalSlot(initial, state)
    if (selected.binding !== undefined) {
      const node = tx.get(selected.binding.object)
      tx.require(node, options.access === "readwrite" ? (E.READ_PERMISSION | E.WRITE_PERMISSION) : E.WRITE_PERMISSION)
      tx.conditions(initial.parent, initial.binding, options.conditions)
      tx.revision(node, options)
      return file(tx, node)
    }
    if (create === "existing") {
      tx.conditions(initial.parent, initial.binding, options.conditions)
      throw new M.NotFound({ operation: tx.operation, reason: "missingEntry" })
    }
    authorizeCreate(tx, selected.parent, options.mode, "file")
    tx.conditions(initial.parent, initial.binding, options.conditions)
  }
  if (options.expectedRevision !== undefined) {
    throw new M.ConditionFailed({ operation: tx.operation, reason: "objectRevision" })
  }
  const node = file(tx, tx.create("file", selected.parent, options.mode))
  tx.insert(selected.parent.id, selected.name, node.id)
  return node
}

export const writeFile = (
  tx: E.Transaction,
  target: M.Target,
  data: Uint8Array,
  options?: M.WriteFileOptions
): void => {
  validate("writeFile", options)
  const node = writable(tx, target, options ?? {})
  io(tx, BigInt(data.length))
  const placement = options?.placement ?? "replace"
  const length = placement === "replace"
    ? data.length
    : placement === "start"
    ? Math.max(node.data.length, data.length)
    : node.data.length + data.length
  candidate(tx, BigInt(length))
  if (data.length === 0 && (placement !== "replace" || node.data.length === 0)) return
  const next = new Uint8Array(length)
  if (placement !== "replace") next.set(node.data)
  next.set(data, placement === "append" ? node.data.length : 0)
  const edited = file(tx, tx.edit(node.id))
  edited.data = next
  tx.changed(node.id, ["mtime", "ctime"])
}

export const truncate = (
  tx: E.Transaction,
  target: M.Target,
  length: ByteSize.Input,
  options?: M.RevisionCondition
): void => {
  validate("truncate", options)
  const requested = R.size(length, tx.operation, "length")
  const node = file(tx, tx.target(target).object)
  tx.require(node, E.WRITE_PERMISSION)
  tx.revision(node, options)
  candidate(tx, requested)
  if (requested === BigInt(node.data.length)) return
  const data = new Uint8Array(Number(requested))
  data.set(node.data.subarray(0, data.length))
  file(tx, tx.edit(node.id)).data = data
  tx.changed(node.id, ["mtime", "ctime"])
}

export const validateAttributes = (attributes: M.Attributes, operation: string): void => {
  E.checkOptions(attributes, attributeFields, operation)
  if (attributes === undefined) R.invalid(operation, "attributes")
  if (attributes.mode !== undefined) E.mode(attributes.mode, "directory", operation)
  if (attributes.uid !== undefined) E.identity(attributes.uid, operation, "uid")
  if (attributes.gid !== undefined) E.identity(attributes.gid, operation, "gid")
  if (attributes.atime !== undefined && !Schema.is(Schema.UnixNano)(attributes.atime)) R.invalid(operation, "atime")
  if (attributes.mtime !== undefined && !Schema.is(Schema.UnixNano)(attributes.mtime)) R.invalid(operation, "mtime")
}

/** Authorizes all requested fields against the same prestate. Also used by retained handles. */
export const attributesFor = (
  tx: E.Transaction,
  node: E.Node,
  attributes: M.Attributes,
  options?: M.RevisionCondition
): void => {
  validateAttributes(attributes, tx.operation)
  if (attributes.mode !== undefined) {
    if (node.kind === "symlink") return tx.wrongKind()
    E.mode(attributes.mode, node.kind, tx.operation)
    tx.owns(node)
    if (
      node.kind === "directory" && (attributes.mode & E.SET_GID_BIT) !== 0 && (node.mode & E.SET_GID_BIT) === 0 &&
      !tx.caller.policy.privileged && node.gid !== tx.caller.policy.gid && !tx.caller.policy.groups.includes(node.gid)
    ) throw new M.AccessDenied({ operation: tx.operation, reason: "ownership" })
  }
  if (attributes.uid !== undefined && !tx.caller.policy.privileged) {
    throw new M.AccessDenied({ operation: tx.operation, reason: "ownership" })
  }
  if (attributes.gid !== undefined) {
    tx.owns(node)
    if (
      !tx.caller.policy.privileged && attributes.gid !== tx.caller.policy.gid &&
      !tx.caller.policy.groups.includes(attributes.gid)
    ) throw new M.AccessDenied({ operation: tx.operation, reason: "ownership" })
  }
  if (attributes.atime !== undefined || attributes.mtime !== undefined) tx.owns(node)
  tx.revision(node, options)
  let changed = false
  const edited = tx.edit(node.id)
  for (const field of ["mode", "uid", "gid", "atime", "mtime"] as const) {
    const value = attributes[field]
    if (value === undefined) continue
    if (value !== node[field]) changed = true
    if (field === "atime" || field === "mtime") {
      const requested = attributes[field]
      if (requested !== undefined) tx.explicitTime(node.id, field, requested)
    } else Object.assign(edited, { [field]: value })
  }
  if (changed) tx.changed(node.id, ["ctime"])
}

export const setAttributes = (
  tx: E.Transaction,
  target: M.Target,
  attributes: M.Attributes,
  options?: M.AttributeOptions
): void => {
  validate("setAttributes", options)
  validateAttributes(attributes, tx.operation)
  attributesFor(tx, tx.target(target, options?.followFinalSymlink !== false).object, attributes, options)
}

// -----------------------------------------------------------------------------
// Namespace changes
// -----------------------------------------------------------------------------

export const createFile = (
  tx: E.Transaction,
  target: M.EntryTarget,
  options?: M.CreateOptions
): M.ObjectObservation => {
  validate("createFile", options)
  const slot = tx.slot(target)
  authorizeCreate(tx, slot.parent, options?.mode, "file")
  tx.conditions(slot.parent, slot.binding, options?.conditions)
  absent(tx, slot.binding)
  const node = tx.create("file", slot.parent, options?.mode)
  tx.insert(slot.parent.id, slot.name, node.id)
  return tx.observation(node)
}

const mkdirOne = (tx: E.Transaction, target: M.EntryTarget, options: M.MkdirOptions, final = true): E.DirectoryNode => {
  const slot = tx.slot(target, undefined, undefined, true)
  if (slot.binding !== undefined && options.recursive) {
    const node = tx.get(slot.binding.object)
    if (final) tx.conditions(slot.parent, slot.binding, options.conditions)
    if (node.kind === "directory") return node
    return tx.wrongKind()
  }
  authorizeCreate(tx, slot.parent, options.mode, "directory")
  if (final) tx.conditions(slot.parent, slot.binding, options.conditions)
  absent(tx, slot.binding)
  const node = tx.create("directory", slot.parent, options.mode)
  if (node.kind !== "directory") return tx.wrongKind()
  tx.insert(slot.parent.id, slot.name, node.id)
  return node
}

export const makeDirectory = (
  tx: E.Transaction,
  target: M.EntryTarget,
  options?: M.MkdirOptions
): M.DirectoryObservation => {
  validate("makeDirectory", options)
  let node: E.Node
  if (!options?.recursive || (typeof target !== "string" && !BytePath.isBytePath(target))) {
    node = mkdirOne(tx, target, options ?? {})
  } else {
    const bytes = BytePath.toBytes(E.pathValue(target, tx.operation))
    let end = bytes.length
    while (end > 0 && bytes[end - 1] === CHAR_FORWARD_SLASH) end--
    if (end === 0) node = tx.target(target, false).object
    else {
      let first = end - 1
      while (first >= 0 && bytes[first] !== CHAR_FORWARD_SLASH) first--
      E.nameValue(path(bytes.subarray(first + 1, end)), tx.operation)
      node = tx.directory(tx.caller.policy.cwd)
      for (let index = 0; index <= end; index++) {
        if (index < end && bytes[index] !== CHAR_FORWARD_SLASH) continue
        if (index === 0 || bytes[index - 1] === CHAR_FORWARD_SLASH) continue
        const prefix = path(bytes.subarray(0, index))
        const final = index === end
        try {
          node = tx.resolve(prefix, !final).object
          if (node.kind !== "directory") return tx.wrongKind()
          if (final && options.conditions !== undefined) {
            const slot = tx.slot(prefix)
            tx.conditions(slot.parent, slot.binding, options.conditions)
          }
        } catch (error) {
          if (!(error instanceof M.NotFound)) throw error
          node = mkdirOne(tx, prefix, options, final)
        }
      }
    }
  }
  const result = tx.observation(node)
  if (result.kind !== "directory") return tx.wrongKind()
  return result
}

export const makeDirectoryEntry = (
  tx: E.Transaction,
  target: M.EntryTarget,
  options?: M.CreateOptions
): M.PresentEntry & { readonly object: M.DirectoryObservation } => {
  const directory = makeDirectory(tx, target, options)
  const slot = tx.slot(target)
  tx.reserve(BigInt(BytePath.byteLength(slot.name)))
  const entry = tx.entry(tx.directory(slot.parent.id), slot.name, slot.binding)
  // NOTE: Creation and observation share a transaction, so a missing binding is an internal defect.
  if (entry.state !== "present" || entry.object.kind !== "directory") {
    throw new TypeError("Created directory has no binding")
  }
  return { ...entry, object: directory }
}

export const makeSymlink = (
  tx: E.Transaction,
  target: M.EntryTarget,
  linkTarget: M.Path,
  options?: M.AbsentConditions
): M.ObjectObservation => {
  validate("makeSymlink", options)
  const spelling = E.pathValue(linkTarget, tx.operation)
  if (BytePath.byteLength(spelling) === 0) R.invalid(tx.operation, "linkTarget")
  if (BigInt(BytePath.byteLength(spelling)) > tx.engine.runtime.limits.pathBytes) {
    R.limit(tx.operation, "path", "resolution")
  }
  const slot = tx.slot(target)
  authorizeCreate(tx, slot.parent, undefined, "symlink")
  tx.conditions(slot.parent, slot.binding, options)
  absent(tx, slot.binding)
  const node = tx.create("symlink", slot.parent, undefined, spelling)
  tx.insert(slot.parent.id, slot.name, node.id)
  return tx.observation(node)
}

export const makeHardLink = (
  tx: E.Transaction,
  source: M.HardLinkSource,
  destination: M.EntryTarget,
  options?: M.AbsentConditions
): M.ObjectObservation => {
  validate("makeHardLink", options)
  if (!Schema.is(Schema.Record(Schema.String, Schema.Unknown))(source)) R.invalid(tx.operation, "source")
  E.checkOptions(
    source,
    "reference" in source ? hardLinkSourceFields.reference : hardLinkSourceFields.entry,
    tx.operation
  )
  let node: E.Node
  if ("reference" in source) node = tx.target(source.reference, false).object
  else {
    const selected = tx.slot(source.entry)
    if (condition(source.conditions, tx.operation)?.expected === "absent") {
      R.invalid(tx.operation, "expected")
    }
    tx.conditions(selected.parent, selected.binding, source.conditions)
    const binding = required(tx, selected.binding)
    node = tx.get(binding.object)
  }
  if (node.kind === "directory") return tx.wrongKind()
  const slot = tx.slot(destination)
  authorizeCreate(tx, slot.parent, undefined, node.kind)
  tx.conditions(slot.parent, slot.binding, options)
  absent(tx, slot.binding)
  tx.hardLink(node, slot)
  return tx.observation(tx.get(node.id))
}

export const unlink = (tx: E.Transaction, target: M.EntryTarget, options?: M.EntryConditions): void => {
  validate("unlink", options)
  const slot = tx.slot(target)
  if (slot.binding === undefined) {
    tx.require(slot.parent, E.WRITE_PERMISSION | E.EXECUTE_PERMISSION)
    tx.conditions(slot.parent, undefined, options)
  }
  const binding = required(tx, slot.binding)
  const node = tx.get(binding.object)
  tx.sticky(slot.parent, node)
  tx.conditions(slot.parent, binding, options)
  if (node.kind === "directory") return tx.wrongKind()
  tx.remove(slot.parent, binding)
}

export const removeDirectory = (tx: E.Transaction, target: M.EntryTarget, options?: M.EntryConditions): void => {
  validate("removeDirectory", options)
  const slot = tx.slot(target)
  if (slot.binding === undefined) {
    tx.require(slot.parent, E.WRITE_PERMISSION | E.EXECUTE_PERMISSION)
    tx.conditions(slot.parent, undefined, options)
  }
  const binding = required(tx, slot.binding)
  const node = tx.get(binding.object)
  tx.sticky(slot.parent, node)
  tx.conditions(slot.parent, binding, options)
  if (node.kind !== "directory") return tx.wrongKind()
  if (node.entries.size !== 0) throw new M.Busy({ operation: tx.operation, reason: "nonemptyDirectory" })
  tx.remove(slot.parent, binding)
}

export const rename = (
  tx: E.Transaction,
  source: M.EntryTarget,
  destination: M.EntryTarget,
  options?: M.RenameOptions
): void => {
  validate("rename", options)
  const from = tx.slot(source)
  if (from.binding === undefined) {
    tx.require(from.parent, E.WRITE_PERMISSION | E.EXECUTE_PERMISSION)
    tx.conditions(from.parent, undefined, options?.source)
  }
  const binding = required(tx, from.binding)
  const node = tx.get(binding.object)
  tx.sticky(from.parent, node)
  tx.conditions(from.parent, binding, options?.source)
  const to = tx.slot(destination, undefined, undefined, node.kind === "directory")
  const victim = to.binding === undefined ? undefined : tx.get(to.binding.object)
  if (victim === undefined) tx.require(to.parent, E.WRITE_PERMISSION | E.EXECUTE_PERMISSION)
  else tx.sticky(to.parent, victim)
  tx.conditions(to.parent, to.binding, options?.destination)
  if (victim?.id === node.id) return
  if (victim !== undefined && ((node.kind === "directory") !== (victim.kind === "directory"))) return tx.wrongKind()
  if (victim?.kind === "directory" && victim.entries.size !== 0) {
    throw new M.Busy({ operation: tx.operation, reason: "nonemptyDirectory" })
  }
  if (node.kind === "directory" && tx.contained(to.parent.id, node.id)) {
    throw new M.AccessDenied({ operation: tx.operation, reason: "confinement" })
  }
  tx.move(from, to, node)
}

// -----------------------------------------------------------------------------
// Copy publication
// -----------------------------------------------------------------------------

export const publishCopiedFile = (
  tx: E.Transaction,
  destination: M.EntryTarget,
  data: Uint8Array,
  options?: M.AtomicCopyOptions
): M.ObjectObservation => {
  validate("publishCopiedFile", options)
  const slot = tx.slot(destination)
  const existing = slot.binding === undefined ? undefined : tx.get(slot.binding.object)
  if (existing === undefined) authorizeCreate(tx, slot.parent, options?.mode, "file")
  else tx.require(existing, E.WRITE_PERMISSION)
  if (existing !== undefined && options?.preserveTimes !== undefined) tx.owns(existing)
  tx.conditions(slot.parent, slot.binding, options?.destination)
  if (existing !== undefined) tx.revision(existing, options)
  else if (options?.expectedRevision !== undefined) {
    throw new M.ConditionFailed({ operation: tx.operation, reason: "objectRevision" })
  }
  if (existing !== undefined && !options?.overwrite) {
    throw new M.AlreadyExists({ operation: tx.operation, reason: "occupiedEntry" })
  }
  if (existing !== undefined && existing.kind !== "file") return tx.wrongKind()
  io(tx, BigInt(data.length))
  candidate(tx, BigInt(data.length))
  const node = existing ?? tx.create("file", slot.parent, options?.mode)
  const next = file(tx, tx.edit(node.id))
  next.data = data.slice()
  if (existing === undefined) tx.insert(slot.parent.id, slot.name, node.id)
  if (data.length > 0 || (existing !== undefined && existing.data.length !== 0)) tx.changed(node.id, ["mtime", "ctime"])
  if (options?.preserveTimes !== undefined) attributesFor(tx, tx.get(node.id), options.preserveTimes)
  return tx.observation(tx.get(node.id))
}

export const publishCopiedSymlink = (
  tx: E.Transaction,
  destination: M.EntryTarget,
  target: BytePath.BytePath,
  options?: M.AtomicSymlinkCopyOptions
): M.ObjectObservation => {
  validate("publishCopiedSymlink", options)
  if (!BytePath.isBytePath(target) || BytePath.byteLength(target) === 0) R.invalid(tx.operation, "target")
  if (BigInt(BytePath.byteLength(target)) > tx.engine.runtime.limits.pathBytes) {
    R.limit(tx.operation, "path", "resolution")
  }
  const slot = tx.slot(destination)
  const existing = slot.binding === undefined ? undefined : tx.get(slot.binding.object)
  if (existing === undefined) tx.require(slot.parent, E.WRITE_PERMISSION | E.EXECUTE_PERMISSION)
  else tx.sticky(slot.parent, existing)
  tx.conditions(slot.parent, slot.binding, options?.destination)
  if (existing !== undefined && !options?.overwrite) {
    throw new M.AlreadyExists({ operation: tx.operation, reason: "occupiedEntry" })
  }
  if (existing?.kind === "directory") return tx.wrongKind()
  if (slot.binding !== undefined) tx.remove(slot.parent, slot.binding)
  const node = tx.create("symlink", slot.parent, undefined, target)
  tx.insert(slot.parent.id, slot.name, node.id)
  if (options?.preserveTimes !== undefined) attributesFor(tx, node, options.preserveTimes)
  return tx.observation(tx.get(node.id))
}
