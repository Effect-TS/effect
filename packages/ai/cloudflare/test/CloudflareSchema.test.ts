import * as CloudflareSchema from "@effect/ai-cloudflare/CloudflareSchema"
import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import { structuredExamples } from "./fixtures/structured-examples.ts"

const structuredScoreAnswer = {
  type: "score",
  score: 1.09,
  confidence: 0.87,
  legend: {
    "0": { what: "Cosmetic; no impact to functionality", examples: ["typo in a label", "misaligned icon"] },
    "1": {
      what: "Broken or degraded feature, but workaround exists",
      examples: ["export fails in one browser but works in another"]
    },
    "2": { what: "Blocking issue; no workaround exists", examples: ["cannot log in", "data loss"] }
  },
  probabilities: { "0": 0.0, "1": 0.91, "2": 0.09 }
}

describe("CloudflareSchema", () => {
  it.each(structuredExamples)("round trips the structured questions of the $name example", ({ questions }) => {
    const Questions = Schema.Record(Schema.String, CloudflareSchema.Question)
    const decoded = Schema.decodeUnknownSync(Questions)(questions)

    assert.deepStrictEqual(JSON.parse(JSON.stringify(Schema.encodeSync(Questions)(decoded))), questions)
  })

  it.each([
    { name: "a numeric score level", question: { type: "score", instructions: "Rate", criteria: [0, 1] } },
    {
      name: "a boolean noul outcome",
      question: { type: "noul", instructions: "Urgent", criteria: { false: false, true: true } }
    }
  ])("accepts $name", ({ question }) => {
    const decoded = Schema.decodeUnknownSync(CloudflareSchema.Question)(question)

    assert.deepStrictEqual(JSON.parse(JSON.stringify(decoded)), question)
  })

  it.each([
    { name: "null instructions", question: { type: "noul", instructions: null } },
    { name: "numeric instructions", question: { type: "noul", instructions: 1 } }
  ])("rejects $name", ({ question }) => {
    assert.throws(() => Schema.decodeUnknownSync(CloudflareSchema.Question)(question))
  })

  it("decodes a score answer whose legend holds structured levels", () => {
    const decoded = Schema.decodeUnknownSync(CloudflareSchema.ScoreAnswer)(structuredScoreAnswer)

    assert.deepStrictEqual(JSON.parse(JSON.stringify(decoded)), structuredScoreAnswer)
  })

  it("rejects a score answer without a legend", () => {
    const { legend: _legend, ...withoutLegend } = structuredScoreAnswer

    assert.throws(() => Schema.decodeUnknownSync(CloudflareSchema.ScoreAnswer)(withoutLegend))
  })
})
