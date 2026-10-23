/**
 * Provides bounded in-memory filesystems with byte paths, explicit caller credentials and scoped handles.
 *
 * Create an Owner with `make`, then authorize callers inside an Effect Scope. Owners authorize callers and
 * capture the root-reachable graph. Each caller applies its own credentials, root and working directory.
 * File handles retain their acquired grants for their independent lifetime.
 *
 * @stability experimental
 * @since 4.1.0
 */
import * as Clock from "../Clock.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Schema from "../Schema.ts"
import * as Scope from "../Scope.ts"
import type * as Stream from "../Stream.ts"
import * as A from "./internal/atomic.ts"
import * as C from "./internal/capture.ts"
import * as E from "./internal/engine.ts"
import * as H from "./internal/handles.ts"
import * as M from "./internal/model.ts"
import * as O from "./internal/operations.ts"
import * as P from "./internal/preparation.ts"
import * as R from "./internal/runtime.ts"
import * as S from "./internal/sync.ts"
import * as W from "./internal/walk.ts"

const DEFAULT_ROOT_MODE = 0o755

const DEFAULT_UMASK = 0o022

export {
  /**
   * AccessDenied expected failure with typed reasons and safe operation context.
   *
   * @stability experimental
   * @category errors
   * @since 4.1.0
   */
  AccessDenied,
  /**
   * Constructible alias record for a regular file or symlink. It repeats no metadata.
   *
   * @stability experimental
   * @category schemas
   * @since 4.1.0
   */
  AliasRecord,
  /**
   * AlreadyExists expected failure with typed reasons and safe operation context.
   *
   * @stability experimental
   * @category errors
   * @since 4.1.0
   */
  AlreadyExists,
  /**
   * Busy expected failure with typed reasons and safe operation context.
   *
   * @stability experimental
   * @category errors
   * @since 4.1.0
   */
  Busy,
  /**
   * CapabilityUnavailable expected failure with typed reasons and safe operation context.
   *
   * @stability experimental
   * @category errors
   * @since 4.1.0
   */
  CapabilityUnavailable,
  /**
   * Schema for structural capture records. Restore rejects excess fields and graph-level inconsistencies.
   *
   * @stability experimental
   * @category schemas
   * @since 4.1.0
   */
  CaptureRecord,
  /**
   * ConditionFailed expected failure with typed reasons and safe operation context.
   *
   * @stability experimental
   * @category errors
   * @since 4.1.0
   */
  ConditionFailed,
  /**
   * Constructible directory capture record. Local ids are positive and separate from preserved object
   * numbers.
   *
   * @stability experimental
   * @category schemas
   * @since 4.1.0
   */
  DirectoryRecord,
  /**
   * Schema for a complete rich entry listing requiring directory read and search permission. Child
   * observations do not follow symlinks or touch child timestamps. Opaque fields recognize only authentic
   * issued values; decoding scalar identifiers never grants authority. No wire format is promised.
   *
   * @stability experimental
   * @category schemas
   * @since 4.1.0
   */
  EntryListing,
  /**
   * Schema for absent or present route-specific slots. Absence carries no history token; observing a
   * supplied name requires search permission. Opaque fields recognize only authentic issued values;
   * decoding scalar identifiers never grants authority. No wire format is promised.
   *
   * @stability experimental
   * @category schemas
   * @since 4.1.0
   */
  EntryObservation,
  /**
   * Compares semantic identities without counter arithmetic.
   *
   * @stability experimental
   * @category comparisons
   * @since 4.1.0
   */
  equalsEntryBinding,
  /**
   * Compares semantic identities without counter arithmetic.
   *
   * @stability experimental
   * @category comparisons
   * @since 4.1.0
   */
  equalsNamespaceRevision,
  /**
   * Compares semantic identities without counter arithmetic.
   *
   * @stability experimental
   * @category comparisons
   * @since 4.1.0
   */
  equalsObjectReference,
  /**
   * Compares semantic identities without counter arithmetic.
   *
   * @stability experimental
   * @category comparisons
   * @since 4.1.0
   */
  equalsObjectRevision,
  /**
   * Constructible file capture record. Local ids are positive and separate from preserved object numbers.
   *
   * @stability experimental
   * @category schemas
   * @since 4.1.0
   */
  FileRecord,
  /**
   * InvalidInput expected failure with typed reasons and safe operation context.
   *
   * @stability experimental
   * @category errors
   * @since 4.1.0
   */
  InvalidInput,
  /**
   * InvalidResource expected failure with typed reasons and safe operation context.
   *
   * @stability experimental
   * @category errors
   * @since 4.1.0
   */
  InvalidResource,
  /**
   * InvalidRestore expected failure with typed reasons and safe operation context.
   *
   * @stability experimental
   * @category errors
   * @since 4.1.0
   */
  InvalidRestore,
  /**
   * LimitExceeded expected failure with typed reasons and safe operation context.
   *
   * @stability experimental
   * @category errors
   * @since 4.1.0
   */
  LimitExceeded,
  /**
   * Validated finite construction limits. Defaults are objects 32768, entries 65536, callers 256, handles
   * 1024, operations 128, name 255, path 4096, expanded path 16384, follows 64, visits/records 131072,
   * content 64 MiB, file/I/O 16 MiB, transient 256 MiB and restore payload 128 MiB. Sync defaults false.
   *
   * @stability experimental
   * @category schemas
   * @since 4.1.0
   */
  Limits,
  /**
   * Schema for one rich-listing child. Directory context belongs to the listing envelope; the child
   * carries its exact name, binding and no-follow observation.
   *
   * @stability experimental
   * @category schemas
   * @since 4.1.0
   */
  ListedEntry,
  /**
   * Complete logical metadata. Object numbers are positive, uid/gid are uint32, and modes reject
   * unsupported bits.
   *
   * @stability experimental
   * @category schemas
   * @since 4.1.0
   */
  Metadata,
  /**
   * Schema for a complete name listing in unsigned byte order. The directory observation reflects the
   * post-read access time; directory read permission is sufficient. Opaque fields recognize only authentic
   * issued values; decoding scalar identifiers never grants authority. No wire format is promised.
   *
   * @stability experimental
   * @category schemas
   * @since 4.1.0
   */
  NameListing,
  /**
   * NamespaceChanged expected failure with typed reasons and safe operation context.
   *
   * @stability experimental
   * @category errors
   * @since 4.1.0
   */
  NamespaceChanged,
  /**
   * NotFound expected failure with typed reasons and safe operation context.
   *
   * @stability experimental
   * @category errors
   * @since 4.1.0
   */
  NotFound,
  /**
   * Schema for coherent discriminated object observations. Directory observations include their
   * direct-entry revision. Opaque fields recognize only authentic issued values; decoding scalar
   * identifiers never grants authority. No wire format is promised.
   *
   * @stability experimental
   * @category schemas
   * @since 4.1.0
   */
  ObjectObservation,
  /**
   * ReentrantOperation expected failure with typed reasons and safe operation context.
   *
   * @stability experimental
   * @category errors
   * @since 4.1.0
   */
  ReentrantOperation,
  /**
   * Constructible root capture record. Local ids are positive and separate from preserved object numbers.
   *
   * @stability experimental
   * @category schemas
   * @since 4.1.0
   */
  RootRecord,
  /**
   * Captured semantic metadata. Restore derives size and link counts; object numbers and all four times
   * remain exact.
   *
   * @stability experimental
   * @category schemas
   * @since 4.1.0
   */
  SemanticMetadata,
  /**
   * Constructible symlink capture record. Local ids are positive and separate from preserved object
   * numbers.
   *
   * @stability experimental
   * @category schemas
   * @since 4.1.0
   */
  SymlinkRecord,
  /**
   * Unrepresentable expected failure with typed reasons and safe operation context.
   *
   * @stability experimental
   * @category errors
   * @since 4.1.0
   */
  Unrepresentable,
  /**
   * Exact coherent scalar accounting, including unreachable retained objects. Inspection needs no ordinary
   * operation slot.
   *
   * @stability experimental
   * @category schemas
   * @since 4.1.0
   */
  Usage,
  /**
   * Context key for the caller capability. It provides no route to Owner.
   *
   * **Details**
   *
   * Namespace use rechecks the scoped caller's root, cwd and every inherited confinement boundary. A
   * detached or escaped root blocks namespace use until that same directory identity returns. An invalid
   * cwd blocks relative paths only.
   *
   * @stability experimental
   * @category tags
   * @since 4.1.0
   */
  VirtualFileSystem,
  /**
   * Schema for live metadata-walk records with no fabricated root entry. The root relative path is `.`;
   * symlinks are leaves. Opaque fields recognize only authentic issued values; decoding scalar identifiers
   * never grants authority. No wire format is promised.
   *
   * @stability experimental
   * @category schemas
   * @since 4.1.0
   */
  WalkRecord
} from "./internal/model.ts"

export type {
  /**
   * Absence and parent conditions for exclusive entry creation.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  AbsentConditions,
  /**
   * Atomic permission-set request. Omitted or false fields add no requirement; empty options check
   * authorized existence. All requested permissions use one resolved object and one coherent state without
   * touching timestamps.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  AccessOptions,
  /**
   * Concrete atomic destination content-and-times publication. Existing regular files retain identity,
   * grants, birthtime, mode and ownership. New objects use ordinary supplied source mode bits through
   * caller umask and inheritance. All requested times and content authorize against prestate.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  AtomicCopyOptions,
  /**
   * Atomic symlink-copy options. Symlink mode is always 0777 and ignores umask.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  AtomicSymlinkCopyOptions,
  /**
   * Attribute selection and object-revision condition. Following is the default.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  AttributeOptions,
  /**
   * Atomic attribute request. Every field is authorized against prestate; no-follow symlink chmod is
   * invalid.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  Attributes,
  /**
   * Initial scoped caller authorization. Umask defaults 022; root/cwd default instance root. No host
   * defaults are consulted.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  CallerOptions,
  /**
   * Independent immutable captured graph. Every traversal is root-first DFS byte order, primary before
   * aliases, with fresh mutable output bytes. It pins no live object or source reservation.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  Capture,
  /**
   * Finite source-independent per-run traversal limits. Defaults are 131072 records, 128 MiB output and
   * 256 MiB staging.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  CaptureTraversalOptions,
  /**
   * Fresh instance configuration. Root defaults 0:0/0755 without umask; its four times use one captured
   * Clock sample.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  Configuration,
  /**
   * Copy-source final-link policy. Default false reads literal symlink bytes; true follows and requires a
   * regular file for copyFile. Directories are handled by namespace traversal, never materialized through
   * this read.
   *
   * @stability experimental
   * @category configuration
   * @since 4.1.0
   */
  CopyReadOptions,
  /**
   * Copy-source observation with kind-correlated bytes, metadata, post-read revision and pre-read access
   * time. Literal links carry exact BytePath targets. This record is read data rather than a serializable
   * authority format.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  CopySourceRead,
  /**
   * Exclusive creation with an optional mode and authorized absence guards.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  CreateOptions,
  /**
   * Copied uint32 identity. Supplementary groups default empty; privilege defaults false. uid zero has no
   * implicit privilege.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  Credentials,
  /**
   * Destination-slot and direct-parent conditions for rename or atomic copy publication.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  DestinationConditions,
  /**
   * Retained directory metadata observation and idempotent close. Namespace selection through it still
   * uses the invoking caller current confinement and permission.
   *
   * @stability experimental
   * @category resource management
   * @since 4.1.0
   */
  DirectoryHandle,
  /**
   * Observation of a real directory.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  DirectoryObservation,
  /**
   * Directory selector checked against the invoking caller at execution.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  DirectorySelector,
  /**
   * One validated name in a selected directory. The address carries no authority.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  EntryAddress,
  /**
   * Opaque binding identity that changes after removal and reinsertion.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  EntryBinding,
  /**
   * Deletion conditions. Content revisions never guard name deletion.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  EntryConditions,
  /**
   * Route-specific entry selector. Root and terminal dot components cannot name mutable entries.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  EntryTarget,
  /**
   * Independently scoped retained file grant with acquiring credentials. Sharing delegates its exact
   * grant, cursor, close state and original lifetime. Data permission survives unlink/mode changes;
   * attributes use current ownership and acquiring identity. Reads advance by actual bytes, positioned I/O
   * preserves cursor, append writes atomically select EOF with the fixed appendCursor policy, defaulting
   * to advance. Handle truncate uses its fixed truncateCursor policy, defaulting to preserve. Effect/sync
   * sharing retains both policies. Zero writes do not grow or move. Close stops admissions, drains
   * admitted work and releases resources even on interruption.
   *
   * @stability experimental
   * @category resource management
   * @since 4.1.0
   */
  FileHandle,
  /**
   * Hard-link source. References fix identity; named sources can guard the selected binding.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  HardLinkSource,
  /**
   * Construction-only finite limits. Counts are nonnegative safe integers; root objects, operations and
   * address limits are positive. Zero disables other resources. Limits intersect.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  LimitOptions,
  /**
   * Atomic path-bounded recursive mkdir. Existing real directories are noops only in recursive mode; all
   * new components use the same masked mode.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  MkdirOptions,
  /**
   * Named selection whose entry context is present and agrees with its no-follow object observation in the
   * same coherent state. Listing selections each own their lease until explicitly released or finalized
   * with the session.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  NamedTraversalSelection,
  /**
   * Opaque direct-entry revision bound to its directory and instance.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  NamespaceRevision,
  /**
   * Namespace view borrowing one independently scoped OperationSession. Every observation takes its own
   * FIFO turn and shares its ticket, retained policy and cumulative ledgers. A convenience
   * acquireTraversal owns its common operation privately; creating another view adds no
   * caller/ticket/Scope. Pausing retains charged state and the ticket, not an execution turn; matcher,
   * conversion and consumer code execute outside turns. No snapshot or transaction callback is supplied.
   *
   * **Details**
   *
   * Locations and selections belong to the common operation, so other views of that same operation can use
   * them. Another operation cannot. Each explicit lease release stops new uses and drains admitted uses
   * without invalidating already-issued descendants. Releasing base alone does not close the operation.
   * This close Effect is the common shutdown, including files, budget, every view, lease and reservation.
   * Historical observations remain data. Distinct logical payload roles stay charged until their final
   * dependent ends.
   *
   * @stability experimental
   * @category resource management
   * @since 4.1.0
   */
  NamespaceTraversal,
  /**
   * Nonretaining instance identity. Current recipient authorization still needs an authorized route.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  ObjectReference,
  /**
   * Opaque object revision bound to its object and instance.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  ObjectRevision,
  /**
   * Atomic content read with post-read observation and the source access time before the automatic read
   * touch.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  ObservedRead,
  /**
   * Open defaults to read, existing, follow, no append and no truncate. Append/truncate require write.
   * Existing targets require their access permission; creation grants requested handle access after parent
   * authorization.
   *
   * **Details**
   *
   * With truncate true, expectedRevision guards the resolved file before truncation, including through a
   * symlink. Entry conditions independently guard its named binding. Authorization precedes guard
   * evaluation; all guards, truncation and handle acquisition share one atomic publication boundary. A
   * mismatch returns ConditionFailed without truncation or a delivered handle. Check even an empty file;
   * successful size-preserving truncation changes no timestamps or revisions.
   *
   * **Gotchas**
   *
   * expectedRevision requires truncate true, otherwise InvalidInput. It requires an existing object:
   * create-if-missing with an absent target returns ConditionFailed without creation; exclusive creation
   * with expectedRevision returns InvalidInput. These combinations are validated during execution. The
   * guard applies only at acquisition; later writes need their own conditions. appendCursor and
   * truncateCursor are fixed at acquisition and shared by every handle view. Contents, cursor, times,
   * revisions and accounting publish together. Defaults advance append and preserve truncate. Explicit
   * policies can preserve append and clamp truncate without a shadow cursor or seek-back.
   * Cursor-only clamping changes no object timestamps or revisions. Policies add no authority and do not
   * alter positioned-I/O or zero-length-write rules.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  OpenOptions,
  /**
   * Session accounting for externally held payload and cumulative comparisons. Reserve before
   * allocation/compilation. Consumption counts finite nonnegative safe integers and never refunds work.
   * Namespace visits are charged by session observations automatically. These operations use the existing
   * session ticket; they neither acquire another operation slot nor run arbitrary Effects.
   *
   * @stability experimental
   * @category resource management
   * @since 4.1.0
   */
  OperationBudget,
  /**
   * One name beneath a same-operation route location. It is accepted only by the bounded file view and
   * preserves destination route checks; it does not broaden ordinary DirectorySelector. Name follows the
   * usual single-entry validation.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  OperationEntryAddress,
  /**
   * Expected failures for byte-exact live filesystem operations. Restore-format failures and boundary
   * representation failures do not arise in these calls.
   *
   * @stability experimental
   * @category errors
   * @since 4.1.0
   */
  OperationError,
  /**
   * Concrete bounded file operations borrowing the common session lifetime, fixed caller policy, ticket
   * and ledgers. Every step takes an individual FIFO turn. No handle, callback runner, generic
   * transaction, new Scope or additional caller/ticket charge is supplied. Prior published steps survive
   * later failure.
   *
   * **Details**
   *
   * Copy reads consume complete source payload against the cumulative copy limit before materialization,
   * including each alias name. Payload release never refunds work. Same-operation selections preserve
   * binding and route checks; ordinary entry targets are selected and read coherently. Source read holds
   * coexist with destination input snapshots and complete candidate reservations. Text writes use external
   * text/encoded holds plus the normal write operation. Current permission and confinement checks still
   * apply to every step.
   *
   * @stability experimental
   * @category services
   * @since 4.1.0
   */
  OperationFiles,
  /**
   * Cumulative limits for one independently scoped operation. Namespace visits intersect the instance
   * ceiling. Comparisons default to 1048576; copy source bytes default to 128 MiB. Overrides are finite
   * nonnegative values, including zero; count fields are safe integers and byte fields use ByteSize.Input.
   * Creating views never resets these allowances.
   *
   * @stability experimental
   * @category configuration
   * @since 4.1.0
   */
  OperationOptions,
  /**
   * Independently Scope-owned admitted operation. Acquisition charges one caller slot for fixed policy and
   * one operation ticket and enrolls cleanup before delivery; it does not select a search base or require
   * directory listing. Source-caller release neither closes nor waits for this operation. Current
   * namespace authority remains mandatory; retained policy is not preserved access.
   *
   * **Details**
   *
   * Files and budget borrow this lifetime. Traversal views add base leases but no Scope/caller/ticket and
   * share all cumulative work and payload accounting. Resources interoperate across views of this
   * operation, never across operations. Closing through any namespace view or this close Effect stops new
   * steps and growth, removes queued waits, drains admitted steps and releases all charges before
   * completion. Close and Scope release share idempotent cleanup and Cause preservation without
   * quota/permission gates. Published writes are not undone. An idle open operation retains its ticket and
   * causes synchronous Busy.
   *
   * @stability experimental
   * @category resource management
   * @since 4.1.0
   */
  OperationSession,
  /**
   * Unscoped initial authority for caller authorization, root-reachable atomic capture and exact
   * accounting. It has no global disposal or revocation. Capture excludes orphans, handles, caller policy,
   * clocks and runtime guards. Usage and limits remain inspectable under saturation.
   *
   * @stability experimental
   * @category services
   * @since 4.1.0
   */
  Owner,
  /**
   * Path input. Strings use strict UTF-8; bytes remain exact. Empty paths and NUL are invalid.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  Path,
  /**
   * Followed-path open options. Slot and parent conditions require an explicit EntryAddress so a dangling
   * symlink cannot make the guarded slot ambiguous.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  PathOpenOptions,
  /**
   * Followed-path whole-file options. Object revisions guard the resolved object; named slot and parent
   * conditions require an explicit EntryAddress.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  PathWriteFileOptions,
  /**
   * Fixed session-owned payload charge with idempotent Effect-valued release. It cannot be resized.
   * Release stops new lease uses, drains admitted uses and ends this logical payload role before
   * completion; no permission or ordinary admission can block cleanup. Session close finalizes every
   * outstanding hold. Separately issued holds remain independently releasable within that lifetime.
   *
   * @stability experimental
   * @category resource management
   * @since 4.1.0
   */
  PayloadHold,
  /**
   * Absolute logical-payload reservation owned by one session. Resize validates ByteSize.Input and changes
   * the charge atomically; growth fails immediately without changing the old hold, shrinking frees the
   * difference, equal size is a no-op, and zero keeps a live lease. No delayed growth is queued.
   *
   * **Gotchas**
   *
   * Release is idempotent and unblocked by ordinary admission or permissions. Resize after release fails
   * InvalidResource, even for zero. Reduce a hold only when that external payload role has ended. This
   * lease cannot resize or free automatic VFS frame/observation charges. Every returned lease is enrolled
   * in cleanup before delivery; no charge can appear after close completes.
   *
   * @stability experimental
   * @category resource management
   * @since 4.1.0
   */
  PayloadReservation,
  /**
   * Expected object or exact binding for an existing entry.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  PresentCondition,
  /**
   * Present entry binding and no-follow object observation.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  PresentEntry,
  /**
   * Expected failures for ordinary atomic reads and observations, which accept no guards and do not report
   * automatic traversal-selection loss.
   *
   * @stability experimental
   * @category errors
   * @since 4.1.0
   */
  ReadError,
  /**
   * Isolated read value with a fixed payload hold. Returned bytes are snapshots, not a retained file grant
   * or live pin. Release ends the charged role, not the cumulative work already consumed; handed-off data
   * and historical observations remain data. The operation owns cleanup and bounds the lease lifetime.
   *
   * @stability experimental
   * @category resource management
   * @since 4.1.0
   */
  ReadLease,
  /**
   * Optional positioned I/O. Positioned reads preserve the shared cursor.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  ReadOptions,
  /**
   * Reference-only open options. An exact object reference has no named creation slot, so creation modes
   * and entry/parent conditions are unavailable. expectedRevision remains available for truncating
   * acquisition under OpenOptions.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  ReferenceOpenOptions,
  /**
   * Reference-only whole-file write options. A reference can guard the existing object revision but cannot
   * create an entry or guard a parent slot.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  ReferenceWriteFileOptions,
  /**
   * Bounded partial recursive removal. The top binding stays latched; replacements and moved selections
   * are never silently rescanned.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  RemoveOptions,
  /**
   * Independent source and destination conditions. Source resolution and authorization precede destination
   * checks.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  RenameOptions,
  /**
   * Restore construction limits. Root overrides are deliberately absent; restored metadata is exact.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  RestoreOptions,
  /**
   * Content or attribute condition tied to the selected object identity.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  RevisionCondition,
  /**
   * Exact signed seek delta. The resulting cursor must be nonnegative; seeking beyond EOF allocates
   * nothing.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  Seek,
  /**
   * Explicit slot condition checked only after route authorization.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  SlotCondition,
  /**
   * Synchronous view borrowing the same retained directory handle and scope.
   *
   * @stability experimental
   * @category resource management
   * @since 4.1.0
   */
  SyncDirectoryHandle,
  /**
   * Synchronous view of the same handle, cursor, grant and close state. Its Effect view adds no lifetime
   * or charge. Fully closed close succeeds even during unrelated pending work; an open or closing handle
   * cannot synchronously close while ordinary work is pending. Expected failure guarantees no publication
   * for that call; defects carry no rollback receipt.
   *
   * @stability experimental
   * @category resource management
   * @since 4.1.0
   */
  SyncFileHandle,
  /**
   * Scoped synchronous caller region with independently retained credentials/root/cwd charged as a caller.
   * Opens enroll region-owned cleanup before publication. Every call immediately fails Busy while any
   * ordinary admitted work is unfinished, including queued/preparing work and paused walks. No call queues
   * or mutates after Busy. Region release drains before closing its owned handles.
   *
   * **Gotchas**
   *
   * A lone defect is rethrown unchanged. Multiple observed failures/defects throw Cause.UnknownError with
   * a structured Cause made from ordered reasons in Error.cause; no reason is deduplicated or squashed. No
   * sync interruption channel or unsafe extraction family is supplied.
   *
   * @stability experimental
   * @category services
   * @since 4.1.0
   */
  SyncFileSystem,
  /**
   * Object selector. References select the exact object and never choose an arbitrary symlink route.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  Target,
  /**
   * Text-read bytes and decoded-string allowance, independently held. The byte lease charges N; the output
   * hold charges a conservative 2N. Both are reserved from one coherent read preparation before
   * materialization or atime publication. Validate encoding before reading; decode outside filesystem
   * turns. Release bytes after decoding no longer needs them and output on string handoff. The fixed
   * output hold cannot be reduced for ASCII, BOM removal or replacement. Normal whole-read I/O and file
   * limits still apply.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  TextRead,
  /**
   * Binding-preserving classification. Directory results own a new location retaining the selected
   * followed route for later descent. A missing symlink target is nondirectory only while the selected
   * link still matches; other failures propagate. Later location use revalidates route, target and current
   * authority without chasing replacements. Classification does not touch atime or read/decode symlink
   * target text.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  TraversalClassification,
  /**
   * Operation-bound directory location retaining its selected route, followed-link associations and
   * required directory identities. It grants no independent namespace authority. Releasing this lease does
   * not invalidate already-issued descendants, which retain their own route dependencies. Shared aliases
   * use the same release state; no implicit duplication is supplied.
   *
   * @stability experimental
   * @category resource management
   * @since 4.1.0
   */
  TraversalDirectory,
  /**
   * Expected traversal failures, including automatically selected-binding loss. There are no explicit
   * mutation conditions or new restore/encoding failures.
   *
   * @stability experimental
   * @category errors
   * @since 4.1.0
   */
  TraversalError,
  /**
   * Complete coherent direct listing in core byte order, including the directory's post-list observation.
   * Names are obtained from each present entry. This envelope is data rather than a separate lease;
   * release its selection leases individually when no longer needed. The adapter decodes all names
   * strictly before matching and applies its own string ordering.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  TraversalListing,
  /**
   * Namespace-only convenience acquisition options. Limits configure the common operation once; base
   * configures the initial namespace view. If view creation fails, finalize the entire privately acquired
   * operation before returning.
   *
   * @stability experimental
   * @category configuration
   * @since 4.1.0
   */
  TraversalOptions,
  /**
   * Semantic namespace request structurally compatible with slash Glob probes. Name accepts one entry
   * name, never a path; Current/Parent/Root retain ordered resolution, search and confinement checks. Root
   * selects caller root, not base. No Glob parser or proposed upstream type is imported into this
   * contract.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  TraversalProbe,
  /**
   * Operation-bound no-follow selection and coherent historical observation. Named entries carry
   * parent/name/binding context; navigation selections invent no entry. Selection retains supporting
   * routes, not a regular-file data grant or its contents. Release stops new uses and drains admitted
   * uses; observations already returned remain historical data. Classified locations already issued remain
   * independently usable within the same operation lifetime.
   *
   * @stability experimental
   * @category resource management
   * @since 4.1.0
   */
  TraversalSelection,
  /**
   * Namespace-view search base, defaulting to the session's retained cwd selected when this view is
   * requested. A base is not a new confinement boundary. Requesting a view acquires no extra Scope, caller
   * slot or operation ticket.
   *
   * @stability experimental
   * @category configuration
   * @since 4.1.0
   */
  TraversalViewOptions,
  /**
   * Expected failure union. Defects, interruption and producer causes remain outside this union. Reentry
   * and receiver liveness precede validation, then admission/reservation, ordered resolution/authority,
   * authorized conditions, final capacity and publication. Denied ancestors mask deeper existence; source
   * checks precede destination checks.
   *
   * @stability experimental
   * @category errors
   * @since 4.1.0
   */
  VirtualFileSystemError,
  /**
   * Bounded walk options. A depth cutoff succeeds; exhausted visits fail. Later siblings are not chased.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  WalkOptions,
  /**
   * Writes one complete input atomically. Defaults to create-if-missing, replace placement and write
   * access. Start placement writes at offset zero and keeps the remaining tail; append chooses current EOF
   * in the same publication. Readwrite requires both permissions on an existing file. Creation authorizes
   * the requested grant without rechecking the resulting masked mode. Revision guards apply to existing
   * object identity; slot conditions apply to the named slot. Reserve the input plus complete resulting
   * file before publication. Empty input still applies creation and replacement policies.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  WriteFileOptions,
  /**
   * All-or-failure write with an optional object revision. Positioned append writes are invalid.
   *
   * @stability experimental
   * @category models
   * @since 4.1.0
   */
  WriteOptions
} from "./internal/model.ts"

/**
 * Constructs an empty filesystem with finite limits.
 *
 * **Details**
 *
 * The returned Owner has no Scope requirement. Its `authorize` method acquires a caller in the current Scope.
 * Credentials require an explicit uid and gid. uid zero has no implicit privilege, and construction creates
 * only the root directory. Construction captures the current Clock, using Effect's default clock unless
 * one is provided. All four root timestamps use one sample of that clock.
 *
 * **Example** (Writing through a scoped caller)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { VirtualFileSystem } from "effect/virtual-file-system"
 *
 * const program = Effect.scoped(Effect.gen(function*() {
 *   const owner = yield* VirtualFileSystem.make()
 *   const caller = yield* owner.authorize({ credentials: { uid: 0, gid: 0 } })
 *   yield* caller.writeFile("/hello.txt", new TextEncoder().encode("Hello"))
 *   return new TextDecoder().decode(yield* caller.readFile("/hello.txt"))
 * }))
 *
 * await Effect.runPromise(program) // => "Hello"
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.0
 */
export const make: (
  configuration?: M.Configuration
) => Effect.Effect<M.Owner, M.VirtualFileSystemError> = Effect.fnUntraced(
  function*(configuration) {
    const clock = yield* Clock.Clock
    return yield* R.evaluate(() => {
      E.checkOptions(configuration, ["limits", "root"], "make")
      const limits = R.configure(configuration?.limits)
      E.checkOptions(configuration?.root, ["uid", "gid", "mode"], "make")
      const root = {
        uid: E.identity(configuration?.root?.uid ?? 0, "make", "uid"),
        gid: E.identity(configuration?.root?.gid ?? 0, "make", "gid"),
        mode: E.mode(configuration?.root?.mode ?? DEFAULT_ROOT_MODE, "directory", "make")
      }
      return ownerFor(new E.Engine(new R.Runtime(limits, clock), root))
    })
  }
)

/**
 * Restores a fresh filesystem from an independent capture or a stream of capture records.
 *
 * **Details**
 *
 * Records may arrive in any order, including aliases before their targets and a root after its children.
 * Restore requires one connected acyclic directory graph and rejects excess fields, duplicate identifiers
 * and directory aliases. Dangling symlinks and cyclic symlink targets remain valid.
 *
 * Object numbers, ownership, modes and exact timestamps are preserved. The restored instance receives fresh
 * identity tokens and a distinct instance number. Every mutable input record is copied before the next pull,
 * and producer finalization completes before Owner delivery. Producer failures and cleanup defects retain
 * their Effect Cause. Construction captures the current Clock, using Effect's default clock unless one
 * is provided.
 *
 * **Example** (Restoring after the source caller closes)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { VirtualFileSystem } from "effect/virtual-file-system"
 *
 * const snapshot = await Effect.runPromise(
 *   Effect.scoped(Effect.gen(function*() {
 *     const owner = yield* VirtualFileSystem.make()
 *     const caller = yield* owner.authorize({ credentials: { uid: 0, gid: 0 } })
 *     yield* caller.writeFile("/saved", new Uint8Array([1, 2, 3]))
 *     return yield* owner.capture()
 *   }))
 * )
 *
 * const restored = Effect.scoped(Effect.gen(function*() {
 *   const owner = yield* VirtualFileSystem.restore(snapshot)
 *   const caller = yield* owner.authorize({ credentials: { uid: 0, gid: 0 } })
 *   return Array.from(yield* caller.readFile("/saved"))
 * }))
 *
 * await Effect.runPromise(restored) // => [1, 2, 3]
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.0
 */
export const restore = <Error = never, Services = never>(
  source: M.Capture | Stream.Stream<M.CaptureRecord, Error, Services>,
  options?: M.RestoreOptions
): Effect.Effect<M.Owner, M.VirtualFileSystemError | Error, Services | Clock.Clock> =>
  Effect.map(C.restoreEngine(source, options), ownerFor)

/**
 * Creates independent filesystem state and provides its scoped caller as the VirtualFileSystem service.
 *
 * **Details**
 *
 * Caller credentials are required. The layer exposes no Owner, and its Scope releases the caller. Normal
 * Effect layer memoization applies when the same layer is shared. Construction captures the current Clock,
 * using Effect's default clock unless one is provided.
 *
 * **Example** (Providing a filesystem service)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { VirtualFileSystem } from "effect/virtual-file-system"
 *
 * const files = VirtualFileSystem.layer({ caller: { credentials: { uid: 0, gid: 0 } } })
 * const program = Effect.gen(function*() {
 *   const caller = yield* VirtualFileSystem.VirtualFileSystem
 *   yield* caller.writeFile("/value", new Uint8Array([7]))
 *   return Array.from(yield* caller.readFile("/value"))
 * }).pipe(Effect.provide(files))
 *
 * await Effect.runPromise(program) // => [7]
 * ```
 *
 * @stability experimental
 * @category layers
 * @since 4.1.0
 */
export const layer = (
  configuration: M.Configuration & { readonly caller: M.CallerOptions }
): Layer.Layer<M.VirtualFileSystem, M.VirtualFileSystemError> =>
  Layer.effect(
    M.VirtualFileSystem,
    Effect.gen(function*() {
      const owner = yield* make({
        ...(configuration.limits === undefined ? {} : { limits: configuration.limits }),
        ...(configuration.root === undefined ? {} : { root: configuration.root })
      })
      return yield* owner.authorize(configuration.caller)
    })
  )

/**
 * Provides an existing caller with its original lifetime and acquired authority.
 *
 * **Details**
 *
 * The layer borrows the caller. Providing or releasing this layer does not create another caller, extend its
 * Scope or close it early. The original caller remains usable until its own Scope closes.
 *
 * **Example** (Borrowing an existing caller)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { VirtualFileSystem } from "effect/virtual-file-system"
 *
 * const program = Effect.scoped(Effect.gen(function*() {
 *   const owner = yield* VirtualFileSystem.make()
 *   const caller = yield* owner.authorize({ credentials: { uid: 0, gid: 0 } })
 *   yield* Effect.gen(function*() {
 *     const provided = yield* VirtualFileSystem.VirtualFileSystem
 *     yield* provided.writeFile("/shared", new Uint8Array([9]))
 *   }).pipe(Effect.provide(VirtualFileSystem.layerCaller(caller)))
 *   return Array.from(yield* caller.readFile("/shared"))
 * }))
 *
 * await Effect.runPromise(program) // => [9]
 * ```
 *
 * @stability experimental
 * @category layers
 * @since 4.1.0
 */
export const layerCaller = (caller: M.VirtualFileSystem): Layer.Layer<M.VirtualFileSystem> =>
  Layer.succeed(M.VirtualFileSystem, caller)

const simple = <Target extends M.Target, Value>(
  caller: E.Caller,
  operation: string,
  target: Target,
  body: (tx: E.Transaction, target: E.TargetSnapshot<Target>) => Value
): Effect.Effect<Value, M.OperationError> =>
  E.runAtomic(caller, operation, [target], () => {}, () => {
    const copy = E.snapshotTarget(target)
    return (tx) => body(tx, copy)
  })

const withOptions = <Target extends M.Target, Operation extends A.Operation, Value>(
  caller: E.Caller,
  operation: Operation,
  target: Target,
  options: A.OptionsByOperation[Operation],
  body: (tx: E.Transaction, target: E.TargetSnapshot<Target>, options: A.OptionsByOperation[Operation]) => Value
): Effect.Effect<Value, M.OperationError> =>
  E.runAtomic(caller, operation, [target], () => A.validate(operation, options), () => {
    const copy = E.snapshotTarget(target)
    const fixed = P.snapshotOptions[operation](options)
    return (tx) => body(tx, copy, fixed)
  })

const write = <Target extends M.Target, Operation extends "writeFile" | "publishCopiedFile", Value>(
  caller: E.Caller,
  operation: Operation,
  target: Target,
  input: Uint8Array,
  options: A.OptionsByOperation[Operation],
  body: (
    tx: E.Transaction,
    target: E.TargetSnapshot<Target>,
    input: Uint8Array,
    options: A.OptionsByOperation[Operation]
  ) => Value
): Effect.Effect<Value, M.OperationError> =>
  E.runAtomic(caller, operation, [target], () => {
    A.validate(operation, options)
    P.inputLength(input, operation, caller.runtime.limits)
  }, (work) => {
    const targetCopy = E.snapshotTarget(target)
    const fixed = P.snapshotOptions[operation](options)
    const bytes = P.snapshotInput(work, input)
    return (tx) => body(tx, targetCopy, bytes, fixed)
  })

const U32 = Schema.Number.check(Schema.isUint32())

const Umask = Schema.Number.check(Schema.isInt(), Schema.isBetween({ minimum: 0, maximum: 0o777 }))

const credentials = (
  options: M.CallerOptions,
  operation: string
): Omit<E.Policy, "root" | "cwd" | "boundaries"> => {
  E.checkOptions(options, ["credentials", "umask", "root", "cwd"], operation)
  const input = options?.credentials
  E.checkOptions(input, ["uid", "gid", "supplementaryGroups", "privileged"], operation)
  const uid = E.identity(input?.uid, operation, "uid")
  const gid = E.identity(input?.gid, operation, "gid")
  if (input.privileged !== undefined && !Schema.is(Schema.Boolean)(input.privileged)) {
    return R.invalid(operation, "privileged")
  }
  const groups = input.supplementaryGroups ?? []
  if (!Schema.is(Schema.Array(U32))(groups)) return R.invalid(operation, "supplementaryGroups")
  const umask = options.umask ?? DEFAULT_UMASK
  if (!Schema.is(Umask)(umask)) return R.invalid(operation, "umask", "range")
  return { uid, gid, groups, privileged: input.privileged ?? false, umask }
}

const makeCaller = (caller: E.Caller): M.VirtualFileSystem => {
  const value: M.VirtualFileSystem = {
    [M.CallerTypeId]: M.CallerTypeId,
    instanceNumber: caller.runtime.instanceNumber,
    inputLimits: caller.inputLimits,
    lookup: (target) => R.readOnly(simple(caller, "lookup", target, A.lookup)),
    stat: (target) => R.readOnly(simple(caller, "stat", target, A.stat)),
    linkStat: (target) => R.readOnly(simple(caller, "linkStat", target, A.linkStat)),
    access: (target, options) => R.readOnly(withOptions(caller, "access", target, options, A.access)),
    observeEntry: (address) => R.readOnly(simple(caller, "observeEntry", address, A.observeEntry)),
    observeRouteParent: (path) => R.readOnly(simple(caller, "observeRouteParent", path, A.observeRouteParent)),
    realPath: (path) => R.readOnly(simple(caller, "realPath", path, A.realPath)),
    readFile: (target) => R.readOnly(simple(caller, "readFile", target, A.readFile)),
    readFileObserved: (target) => R.readOnly(simple(caller, "readFileObserved", target, A.readFileObserved)),
    readLink: (target) => R.readOnly(simple(caller, "readLink", target, A.readLink)),
    readLinkObserved: (target) => R.readOnly(simple(caller, "readLinkObserved", target, A.readLinkObserved)),
    readDirectory: (target) => R.readOnly(simple(caller, "readDirectory", target, A.readDirectory)),
    readDirectoryEntries: (target) =>
      R.readOnly(simple(caller, "readDirectoryEntries", target, A.readDirectoryEntries)),
    writeFile: (target: M.Target, data: Uint8Array, options?: M.WriteFileOptions) =>
      write(caller, "writeFile", target, data, options, A.writeFile),
    truncate: (target, length, options) =>
      E.runAtomic(caller, "truncate", [target], () => {
        A.validate("truncate", options)
        R.size(length, "truncate", "length")
      }, () => {
        const fixed = P.snapshotOptions.truncate(options)
        const copy = E.snapshotTarget(target)
        const amount = length
        return (tx) => A.truncate(tx, copy, amount, fixed)
      }),
    setAttributes: (target, attributes, options) =>
      E.runAtomic(caller, "setAttributes", [target], () => {
        A.validate("setAttributes", options)
        A.validateAttributes(attributes, "setAttributes")
      }, () => {
        const fixed = P.snapshotOptions.setAttributes(options)
        const attrs = P.snapshotAttributes(attributes, "setAttributes")
        const copy = E.snapshotTarget(target)
        return (tx) => A.setAttributes(tx, copy, attrs, fixed)
      }),
    createFile: (target, options) => withOptions(caller, "createFile", target, options, A.createFile),
    makeDirectory: (target, options) => withOptions(caller, "makeDirectory", target, options, A.makeDirectory),
    makeDirectoryEntry: (target, options) =>
      withOptions(caller, "makeDirectoryEntry", target, options, A.makeDirectoryEntry),
    makeSymlink: (target, linkTarget, options) =>
      E.runAtomic(caller, "makeSymlink", [target, linkTarget], () => A.validate("makeSymlink", options), () => {
        const copy = E.snapshotTarget(target)
        const link = E.pathValue(linkTarget, "makeSymlink")
        const fixed = P.snapshotOptions.makeSymlink(options)
        return (tx) => A.makeSymlink(tx, copy, link, fixed)
      }),
    makeHardLink: (source, destination, options) =>
      E.runAtomic(
        caller,
        "makeHardLink",
        () => ["reference" in source ? source.reference : source.entry, destination],
        () => {
          if (source === null || typeof source !== "object") R.invalid("makeHardLink", "source")
          E.checkOptions(source, "reference" in source ? ["reference"] : ["entry", "conditions"], "makeHardLink")
          A.validate("makeHardLink", options)
        },
        () => {
          const fixedSource = P.snapshotHardLinkSource(source)
          const fixed = P.snapshotOptions.makeHardLink(options)
          const target = E.snapshotTarget(destination)
          return (tx) => A.makeHardLink(tx, fixedSource, target, fixed)
        }
      ),
    rename: (source, destination, options) =>
      E.runAtomic(caller, "rename", [source, destination], () => A.validate("rename", options), () => {
        const from = E.snapshotTarget(source)
        const to = E.snapshotTarget(destination)
        const fixed = P.snapshotOptions.rename(options)
        return (tx) => A.rename(tx, from, to, fixed)
      }),
    unlink: (target, options) => withOptions(caller, "unlink", target, options, A.unlink),
    removeDirectory: (target, options) => withOptions(caller, "removeDirectory", target, options, A.removeDirectory),
    open: (target: M.Target, options?: M.OpenOptions) => H.open(caller, target, options),
    openDirectory: (target) => H.openDirectory(caller, target),
    withRoot: (directory) => derive(caller, directory, true),
    withCurrentDirectory: (directory) => derive(caller, directory, false),
    removeRecursive: (target, options) => W.removeRecursive(caller, target, options),
    walk: (target, options) => W.walk(caller, target, options),
    publishCopiedFile: (destination, data, options) =>
      write(caller, "publishCopiedFile", destination, data, options, A.publishCopiedFile),
    publishCopiedSymlink: (destination, target, options) =>
      E.runAtomic(
        caller,
        "publishCopiedSymlink",
        [destination, target],
        () => A.validate("publishCopiedSymlink", options),
        () => {
          const copy = E.snapshotTarget(destination)
          const fixed = P.snapshotOptions.publishCopiedSymlink(options)
          const link = target
          return (tx) => A.publishCopiedSymlink(tx, copy, link, fixed)
        }
      ),
    acquireOperation: (options) => O.acquireOperation(caller, options),
    acquireTraversal: (options) => O.acquireTraversal(caller, options),
    acquireSync: S.acquireSync(caller)
  }
  E.callers.set(value, caller)
  return Object.freeze(value)
}

const derive = Effect.fnUntraced(
  function*(
    source: E.Caller,
    directory: M.DirectorySelector,
    narrow: boolean
  ): Effect.fn.Return<M.VirtualFileSystem, M.OperationError, Scope.Scope> {
    const scope = yield* Scope.Scope

    return yield* source.runtime.run(source.resource, narrow ? "withRoot" : "withCurrentDirectory", () => ({
      bytes: E.addressBytes(directory, "derive", source.runtime.limits),
      snapshot: (work) => {
        const acquired = work.acquireResource("caller")
        const fixed = directory

        return {
          enroll: acquired.enroll(scope, "derive"),
          execute: () => {
            if (acquired.state !== "open") throw R.closed("derive", acquired.state)

            const tx = new E.Transaction(source, work)
            const dir = tx.selectDirectory(fixed)

            if (!tx.contained(dir.id, source.policy.root)) {
              throw new M.AccessDenied({ operation: "derive", reason: "confinement" })
            }

            const policy: E.Policy = narrow
              ? {
                ...source.policy,
                root: dir.id,
                cwd: dir.id,
                boundaries: Object.freeze([...source.policy.boundaries, source.policy.root])
              }
              : { ...source.policy, cwd: dir.id }
            const caller = E.createCaller(tx.engine, policy, acquired)
            const value = makeCaller(caller)

            tx.stageCallerRetention(caller)

            return tx.transition(value)
          }
        }
      }
    }))
  }
)

const ownerFor = (engine: E.Engine): M.Owner => {
  const ownerResource = engine.runtime.resource("lease", "owner")
  const authorityContext = {
    runtime: engine.runtime,
    inputLimits: engine.inputLimits,
    engineCell: ownerResource.retainContext(engine),
    resource: ownerResource
  }
  const owner: M.Owner = {
    [M.OwnerTypeId]: M.OwnerTypeId,
    limits: engine.runtime.limits,
    usage: Effect.sync(() => engine.usage()),
    capture: () => C.capture(engine),
    authorize: Effect.fnUntraced(function*(options: M.CallerOptions) {
      const scope = yield* Scope.Scope

      return yield* engine.runtime.run(ownerResource, "authorize", () => {
        const validated = credentials(options, "authorize")
        const targets = [options.root, options.cwd].filter((target): target is M.DirectorySelector =>
          target !== undefined
        )

        return {
          bytes: targets.reduce(
            (sum, target) => sum + E.addressBytes(target, "authorize", engine.runtime.limits),
            BigInt("0")
          ),
          snapshot: (work) => {
            const base = { ...validated, groups: Object.freeze(validated.groups.slice()) }
            const acquired = work.acquireResource("caller")
            const rootSelector = options.root
            const cwdSelector = options.cwd
            // NOTE: Owner privilege resolves the initial root and cwd. The delivered caller uses the supplied credentials.
            const ownerPolicy: E.Policy = {
              ...base,
              privileged: true,
              root: engine.root,
              cwd: engine.root,
              boundaries: []
            }

            return {
              enroll: acquired.enroll(scope, "authorize"),
              execute: () => {
                if (acquired.state !== "open") throw R.closed("authorize", acquired.state)

                const authority: E.Caller = { ...authorityContext, policy: ownerPolicy }
                const tx = new E.Transaction(authority, work)
                const root = rootSelector === undefined ? engine.root : tx.selectDirectory(rootSelector).id
                const initial: E.Policy = { ...ownerPolicy, root, cwd: root }
                const restricted = new E.Transaction({ ...authority, policy: initial }, work)
                const cwd = cwdSelector === undefined ? root : restricted.selectDirectory(cwdSelector).id

                if (!restricted.contained(cwd, root)) {
                  throw new M.AccessDenied({ operation: "authorize", reason: "confinement" })
                }

                const policy: E.Policy = { ...base, root, cwd, boundaries: [] }
                const caller = E.createCaller(engine, policy, acquired)

                tx.stageCallerRetention(caller)

                return tx.transition(makeCaller(caller))
              }
            }
          }
        }
      })
    })
  }

  return Object.freeze(owner)
}
