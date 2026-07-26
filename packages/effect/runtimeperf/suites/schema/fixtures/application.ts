import * as Schema from "effect/Schema"
import * as SchemaParser from "effect/SchemaParser"
import assert from "node:assert/strict"
import * as v from "valibot"
import { z } from "zod/v4"

const effectMessage = Schema.Struct({
  id: Schema.String,
  timestamp: Schema.NumberFromString,
  user: Schema.Struct({
    name: Schema.NonEmptyString,
    email: Schema.optionalKey(Schema.String)
  }),
  tags: Schema.Array(Schema.String),
  payload: Schema.Union([
    Schema.Struct({ type: Schema.Literal("text"), value: Schema.String }),
    Schema.Struct({ type: Schema.Literal("count"), value: Schema.Number })
  ])
})

const valibotMessage = v.object({
  id: v.string(),
  timestamp: v.pipe(v.string(), v.transform(Number), v.number()),
  user: v.object({
    name: v.pipe(v.string(), v.nonEmpty()),
    email: v.optional(v.string())
  }),
  tags: v.array(v.string()),
  payload: v.variant("type", [
    v.object({ type: v.literal("text"), value: v.string() }),
    v.object({ type: v.literal("count"), value: v.number() })
  ])
})

const zodMessage = z.object({
  id: z.string(),
  timestamp: z.string().transform(Number),
  user: z.object({
    name: z.string().min(1),
    email: z.string().optional()
  }),
  tags: z.array(z.string()),
  payload: z.discriminatedUnion("type", [
    z.object({ type: z.literal("text"), value: z.string() }),
    z.object({ type: z.literal("count"), value: z.number() })
  ])
})

const input = {
  id: "message-1",
  timestamp: "123",
  user: { name: "Ada", email: "ada@example.com" },
  tags: ["runtime", "schema", "benchmark"],
  payload: { type: "text", value: "hello" }
}

const expected = {
  ...input,
  timestamp: 123
}

export const effectMessageValid = () => {
  const run = SchemaParser.decodeUnknownExit(effectMessage)
  return {
    run: () => run(input),
    validate: (result) => {
      assert.equal(result._tag, "Success")
      assert.deepEqual(result.value, expected)
    }
  }
}

export const valibotMessageValid = () => {
  const run = v.safeParser(valibotMessage)
  return {
    run: () => run(input),
    validate: (result) => {
      assert.equal(result.success, true)
      assert.deepEqual(result.output, expected)
    }
  }
}

export const zodMessageValid = () => {
  return {
    run: () => zodMessage.safeParse(input, { jitless: true }),
    validate: (result) => {
      assert.equal(result.success, true)
      assert.deepEqual(result.data, expected)
    }
  }
}
