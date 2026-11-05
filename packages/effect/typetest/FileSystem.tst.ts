import type { ByteSize, Context, Layer, PlatformError } from "effect"
import { Effect, FileSystem } from "effect"
import { describe, expect, it } from "tstyche"

describe("FileSystem", () => {
  it("uses numbers for buffer sizes and ByteSize for logical file sizes", () => {
    expect<FileSystem.File.Info["size"]>().type.toBe<ByteSize.ByteSize>()
    expect<Parameters<FileSystem.File["readAlloc"]>[0]>().type.toBe<number>()
    expect<NonNullable<Parameters<FileSystem.Shape["stream"]>[1]>["chunkSize"]>().type.toBe<
      number | undefined
    >()
    expect<Parameters<FileSystem.File["truncate"]>[0]>().type.toBe<number | undefined>()
    expect<Parameters<FileSystem.File["seek"]>[0]>().type.toBe<bigint>()
    expect<ReturnType<FileSystem.File["seek"]>>().type.toBe<Effect.Effect<bigint, PlatformError.PlatformError>>()
    expect<Effect.Success<ReturnType<FileSystem.File["read"]>>>().type.toBe<number>()
    expect<Effect.Success<ReturnType<FileSystem.File["write"]>>>().type.toBe<number>()
  })

  it("is the union of its operations' keys, satisfied by the merge of their layers", () => {
    expect<FileSystem.FileSystem>().type.toBe<
      | "effect/FileSystem/access"
      | "effect/FileSystem/copy"
      | "effect/FileSystem/copyFile"
      | "effect/FileSystem/chmod"
      | "effect/FileSystem/chown"
      | "effect/FileSystem/glob"
      | "effect/FileSystem/exists"
      | "effect/FileSystem/link"
      | "effect/FileSystem/lstat"
      | "effect/FileSystem/makeDirectory"
      | "effect/FileSystem/makeTempDirectory"
      | "effect/FileSystem/makeTempDirectoryScoped"
      | "effect/FileSystem/makeTempFile"
      | "effect/FileSystem/makeTempFileScoped"
      | "effect/FileSystem/open"
      | "effect/FileSystem/readDirectory"
      | "effect/FileSystem/readDirectoryEntries"
      | "effect/FileSystem/readFile"
      | "effect/FileSystem/readFileString"
      | "effect/FileSystem/readLink"
      | "effect/FileSystem/realPath"
      | "effect/FileSystem/remove"
      | "effect/FileSystem/rename"
      | "effect/FileSystem/sink"
      | "effect/FileSystem/stat"
      | "effect/FileSystem/stream"
      | "effect/FileSystem/symlink"
      | "effect/FileSystem/truncate"
      | "effect/FileSystem/utimes"
      | "effect/FileSystem/watch"
      | "effect/FileSystem/writeFile"
      | "effect/FileSystem/writeFileString"
    >()
    expect<Context.Service.Identifier<typeof FileSystem.FileSystem>>().type.toBe<FileSystem.FileSystem>()
    expect<Context.Service.Shape<typeof FileSystem.FileSystem>>().type.toBe<FileSystem.Shape>()
    // the merge of every operation's layer is a layer of the record; a merge of some is not
    const all = null as unknown as Layer.Layer<FileSystem.FileSystem>
    const some = null as unknown as Layer.Layer<"effect/FileSystem/readFile" | "effect/FileSystem/writeFile">
    expect(some).type.not.toBeAssignableTo<Layer.Layer<FileSystem.FileSystem>>()
    expect(all).type.toBeAssignableTo<Layer.Layer<"effect/FileSystem/readFile" | "effect/FileSystem/writeFile">>()
    // an operation call names its key, and a layer of the record satisfies it
    const call = null as unknown as ReturnType<typeof FileSystem.readFile>
    expect(call).type.toBe<Effect.Effect<Uint8Array, PlatformError.PlatformError, "effect/FileSystem/readFile">>()
    const record = null as unknown as Layer.Layer<FileSystem.FileSystem>
    expect(call.pipe(Effect.provide(record))).type.toBe<Effect.Effect<Uint8Array, PlatformError.PlatformError>>()
  })

  it("names ReadOnly as the subset of the ten reading operations", () => {
    const readOnly = null as unknown as Layer.Layer<FileSystem.ReadOnly>
    const record = null as unknown as Layer.Layer<FileSystem.FileSystem>
    // the full record satisfies the subset; the subset does not satisfy the full record
    expect(record).type.toBeAssignableTo<Layer.Layer<FileSystem.ReadOnly>>()
    expect(readOnly).type.not.toBeAssignableTo<Layer.Layer<FileSystem.FileSystem>>()
    // the subset satisfies its members
    expect(FileSystem.stat("a").pipe(Effect.provide(readOnly))).type.toBe<
      Effect.Effect<FileSystem.File.Info, PlatformError.PlatformError>
    >()
    expect(FileSystem.writeFile("a", new Uint8Array()).pipe(Effect.provide(readOnly))).type.toBe<
      Effect.Effect<void, PlatformError.PlatformError, "effect/FileSystem/writeFile">
    >()
    expect<FileSystem.ReadOnlyShape>().type.toBe<
      Pick<
        FileSystem.Shape,
        | "access"
        | "exists"
        | "lstat"
        | "readDirectory"
        | "readDirectoryEntries"
        | "readFile"
        | "readFileString"
        | "readLink"
        | "realPath"
        | "stat"
      >
    >()
  })
})
