import * as Mime from "@effect/platform-node/Mime"
import { assert, describe, it } from "@effect/vitest"

describe("Mime", () => {
  it("looks up common static file types", () => {
    assert.strictEqual(Mime.getType("index.html"), "text/html")
    assert.strictEqual(Mime.getType("styles.css"), "text/css")
    assert.strictEqual(Mime.getType("app.js"), "text/javascript")
    assert.strictEqual(Mime.getType("image.png"), "image/png")
    assert.strictEqual(Mime.getType("document.pdf"), "application/pdf")
    assert.strictEqual(Mime.getType("font.woff2"), "font/woff2")
  })

  it("looks up standard MIME types", () => {
    assert.strictEqual(Mime.getType("feed.atom"), "application/atom+xml")
    assert.strictEqual(Mime.getType("archive.jar"), "application/java-archive")
    assert.strictEqual(Mime.getType("calendar.ics"), "text/calendar")
    assert.strictEqual(Mime.getType("model.glb"), "model/gltf-binary")
  })

  it("returns null for unknown and missing extensions", () => {
    assert.strictEqual(Mime.getType("file.unknown"), null)
    assert.strictEqual(Mime.getType("/directory/file"), null)
  })

  it("handles extensions case-insensitively", () => {
    assert.strictEqual(Mime.getType("/directory/INDEX.HTML"), "text/html")
    assert.strictEqual(Mime.getType("PHOTO.JpEg"), "image/jpeg")
  })

  it("exposes reverse lookups at the module level", () => {
    assert.strictEqual(Mime.getExtension("text/html; charset=utf-8"), "html")
    assert.deepStrictEqual(Mime.getAllExtensions("text/html"), new Set(["html", "htm", "shtml"]))
  })

  it("keeps the customizable Mime facade", () => {
    const registry = new Mime.Mime({ "application/example": ["example", "*shared"] })
    registry.define({ "application/shared": ["shared"] })

    assert.strictEqual(registry.getType("file.example"), "application/example")
    assert.strictEqual(registry.getType("file.shared"), "application/shared")
    assert.strictEqual(registry.getExtension("application/example; charset=utf-8"), "example")
    assert.deepStrictEqual(registry.getAllExtensions("application/example"), new Set(["example", "shared"]))
  })

  it("keeps the default export for compatibility", () => {
    assert.strictEqual(Mime.default.getType("index.html"), Mime.getType("index.html"))
  })
})
