import type { BytePath, Effect, Layer, Option, Result, Scope, Stream } from "effect"
import * as VFS from "effect/virtual-file-system/VirtualFileSystem"
import { describe, expect, it } from "tstyche"

declare const caller: VFS.VirtualFileSystem
declare const reference: VFS.ObjectReference
declare const address: VFS.EntryAddress
declare const bytes: Uint8Array
declare const sync: VFS.SyncFileSystem
declare const file: VFS.FileHandle
declare const observation: VFS.ObjectObservation
declare const entry: VFS.EntryObservation
declare const capture: VFS.CaptureRecord
declare const candidate: unknown
declare const snapshot: VFS.Capture
declare const records: Stream.Stream<VFS.CaptureRecord, "producer failure", RecordProducer>

interface RecordProducer {
  readonly RecordProducer: unique symbol
}

describe("VirtualFileSystem model", () => {
  it("should construct and restore without requiring Clock provision", () => {
    expect(VFS.make()).type.toBe<Effect.Effect<VFS.Owner, VFS.VirtualFileSystemError>>()
    expect(VFS.restore(snapshot)).type.toBe<Effect.Effect<VFS.Owner, VFS.VirtualFileSystemError>>()
    expect(VFS.layer({ caller: { credentials: { uid: 0, gid: 0 } } })).type.toBe<
      Layer.Layer<VFS.VirtualFileSystem, VFS.VirtualFileSystemError>
    >()
  })

  it("should preserve the producer's failures and required services when restoring records", () => {
    expect(VFS.restore(records)).type.toBe<
      Effect.Effect<VFS.Owner, VFS.VirtualFileSystemError | "producer failure", RecordProducer>
    >()
  })

  it("should preserve access and creation choices in public option types", () => {
    expect<Pick<VFS.OpenOptions, "access" | "create">>().type.toBe<{
      readonly access?: "read" | "write" | "readwrite" | undefined
      readonly create?: "existing" | "ifmissing" | "exclusive" | undefined
    }>()
    expect<Pick<VFS.WriteFileOptions, "access" | "create">>().type.toBe<{
      readonly access?: "write" | "readwrite" | undefined
      readonly create?: "existing" | "ifmissing" | "exclusive" | undefined
    }>()
    expect<Pick<VFS.ReferenceOpenOptions, "create">>().type.toBe<{
      readonly create?: "existing" | undefined
    }>()
    expect<Pick<VFS.ReferenceWriteFileOptions, "create">>().type.toBe<{
      readonly create?: "existing" | undefined
    }>()
    expect(caller.writeFile).type.toBeCallableWith(address, bytes, { access: "readwrite", create: "exclusive" })
    expect(caller.writeFile).type.not.toBeCallableWith(address, bytes, { access: "read" })
  })

  it("should reject named-slot options when a reference selector is supplied", () => {
    expect(caller.open).type.toBeCallableWith(reference, { create: "existing", truncate: true })
    expect(caller.open).type.not.toBeCallableWith(reference, { create: "exclusive" })
    expect(caller.open).type.not.toBeCallableWith(reference, { mode: 0o644 })
    expect(caller.open).type.not.toBeCallableWith(reference, { conditions: {} })
    expect(caller.open).type.toBeCallableWith(address, {
      create: "exclusive",
      conditions: { entry: { expected: "absent" } }
    })
    expect(caller.open).type.not.toBeCallableWith("/file", { conditions: {} })
    expect(caller.writeFile).type.not.toBeCallableWith(reference, bytes, { create: "ifmissing" })
    expect(caller.writeFile).type.not.toBeCallableWith("/file", bytes, { conditions: {} })
    expect(caller.writeFile).type.toBeCallableWith(address, bytes, { conditions: { entry: { expected: "absent" } } })
  })

  it("should require Scope when a caller acquires an independent resource", () => {
    expect(caller.open(reference)).type.toBe<Effect.Effect<VFS.FileHandle, VFS.OperationError, Scope.Scope>>()
    expect(caller.openDirectory(reference)).type.toBe<
      Effect.Effect<VFS.DirectoryHandle, VFS.OperationError, Scope.Scope>
    >()
    expect(caller.acquireOperation()).type.toBe<Effect.Effect<VFS.OperationSession, VFS.OperationError, Scope.Scope>>()
    expect(caller.acquireSync).type.toBe<Effect.Effect<VFS.SyncFileSystem, VFS.OperationError, Scope.Scope>>()
    expect(caller.stat(reference)).type.toBe<Effect.Effect<VFS.ObjectObservation, VFS.ReadError>>()
    expect(caller.observeRouteParent("/file")).type.toBe<
      Effect.Effect<Option.Option<VFS.PresentEntry>, VFS.ReadError>
    >()
    expect(file.sync()).type.toBe<Effect.Effect<VFS.SyncFileHandle, VFS.OperationError>>()
  })

  it("should preserve Result errors when synchronous overloads are called", () => {
    expect(sync.stat(reference)).type.toBe<Result.Result<VFS.ObjectObservation, VFS.ReadError>>()
    expect(sync.realPath("/file")).type.toBe<Result.Result<BytePath.BytePath, VFS.ReadError>>()
    expect(sync.open(reference)).type.toBe<Result.Result<VFS.SyncFileHandle, VFS.OperationError>>()
    expect(sync.open).type.not.toBeCallableWith(reference, { create: "exclusive" })
    expect(sync.open).type.not.toBeCallableWith("/file", { conditions: {} })
    expect(sync.writeFile).type.toBeCallableWith(address, bytes, { conditions: { entry: { expected: "absent" } } })
  })

  it("should preserve object variants when using observation cases, guards, and exhaustive matching", () => {
    expect<typeof VFS.ObjectObservation.cases.directory["Type"]>().type.toBe<VFS.DirectoryObservation>()
    if (VFS.ObjectObservation.guards.file(candidate)) {
      expect(candidate).type.toBe<Extract<VFS.ObjectObservation, { readonly kind: "file" }>>()
      expect(candidate).type.not.toHaveProperty("namespaceRevision")
    }
    if (VFS.ObjectObservation.guards.directory(candidate)) {
      expect(candidate).type.toBe<VFS.DirectoryObservation>()
      expect(candidate.namespaceRevision).type.toBe<VFS.NamespaceRevision>()
    }
    expect(VFS.ObjectObservation.match(observation, {
      file: (value) => value.metadata.kind,
      directory: (value) => value.metadata.kind,
      symlink: (value) => value.metadata.kind
    })).type.toBe<"file" | "directory" | "symlink">()
    expect(VFS.ObjectObservation.match).type.not.toBeCallableWith(observation, {
      file: () => 0,
      directory: () => 0
    })
  })

  it("should preserve entry presence when using cases, guards, and exhaustive matching", () => {
    expect<typeof VFS.EntryObservation.cases.present["Type"]>().type.toBe<VFS.PresentEntry>()
    if (VFS.EntryObservation.guards.present(candidate)) {
      expect(candidate).type.toBe<VFS.PresentEntry>()
      expect(candidate.binding).type.toBe<VFS.EntryBinding>()
    }
    if (VFS.EntryObservation.guards.absent(candidate)) {
      expect(candidate).type.not.toHaveProperty("object")
    }
    expect(VFS.EntryObservation.match(entry, {
      absent: () => undefined,
      present: (value) => value.binding
    })).type.toBe<VFS.EntryBinding | undefined>()
    expect(VFS.EntryObservation.match).type.not.toBeCallableWith(entry, { present: () => 0 })
  })

  it("should preserve capture payloads when using cases, guards, and exhaustive matching", () => {
    expect<typeof VFS.CaptureRecord.cases.file>().type.toBe<typeof VFS.FileRecord>()
    if (VFS.CaptureRecord.guards.file(candidate)) {
      expect(candidate).type.toBe<VFS.FileRecord>()
      expect(candidate.data).type.toBe<Uint8Array>()
    }
    expect(VFS.CaptureRecord.match(capture, {
      root: (value) => value.id,
      directory: (value) => value.parentId,
      file: (value) => value.data,
      symlink: (value) => value.target,
      alias: (value) => value.targetId
    })).type.toBe<bigint | Uint8Array | BytePath.BytePath>()
    expect(VFS.CaptureRecord.match).type.not.toBeCallableWith(capture, {
      root: () => 0,
      directory: () => 0,
      file: () => 0,
      symlink: () => 0
    })
  })

  it("should distinguish authority and observation variants when consumer code narrows their types", () => {
    if (observation.kind === "directory") {
      expect(observation.metadata.kind).type.toBe<"directory">()
      expect(observation.namespaceRevision).type.toBe<VFS.NamespaceRevision>()
    }
    if (observation.kind === "file") {
      expect(observation.metadata.kind).type.toBe<"file">()
      expect(observation).type.not.toHaveProperty("namespaceRevision")
    }
    expect<VFS.ObjectReference>().type.not.toBeAssignableTo<VFS.EntryBinding>()
    expect<VFS.ObjectRevision>().type.not.toBeAssignableTo<VFS.NamespaceRevision>()
    expect<VFS.VirtualFileSystem>().type.not.toBeAssignableTo<VFS.Owner>()
    expect<VFS.FileHandle>().type.not.toBeAssignableTo<VFS.DirectoryHandle>()
  })
  it("should accept undefined settings when optional fields allow them", () => {
    expect({ uid: 0, gid: 0, supplementaryGroups: undefined, privileged: undefined }).type.toBeAssignableTo<
      VFS.Credentials
    >()
    expect({ credentials: { uid: 0, gid: 0 }, root: undefined, cwd: undefined, umask: undefined }).type
      .toBeAssignableTo<VFS.CallerOptions>()
    expect({ root: undefined, limits: undefined }).type.toBeAssignableTo<VFS.Configuration>()
    expect(caller.open).type.toBeCallableWith(reference, { create: undefined, truncate: undefined })
    expect(caller.open).type.not.toBeCallableWith(reference, { mode: undefined })
    expect(caller.writeFile).type.not.toBeCallableWith(reference, bytes, { conditions: undefined })
  })
})
