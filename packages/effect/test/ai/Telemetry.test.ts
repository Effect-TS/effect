import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Option, Schema, Tracer } from "effect"
import { LanguageModel, Telemetry, Tool, Toolkit } from "effect/ai"
import * as TestUtils from "./utils.ts"

const EchoTool = Tool.make("EchoTool", { success: Schema.String })
const EchoToolkit = Toolkit.make(EchoTool)
const EchoToolkitLayer = EchoToolkit.toLayer({ EchoTool: () => Effect.succeed("ok") })

const makeSpan = () =>
  new Tracer.NativeSpan({
    name: "test",
    parent: Option.none(),
    annotations: Context.empty(),
    links: [],
    startTime: 0n,
    kind: "internal",
    sampled: true
  })

describe("Telemetry", () => {
  describe("addGenAIAnnotations", () => {
    it("writes gen_ai.provider.name and never gen_ai.system", () => {
      const span = makeSpan()
      Telemetry.addGenAIAnnotations(span, { provider: { name: "anthropic" }, operation: { name: "chat" } })
      assert.strictEqual(span.attributes.get("gen_ai.provider.name"), "anthropic")
      assert.isFalse(span.attributes.has("gen_ai.system"))
    })

    it("maps the deprecated system option to gen_ai.provider.name", () => {
      const span = makeSpan()
      Telemetry.addGenAIAnnotations(span, { system: "openai" })
      assert.strictEqual(span.attributes.get("gen_ai.provider.name"), "openai")
      assert.isFalse(span.attributes.has("gen_ai.system"))
    })

    it("prefers provider.name over the deprecated system option", () => {
      const span = makeSpan()
      Telemetry.addGenAIAnnotations(span, { provider: { name: "anthropic" }, system: "openai" })
      assert.strictEqual(span.attributes.get("gen_ai.provider.name"), "anthropic")
    })

    it("renames deprecated system values to current provider names", () => {
      const cases = [
        ["az.ai.openai", "azure.ai.openai"],
        ["az.ai.inference", "azure.ai.inference"],
        ["gemini", "gcp.gemini"],
        ["vertex_ai", "gcp.vertex_ai"],
        ["xai", "x_ai"],
        ["cohere", "cohere"]
      ] as const
      for (const [system, expected] of cases) {
        const span = makeSpan()
        Telemetry.addGenAIAnnotations(span, { system })
        assert.strictEqual(span.attributes.get("gen_ai.provider.name"), expected)
      }
    })
  })

  describe("LanguageModel spans", () => {
    it.effect("are client spans with namespaced, primitive tool attributes", () =>
      Effect.gen(function*() {
        const spans: Array<Tracer.NativeSpan> = []
        const tracer = Tracer.make({
          span(options) {
            const span = new Tracer.NativeSpan(options)
            spans.push(span)
            return span
          }
        })
        yield* LanguageModel.generateText({
          prompt: "hi",
          concurrency: 2,
          toolkit: EchoToolkit,
          toolChoice: { oneOf: ["EchoTool"] }
        }).pipe(
          TestUtils.withLanguageModel({ generateText: [] }),
          Effect.provide(EchoToolkitLayer),
          Effect.withTracer(tracer)
        )
        const span = spans.find((span) => span.name === "LanguageModel.generateText")
        assert.isDefined(span)
        assert.strictEqual(span!.kind, "client")
        assert.strictEqual(span!.attributes.get("effect.ai.concurrency"), 2)
        assert.strictEqual(span!.attributes.get("effect.ai.tool_choice"), "{\"oneOf\":[\"EchoTool\"]}")
        assert.isFalse(span!.attributes.has("concurrency"))
        assert.isFalse(span!.attributes.has("toolChoice"))
      }))
  })
})
