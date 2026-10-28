import { assert, describe, it } from "@effect/vitest"
import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpServer from "effect/ai/McpServer"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import { createHash } from "node:crypto"
import { initializeHttpSession, makeHttpHarness } from "./TestUtils/McpHttpHarness.ts"
import { readMcpHttpResponse } from "./TestUtils/McpHttpResponse.ts"
import { makeServerLayer } from "./TestUtils/McpServerLayer.ts"

// https://github.com/modelcontextprotocol/ext-skills/blob/main/specification/stable/skills.mdx

const modern = McpProtocol.v2026_07_28

const metadata = {
  "io.modelcontextprotocol/protocolVersion": modern.protocolVersion,
  "io.modelcontextprotocol/clientCapabilities": {},
  "io.modelcontextprotocol/clientInfo": { name: "SkillsClient", version: "1.0.0" }
} as const

const modernRequest = (method: string, params: Record<string, unknown> = {}) => ({
  body: { jsonrpc: "2.0", id: 1, method, params: { ...params, _meta: metadata } },
  headers: {
    "MCP-Protocol-Version": modern.protocolVersion,
    "Mcp-Method": method,
    ...(method === "resources/read" ? { "Mcp-Name": String(params.uri) } : {})
  }
})

const sha256 = (content: string | Uint8Array) => `sha256:${createHash("sha256").update(content).digest("hex")}`

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const Refunds = McpServer.skill({
  uri: "skill://acme/billing/refunds/SKILL.md",
  frontmatter: {
    name: "refunds",
    description: "Process refunds using the billing tools",
    license: "Apache-2.0",
    metadata: { "acme-tools": "issue_refund" }
  },
  instructions: "Read references/policy.md before issuing a refund.\n",
  files: {
    "references/policy.md": "Refunds above CHF 500 require manager approval.\n",
    "assets/logo.png": PNG,
    "scripts/check": { content: "#!/bin/sh\n", mimeType: "text/x-shellscript" }
  }
})

const Invoices = McpServer.skill({
  uri: "skill://acme/billing/invoices/SKILL.md",
  frontmatter: { name: "invoices", description: "Draft invoices" },
  files: {
    "SKILL.md": "---\nname: invoices\ndescription: Draft invoices\n---\n\nUse the invoice tools.\n"
  }
})

const Skills = Layer.mergeAll(Refunds, Invoices)

const modernHarness = (registrations: Layer.Layer<never, unknown, McpServer.McpServer>) =>
  makeHttpHarness(
    registrations.pipe(Layer.provideMerge(makeServerLayer({ name: "SkillsServer", protocols: [modern] })))
  )

const call = Effect.fnUntraced(function*(
  harness: Effect.Success<ReturnType<typeof makeHttpHarness>>,
  method: string,
  params?: Record<string, unknown>
) {
  const { body, headers } = modernRequest(method, params)
  const response = yield* harness.post(body, headers)
  return { status: response.status, message: (yield* readMcpHttpResponse(response)) as any }
})

describe("McpServer skills", () => {
  describe("v2026-07-28", () => {
    it.effect("declares the extension and the resources capability in discovery", () =>
      Effect.gen(function*() {
        const harness = yield* modernHarness(Skills)
        const { message } = yield* call(harness, "server/discover")
        assert.deepStrictEqual(message.result.capabilities.extensions, {
          "io.modelcontextprotocol/skills": { directoryRead: true }
        })
        assert.isDefined(message.result.capabilities.resources)
      }))

    it.effect("lists every skill with a manifest of the bytes resources/read serves", () =>
      Effect.gen(function*() {
        const harness = yield* modernHarness(Skills)
        const { message } = yield* call(harness, "skills/list")
        assert.strictEqual(message.result.resultType, "complete")
        assert.strictEqual(message.result.ttlMs, 0)
        assert.strictEqual(message.result.cacheScope, "private")

        const refunds = message.result.skills.find((skill: any) => skill.frontmatter.name === "refunds")
        assert.deepStrictEqual(refunds.uri, "skill://acme/billing/refunds/SKILL.md")
        assert.deepStrictEqual(refunds.frontmatter, {
          name: "refunds",
          description: "Process refunds using the billing tools",
          license: "Apache-2.0",
          metadata: { "acme-tools": "issue_refund" }
        })
        assert.deepStrictEqual(
          refunds.resources.map((resource: any) => resource.uri),
          [
            "skill://acme/billing/refunds/SKILL.md",
            "skill://acme/billing/refunds/assets/logo.png",
            "skill://acme/billing/refunds/references/policy.md",
            "skill://acme/billing/refunds/scripts/check"
          ]
        )

        for (const resource of refunds.resources) {
          const { message: read } = yield* call(harness, "resources/read", { uri: resource.uri })
          const [content] = read.result.contents
          const bytes = content.text === undefined
            ? Buffer.from(content.blob, "base64")
            : Buffer.from(content.text, "utf8")
          assert.strictEqual(resource.digest, sha256(bytes))
          assert.strictEqual(resource.size, bytes.byteLength)
        }
      }))

    it.effect("renders SKILL.md frontmatter that parses to the listed frontmatter", () =>
      Effect.gen(function*() {
        const harness = yield* modernHarness(Skills)
        const { message } = yield* call(harness, "resources/read", { uri: "skill://acme/billing/refunds/SKILL.md" })
        assert.deepStrictEqual(message.result.contents, [{
          uri: "skill://acme/billing/refunds/SKILL.md",
          mimeType: "text/markdown",
          text: "---\n" +
            "name: \"refunds\"\n" +
            "description: \"Process refunds using the billing tools\"\n" +
            "license: \"Apache-2.0\"\n" +
            "metadata: {\"acme-tools\":\"issue_refund\"}\n" +
            "---\n\n" +
            "Read references/policy.md before issuing a refund.\n"
        }])
      }))

    it.effect("serves a SKILL.md given as a file verbatim", () =>
      Effect.gen(function*() {
        const harness = yield* modernHarness(Skills)
        const { message } = yield* call(harness, "resources/read", { uri: "skill://acme/billing/invoices/SKILL.md" })
        assert.strictEqual(
          message.result.contents[0].text,
          "---\nname: invoices\ndescription: Draft invoices\n---\n\nUse the invoice tools.\n"
        )
      }))

    it.effect("names and describes SKILL.md from the frontmatter in resources/list", () =>
      Effect.gen(function*() {
        const harness = yield* modernHarness(Skills)
        const { message } = yield* call(harness, "resources/list")
        const skillMd = message.result.resources.find((resource: any) =>
          resource.uri === "skill://acme/billing/refunds/SKILL.md"
        )
        assert.strictEqual(skillMd.name, "refunds")
        assert.strictEqual(skillMd.description, "Process refunds using the billing tools")
        assert.strictEqual(skillMd.mimeType, "text/markdown")
      }))

    it.effect("lists the frontmatter of a SKILL.md given as a file without frontmatter", () =>
      Effect.gen(function*() {
        const harness = yield* modernHarness(McpServer.skill({
          uri: "skill://acme/notes/SKILL.md",
          files: {
            "SKILL.md":
              "---\nname: notes\ndescription: Take notes\nmetadata:\n  version: \"2\"\n---\n\nWrite things down.\n"
          }
        }))
        const { message } = yield* call(harness, "skills/get", { uri: "skill://acme/notes/SKILL.md" })
        assert.deepStrictEqual(message.result.skill.frontmatter, {
          name: "notes",
          description: "Take notes",
          metadata: { version: "2" }
        })
      }))

    it.effect("gets a skill by the URI of its SKILL.md", () =>
      Effect.gen(function*() {
        const harness = yield* modernHarness(Skills)
        const { message: list } = yield* call(harness, "skills/list")
        const { message } = yield* call(harness, "skills/get", { uri: "skill://acme/billing/invoices/SKILL.md" })
        assert.strictEqual(message.result.resultType, "complete")
        assert.strictEqual(message.result.ttlMs, 0)
        assert.deepStrictEqual(
          message.result.skill,
          list.result.skills.find((skill: any) => skill.uri === "skill://acme/billing/invoices/SKILL.md")
        )
      }))

    it.effect("rejects skills/get for anything but a served skill with -32602", () =>
      Effect.gen(function*() {
        const harness = yield* modernHarness(Skills)
        for (
          const uri of [
            "skill://acme/billing/missing/SKILL.md",
            "skill://acme/billing/refunds/references/policy.md"
          ]
        ) {
          const { message } = yield* call(harness, "skills/get", { uri })
          assert.strictEqual(message.error.code, -32602)
        }
      }))

    it.effect("reads every directory of the skill namespace, merging shared prefixes", () =>
      Effect.gen(function*() {
        const harness = yield* modernHarness(Skills)
        const read = (uri: string) =>
          call(harness, "resources/directory/read", { uri }).pipe(Effect.map(({ message }) => message.result))

        const prefix = yield* read("skill://acme/billing")
        assert.strictEqual(prefix.resultType, "complete")
        assert.strictEqual(prefix.ttlMs, 0)
        assert.deepStrictEqual(prefix.resources, [
          { uri: "skill://acme/billing/invoices", name: "invoices", mimeType: "inode/directory" },
          { uri: "skill://acme/billing/refunds", name: "refunds", mimeType: "inode/directory" }
        ])
        assert.deepStrictEqual((yield* read("skill://acme")).resources, [
          { uri: "skill://acme/billing", name: "billing", mimeType: "inode/directory" }
        ])
        assert.deepStrictEqual((yield* read("skill://acme/billing/refunds")).resources, [
          { uri: "skill://acme/billing/refunds/SKILL.md", name: "SKILL.md", mimeType: "text/markdown" },
          { uri: "skill://acme/billing/refunds/assets", name: "assets", mimeType: "inode/directory" },
          { uri: "skill://acme/billing/refunds/references", name: "references", mimeType: "inode/directory" },
          { uri: "skill://acme/billing/refunds/scripts", name: "scripts", mimeType: "inode/directory" }
        ])
        assert.deepStrictEqual((yield* read("skill://acme/billing/refunds/assets")).resources, [
          { uri: "skill://acme/billing/refunds/assets/logo.png", name: "logo.png", mimeType: "image/png" }
        ])
      }))

    it.effect("rejects a directory read of a file or an unknown URI with -32602", () =>
      Effect.gen(function*() {
        const harness = yield* modernHarness(Skills)
        for (const uri of ["skill://acme/billing/refunds/SKILL.md", "skill://acme/missing", "skill://acme/billing/"]) {
          const { message } = yield* call(harness, "resources/directory/read", { uri })
          assert.strictEqual(message.error.code, -32602)
        }
      }))

    it.effect("rejects a cursor it never issued with -32602", () =>
      Effect.gen(function*() {
        const harness = yield* modernHarness(Skills)
        const { message } = yield* call(harness, "skills/list", { cursor: "next" })
        assert.strictEqual(message.error.code, -32602)
      }))

    it.effect("applies the skills cache hint to every skills result", () =>
      Effect.gen(function*() {
        const harness = yield* makeHttpHarness(Skills.pipe(Layer.provideMerge(makeServerLayer({
          name: "SkillsServer",
          protocols: [modern],
          cacheHints: { skills: { ttl: "1 minute", cacheScope: "private" } }
        }))))
        for (
          const [method, params] of [
            ["skills/list", {}],
            ["skills/get", { uri: "skill://acme/billing/refunds/SKILL.md" }],
            ["resources/directory/read", { uri: "skill://acme" }]
          ] as const
        ) {
          const { message } = yield* call(harness, method, params)
          assert.strictEqual(message.result.ttlMs, 60_000, method)
          assert.strictEqual(message.result.cacheScope, "private", method)
        }
      }))

    it.effect("answers the extension's methods with -32601 and omits the declaration without skills", () =>
      Effect.gen(function*() {
        const harness = yield* modernHarness(
          McpServer.resource({ uri: "file:///readme", name: "Readme", content: Effect.succeed("readme") })
        )
        const { message: discovered } = yield* call(harness, "server/discover")
        assert.isUndefined(discovered.result.capabilities.extensions)
        for (const method of ["skills/list", "skills/get", "resources/directory/read"]) {
          const { message, status } = yield* call(harness, method, { uri: "skill://acme" })
          assert.strictEqual(status, 404, method)
          assert.strictEqual(message.error.code, -32601, method)
        }
      }))
  })

  describe("sessionful revisions", () => {
    for (const protocol of [McpProtocol.v2025_11_25, McpProtocol.v2024_11_05]) {
      it.effect(`serves the extension without cache attributes on ${protocol.protocolVersion}`, () =>
        Effect.gen(function*() {
          const harness = yield* makeHttpHarness(Skills.pipe(Layer.provideMerge(makeServerLayer({
            name: "SkillsServer",
            protocols: [protocol],
            extensions: { "example/other": {} }
          }))))
          const initialize = yield* harness.post({
            jsonrpc: "2.0",
            id: "initialize",
            method: "initialize",
            params: {
              protocolVersion: protocol.protocolVersion,
              capabilities: {},
              clientInfo: { name: "test", version: "1.0.0" }
            }
          })
          const initialized = (yield* readMcpHttpResponse(initialize)) as any
          assert.deepStrictEqual(initialized.result.capabilities.extensions, {
            "example/other": {},
            "io.modelcontextprotocol/skills": { directoryRead: true }
          })

          const headers = yield* initializeHttpSession(harness, protocol)
          const post = (method: string, params: Record<string, unknown>) =>
            harness.post({ jsonrpc: "2.0", id: 2, method, params }, headers).pipe(
              Effect.flatMap(readMcpHttpResponse),
              Effect.map((message) => message as any)
            )

          const list = yield* post("skills/list", {})
          assert.deepStrictEqual(Object.keys(list.result), ["skills"])
          assert.strictEqual(list.result.skills.length, 2)

          const get = yield* post("skills/get", { uri: "skill://acme/billing/refunds/SKILL.md" })
          assert.deepStrictEqual(Object.keys(get.result), ["skill"])
          assert.strictEqual(get.result.skill.frontmatter.name, "refunds")

          const missing = yield* post("skills/get", { uri: "skill://acme/missing/SKILL.md" })
          assert.strictEqual(missing.error.code, -32602)

          const directory = yield* post("resources/directory/read", { uri: "skill://acme" })
          assert.deepStrictEqual(directory.result, {
            resources: [{ uri: "skill://acme/billing", name: "billing", mimeType: "inode/directory" }]
          })
        }))
    }
  })

  describe("registration", () => {
    const register = (options: McpServer.SkillOptions) =>
      McpServer.registerSkill(options).pipe(Effect.provide(McpServer.McpServer.layer), Effect.exit)

    const base = {
      uri: "skill://refunds/SKILL.md",
      frontmatter: { name: "refunds", description: "Process refunds" },
      instructions: "Refund carefully.\n"
    } as const

    const assertRejected = (exit: Exit.Exit<void, unknown>, reason: RegExp) => {
      assert.isTrue(Exit.isFailure(exit))
      if (Exit.isFailure(exit)) assert.match(String(exit.cause), reason)
    }

    it.effect("accepts a valid skill", () =>
      Effect.gen(function*() {
        assert.isTrue(Exit.isSuccess(yield* register(base)))
      }))

    it.effect("rejects a name that differs from the last path segment", () =>
      Effect.gen(function*() {
        assertRejected(
          yield* register({ ...base, uri: "skill://other/SKILL.md" }),
          /frontmatter name "refunds" must equal "other"/
        )
      }))

    it.effect("rejects a name that breaks the Agent Skills naming rules", () =>
      Effect.gen(function*() {
        assertRejected(
          yield* register({
            ...base,
            uri: "skill://Refunds/SKILL.md",
            frontmatter: { name: "Refunds", description: "Process refunds" }
          }),
          /not valid Agent Skills frontmatter[\s\S]*\["name"\]/
        )
      }))

    it.effect("rejects an empty description", () =>
      Effect.gen(function*() {
        assertRejected(
          yield* register({ ...base, frontmatter: { name: "refunds", description: "" } }),
          /not valid Agent Skills frontmatter[\s\S]*\["description"\]/
        )
      }))

    it.effect("rejects a URI that does not address a SKILL.md", () =>
      Effect.gen(function*() {
        assertRejected(yield* register({ ...base, uri: "skill://refunds/README.md" }), /<skill-path>\/SKILL\.md/)
      }))

    // The Agent Skills specification defines `metadata` as a map of strings.
    it.effect("rejects frontmatter that breaks the Agent Skills specification's optional fields", () =>
      Effect.gen(function*() {
        assertRejected(
          yield* register({
            uri: "skill://refunds/SKILL.md",
            files: { "SKILL.md": "---\nname: refunds\ndescription: Process refunds\nmetadata:\n  version: 2\n---\n" }
          }),
          /\["metadata"\]\["version"\]/
        )
        assertRejected(
          yield* register({ ...base, frontmatter: { ...base.frontmatter, compatibility: "x".repeat(501) } }),
          /\["compatibility"\]/
        )
      }))

    it.effect("keeps frontmatter fields the Agent Skills specification does not define", () =>
      Effect.gen(function*() {
        assert.isTrue(
          Exit.isSuccess(yield* register({ ...base, frontmatter: { ...base.frontmatter, "x-team": ["billing"] } }))
        )
      }))

    it.effect("rejects a SKILL.md whose frontmatter differs from the given frontmatter", () =>
      Effect.gen(function*() {
        assertRejected(
          yield* register({
            uri: "skill://refunds/SKILL.md",
            frontmatter: { name: "refunds", description: "Process refunds" },
            files: { "SKILL.md": "---\nname: refunds\ndescription: Something else\n---\n" }
          }),
          /frontmatter of SKILL.md differs/
        )
      }))

    it.effect("rejects a SKILL.md without frontmatter", () =>
      Effect.gen(function*() {
        assertRejected(
          yield* register({ uri: "skill://refunds/SKILL.md", files: { "SKILL.md": "Refund carefully.\n" } }),
          /must begin with YAML frontmatter/
        )
      }))

    it.effect("rejects a file path that escapes the skill", () =>
      Effect.gen(function*() {
        assertRejected(yield* register({ ...base, files: { "../secrets.md": "secret" } }), /escapes the skill/)
      }))

    it.effect("rejects SKILL.md given both as instructions and as a file", () =>
      Effect.gen(function*() {
        assertRejected(
          yield* McpServer.registerSkill({ ...base, files: { "SKILL.md": "---\n---\n" } } as any).pipe(
            Effect.provide(McpServer.McpServer.layer),
            Effect.exit
          ),
          /not both/
        )
      }))

    it.effect("rejects a nested skill that serves different bytes than its enclosing skill", () =>
      Effect.gen(function*() {
        const exit = yield* Effect.gen(function*() {
          yield* McpServer.registerSkill({
            ...base,
            files: { "nested/SKILL.md": "---\nname: nested\ndescription: Nested\n---\n" }
          })
          yield* McpServer.registerSkill({
            uri: "skill://refunds/nested/SKILL.md",
            frontmatter: { name: "nested", description: "Nested" },
            instructions: "Different body.\n"
          })
        }).pipe(Effect.provide(McpServer.McpServer.layer), Effect.exit)
        assertRejected(exit, /different bytes/)
      }))

    it.effect("accepts a nested skill that serves the same bytes as its enclosing skill", () =>
      Effect.gen(function*() {
        const nested = "---\nname: nested\ndescription: Nested\n---\n"
        const exit = yield* Effect.gen(function*() {
          yield* McpServer.registerSkill({ ...base, files: { "nested/SKILL.md": nested } })
          yield* McpServer.registerSkill({
            uri: "skill://refunds/nested/SKILL.md",
            frontmatter: { name: "nested", description: "Nested" },
            files: { "SKILL.md": nested }
          })
        }).pipe(Effect.provide(McpServer.McpServer.layer), Effect.exit)
        assert.isTrue(Exit.isSuccess(exit))
      }))
  })
})
