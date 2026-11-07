/* Request snapshots shared by the caller, handle and session entry points. */
import * as BytePath from "../../BytePath.ts"
import * as Result from "../../Result.ts"
import * as A from "./atomic.ts"
import * as E from "./engine.ts"
import * as M from "./model.ts"
import type * as R from "./runtime.ts"

// -----------------------------------------------------------------------------
// Snapshot types and shape checks
// -----------------------------------------------------------------------------

// NOTE: Index required keys into the original options type so undefined survives
// when exactOptionalPropertyTypes is disabled.
type Complete<Options> = { readonly [Key in keyof Required<Options>]: Options[Key] }

const checkKeys = (
  keys: ReadonlyArray<string>,
  allowed: ReadonlyArray<string>,
  operation: string
) => {
  for (const key of keys) {
    if (!allowed.includes(key)) return Result.fail(new M.InvalidInput({ operation, field: key, reason: "excessField" }))
  }
  return Result.succeed(undefined)
}

// NOTE: Snapshots read declared fields once, including inherited and non-enumerable values.
// Shape checks must not read getters; token authorization stays in the transaction.
const checkShape = (
  input: unknown,
  allowed: ReadonlyArray<string>,
  operation: string
) => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return Result.fail(new M.InvalidInput({ operation, field: "options", reason: "malformed" }))
  }
  const keys = Object.keys(input)
  return Result.map(checkKeys(keys, allowed, operation), () => keys)
}

// -----------------------------------------------------------------------------
// Entry conditions
// -----------------------------------------------------------------------------

function snapshotSlot(
  input: Extract<M.SlotCondition, { readonly expected: "absent" }>,
  operation: string
): Result.Result<Extract<M.SlotCondition, { readonly expected: "absent" }>, M.InvalidInput>
function snapshotSlot(input: M.PresentCondition, operation: string): Result.Result<M.PresentCondition, M.InvalidInput>
function snapshotSlot(input: M.SlotCondition, operation: string): Result.Result<M.SlotCondition, M.InvalidInput>
function snapshotSlot(input: M.SlotCondition, operation: string): Result.Result<M.SlotCondition, M.InvalidInput> {
  return Result.gen(function*() {
    const keys = yield* checkShape(input, A.slotFields, operation)
    const expected = input.expected
    if (expected === "present") {
      yield* checkKeys(keys, A.slotVariantFields.present, operation)
      return { expected, object: input.object }
    }
    if (expected === "binding") {
      yield* checkKeys(keys, A.slotVariantFields.binding, operation)
      return { expected, binding: input.binding }
    }
    if (expected === "absent") yield* checkKeys(keys, A.slotVariantFields.absent, operation)
    return { expected }
  })
}

/** @internal */
export function snapshotConditions(
  input: M.AbsentConditions | undefined,
  operation: string
): Result.Result<Complete<M.AbsentConditions> | undefined, M.InvalidInput>
export function snapshotConditions(
  input: M.EntryConditions | undefined,
  operation: string
): Result.Result<Complete<M.EntryConditions> | undefined, M.InvalidInput>
export function snapshotConditions(
  input: M.DestinationConditions | undefined,
  operation: string
): Result.Result<Complete<M.DestinationConditions> | undefined, M.InvalidInput>
export function snapshotConditions(
  input: M.DestinationConditions | undefined,
  operation: string
): Result.Result<Complete<M.DestinationConditions> | undefined, M.InvalidInput> {
  return Result.gen(function*() {
    if (input === undefined) return undefined
    yield* checkShape(input, A.conditionFields, operation)
    const entry = input.entry
    return {
      entry: entry === undefined ? undefined : yield* snapshotSlot(entry, operation),
      parentNamespace: input.parentNamespace
    }
  })
}

// -----------------------------------------------------------------------------
// Operation options
// -----------------------------------------------------------------------------

const snapshotTimes = (
  input: M.AtomicCopyOptions["preserveTimes"],
  operation: string
) =>
  Result.gen(function*() {
    if (input === undefined) return undefined
    yield* checkShape(input, A.timeFields, operation)
    return { atime: input.atime, mtime: input.mtime }
  })

const createOptions = (
  input: M.CreateOptions | undefined,
  operation: "createFile" | "makeDirectoryEntry"
): Result.Result<Complete<M.CreateOptions> | undefined, M.InvalidInput> =>
  Result.gen(function*() {
    if (input === undefined) return undefined
    yield* checkShape(input, A.optionFields[operation], operation)
    return { mode: input.mode, conditions: yield* snapshotConditions(input.conditions, operation) }
  })

/** @internal */
export const snapshotTruncateOptions = (
  input: M.RevisionCondition | undefined
): Result.Result<Complete<M.RevisionCondition> | undefined, M.InvalidInput> =>
  Result.gen(function*() {
    if (input === undefined) return undefined
    yield* checkShape(input, A.optionFields.truncate, "truncate")
    return { expectedRevision: input.expectedRevision }
  })

// This map keeps operation/options correlation through shared caller adapters.
// Complete return shapes make new optional fields require a snapshot decision.
/** @internal */
export const snapshotOptions: {
  readonly [Operation in A.Operation]: (
    input: A.OptionsByOperation[Operation]
  ) => Result.Result<A.OptionsByOperation[Operation], M.InvalidInput>
} = {
  access: (input): Result.Result<Complete<M.AccessOptions> | undefined, M.InvalidInput> =>
    Result.gen(function*() {
      if (input === undefined) return undefined
      yield* checkShape(input, A.optionFields.access, "access")
      return { read: input.read, write: input.write, execute: input.execute }
    }),
  writeFile: (input): Result.Result<Complete<M.WriteFileOptions> | undefined, M.InvalidInput> =>
    Result.gen(function*() {
      if (input === undefined) return undefined
      yield* checkShape(input, A.optionFields.writeFile, "writeFile")
      return {
        placement: input.placement,
        access: input.access,
        create: input.create,
        mode: input.mode,
        conditions: yield* snapshotConditions(input.conditions, "writeFile"),
        expectedRevision: input.expectedRevision
      }
    }),
  createFile: (input) => createOptions(input, "createFile"),
  makeDirectoryEntry: (input) => createOptions(input, "makeDirectoryEntry"),
  makeDirectory: (input): Result.Result<Complete<M.MkdirOptions> | undefined, M.InvalidInput> =>
    Result.gen(function*() {
      if (input === undefined) return undefined
      yield* checkShape(input, A.optionFields.makeDirectory, "makeDirectory")
      return {
        mode: input.mode,
        conditions: yield* snapshotConditions(input.conditions, "makeDirectory"),
        recursive: input.recursive
      }
    }),
  makeSymlink: (input) => snapshotConditions(input, "makeSymlink"),
  makeHardLink: (input) => snapshotConditions(input, "makeHardLink"),
  unlink: (input) => snapshotConditions(input, "unlink"),
  removeDirectory: (input) => snapshotConditions(input, "removeDirectory"),
  rename: (input): Result.Result<Complete<M.RenameOptions> | undefined, M.InvalidInput> =>
    Result.gen(function*() {
      if (input === undefined) return undefined
      yield* checkShape(input, A.optionFields.rename, "rename")
      return {
        source: yield* snapshotConditions(input.source, "rename"),
        destination: yield* snapshotConditions(input.destination, "rename")
      }
    }),
  setAttributes: (input): Result.Result<Complete<M.AttributeOptions> | undefined, M.InvalidInput> =>
    Result.gen(function*() {
      if (input === undefined) return undefined
      yield* checkShape(input, A.optionFields.setAttributes, "setAttributes")
      return { followFinalSymlink: input.followFinalSymlink, expectedRevision: input.expectedRevision }
    }),
  truncate: snapshotTruncateOptions,
  publishCopiedFile: (input): Result.Result<Complete<M.AtomicCopyOptions> | undefined, M.InvalidInput> =>
    Result.gen(function*() {
      if (input === undefined) return undefined
      yield* checkShape(input, A.optionFields.publishCopiedFile, "publishCopiedFile")
      return {
        overwrite: input.overwrite,
        preserveTimes: yield* snapshotTimes(input.preserveTimes, "publishCopiedFile"),
        mode: input.mode,
        destination: yield* snapshotConditions(input.destination, "publishCopiedFile"),
        expectedRevision: input.expectedRevision
      }
    }),
  publishCopiedSymlink: (input): Result.Result<Complete<M.AtomicSymlinkCopyOptions> | undefined, M.InvalidInput> =>
    Result.gen(function*() {
      if (input === undefined) return undefined
      yield* checkShape(input, A.optionFields.publishCopiedSymlink, "publishCopiedSymlink")
      return {
        overwrite: input.overwrite,
        preserveTimes: yield* snapshotTimes(input.preserveTimes, "publishCopiedSymlink"),
        destination: yield* snapshotConditions(input.destination, "publishCopiedSymlink")
      }
    })
}

// -----------------------------------------------------------------------------
// Source, data and attribute snapshots
// -----------------------------------------------------------------------------

const snapshotSourceEntry = (input: M.EntryTarget) => {
  // A source getter can supply a malformed primitive after admission. Preserve it
  // for the transaction parser instead of dereferencing or authenticating it here.
  if (
    typeof input !== "object" || input === null || BytePath.isBytePath(input) || M.isToken(input) ||
    E.isDirectoryHandle(input)
  ) return input
  return { directory: input.directory, name: input.name }
}

/** @internal */
export const snapshotHardLinkSource = (source: M.HardLinkSource) =>
  Result.gen(function*() {
    const keys = yield* checkShape(source, ["reference", "entry", "conditions"], "makeHardLink")
    if ("reference" in source) {
      yield* checkKeys(keys, A.hardLinkSourceFields.reference, "makeHardLink")
      return { reference: source.reference }
    }
    yield* checkKeys(keys, A.hardLinkSourceFields.entry, "makeHardLink")
    return {
      entry: snapshotSourceEntry(source.entry),
      conditions: yield* snapshotConditions(source.conditions, "makeHardLink")
    }
  })

/** @internal */
export const inputLength = (
  input: Uint8Array,
  operation: string,
  limits: M.Limits
) =>
  Result.gen(function*() {
    const length = yield* E.bufferLengthResult(input, operation)
    if (BigInt(length) > limits.ioBytes) {
      return yield* Result.fail(new M.LimitExceeded({ operation, domain: "io", stage: "admission" }))
    }
    return length
  })

/** @internal */
export const snapshotInput = (work: R.Work, input: Uint8Array) =>
  Result.gen(function*() {
    const length = yield* inputLength(input, work.operation, work.ticket.runtime.limits)
    yield* work.reserveResult(BigInt(length))
    const copy = new Uint8Array(length)
    Uint8Array.prototype.set.call(copy, input)
    return copy
  })

/** @internal */
export const snapshotAttributes = (
  input: M.Attributes,
  operation: string
): Result.Result<Complete<M.Attributes>, M.InvalidInput> =>
  Result.gen(function*() {
    yield* checkShape(input, A.attributeFields, operation)
    return { mode: input.mode, uid: input.uid, gid: input.gid, atime: input.atime, mtime: input.mtime }
  })
