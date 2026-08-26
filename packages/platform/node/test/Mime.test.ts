import mime, { Mime } from "@effect/platform-node/Mime"
import { assert, describe, it } from "@effect/vitest"

describe("Mime", () => {
  it("looks up common static file types", () => {
    assert.strictEqual(mime.getType("index.html"), "text/html")
    assert.strictEqual(mime.getType("styles.css"), "text/css")
    assert.strictEqual(mime.getType("app.js"), "text/javascript")
    assert.strictEqual(mime.getType("image.png"), "image/png")
    assert.strictEqual(mime.getType("document.pdf"), "application/pdf")
    assert.strictEqual(mime.getType("font.woff2"), "font/woff2")
  })

  it("returns null for unknown and missing extensions", () => {
    assert.strictEqual(mime.getType("file.unknown"), null)
    assert.strictEqual(mime.getType("/directory/file"), null)
  })

  it("handles extensions case-insensitively", () => {
    assert.strictEqual(mime.getType("/directory/INDEX.HTML"), "text/html")
    assert.strictEqual(mime.getType("PHOTO.JpEg"), "image/jpeg")
  })

  it("keeps the customizable Mime facade", () => {
    const registry = new Mime({ "application/example": ["example", "*shared"] })
    registry.define({ "application/shared": ["shared"] })

    assert.strictEqual(registry.getType("file.example"), "application/example")
    assert.strictEqual(registry.getType("file.shared"), "application/shared")
    assert.strictEqual(registry.getExtension("application/example; charset=utf-8"), "example")
    assert.deepStrictEqual(registry.getAllExtensions("application/example"), new Set(["example", "shared"]))
  })
})
