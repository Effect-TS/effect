import type * as Response from "@effect/ai/Response"
import * as Tool from "@effect/ai/Tool"
import { Schema } from "effect"
import { describe, expect, it } from "tstyche"

describe("Tool", () => {
  it("infers struct parameters", () => {
    const _Read = Tool.make("Read", {
      parameters: {
        filePath: Schema.String
      }
    })

    expect<Tool.Parameters<typeof _Read>>().type.toBe<{
      readonly filePath: string
    }>()
    expect<Tool.ParametersEncoded<typeof _Read>>().type.toBe<{
      readonly filePath: string
    }>()
    expect<Response.ToolCallParts<{ readonly Read: typeof _Read }>>().type.toBe<
      Response.ToolCallPart<"Read", { readonly filePath: string }>
    >()
  })

  it("infers empty parameters", () => {
    const _Empty = Tool.make("Empty")

    expect<Tool.ParametersSchema<typeof _Empty>>().type.toBe<typeof Tool.EmptyParams>()
    expect<Tool.Parameters<typeof _Empty>>().type.toBe<{
      readonly [x: string]: never
    }>()
    expect<Tool.ParametersEncoded<typeof _Empty>>().type.toBe<{
      readonly [x: string]: never
    }>()
  })

  it("accepts explicit empty parameters", () => {
    const _Empty = Tool.make("Empty", {
      parameters: Tool.EmptyParams
    })

    expect<Tool.ParametersSchema<typeof _Empty>>().type.toBe<typeof Tool.EmptyParams>()
    expect<Tool.Parameters<typeof _Empty>>().type.toBe<{
      readonly [x: string]: never
    }>()
  })

  it("infers setParameters with struct fields", () => {
    const _Read = Tool.make("Read").setParameters({
      filePath: Schema.String
    })

    expect<Tool.Parameters<typeof _Read>>().type.toBe<{
      readonly filePath: string
    }>()
    expect<Tool.ParametersEncoded<typeof _Read>>().type.toBe<{
      readonly filePath: string
    }>()
    expect<Response.ToolCallParts<{ readonly Read: typeof _Read }>>().type.toBe<
      Response.ToolCallPart<"Read", { readonly filePath: string }>
    >()
  })

  it("infers setParameters with a struct schema", () => {
    const Parameters = Schema.Struct({
      filePath: Schema.String
    })
    const _Read = Tool.make("Read").setParameters(Parameters)

    expect<Tool.ParametersSchema<typeof _Read>>().type.toBe<typeof Parameters>()
    expect<Tool.Parameters<typeof _Read>>().type.toBe<{
      readonly filePath: string
    }>()
    expect<Tool.ParametersEncoded<typeof _Read>>().type.toBe<{
      readonly filePath: string
    }>()
  })

  it("infers setParameters with empty parameters", () => {
    const _Empty = Tool.make("Empty", {
      parameters: {
        filePath: Schema.String
      }
    }).setParameters(Tool.EmptyParams)

    expect<Tool.ParametersSchema<typeof _Empty>>().type.toBe<typeof Tool.EmptyParams>()
    expect<Tool.Parameters<typeof _Empty>>().type.toBe<{
      readonly [x: string]: never
    }>()
    expect<Tool.ParametersEncoded<typeof _Empty>>().type.toBe<{
      readonly [x: string]: never
    }>()
  })
})
