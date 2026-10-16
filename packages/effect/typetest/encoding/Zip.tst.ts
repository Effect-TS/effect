import { Stream } from "effect"
import * as Zip from "effect/encoding/Zip"
import { describe, expect, it } from "tstyche"

describe("Zip", () => {
  it("encode infers body errors and services from a union of entries", () => {
    const entries = Stream.make(
      Zip.fileStream("a", Stream.fail("A") as Stream.Stream<Uint8Array, "A", "ServiceA">),
      Zip.fileStream("b", Stream.fail("B") as Stream.Stream<Uint8Array, "B", "ServiceB">, { method: "Store" }),
      Zip.file("c", "c")
    )

    expect(entries.pipe(Stream.pipeThroughChannel(Zip.encode()))).type.toBe<
      Stream.Stream<Uint8Array, Zip.ZipError | "A" | "B", "ServiceA" | "ServiceB">
    >()
  })

  it("decode adds upstream errors to entry bodies", () => {
    const bytes = Stream.fail("Io") as Stream.Stream<Uint8Array, "Io">

    expect(bytes.pipe(Stream.pipeThroughChannel(Zip.decode()))).type.toBe<
      Stream.Stream<Zip.Entry<Zip.ZipError | "Io">, Zip.ZipError | "Io">
    >()
  })
})
