import type { BytePath, Effect, Option, Result, Scope } from "effect"
import type * as VFS from "effect/virtual-file-system/VirtualFileSystem"
import { describe, expect, it } from "tstyche"

declare const caller: VFS.VirtualFileSystem
declare const reference: VFS.ObjectReference
declare const address: VFS.EntryAddress
declare const bytes: Uint8Array
declare const sync: VFS.SyncFileSystem
declare const file: VFS.FileHandle
declare const observation: VFS.ObjectObservation

describe("VirtualFileSystem model", () => {
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
