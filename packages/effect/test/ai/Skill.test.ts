import { assert, describe, it } from "@effect/vitest"
import * as Skill from "effect/ai/Skill"
import * as Digest from "effect/crypto/Digest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { createHash } from "node:crypto"

const frontmatter = { name: "refunds", description: "Process customer refunds" }
const markdown =
  "\uFEFF---\r\nname: refunds\r\ndescription: Process customer refunds\r\n---\r\n\r\nRead references/policy.md.\r\n"
const sha256 = (bytes: string | Uint8Array) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`

describe("Skill", () => {
  it.effect("should preserve instructions and canonical frontmatter when authoring a document", () =>
    Effect.gen(function*() {
      for (const instructions of ["", "\r\n---\r\n\uFEFFBody 😀\r\n"]) {
        const skill = yield* Skill.make({
          frontmatter: {
            ...frontmatter,
            description: "When: refunds\nUse the policy",
            metadata: { version: "yes" },
            future: { nested: [true, null, "quoted: \"text\""] }
          },
          instructions
        })
        assert.strictEqual(skill.instructions, instructions)
        const document = yield* Skill.readText(skill, "SKILL.md")
        const imported = yield* Skill.fromFiles({ "SKILL.md": document })
        assert.deepStrictEqual(imported.frontmatter, skill.frontmatter)
        assert.strictEqual(imported.instructions, instructions)
      }
      const first = yield* Skill.make({ frontmatter: { ...frontmatter, extra: { z: 1, a: 2 } }, instructions: "Body" })
      const reordered = yield* Skill.make({
        frontmatter: { extra: { a: 2, z: 1 }, description: frontmatter.description, name: frontmatter.name },
        instructions: "Body"
      })
      assert.deepStrictEqual(yield* Skill.readBytes(first, "SKILL.md"), yield* Skill.readBytes(reordered, "SKILL.md"))
    }))

  it.effect("should preserve document bytes and normalize metadata when importing YAML", () =>
    Effect.gen(function*() {
      const bytes = new TextEncoder().encode(markdown)
      const skill = yield* Skill.fromFiles({ "SKILL.md": bytes })
      assert.deepStrictEqual(yield* Skill.readBytes(skill, "SKILL.md"), bytes)
      assert.strictEqual(yield* Skill.readText(skill, "SKILL.md"), markdown)
      assert.strictEqual(skill.instructions, "\r\nRead references/policy.md.\r\n")
      const normalized = yield* Skill.fromFiles({
        "SKILL.md": "---\nname: refunds\ndescription: Process refunds\nfuture: [.inf, .nan]\n---\nBody"
      })
      assert.deepStrictEqual(normalized.frontmatter.future, [null, null])
    }))

  it.effect("should preserve captured bytes when callers mutate input and output buffers", () =>
    Effect.gen(function*() {
      const raw = Buffer.from([1, 2, 3])
      const wrapped = new Uint8Array([4, 5, 6])
      const skill = yield* Skill.fromFiles({
        "SKILL.md": markdown,
        "raw.bin": raw,
        "wrapped.bin": { content: wrapped, mimeType: "application/octet-stream" }
      })
      raw.fill(0)
      wrapped.fill(0)
      const output = yield* Skill.readBytes(skill, "raw.bin")
      output.fill(0)
      assert.deepStrictEqual(yield* Skill.readBytes(skill, "raw.bin"), new Uint8Array([1, 2, 3]))
      assert.deepStrictEqual(yield* Skill.readBytes(skill, "wrapped.bin"), new Uint8Array([4, 5, 6]))
    }))

  it.effect("should preserve metadata and descriptors when callers mutate input and exposed objects", () =>
    Effect.gen(function*() {
      const options = {
        frontmatter: { ...frontmatter, future: { nested: ["original"] } },
        instructions: "Read the policy",
        files: { "policy.md": "Approval required" }
      }
      const skill = yield* Skill.make(options)
      options.frontmatter.future.nested[0] = "changed"
      options.files["policy.md"] = "changed"
      const future = skill.frontmatter.future
      if (typeof future === "object" && future !== null) {
        if ("nested" in future && Array.isArray(future.nested)) Reflect.set(future.nested, "0", "changed element")
        Reflect.set(future, "nested", ["changed again"])
      }
      const file = skill.files.find((file) => file.path === "policy.md")
      assert.isDefined(file)
      if (file !== undefined) Reflect.set(file, "mimeType", "application/octet-stream")
      Reflect.set(skill.files, "0", { path: "replacement" })
      assert.deepStrictEqual(skill.frontmatter.future, { nested: ["original"] })
      assert.deepStrictEqual(skill.files.map((file) => file.path), ["SKILL.md", "policy.md"])
      assert.strictEqual(skill.files.find((file) => file.path === "policy.md")?.mimeType, "text/markdown")
      assert.strictEqual(yield* Skill.readText(skill, "policy.md"), "Approval required")
    }))

  it.effect("should capture a stable snapshot when each construction Effect executes", () =>
    Effect.gen(function*() {
      const bytes = new Uint8Array([1])
      const prepare = Skill.fromFiles({ "SKILL.md": markdown, "asset.bin": bytes })
      bytes[0] = 2
      const first = yield* prepare
      bytes[0] = 3
      const second = yield* prepare
      assert.deepStrictEqual(yield* Skill.readBytes(first, "asset.bin"), new Uint8Array([2]))
      assert.deepStrictEqual(yield* Skill.readBytes(second, "asset.bin"), new Uint8Array([3]))
    }))

  it.effect("should require valid UTF-8 when reading text regardless of MIME", () =>
    Effect.gen(function*() {
      const skill = yield* Skill.fromFiles({
        "SKILL.md": { content: markdown, mimeType: "application/octet-stream" },
        "valid.bin": "\uFEFFtext",
        "invalid.bin": new Uint8Array([0xff]),
        "scripts/check.ts": "const approved = true"
      })
      assert.strictEqual(yield* Skill.readText(skill, "SKILL.md"), markdown)
      assert.strictEqual(yield* Skill.readText(skill, "valid.bin"), "\uFEFFtext")
      const error = yield* Effect.flip(Skill.readText(skill, "invalid.bin"))
      assert.strictEqual(error._tag, "SkillReadError")
      assert.strictEqual(error.reason, "InvalidUtf8")
      assert.strictEqual(error.path, "invalid.bin")
      assert.strictEqual(skill.files.find((file) => file.path === "scripts/check.ts")?.mimeType, "text/x-typescript")
      assert.deepStrictEqual(yield* Skill.readBytes(skill, "invalid.bin"), new Uint8Array([0xff]))
    }))

  it.effect("should return typed failures when entry data or authoring sources are invalid", () =>
    Effect.gen(function*() {
      const cases = [
        [Skill.make({ frontmatter: { ...frontmatter, name: "Refunds" }, instructions: "" }), "InvalidFrontmatter"],
        [Skill.make({ frontmatter, instructions: "\ud800" }), "InvalidInput"],
        [Skill.make({ frontmatter, instructions: "", files: { "SKILL.md": markdown } }), "InvalidEntry"],
        [Skill.fromFiles({ "SKILL.md": "No frontmatter" }), "InvalidEntry"],
        [Skill.fromFiles({ "SKILL.md": new Uint8Array([0xff]) }), "InvalidEntry"]
      ] as const
      for (const [effect, reason] of cases) {
        const error = yield* Effect.flip(effect)
        assert.strictEqual(error._tag, "SkillError")
        assert.strictEqual(error.reason, reason)
      }
    }))

  it.effect("should reject a bundle when paths are invalid or conflict with directories", () =>
    Effect.gen(function*() {
      for (const path of ["", "/root", "a/", "a//b", ".", "a/../b", "a\\b", "a\0b"]) {
        const error = yield* Effect.flip(Skill.fromFiles({ "SKILL.md": markdown, [path]: "content" }))
        assert.strictEqual(error.reason, "InvalidPath", path)
        assert.strictEqual(error.path, path)
      }
      const error = yield* Effect.flip(Skill.fromFiles({ "SKILL.md": markdown, a: "file", "a/b": "nested" }))
      assert.strictEqual(error.reason, "PathConflict")
    }))

  it.effect("should resolve literal keys when reading bundle files", () =>
    Effect.gen(function*() {
      const skill = yield* Skill.fromFiles({
        "SKILL.md": markdown,
        "refs/a#b?.md": "literal characters",
        "refs/a%2fb.md": "percent text"
      })
      assert.strictEqual(yield* skill.pipe(Skill.readText("refs/a#b?.md")), "literal characters")
      assert.strictEqual(yield* Skill.readText(skill, "refs/a%2fb.md"), "percent text")
      assert.strictEqual((yield* Effect.flip(Skill.readText(skill, "refs/a/b.md"))).reason, "NotFound")
      assert.strictEqual((yield* Effect.flip(Skill.readBytes(skill, "../outside"))).reason, "InvalidPath")
    }))

  it.effect("should count the entry document when enforcing configured file and byte limits", () =>
    Effect.gen(function*() {
      const files = {
        "SKILL.md": markdown,
        ...Object.fromEntries(Array.from({ length: 512 }, (_, i) => [`f${i}`, ""]))
      }
      assert.strictEqual((yield* Effect.flip(Skill.fromFiles(files))).reason, "LimitExceeded")
      const larger = yield* Skill.fromFiles(files, { limits: { maxFiles: 1024, maxBytes: "1 MiB" } })
      assert.strictEqual(larger.files.length, 513)
      const boundary = yield* Skill.fromFiles({
        "SKILL.md": markdown,
        ...Object.fromEntries(Array.from({ length: 511 }, (_, i) => [`f${i}`, ""]))
      })
      assert.strictEqual(boundary.files.length, 512)
      const entrySize = new TextEncoder().encode(markdown).byteLength
      assert.strictEqual(
        (yield* Effect.flip(Skill.fromFiles({ "SKILL.md": markdown }, { limits: { maxBytes: entrySize - 1 } }))).reason,
        "LimitExceeded"
      )
      yield* Skill.fromFiles({ "SKILL.md": markdown }, { limits: { maxBytes: entrySize } })
      assert.strictEqual(
        (yield* Effect.flip(Skill.fromFiles({ "SKILL.md": markdown, "large.bin": new Uint8Array(16 * 1024 * 1024) })))
          .reason,
        "LimitExceeded"
      )
      const raisedBytes = yield* Skill.fromFiles({
        "SKILL.md": markdown,
        "large.bin": new Uint8Array(16 * 1024 * 1024)
      }, { limits: { maxBytes: "32 MiB" } })
      assert.strictEqual(raisedBytes.files.find((file) => file.path === "large.bin")?.size, 16 * 1024 * 1024)
      for (const maxFiles of [0, 1.5]) {
        assert.strictEqual(
          (yield* Effect.flip(Skill.fromFiles({ "SKILL.md": markdown }, { limits: { maxFiles } }))).reason,
          "InvalidInput"
        )
      }
    }))

  it.effect("should include exact hashes and metadata in path order when generating a manifest", () =>
    Effect.gen(function*() {
      const skill = yield* Skill.fromFiles({
        "z.bin": new Uint8Array([0, 255]),
        "SKILL.md": markdown,
        "a.txt": "first"
      })
      const manifest = yield* Skill.manifest(skill)
      assert.deepStrictEqual(manifest, {
        version: 1,
        files: [
          { path: "SKILL.md", mimeType: "text/markdown", size: Buffer.byteLength(markdown), digest: sha256(markdown) },
          { path: "a.txt", mimeType: "text/plain", size: 5, digest: sha256("first") },
          { path: "z.bin", mimeType: "application/octet-stream", size: 2, digest: sha256(new Uint8Array([0, 255])) }
        ]
      })
    }).pipe(Effect.provide(Digest.layerWebCrypto)))

  it.effect("should preserve private bytes when the Digest service retains its input", () =>
    Effect.gen(function*() {
      const retained: Array<Uint8Array> = []
      const provider = {
        digest: (_algorithm: Digest.Algorithm, bytes: Uint8Array) =>
          Effect.sync(() => new Uint8Array(createHash("sha256").update(bytes).digest())),
        digestHex: (_algorithm: Digest.Algorithm, bytes: Uint8Array) =>
          Effect.sync(() => {
            retained.push(bytes)
            return createHash("sha256").update(bytes).digest("hex")
          })
      }
      const skill = yield* Skill.fromFiles({ "SKILL.md": markdown, "policy.md": "safe" })
      const expected = yield* Skill.manifest(skill).pipe(Effect.provideService(Digest.Digest, provider))
      for (const bytes of retained) bytes.fill(120)
      assert.strictEqual(yield* Skill.readText(skill, "policy.md"), "safe")
      const observed = yield* Skill.manifest(skill).pipe(Effect.provide(Digest.layerWebCrypto))
      assert.isTrue(Schema.toEquivalence(Skill.Manifest)(expected, observed))
    }))

  it.effect("should omit instructions and file contents when inspecting a skill", () =>
    Effect.gen(function*() {
      const skill = yield* Skill.make({
        frontmatter,
        instructions: "Private instructions",
        files: { "policy.md": "Private policy" }
      })
      const summary = JSON.stringify(skill)
      assert.include(summary, "refunds")
      assert.notInclude(summary, "Private instructions")
      assert.notInclude(summary, "Private policy")
    }))
})
