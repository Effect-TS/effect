import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as NodeHttpPlatform from "@effect/platform-node/NodeHttpPlatform"
import * as NodePath from "@effect/platform-node/NodePath"
import { HttpRouter, HttpStaticServer } from "effect/http"
import * as Layer from "effect/Layer"
import { strict as assert } from "node:assert"

const root = process.argv[2]
const range = process.argv[3]
const conditional = process.argv[4] === "if-range"
const { handler, dispose } = HttpRouter.toWebHandler(
  HttpStaticServer.layer({ root }).pipe(
    Layer.provideMerge(Layer.mergeAll(NodeFileSystem.layer, NodeHttpPlatform.layer, NodePath.layer))
  ),
  { disableLogger: true }
)
try {
  const initial = await handler(new Request("http://localhost/range.txt"))
  const etag = initial.headers.get("etag")
  assert.ok(etag && !etag.startsWith("W/"))
  assert.equal(await initial.text(), "0123456789abcdef")

  // Each request finishes consuming its body before the next one starts.
  // The workload exceeds the descriptor budget without concurrent requests,
  // GC calls, stream spies, or platform-specific descriptor inspection.
  for (let i = 0; i < 256; i++) {
    const response = await handler(
      new Request("http://localhost/range.txt", {
        headers: conditional ? { Range: range, "If-Range": etag } : { Range: range }
      })
    )
    assert.equal(response.status, range === "bytes=0-3" ? 206 : 416, `request ${i}`)
    assert.equal(await response.text(), range === "bytes=0-3" ? "0123" : "", `request ${i}`)
  }
  const final = await handler(new Request("http://localhost/range.txt"))
  assert.equal(final.status, 200)
  assert.equal(await final.text(), "0123456789abcdef")
  console.log("completed 256 requests")
} finally {
  await dispose()
}
