/*
 * Internal definitions shared by the filesystem engine and public declarations.
 */
import * as BytePath from "../../BytePath.ts"
import * as Bytes from "../../Bytes.ts"
import type * as ByteSize from "../../ByteSize.ts"
import * as Context from "../../Context.ts"
import type * as DateTime from "../../DateTime.ts"
import type * as Effect from "../../Effect.ts"
import type * as Option from "../../Option.ts"
import * as Result from "../../Result.ts"
import * as Schema from "../../Schema.ts"
import type * as Scope from "../../Scope.ts"
import type * as Stream from "../../Stream.ts"

// -----------------------------------------------------------------------------
// Token registry
// -----------------------------------------------------------------------------

export type TokenKind = "object" | "binding" | "revision" | "namespace"

export interface TokenInfo {
  readonly kind: TokenKind
  readonly instance: bigint
  readonly object: bigint
  readonly version: bigint
}

const tokenRegistry = new WeakMap<object, TokenInfo>()

export const tokenInfo = (value: unknown): TokenInfo | undefined =>
  typeof value === "object" && value !== null ? tokenRegistry.get(value) : undefined

// NOTE: Registry membership identifies issued tokens of every kind. Transactions still
// check kind and instance, preserving wrong-kind and foreign-token failures.
export const isToken = (
  value: unknown
): value is ObjectReference | EntryBinding | ObjectRevision | NamespaceRevision => tokenInfo(value) !== undefined

export function issueToken(kind: "object", instance: bigint, object: bigint, version: bigint): ObjectReference
export function issueToken(kind: "binding", instance: bigint, object: bigint, version: bigint): EntryBinding
export function issueToken(kind: "revision", instance: bigint, object: bigint, version: bigint): ObjectRevision
export function issueToken(kind: "namespace", instance: bigint, object: bigint, version: bigint): NamespaceRevision
export function issueToken(
  kind: TokenKind,
  instance: bigint,
  object: bigint,
  version: bigint
): ObjectReference | EntryBinding | ObjectRevision | NamespaceRevision {
  const value = kind === "object" ?
    Object.freeze<ObjectReference>({ [ObjectReferenceTypeId]: ObjectReferenceTypeId }) :
    kind === "binding" ?
    Object.freeze<EntryBinding>({ [EntryBindingTypeId]: EntryBindingTypeId }) :
    kind === "revision" ?
    Object.freeze<ObjectRevision>({ [ObjectRevisionTypeId]: ObjectRevisionTypeId }) :
    Object.freeze<NamespaceRevision>({ [NamespaceRevisionTypeId]: NamespaceRevisionTypeId })
  tokenRegistry.set(value, Object.freeze({ kind, instance, object, version }))
  return value
}

const equalsToken = (kind: TokenKind, left: unknown, right: unknown): boolean => {
  const a = tokenInfo(left)
  const b = tokenInfo(right)
  return a !== undefined && b !== undefined && a.kind === kind && b.kind === kind &&
    a.instance === b.instance && a.object === b.object && a.version === b.version
}

const sameObject = (left: unknown, right: unknown): boolean => {
  const a = tokenInfo(left)
  const b = tokenInfo(right)
  return a !== undefined && b !== undefined && a.instance === b.instance && a.object === b.object
}

// -----------------------------------------------------------------------------
// Schema constraints
// -----------------------------------------------------------------------------

const CHAR_DOT = 46

const CHAR_FORWARD_SLASH = 47

const bigint0 = BigInt(0)

const bigint2 = BigInt(2)

const PositiveBigInt = Schema.BigInt.check(Schema.isGreaterThanBigInt(bigint0))

const NonNegativeBigInt = Schema.BigInt.check(Schema.isGreaterThanOrEqualToBigInt(bigint0))

const Count = Schema.Natural

const PositiveCount = Count.check(Schema.isGreaterThan(0))

const Uint32 = Schema.Number.check(Schema.isUint32())

const Mode = Schema.Number.check(Schema.isInt(), Schema.isBetween({ minimum: 0, maximum: 0o3777 }))

const PositiveByteSize = Schema.ByteSize.check(Schema.makeFilter((size) => size > bigint0))

const Reference = Schema.declare<ObjectReference>((value): value is ObjectReference =>
  tokenInfo(value)?.kind === "object"
)

const Binding = Schema.declare<EntryBinding>((value): value is EntryBinding => tokenInfo(value)?.kind === "binding")

const Revision = Schema.declare<ObjectRevision>((value): value is ObjectRevision =>
  tokenInfo(value)?.kind === "revision"
)

const Namespace = Schema.declare<NamespaceRevision>((value): value is NamespaceRevision =>
  tokenInfo(value)?.kind === "namespace"
)

const NonEmptyPath = Schema.BytePath.check(Schema.makeFilter((path) => BytePath.byteLength(path) > 0))

export const Name = Schema.BytePath.check(Schema.makeFilter((path) => {
  const bytes = BytePath.toBytes(path)
  return bytes.length > 0 && !bytes.includes(CHAR_FORWARD_SLASH) &&
    !(bytes.length === 1 && bytes[0] === CHAR_DOT) &&
    !(bytes.length === 2 && bytes[0] === CHAR_DOT && bytes[1] === CHAR_DOT)
}))

const sortedNames = (names: ReadonlyArray<BytePath.BytePath>): boolean =>
  names.every((name, index) => index === 0 || BytePath.Order(names[index - 1], name) < 0)

const validMetadata = (metadata: {
  readonly kind: "file" | "directory" | "symlink"
  readonly mode: number
  readonly size: ByteSize.ByteSize
  readonly nlink: bigint
}): boolean =>
  metadata.kind === "file" ?
    metadata.mode <= 0o777 :
    metadata.kind === "symlink" ?
    metadata.mode === 0o777 && metadata.size > bigint0 :
    metadata.size === bigint0 && (metadata.nlink === bigint0 || metadata.nlink >= bigint2)

const coherentObservation = (observation: {
  readonly reference: ObjectReference
  readonly revision: ObjectRevision
  readonly metadata: { readonly objectNumber: bigint }
}): boolean =>
  sameObject(observation.reference, observation.revision) &&
  tokenInfo(observation.reference)?.object === observation.metadata.objectNumber

// -----------------------------------------------------------------------------
// Identity tokens
// -----------------------------------------------------------------------------

const ObjectReferenceTypeId: unique symbol = Symbol("effect/virtual-file-system/ObjectReferenceTypeId")

export interface ObjectReference {
  readonly [ObjectReferenceTypeId]: typeof ObjectReferenceTypeId
}

export const equalsObjectReference = (left: ObjectReference, right: ObjectReference): boolean =>
  equalsToken("object", left, right)

const EntryBindingTypeId: unique symbol = Symbol("effect/virtual-file-system/EntryBindingTypeId")

export interface EntryBinding {
  readonly [EntryBindingTypeId]: typeof EntryBindingTypeId
}

export const equalsEntryBinding = (left: EntryBinding, right: EntryBinding): boolean =>
  equalsToken("binding", left, right)

const ObjectRevisionTypeId: unique symbol = Symbol("effect/virtual-file-system/ObjectRevisionTypeId")

export interface ObjectRevision {
  readonly [ObjectRevisionTypeId]: typeof ObjectRevisionTypeId
}

export const equalsObjectRevision = (left: ObjectRevision, right: ObjectRevision): boolean =>
  equalsToken("revision", left, right)

const NamespaceRevisionTypeId: unique symbol = Symbol("effect/virtual-file-system/NamespaceRevisionTypeId")

export interface NamespaceRevision {
  readonly [NamespaceRevisionTypeId]: typeof NamespaceRevisionTypeId
}

export const equalsNamespaceRevision = (left: NamespaceRevision, right: NamespaceRevision): boolean =>
  equalsToken("namespace", left, right)

// -----------------------------------------------------------------------------
// Addresses
// -----------------------------------------------------------------------------

export type Path = string | BytePath.BytePath

export type DirectorySelector = Path | ObjectReference | DirectoryHandle

export interface EntryAddress {
  readonly directory: DirectorySelector
  readonly name: Path
}

export type Target = Path | ObjectReference | EntryAddress

export type EntryTarget = Path | EntryAddress

// -----------------------------------------------------------------------------
// Observations and listings
// -----------------------------------------------------------------------------

export const Metadata = Schema.Struct({
  kind: Schema.Literals(["file", "directory", "symlink"]),
  objectNumber: PositiveBigInt,
  uid: Uint32,
  gid: Uint32,
  mode: Mode,
  atime: Schema.UnixNano,
  mtime: Schema.UnixNano,
  ctime: Schema.UnixNano,
  birthtime: Schema.UnixNano,
  size: Schema.ByteSize,
  nlink: NonNegativeBigInt
}).check(Schema.makeFilter((metadata) => validMetadata(metadata)))

export type Metadata = typeof Metadata["Type"]

const FileMetadata = Schema.Struct({ ...Metadata.fields, kind: Schema.Literal("file") })
  .check(Schema.makeFilter((metadata) => validMetadata(metadata)))

const DirectoryMetadata = Schema.Struct({ ...Metadata.fields, kind: Schema.Literal("directory") })
  .check(Schema.makeFilter((metadata) => validMetadata(metadata)))

const SymlinkMetadata = Schema.Struct({ ...Metadata.fields, kind: Schema.Literal("symlink") })
  .check(Schema.makeFilter((metadata) => validMetadata(metadata)))

const ObservationFields = { reference: Reference, revision: Revision }

const FileObservation = Schema.Struct({ kind: Schema.Literal("file"), ...ObservationFields, metadata: FileMetadata })
  .check(Schema.makeFilter(coherentObservation))

const DirectoryObservationSchema = Schema.Struct({
  kind: Schema.Literal("directory"),
  ...ObservationFields,
  metadata: DirectoryMetadata,
  namespaceRevision: Namespace
}).check(
  Schema.makeFilter((observation) =>
    coherentObservation(observation) && sameObject(observation.reference, observation.namespaceRevision)
  )
)

const DirectoryObservation = DirectoryObservationSchema

const SymlinkObservation = Schema.Struct({
  kind: Schema.Literal("symlink"),
  ...ObservationFields,
  metadata: SymlinkMetadata
})
  .check(Schema.makeFilter(coherentObservation))

export const ObjectObservation = Schema.Union([FileObservation, DirectoryObservation, SymlinkObservation])

export type ObjectObservation = typeof ObjectObservation["Type"]

export type DirectoryObservation = Extract<ObjectObservation, { readonly kind: "directory" }>

const EntryContextFields = {
  parent: Reference,
  parentNamespaceRevision: Namespace,
  name: Name
}

const AbsentEntry = Schema.Struct({ ...EntryContextFields, state: Schema.Literal("absent") })
  .check(Schema.makeFilter((entry) => sameObject(entry.parent, entry.parentNamespaceRevision)))

const PresentEntrySchema = Schema.Struct({
  ...EntryContextFields,
  state: Schema.Literal("present"),
  binding: Binding,
  object: ObjectObservation
}).check(Schema.makeFilter((entry) =>
  sameObject(entry.parent, entry.parentNamespaceRevision) &&
  tokenInfo(entry.parent)?.instance === tokenInfo(entry.binding)?.instance &&
  tokenInfo(entry.parent)?.instance === tokenInfo(entry.object.reference)?.instance
))

export const EntryObservation = Schema.Union([AbsentEntry, PresentEntrySchema])

export type EntryObservation = typeof EntryObservation["Type"]

export type PresentEntry = Extract<EntryObservation, { readonly state: "present" }>

export const NameListing = Schema.Struct({
  directory: DirectoryObservationSchema,
  names: Schema.Array(Name)
}).check(Schema.makeFilter((listing) => sortedNames(listing.names)))

export type NameListing = typeof NameListing["Type"]

export const ListedEntry = Schema.Struct({
  name: Name,
  binding: Binding,
  object: ObjectObservation
})

export type ListedEntry = typeof ListedEntry["Type"]

export const EntryListing = Schema.Struct({
  directory: DirectoryObservationSchema,
  entries: Schema.Array(ListedEntry)
}).check(Schema.makeFilter((listing) => sortedNames(listing.entries.map((entry) => entry.name))))

export type EntryListing = typeof EntryListing["Type"]

export interface ObservedRead<A> {
  readonly value: A
  readonly object: ObjectObservation
  readonly accessTimeBeforeRead: DateTime.UnixNano
}

export const WalkRecord = Schema.Union([
  Schema.Struct({ path: Schema.BytePath, object: ObjectObservation, root: Schema.Literal(true) }),
  Schema.Struct({
    path: Schema.BytePath,
    object: ObjectObservation,
    root: Schema.Literal(false),
    entry: PresentEntrySchema
  })
])

export type WalkRecord = typeof WalkRecord["Type"]

// -----------------------------------------------------------------------------
// Operation options and conditions
// -----------------------------------------------------------------------------

export interface WalkOptions {
  readonly maxDepth?: number | undefined
  readonly maxVisits?: number | undefined
}

export type SlotCondition = { readonly expected: "absent" } | {
  readonly expected: "present"
  readonly object: ObjectReference
} | { readonly expected: "binding"; readonly binding: EntryBinding }

export type PresentCondition = Exclude<SlotCondition, { readonly expected: "absent" }>

export interface EntryConditions {
  readonly entry?: PresentCondition | undefined
  readonly parentNamespace?: NamespaceRevision | undefined
}

export interface DestinationConditions {
  readonly entry?: SlotCondition | undefined
  readonly parentNamespace?: NamespaceRevision | undefined
}

export interface AbsentConditions {
  readonly entry?: { readonly expected: "absent" } | undefined
  readonly parentNamespace?: NamespaceRevision | undefined
}

export interface RevisionCondition {
  readonly expectedRevision?: ObjectRevision | undefined
}

export interface RenameOptions {
  readonly source?: EntryConditions | undefined
  readonly destination?: DestinationConditions | undefined
}

export type HardLinkSource = { readonly reference: ObjectReference } | {
  readonly entry: EntryTarget
  readonly conditions?: EntryConditions | undefined
}

export interface Attributes {
  readonly mode?: number | undefined
  readonly uid?: number | undefined
  readonly gid?: number | undefined
  readonly atime?: DateTime.UnixNano | undefined
  readonly mtime?: DateTime.UnixNano | undefined
}

export interface AttributeOptions extends RevisionCondition {
  readonly followFinalSymlink?: boolean | undefined
}

export interface OpenOptions extends RevisionCondition {
  readonly access?: "read" | "write" | "readwrite" | undefined
  readonly create?: "existing" | "ifmissing" | "exclusive" | undefined
  readonly append?: boolean | undefined
  readonly truncate?: boolean | undefined
  /** Selects append cursor bookkeeping, default advance; irrelevant to nonappend writes and never changes zero-write behavior. */
  readonly appendCursor?: "advance" | "preserve" | undefined
  /** Selects handle-truncate bookkeeping, default preserve; clamp sets min(old cursor, requested length) even for a same-size truncate. */
  readonly truncateCursor?: "preserve" | "clamp" | undefined
  readonly noFollow?: boolean | undefined
  readonly mode?: number | undefined
  readonly conditions?: DestinationConditions | undefined
}

export interface WriteFileOptions extends RevisionCondition {
  readonly placement?: "replace" | "start" | "append" | undefined
  readonly access?: "write" | "readwrite" | undefined
  readonly create?: "existing" | "ifmissing" | "exclusive" | undefined
  readonly mode?: number | undefined
  readonly conditions?: DestinationConditions | undefined
}

export interface CreateOptions {
  readonly mode?: number | undefined
  readonly conditions?: AbsentConditions | undefined
}

export interface MkdirOptions extends CreateOptions {
  readonly recursive?: boolean | undefined
}

export interface RemoveOptions extends EntryConditions {
  readonly maxVisits?: number | undefined
}

export type Seek = { readonly from: "start"; readonly offset: bigint } | {
  readonly from: "current" | "end"
  readonly offset: bigint
}

export interface ReadOptions {
  readonly position?: bigint | undefined
}

export interface WriteOptions extends ReadOptions, RevisionCondition {}

export interface AtomicCopyOptions {
  readonly overwrite?: boolean | undefined
  readonly preserveTimes?: { readonly atime: DateTime.UnixNano; readonly mtime: DateTime.UnixNano } | undefined
  readonly mode?: number | undefined
  readonly destination?: DestinationConditions | undefined
  readonly expectedRevision?: ObjectRevision | undefined
}

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

const ErrorContext = {
  operation: Schema.String,
  side: Schema.optionalKey(Schema.Literals(["source", "destination"])),
  cause: Schema.optionalKey(Schema.Defect())
}

export class InvalidInput extends Schema.TaggedError<InvalidInput>()("InvalidInput", {
  ...ErrorContext,
  field: Schema.String,
  reason: Schema.Literals(["malformed", "range", "unsupportedBits", "wrongObjectToken", "invalidBuffer", "excessField"])
}) {}

export class NotFound extends Schema.TaggedError<NotFound>()("NotFound", {
  ...ErrorContext,
  reason: Schema.Literals(["missingEntry", "missingRoute"])
}) {}

export class AlreadyExists extends Schema.TaggedError<AlreadyExists>()("AlreadyExists", {
  ...ErrorContext,
  reason: Schema.Literals(["occupiedEntry"])
}) {}

export class AccessDenied extends Schema.TaggedError<AccessDenied>()("AccessDenied", {
  ...ErrorContext,
  reason: Schema.Literals(["permission", "ownership", "confinement", "temporarilyInaccessibleReference"])
}) {}

export class InvalidResource extends Schema.TaggedError<InvalidResource>()("InvalidResource", {
  ...ErrorContext,
  reason: Schema.Literals([
    "closed",
    "closing",
    "foreign",
    "stale",
    "wrongKind",
    "refusedSymlink",
    "symlinkCycle",
    "symlinkLimit"
  ])
}) {}

export class ConditionFailed extends Schema.TaggedError<ConditionFailed>()("ConditionFailed", {
  ...ErrorContext,
  reason: Schema.Literals(["object", "binding", "absence", "objectRevision", "parentNamespaceRevision"])
}) {}

export class NamespaceChanged extends Schema.TaggedError<NamespaceChanged>()("NamespaceChanged", {
  ...ErrorContext,
  reason: Schema.Literals(["selectedBindingLost"])
}) {}

export class LimitExceeded extends Schema.TaggedError<LimitExceeded>()("LimitExceeded", {
  ...ErrorContext,
  domain: Schema.Literals([
    "objects",
    "entries",
    "content",
    "file",
    "callers",
    "handles",
    "operations",
    "transient",
    "io",
    "name",
    "path",
    "expandedPath",
    "visits",
    "records",
    "payload",
    "issuance",
    "comparisons",
    "copyBytes"
  ]),
  stage: Schema.Literals(["admission", "reservation", "resolution", "publication", "traversal", "restore"])
}) {}

export class Busy extends Schema.TaggedError<Busy>()("Busy", {
  ...ErrorContext,
  reason: Schema.Literals(["pending", "draining", "nonemptyDirectory"])
}) {}

export class ReentrantOperation extends Schema.TaggedError<ReentrantOperation>()("ReentrantOperation", {
  ...ErrorContext,
  reason: Schema.Literals(["sameInstance"])
}) {}

export class CapabilityUnavailable extends Schema.TaggedError<CapabilityUnavailable>()("CapabilityUnavailable", {
  ...ErrorContext,
  reason: Schema.Literals(["syncDisabled", "watchUnsupported"])
}) {}

export class InvalidRestore extends Schema.TaggedError<InvalidRestore>()("InvalidRestore", {
  ...ErrorContext,
  reason: Schema.Literals([
    "record",
    "duplicateId",
    "duplicateObjectNumber",
    "root",
    "parent",
    "name",
    "duplicateEntry",
    "disconnected",
    "cycle",
    "directoryAlias",
    "metadata"
  ])
}) {}

export class Unrepresentable extends Schema.TaggedError<Unrepresentable>()("Unrepresentable", {
  ...ErrorContext,
  reason: Schema.Literals(["boundaryTarget"]),
  target: Schema.Literals(["utf8", "Date", "DateTime"])
}) {}

export type VirtualFileSystemError =
  | InvalidInput
  | NotFound
  | AlreadyExists
  | AccessDenied
  | InvalidResource
  | ConditionFailed
  | NamespaceChanged
  | LimitExceeded
  | Busy
  | ReentrantOperation
  | CapabilityUnavailable
  | InvalidRestore
  | Unrepresentable

// -----------------------------------------------------------------------------
// Limits and usage
// -----------------------------------------------------------------------------

export const Limits = Schema.Struct({
  objects: PositiveCount,
  entries: Count,
  callers: Count,
  handles: Count,
  operations: PositiveCount,
  nameBytes: PositiveByteSize,
  pathBytes: PositiveByteSize,
  expandedPathBytes: PositiveByteSize,
  symlinkFollows: Count,
  namespaceVisits: Count,
  restoreRecords: Count,
  contentBytes: Schema.ByteSize,
  fileBytes: Schema.ByteSize,
  transientBytes: Schema.ByteSize,
  ioBytes: Schema.ByteSize,
  restorePayloadBytes: Schema.ByteSize,
  synchronous: Schema.Boolean
})

export type Limits = typeof Limits["Type"]

export interface LimitOptions {
  readonly objects?: number | undefined
  readonly entries?: number | undefined
  readonly callers?: number | undefined
  readonly handles?: number | undefined
  readonly operations?: number | undefined
  readonly nameBytes?: ByteSize.Input | undefined
  readonly pathBytes?: ByteSize.Input | undefined
  readonly expandedPathBytes?: ByteSize.Input | undefined
  readonly symlinkFollows?: number | undefined
  readonly namespaceVisits?: number | undefined
  readonly restoreRecords?: number | undefined
  readonly contentBytes?: ByteSize.Input | undefined
  readonly fileBytes?: ByteSize.Input | undefined
  readonly transientBytes?: ByteSize.Input | undefined
  readonly ioBytes?: ByteSize.Input | undefined
  readonly restorePayloadBytes?: ByteSize.Input | undefined
  readonly synchronous?: boolean | undefined
}

export const Usage = Schema.Struct({
  liveObjects: Count,
  entries: Count,
  contentBytes: Schema.ByteSize,
  unreachableRetainedObjects: Count,
  unreachableRetainedContentBytes: Schema.ByteSize,
  callers: Count,
  handles: Count,
  operations: Count,
  reservedTransientBytes: Schema.ByteSize
}).check(Schema.makeFilter((usage) =>
  usage.unreachableRetainedObjects <= usage.liveObjects &&
  usage.unreachableRetainedContentBytes <= usage.contentBytes
))

export type Usage = typeof Usage["Type"]

// -----------------------------------------------------------------------------
// Caller configuration
// -----------------------------------------------------------------------------

export interface Credentials {
  readonly uid: number
  readonly gid: number
  readonly supplementaryGroups?: ReadonlyArray<number> | undefined
  readonly privileged?: boolean | undefined
}

export interface CallerOptions {
  readonly credentials: Credentials
  readonly umask?: number | undefined
  readonly root?: DirectorySelector | undefined
  readonly cwd?: DirectorySelector | undefined
}

export interface Configuration {
  readonly limits?: LimitOptions | undefined
  readonly root?: {
    readonly uid?: number | undefined
    readonly gid?: number | undefined
    readonly mode?: number | undefined
  } | undefined
}

export interface RestoreOptions {
  readonly limits?: LimitOptions | undefined
}

export interface CaptureTraversalOptions {
  readonly records?: number | undefined
  readonly payloadBytes?: ByteSize.Input | undefined
  readonly stagingBytes?: ByteSize.Input | undefined
}

// -----------------------------------------------------------------------------
// Capture records
// -----------------------------------------------------------------------------

export const SemanticMetadata = Schema.Struct({
  objectNumber: PositiveBigInt,
  uid: Uint32,
  gid: Uint32,
  mode: Mode,
  atime: Schema.UnixNano,
  mtime: Schema.UnixNano,
  ctime: Schema.UnixNano,
  birthtime: Schema.UnixNano
})

export type SemanticMetadata = typeof SemanticMetadata["Type"]

export const RootRecord = Schema.TaggedStruct("root", {
  id: PositiveBigInt,
  metadata: SemanticMetadata
})

export type RootRecord = typeof RootRecord["Type"]

export const DirectoryRecord = Schema.TaggedStruct("directory", {
  id: PositiveBigInt,
  parentId: PositiveBigInt,
  name: Name,
  metadata: SemanticMetadata
})

export type DirectoryRecord = typeof DirectoryRecord["Type"]

export const FileRecord = Schema.TaggedStruct("file", {
  id: PositiveBigInt,
  parentId: PositiveBigInt,
  name: Name,
  data: Schema.Uint8Array.check(Schema.makeFilter((value) => Result.isSuccess(Bytes.byteLength(value)))),
  metadata: SemanticMetadata.check(Schema.makeFilter((metadata) => metadata.mode <= 0o777))
})

export type FileRecord = typeof FileRecord["Type"]

export const SymlinkRecord = Schema.TaggedStruct("symlink", {
  id: PositiveBigInt,
  parentId: PositiveBigInt,
  name: Name,
  target: NonEmptyPath,
  metadata: SemanticMetadata.check(Schema.makeFilter((metadata) => metadata.mode === 0o777))
})

export type SymlinkRecord = typeof SymlinkRecord["Type"]

export const AliasRecord = Schema.TaggedStruct("alias", {
  parentId: PositiveBigInt,
  name: Name,
  targetId: PositiveBigInt
})

export type AliasRecord = typeof AliasRecord["Type"]

export const CaptureRecord = Schema.Union([RootRecord, DirectoryRecord, FileRecord, SymlinkRecord, AliasRecord])

export type CaptureRecord = typeof CaptureRecord["Type"]

export const CaptureTypeId: unique symbol = Symbol("effect/virtual-file-system/CaptureTypeId")

export interface Capture {
  readonly [CaptureTypeId]: typeof CaptureTypeId
  readonly records: (
    options?: CaptureTraversalOptions
  ) => Stream.Stream<CaptureRecord, InvalidInput | InvalidResource | LimitExceeded>
}

// -----------------------------------------------------------------------------
// Operation signatures
// -----------------------------------------------------------------------------

export type PathOpenOptions = Omit<OpenOptions, "conditions">

export type PathWriteFileOptions = Omit<WriteFileOptions, "conditions">

export type AtomicSymlinkCopyOptions = Omit<AtomicCopyOptions, "mode" | "expectedRevision">

export type OperationError = Exclude<VirtualFileSystemError, InvalidRestore | Unrepresentable>

export type ReadError = Exclude<
  OperationError,
  ConditionFailed | NamespaceChanged | AlreadyExists | CapabilityUnavailable
>

type Fx<A> = Effect.Effect<A, OperationError>

type ReadEffect<A> = Effect.Effect<A, ReadError>

type Scoped<A> = Effect.Effect<A, OperationError, Scope.Scope>

type SyncResult<A> = Result.Result<A, OperationError>

export type ReferenceOpenOptions = Omit<OpenOptions, "create" | "mode" | "conditions"> & {
  readonly create?: "existing" | undefined
}

export type ReferenceWriteFileOptions = Omit<WriteFileOptions, "create" | "mode" | "conditions"> & {
  readonly create?: "existing" | undefined
}

export interface AccessOptions {
  readonly read?: boolean | undefined
  readonly write?: boolean | undefined
  readonly execute?: boolean | undefined
}

// -----------------------------------------------------------------------------
// Sessions and namespace traversal
// -----------------------------------------------------------------------------

export interface OperationOptions {
  readonly maxVisits?: number | undefined
  readonly maxComparisons?: number | undefined
  readonly maxCopyBytes?: ByteSize.Input | undefined
}

export interface TraversalViewOptions {
  readonly base?: DirectorySelector | undefined
}

export interface TraversalOptions extends OperationOptions, TraversalViewOptions {}

export type TraversalError = ReadError | NamespaceChanged

type BudgetError = InvalidInput | InvalidResource | LimitExceeded | ReentrantOperation

export const TraversalDirectoryTypeId: unique symbol = Symbol("effect/virtual-file-system/TraversalDirectoryTypeId")

export const TraversalSelectionTypeId: unique symbol = Symbol("effect/virtual-file-system/TraversalSelectionTypeId")

export const NamespaceTraversalTypeId: unique symbol = Symbol("effect/virtual-file-system/NamespaceTraversalTypeId")

export const OperationBudgetTypeId: unique symbol = Symbol("effect/virtual-file-system/OperationBudgetTypeId")

export const PayloadHoldTypeId: unique symbol = Symbol("effect/virtual-file-system/PayloadHoldTypeId")

export const ReadLeaseTypeId: unique symbol = Symbol("effect/virtual-file-system/ReadLeaseTypeId")

export const OperationFilesTypeId: unique symbol = Symbol("effect/virtual-file-system/OperationFilesTypeId")

export const OperationSessionTypeId: unique symbol = Symbol("effect/virtual-file-system/OperationSessionTypeId")

export const PayloadReservationTypeId: unique symbol = Symbol("effect/virtual-file-system/PayloadReservationTypeId")

export interface TraversalDirectory {
  readonly [TraversalDirectoryTypeId]: typeof TraversalDirectoryTypeId
  readonly release: Effect.Effect<void>
}

export interface TraversalSelection {
  readonly [TraversalSelectionTypeId]: typeof TraversalSelectionTypeId
  readonly object: ObjectObservation
  readonly entry: Option.Option<PresentEntry>
  readonly release: Effect.Effect<void>
}

export type NamedTraversalSelection = TraversalSelection & { readonly entry: Option.Some<PresentEntry> }

export interface TraversalListing {
  readonly directory: DirectoryObservation
  readonly entries: ReadonlyArray<NamedTraversalSelection>
}

export type TraversalClassification =
  | { readonly kind: "nonDirectory" }
  | { readonly kind: "directory"; readonly directory: TraversalDirectory }

export interface PayloadHold {
  readonly [PayloadHoldTypeId]: typeof PayloadHoldTypeId
  readonly release: Effect.Effect<void>
}

export interface ReadLease<A> extends PayloadHold {
  readonly [ReadLeaseTypeId]: typeof ReadLeaseTypeId
  readonly value: A
}

export interface TextRead {
  readonly bytes: ReadLease<Uint8Array>
  readonly output: PayloadHold
}

export type CopySourceRead =
  | {
    readonly kind: "file"
    readonly read: ObservedRead<Uint8Array> & {
      readonly object: Extract<ObjectObservation, { readonly kind: "file" }>
    }
  }
  | {
    readonly kind: "symlink"
    readonly read: ObservedRead<BytePath.BytePath> & {
      readonly object: Extract<ObjectObservation, { readonly kind: "symlink" }>
    }
  }

export interface CopyReadOptions {
  readonly followFinalSymlink?: boolean | undefined
}

export interface OperationEntryAddress {
  readonly directory: TraversalDirectory
  readonly name: Path
}

type OperationEntryTarget = EntryTarget | OperationEntryAddress

type OperationAttributeTarget = Target | OperationEntryAddress | TraversalDirectory

export interface OperationFiles {
  readonly [OperationFilesTypeId]: typeof OperationFilesTypeId
  /** Reads a regular file with N byte and 2N output holds before read publication. No decoder runs under the turn. */
  readonly readForText: (target: Target) => Effect.Effect<TextRead, ReadError>
  /** Reads complete literal or followed copy source under one coherent selection; returned data remains charged until lease release. */
  readonly readForCopy: (
    source: EntryTarget | TraversalSelection,
    options?: CopyReadOptions
  ) => Effect.Effect<ReadLease<CopySourceRead>, TraversalError>
  /** Publishes the complete input using the accepted placement/access/creation rules and full resulting-file reservations. */
  readonly writeFile: {
    (target: ObjectReference, data: Uint8Array, options?: ReferenceWriteFileOptions): Fx<void>
    (target: Path, data: Uint8Array, options?: PathWriteFileOptions): Fx<void>
    (target: EntryAddress | OperationEntryAddress, data: Uint8Array, options?: WriteFileOptions): Fx<void>
  }
  /** Atomically publishes copied file data and optional exact source times under the original prestate authorization. */
  readonly publishCopiedFile: (
    destination: OperationEntryTarget,
    data: Uint8Array,
    options?: AtomicCopyOptions
  ) => Fx<ObjectObservation>
  /** Atomically publishes a literal copied link and optional exact times, preserving the fixed symlink mode. */
  readonly publishCopiedSymlink: (
    destination: OperationEntryTarget,
    target: BytePath.BytePath,
    options?: AtomicSymlinkCopyOptions
  ) => Fx<ObjectObservation>
  /** Creates directories atomically under the shared operation ledger; recursive copy finalization remains separate steps. */
  readonly makeDirectory: (
    destination: OperationEntryTarget,
    options?: MkdirOptions
  ) => Fx<DirectoryObservation>
  /** Applies atomic prestate metadata authorization. A directory location is checked on its selected route rather than reopened by path. */
  readonly setAttributes: (
    target: OperationAttributeTarget,
    attributes: Attributes,
    options?: AttributeOptions
  ) => Fx<void>
}

export interface OperationSession {
  readonly [OperationSessionTypeId]: typeof OperationSessionTypeId
  readonly files: OperationFiles
  readonly budget: OperationBudget
  readonly traversal: (options?: TraversalViewOptions) => Effect.Effect<NamespaceTraversal, TraversalError>
  readonly close: Effect.Effect<void>
}

export interface PayloadReservation extends PayloadHold {
  readonly [PayloadReservationTypeId]: typeof PayloadReservationTypeId
  readonly resize: (totalBytes: ByteSize.Input) => Effect.Effect<void, BudgetError>
  readonly release: Effect.Effect<void>
}

export interface OperationBudget {
  readonly [OperationBudgetTypeId]: typeof OperationBudgetTypeId
  readonly reservePayload: (bytes: ByteSize.Input) => Effect.Effect<PayloadReservation, BudgetError>
  readonly consumeComparisons: (count: number) => Effect.Effect<void, BudgetError>
}

export type TraversalProbe =
  | { readonly _tag: "Name"; readonly name: Path }
  | { readonly _tag: "Current" }
  | { readonly _tag: "Parent" }
  | { readonly _tag: "Root" }

export interface NamespaceTraversal {
  readonly [NamespaceTraversalTypeId]: typeof NamespaceTraversalTypeId
  readonly base: TraversalDirectory
  /** Selects one probe with search permission; final named links are not followed. Genuine initial absence is None, selected-route loss fails. Root uses current caller-root authority without depending on the source location's namespace route; the lease itself must still be live and session-owned. */
  readonly select: (
    directory: TraversalDirectory,
    probe: TraversalProbe
  ) => Effect.Effect<Option.Option<TraversalSelection>, TraversalError>
  /** Selects direct entries coherently under R+X and ordinary directory-atime rules. */
  readonly list: (directory: TraversalDirectory) => Effect.Effect<TraversalListing, TraversalError>
  /** Classifies while preserving bindings; a directory result supplies the location used for matcher-approved descent. */
  readonly classify: (selection: TraversalSelection) => Effect.Effect<TraversalClassification, TraversalError>
  readonly budget: OperationBudget
  readonly close: Effect.Effect<void>
}

// -----------------------------------------------------------------------------
// Caller service
// -----------------------------------------------------------------------------

export const CallerTypeId: unique symbol = Symbol("effect/virtual-file-system/CallerTypeId")

export interface VirtualFileSystem {
  readonly [CallerTypeId]: typeof CallerTypeId
  /**
   * Positive synthetic device identity shared by all callers and adapters of this instance.
   * All compatible library copies in one JavaScript global environment share an allocator,
   * including reloads that preserve that environment. Separate workers, realms, isolates and
   * processes have independent domains; equal numbers across domains are allowed.
   * Fresh construction and every restore allocate a distinct value in the destination domain.
   * Values never wrap, reset or get reused while the environment lives. Failed construction
   * may leave gaps. An unavailable or incompatible shared allocator causes an initialization
   * defect before Owner delivery, without a module-local fallback. External registry tampering
   * is outside the supported model. The allocator retains no filesystem objects.
   * Allocation order has no semantic meaning. Capture excludes this value; restore preserves
   * object numbers independently. This is not a persistent or cross-domain identifier.
   * Reading this scalar requires no admission, remains valid after caller release and grants
   * no authority.
   */
  readonly instanceNumber: bigint
  /** Construction-fixed input limits for validating requests. Grants no Owner authority. */
  readonly inputLimits: Readonly<Pick<Limits, "ioBytes" | "pathBytes">>
  /** Returns a nonretaining identity after authorized traversal without touching times. */
  readonly lookup: (target: Target) => ReadEffect<ObjectReference>
  /** Returns coherent followed-object metadata without a content-read permission check or atime touch. */
  readonly stat: (target: Target) => ReadEffect<ObjectObservation>
  /** Returns final-link metadata without following it. */
  readonly linkStat: (target: EntryTarget) => ReadEffect<ObjectObservation>
  /** Checks the current permission class and confinement. File execute bits grant no execution behavior. */
  readonly access: (target: Target, options?: AccessOptions) => ReadEffect<void>
  /** Observes one supplied name under parent search permission, without requiring listing permission. */
  readonly observeEntry: (address: EntryAddress) => ReadEffect<EntryObservation>
  /** Returns the selected route parent and binding; the caller root returns None and exposes no outside parent. */
  readonly observeRouteParent: (path: Path) => ReadEffect<Option.Option<PresentEntry>>
  /** Returns the supplied followed route as caller-root absolute byte spelling without touching atime. References cannot request an arbitrary alias route. */
  readonly realPath: (path: Path) => ReadEffect<BytePath.BytePath>
  /** Returns an isolated whole-file byte array. Successful empty reads and positive EOF reads touch atime. */
  readonly readFile: (target: Target) => ReadEffect<Uint8Array>
  /** Reads content and records source atime before the read in the same atomic operation. */
  readonly readFileObserved: (target: Target) => ReadEffect<ObservedRead<Uint8Array>>
  /** Returns exact link-target bytes and touches the link atime without following the target. */
  readonly readLink: (target: EntryTarget | ObjectReference) => ReadEffect<BytePath.BytePath>
  /** Reads target bytes and preserves source atime before the read in the same observation. */
  readonly readLinkObserved: (target: EntryTarget | ObjectReference) => ReadEffect<ObservedRead<BytePath.BytePath>>
  /** Lists names with directory read permission; returns post-list directory atime. */
  readonly readDirectory: (target: Target) => ReadEffect<NameListing>
  /** Lists bindings and no-follow observations with directory read and search permission. */
  readonly readDirectoryEntries: (target: Target) => ReadEffect<EntryListing>
  /** Atomically writes one complete input using replace, start or append placement. Mutable input is snapshotted per execution after known reservations. */
  readonly writeFile: {
    (target: ObjectReference, data: Uint8Array, options?: ReferenceWriteFileOptions): Fx<void>
    (target: Path, data: Uint8Array, options?: PathWriteFileOptions): Fx<void>
    (target: EntryAddress, data: Uint8Array, options?: WriteFileOptions): Fx<void>
  }
  /** Changes the length atomically, zero-filling growth and preserving every handle cursor. */
  readonly truncate: (target: Target, length: ByteSize.Input, options?: RevisionCondition) => Fx<void>
  /** Publishes all changed attributes atomically after checking every requested field against prestate. */
  readonly setAttributes: (target: Target, attributes: Attributes, options?: AttributeOptions) => Fx<void>
  /** Creates an exclusive empty regular file. Default mode is 0666 before caller umask. */
  readonly createFile: (target: EntryTarget, options?: CreateOptions) => Fx<ObjectObservation>
  /** Creates real directories with default mode 0777 before umask. Recursive creation is one atomic transition. */
  readonly makeDirectory: (target: EntryTarget, options?: MkdirOptions) => Fx<DirectoryObservation>

  /** Creates one exclusive directory and returns its original binding atomically. */
  readonly makeDirectoryEntry: (
    target: EntryTarget,
    options?: CreateOptions
  ) => Fx<PresentEntry & { readonly object: DirectoryObservation }>
  /** Creates an exclusive symlink with exact nonempty NUL-free target bytes, fixed 0777 and inherited gid. */
  readonly makeSymlink: (target: EntryTarget, linkTarget: Path, options?: AbsentConditions) => Fx<ObjectObservation>
  /** Links a regular file or symlink, never a directory. Relative symlinks resolve through each followed entry. */
  readonly makeHardLink: (
    source: HardLinkSource,
    destination: EntryTarget,
    options?: AbsentConditions
  ) => Fx<ObjectObservation>
  /** Atomically changes entry bindings and link counts. Compatible nondirectories or empty directories may be replaced; same-object rename is a checked noop. */
  readonly rename: (source: EntryTarget, destination: EntryTarget, options?: RenameOptions) => Fx<void>
  /** Removes one nondirectory binding without following its final link. Missing entries fail. */
  readonly unlink: (target: EntryTarget, options?: EntryConditions) => Fx<void>
  /** Removes one empty real directory. Retained cwd/root/handles do not prevent removal; its retained nlink becomes zero. */
  readonly removeDirectory: (target: EntryTarget, options?: EntryConditions) => Fx<void>
  /** Opens an independently scoped file handle. An undelivered committed handle is released; its created name may remain. */
  readonly open: {
    (target: ObjectReference, options?: ReferenceOpenOptions): Scoped<FileHandle>
    (target: Path, options?: PathOpenOptions): Scoped<FileHandle>
    (target: EntryAddress, options?: OpenOptions): Scoped<FileHandle>
  }
  /** Opens a traversal-only directory handle with search permission, independently scoped from this caller. */
  readonly openDirectory: (target: Target) => Scoped<DirectoryHandle>
  /** Derives an independently scoped narrower root and resets cwd. Fixed identity and privilege cannot broaden. */
  readonly withRoot: (directory: DirectorySelector) => Scoped<VirtualFileSystem>
  /** Derives an independently scoped cwd while preserving root and all inherited boundaries. */
  readonly withCurrentDirectory: (directory: DirectorySelector) => Scoped<VirtualFileSystem>
  /** Removes bounded steps with a continuous top-binding latch. Earlier completed steps survive later failure. */
  readonly removeRecursive: (target: EntryTarget, options?: RemoveOptions) => Fx<void>
  /** Walks live metadata in root-first DFS byte order without atime. Pausing retains one operation ticket, never a turn; early finalization releases it. */
  readonly walk: (root: Target, options?: WalkOptions) => Stream.Stream<WalkRecord, VirtualFileSystemError>
  /** Atomically publishes one copied regular file with optional exact source access/modification times. No source callbacks run under an ordinary turn. */
  readonly publishCopiedFile: (
    destination: EntryTarget,
    data: Uint8Array,
    options?: AtomicCopyOptions
  ) => Fx<ObjectObservation>
  /** Atomically publishes a literal symlink replacement and optional exact times. Overwriting a regular file replaces its binding, rather than mutating its inode. */
  readonly publishCopiedSymlink: (
    destination: EntryTarget,
    target: BytePath.BytePath,
    options?: AtomicSymlinkCopyOptions
  ) => Fx<ObjectObservation>
  /** Acquires one independently scoped operation with prior cleanup enrollment and one caller/operation charge; no search base is selected. */
  readonly acquireOperation: (options?: OperationOptions) => Scoped<OperationSession>
  /** Acquires a common operation and its namespace view; failed view creation finalizes the private operation before returning. */
  readonly acquireTraversal: (options?: TraversalOptions) => Scoped<NamespaceTraversal>
  /** Acquires a caller-bound synchronous region and enrolls its cleanup before delivery. Requires instance sync opt-in. */
  readonly acquireSync: Scoped<SyncFileSystem>
}

export const VirtualFileSystem: Context.Service<VirtualFileSystem, VirtualFileSystem> = Context.Service<
  VirtualFileSystem
>("effect/virtual-file-system/VirtualFileSystem")

// -----------------------------------------------------------------------------
// Handles
// -----------------------------------------------------------------------------

export const FileHandleTypeId: unique symbol = Symbol("effect/virtual-file-system/FileHandleTypeId")

export const DirectoryHandleTypeId: unique symbol = Symbol("effect/virtual-file-system/DirectoryHandleTypeId")

export interface FileHandle {
  readonly [FileHandleTypeId]: typeof FileHandleTypeId
  readonly stat: () => ReadEffect<ObjectObservation>
  readonly read: (destination: Uint8Array, options?: ReadOptions) => ReadEffect<number>
  readonly readAlloc: (count: number, options?: ReadOptions) => ReadEffect<Uint8Array>
  readonly write: (source: Uint8Array, options?: WriteOptions) => Fx<void>
  readonly seek: (seek: Seek) => Fx<bigint>
  readonly position: () => ReadEffect<bigint>
  readonly truncate: (length: ByteSize.Input, options?: RevisionCondition) => Fx<void>
  readonly setAttributes: (attributes: Attributes, options?: RevisionCondition) => Fx<void>
  readonly close: () => Effect.Effect<void>
  /** Obtains a synchronous view borrowing this handle's original scope; it does not transfer ownership to a region. */
  readonly sync: () => Fx<SyncFileHandle>
}

export interface DirectoryHandle {
  readonly [DirectoryHandleTypeId]: typeof DirectoryHandleTypeId
  readonly stat: () => ReadEffect<DirectoryObservation>
  readonly close: () => Effect.Effect<void>
  readonly sync: () => Fx<SyncDirectoryHandle>
}

// -----------------------------------------------------------------------------
// Synchronous interfaces
// -----------------------------------------------------------------------------

type SyncMethods<T> = {
  readonly [K in keyof T]: T[K] extends (...args: infer A) => Effect.Effect<infer V, infer E, never>
    ? (...args: A) => Result.Result<V, E>
    : never
}

type AtomicMethods = Pick<
  VirtualFileSystem,
  | "lookup"
  | "stat"
  | "linkStat"
  | "access"
  | "observeEntry"
  | "observeRouteParent"
  | "realPath"
  | "readFile"
  | "readFileObserved"
  | "readLink"
  | "readLinkObserved"
  | "readDirectory"
  | "readDirectoryEntries"
  | "truncate"
  | "setAttributes"
  | "createFile"
  | "makeDirectory"
  | "makeSymlink"
  | "makeHardLink"
  | "rename"
  | "unlink"
  | "removeDirectory"
>

type FileMethods = Pick<
  FileHandle,
  "stat" | "read" | "readAlloc" | "write" | "seek" | "position" | "truncate" | "setAttributes" | "close"
>

export const SyncTypeId: unique symbol = Symbol("effect/virtual-file-system/SyncTypeId")

export interface SyncFileSystem extends SyncMethods<AtomicMethods> {
  readonly [SyncTypeId]: typeof SyncTypeId
  readonly writeFile: {
    (target: ObjectReference, data: Uint8Array, options?: ReferenceWriteFileOptions): SyncResult<void>
    (target: Path, data: Uint8Array, options?: PathWriteFileOptions): SyncResult<void>
    (target: EntryAddress, data: Uint8Array, options?: WriteFileOptions): SyncResult<void>
  }
  readonly open: {
    (target: ObjectReference, options?: ReferenceOpenOptions): SyncResult<SyncFileHandle>
    (target: Path, options?: PathOpenOptions): SyncResult<SyncFileHandle>
    (target: EntryAddress, options?: OpenOptions): SyncResult<SyncFileHandle>
  }
  readonly openDirectory: (target: Target) => SyncResult<SyncDirectoryHandle>
}

export interface SyncFileHandle extends SyncMethods<Omit<FileMethods, "close">> {
  readonly [FileHandleTypeId]: typeof FileHandleTypeId
  /** Closes immediately when idle; returns Busy without changing an open or draining handle. Fully closed handles succeed. */
  readonly close: () => SyncResult<void>
  readonly effect: FileHandle
}

export interface SyncDirectoryHandle {
  readonly [DirectoryHandleTypeId]: typeof DirectoryHandleTypeId
  readonly stat: () => Result.Result<DirectoryObservation, ReadError>
  readonly close: () => SyncResult<void>
  readonly effect: DirectoryHandle
}

// -----------------------------------------------------------------------------
// Owner
// -----------------------------------------------------------------------------

export const OwnerTypeId: unique symbol = Symbol("effect/virtual-file-system/OwnerTypeId")

export interface Owner {
  readonly [OwnerTypeId]: typeof OwnerTypeId
  readonly authorize: (options: CallerOptions) => Scoped<VirtualFileSystem>
  readonly capture: () => Fx<Capture>
  readonly usage: Effect.Effect<Usage>
  readonly limits: Limits
}
