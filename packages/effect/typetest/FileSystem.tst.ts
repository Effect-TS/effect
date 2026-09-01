import type { ByteSize, Effect, FileSystem, PlatformError } from "effect"
import { describe, expect, it } from "tstyche"

describe("FileSystem", () => {
  it("uses ByteSize inputs for byte counts and bigint for seek offsets", () => {
    expect<FileSystem.File.Info["size"]>().type.toBe<ByteSize.ByteSize>()
    expect<Parameters<FileSystem.File["readAlloc"]>[0]>().type.toBe<ByteSize.Input>()
    expect<Parameters<FileSystem.File["truncate"]>[0]>().type.toBe<ByteSize.Input | undefined>()
    expect<Parameters<FileSystem.File["seek"]>[0]>().type.toBe<bigint>()
    expect<Effect.Success<ReturnType<FileSystem.File["seek"]>>>().type.toBe<ByteSize.ByteSize>()
    expect<Effect.Error<ReturnType<FileSystem.File["seek"]>>>().type.toBe<PlatformError.PlatformError>()
    expect<Effect.Success<ReturnType<FileSystem.File["read"]>>>().type.toBe<ByteSize.ByteSize>()
    expect<Effect.Success<ReturnType<FileSystem.File["write"]>>>().type.toBe<ByteSize.ByteSize>()
  })
})
