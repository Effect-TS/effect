import type * as Context from "effect/Context"
import type * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as AiTool from "./AiTool.js"
import * as AiToolkit from "./AiToolkit.js"

export type AiResponseStream<Tools extends Record<string, AiTool.Any>> =
  | TextPart
  | ToolCallResults<Tools>

export type Part<Tools extends Record<string, AiTool.Any>> =
  | TextPart
  | ToolCallResults<Tools>

export const ProviderMetadata = {
  TextPart: "@effect/ai/AiResponseStream/TextPart",
  ToolCallResultPart: "@effect/ai/AiResponseStream/ToolCallResultPart"
} as const satisfies Record<string, ProviderMetadata.AllKeys>

export declare namespace ProviderMetadata {
  export type AllKeys = TextPart | ToolCallResultPart

  export type TextPart = "@effect/ai/AiResponseStream/TextPart"

  export type ToolCallResultPart = "@effect/ai/AiResponseStream/ToolCallResultPart"
}

export type ExtractProviderMetadata<
  Metadata extends Record<string, any>,
  Key extends ProviderMetadata.AllKeys
> = Key extends keyof Metadata ? Metadata[Key] : never

export interface BasePart<Key extends ProviderMetadata.AllKeys> {
  readonly providerMetadata: Record<string, Record<string, unknown>>

  readonly getProviderMetadata: <Identifier, Metadata extends Record<string, any>>(
    tag: Context.Tag<Identifier, Metadata>
  ) => Option.Option<ExtractProviderMetadata<Metadata, Key>>

  readonly setProviderMetadata: <Identifier, Metadata extends Record<string, any>>(
    tag: Context.Tag<Identifier, Metadata>,
    metadata: ExtractProviderMetadata<Metadata, Key>
  ) => this
}

export interface TextPart extends BasePart<"@effect/ai/AiResponseStream/TextPart"> {
  readonly type: "text-part"
  readonly text: string
}

export interface ToolCallResult<Name extends string, Result>
  extends BasePart<"@effect/ai/AiResponseStream/ToolCallResultPart">
{
  readonly type: "tool-result"
  readonly name: Name
  readonly result: Result
}

export type ToolCallResults<Tools extends Record<string, AiTool.Any>> = {
  [ToolName in keyof Tools]: ToolName extends string ? ToolCallResult<ToolName, AiTool.Success<Tools[ToolName]>> : never
}[keyof Tools]

export const ToolCallResult = <Tool extends AiTool.Any>(
  tool: Tool
): Schema.Schema<{
  readonly type: Schema.tag<"tool-result">
  readonly name: Schema.Literal<[Tool["name"]]>
  readonly result: Schema.Schema<AiTool.Success<Tool>>
}, {
  readonly type: Schema.tag<"tool-result">
  readonly name: Schema.Literal<[Tool["name"]]>
  readonly result: Schema.Schema<AiTool.Success<Tool>>
}, AiTool.Requirements<Tool>> =>
  Schema.Struct({
    type: Schema.tag("tool-result"),
    name: Schema.Literal(tool.name),
    result: tool.successSchema
  }) as any

const MyTool = AiTool.make("MyTool", {
  success: Schema.String,
  failure: Schema.Defect,
  parameters: {
    myParam: Schema.Number
  }
})

const MyOtherTool = AiTool.make("MyOtherTool", {
  success: Schema.Number,
  failure: Schema.Defect,
  parameters: {
    myParam: Schema.String
  }
})

const MyToolkit = AiToolkit.make(
  MyTool,
  MyOtherTool
)

type Response = Schema.Simplify<AiResponseStream<AiToolkit.Tools<typeof MyToolkit>>>
