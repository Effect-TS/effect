/* Request snapshots shared by the caller, handle and session entry points. */
import * as BytePath from "../../BytePath.ts"
import * as A from "./atomic.ts"
import * as E from "./engine.ts"
import * as M from "./model.ts"
import * as R from "./runtime.ts"

// -----------------------------------------------------------------------------
// Snapshot types and shape checks
// -----------------------------------------------------------------------------

// NOTE: Index required keys into the original options type so undefined survives
// when exactOptionalPropertyTypes is disabled.
type Complete<Options> = { readonly [Key in keyof Required<Options>]: Options[Key] }

const checkKeys = (keys: ReadonlyArray<string>, allowed: ReadonlyArray<string>, operation: string): void => {
  for (const key of keys) if (!allowed.includes(key)) R.invalid(operation, key, "excessField")
}

// NOTE: Snapshots read declared fields once, including inherited and non-enumerable values.
// Shape checks must not read getters; token authorization stays in the transaction.
const checkShape = (input: unknown, allowed: ReadonlyArray<string>, operation: string): ReadonlyArray<string> => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return R.invalid(operation, "options")
  const keys = Object.keys(input)
  checkKeys(keys, allowed, operation)
  return keys
}

// -----------------------------------------------------------------------------
// Entry conditions
// -----------------------------------------------------------------------------

function snapshotSlot(
  input: Extract<M.SlotCondition, { readonly expected: "absent" }>,
  operation: string
): Extract<M.SlotCondition, { readonly expected: "absent" }>
function snapshotSlot(input: M.PresentCondition, operation: string): M.PresentCondition
function snapshotSlot(input: M.SlotCondition, operation: string): M.SlotCondition
function snapshotSlot(input: M.SlotCondition, operation: string): M.SlotCondition {
  const keys = checkShape(input, A.slotFields, operation)
  const expected = input.expected
  if (expected === "present") {
    checkKeys(keys, A.slotVariantFields.present, operation)
    return { expected, object: input.object }
  }
  if (expected === "binding") {
    checkKeys(keys, A.slotVariantFields.binding, operation)
    return { expected, binding: input.binding }
  }
  if (expected === "absent") checkKeys(keys, A.slotVariantFields.absent, operation)
  return { expected }
}

export function snapshotConditions(
  input: M.AbsentConditions | undefined,
  operation: string
): Complete<M.AbsentConditions> | undefined
export function snapshotConditions(
  input: M.EntryConditions | undefined,
  operation: string
): Complete<M.EntryConditions> | undefined
export function snapshotConditions(
  input: M.DestinationConditions | undefined,
  operation: string
): Complete<M.DestinationConditions> | undefined
export function snapshotConditions(
  input: M.DestinationConditions | undefined,
  operation: string
): Complete<M.DestinationConditions> | undefined {
  if (input === undefined) return undefined
  checkShape(input, A.conditionFields, operation)
  const entry = input.entry
  return {
    entry: entry === undefined ? undefined : snapshotSlot(entry, operation),
    parentNamespace: input.parentNamespace
  }
}

// -----------------------------------------------------------------------------
// Operation options
// -----------------------------------------------------------------------------

const snapshotTimes = (
  input: M.AtomicCopyOptions["preserveTimes"],
  operation: string
): M.AtomicCopyOptions["preserveTimes"] => {
  if (input === undefined) return undefined
  checkShape(input, A.timeFields, operation)
  return { atime: input.atime, mtime: input.mtime }
}

const createOptions = (
  input: M.CreateOptions | undefined,
  operation: "createFile" | "makeDirectoryEntry"
): Complete<M.CreateOptions> | undefined => {
  if (input === undefined) return undefined
  checkShape(input, A.optionFields[operation], operation)
  return { mode: input.mode, conditions: snapshotConditions(input.conditions, operation) }
}

// This map keeps operation/options correlation through shared caller adapters.
// Complete return shapes make new optional fields require a snapshot decision.
export const snapshotOptions: {
  readonly [Operation in A.Operation]: (input: A.OptionsByOperation[Operation]) => A.OptionsByOperation[Operation]
} = {
  access: (input): Complete<M.AccessOptions> | undefined => {
    if (input === undefined) return undefined
    checkShape(input, A.optionFields.access, "access")
    return { read: input.read, write: input.write, execute: input.execute }
  },
  writeFile: (input): Complete<M.WriteFileOptions> | undefined => {
    if (input === undefined) return undefined
    checkShape(input, A.optionFields.writeFile, "writeFile")
    return {
      placement: input.placement,
      access: input.access,
      create: input.create,
      mode: input.mode,
      conditions: snapshotConditions(input.conditions, "writeFile"),
      expectedRevision: input.expectedRevision
    }
  },
  createFile: (input) => createOptions(input, "createFile"),
  makeDirectoryEntry: (input) => createOptions(input, "makeDirectoryEntry"),
  makeDirectory: (input): Complete<M.MkdirOptions> | undefined => {
    if (input === undefined) return undefined
    checkShape(input, A.optionFields.makeDirectory, "makeDirectory")
    return {
      mode: input.mode,
      conditions: snapshotConditions(input.conditions, "makeDirectory"),
      recursive: input.recursive
    }
  },
  makeSymlink: (input) => snapshotConditions(input, "makeSymlink"),
  makeHardLink: (input) => snapshotConditions(input, "makeHardLink"),
  unlink: (input) => snapshotConditions(input, "unlink"),
  removeDirectory: (input) => snapshotConditions(input, "removeDirectory"),
  rename: (input): Complete<M.RenameOptions> | undefined => {
    if (input === undefined) return undefined
    checkShape(input, A.optionFields.rename, "rename")
    return {
      source: snapshotConditions(input.source, "rename"),
      destination: snapshotConditions(input.destination, "rename")
    }
  },
  setAttributes: (input): Complete<M.AttributeOptions> | undefined => {
    if (input === undefined) return undefined
    checkShape(input, A.optionFields.setAttributes, "setAttributes")
    return { followFinalSymlink: input.followFinalSymlink, expectedRevision: input.expectedRevision }
  },
  truncate: (input): Complete<M.RevisionCondition> | undefined => {
    if (input === undefined) return undefined
    checkShape(input, A.optionFields.truncate, "truncate")
    return { expectedRevision: input.expectedRevision }
  },
  publishCopiedFile: (input): Complete<M.AtomicCopyOptions> | undefined => {
    if (input === undefined) return undefined
    checkShape(input, A.optionFields.publishCopiedFile, "publishCopiedFile")
    return {
      overwrite: input.overwrite,
      preserveTimes: snapshotTimes(input.preserveTimes, "publishCopiedFile"),
      mode: input.mode,
      destination: snapshotConditions(input.destination, "publishCopiedFile"),
      expectedRevision: input.expectedRevision
    }
  },
  publishCopiedSymlink: (input): Complete<M.AtomicSymlinkCopyOptions> | undefined => {
    if (input === undefined) return undefined
    checkShape(input, A.optionFields.publishCopiedSymlink, "publishCopiedSymlink")
    return {
      overwrite: input.overwrite,
      preserveTimes: snapshotTimes(input.preserveTimes, "publishCopiedSymlink"),
      destination: snapshotConditions(input.destination, "publishCopiedSymlink")
    }
  }
}

// -----------------------------------------------------------------------------
// Source, data and attribute snapshots
// -----------------------------------------------------------------------------

const snapshotSourceEntry = (input: M.EntryTarget): M.EntryTarget => {
  // A source getter can supply a malformed primitive after admission. Preserve it
  // for the transaction parser instead of dereferencing or authenticating it here.
  if (
    typeof input !== "object" || input === null || BytePath.isBytePath(input) || M.isToken(input) ||
    E.isDirectoryHandle(input)
  ) return input
  return { directory: input.directory, name: input.name }
}

export const snapshotHardLinkSource = (source: M.HardLinkSource): M.HardLinkSource => {
  const keys = checkShape(source, ["reference", "entry", "conditions"], "makeHardLink")
  if ("reference" in source) {
    checkKeys(keys, A.hardLinkSourceFields.reference, "makeHardLink")
    return { reference: source.reference }
  }
  checkKeys(keys, A.hardLinkSourceFields.entry, "makeHardLink")
  return {
    entry: snapshotSourceEntry(source.entry),
    conditions: snapshotConditions(source.conditions, "makeHardLink")
  }
}

export const inputLength = (input: Uint8Array, operation: string, limits: M.Limits): number => {
  const length = E.bufferLength(input, operation)
  if (BigInt(length) > limits.ioBytes) return R.limit(operation, "io", "admission")
  return length
}

export const snapshotInput = (work: R.Work, input: Uint8Array): Uint8Array => {
  const length = inputLength(input, work.operation, work.ticket.runtime.limits)
  work.reserve(BigInt(length))
  const copy = new Uint8Array(length)
  Uint8Array.prototype.set.call(copy, input)
  return copy
}

export const snapshotAttributes = (input: M.Attributes, operation: string): Complete<M.Attributes> => {
  checkShape(input, A.attributeFields, operation)
  return { mode: input.mode, uid: input.uid, gid: input.gid, atime: input.atime, mtime: input.mtime }
}
