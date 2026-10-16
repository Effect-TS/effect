import { ProtoFile } from "@effect/protobuf"
import { assert, describe, it } from "@effect/vitest"
import { execFileSync } from "node:child_process"
import * as Fs from "node:fs"
import * as Os from "node:os"
import * as Path from "node:path"
import { expect } from "vitest"
import { PointService, Scalars, Shapes, TreeNode, WellKnown } from "./fixtures/schemas.ts"

const buf = Path.join(import.meta.dirname, "..", "node_modules", ".bin", "buf")

describe("ProtoFile", () => {
  it("renders schema-first definitions to a .proto file that buf compiles", async () => {
    const source = ProtoFile.make({
      package: "acme.v1",
      messages: [Scalars, Shapes, WellKnown, TreeNode],
      services: [PointService]
    })
    await expect(source).toMatchFileSnapshot("./__snapshots__/kitchen_sink.from-schema.proto")

    const dir = Fs.mkdtempSync(Path.join(Os.tmpdir(), "effect-protobuf-"))
    Fs.mkdirSync(Path.join(dir, "acme", "v1"), { recursive: true })
    Fs.writeFileSync(Path.join(dir, "acme", "v1", "kitchen_sink.proto"), source)
    Fs.writeFileSync(Path.join(dir, "buf.yaml"), "version: v2\n")
    // throws (with buf's diagnostics) when the file does not compile
    execFileSync(buf, ["build", dir, "-o", Path.join(dir, "out.binpb")], { stdio: "pipe" })
    assert.isTrue(Fs.statSync(Path.join(dir, "out.binpb")).size > 0)
  })
})
