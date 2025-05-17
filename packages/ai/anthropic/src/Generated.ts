/**
 * @since 1.0.0
 */
import type * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientError from "@effect/platform/HttpClientError"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import type { ParseError } from "effect/ParseResult"
import * as S from "effect/Schema"

export class MessagesPostParams extends S.Struct({
  /**
   * The version of the Anthropic API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.anthropic.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The model that will complete your prompt.\n\nSee [models](https://docs.anthropic.com/en/docs/models-overview) for additional details and options.
 */
export class Model extends S.Union(
  /**
   * Our most intelligent model
   */
  S.Literal("claude-3-7-sonnet-latest"),
  /**
   * Our most intelligent model
   */
  S.Literal("claude-3-7-sonnet-20250219"),
  /**
   * Fastest and most compact model for near-instant responsiveness
   */
  S.Literal("claude-3-5-haiku-latest"),
  /**
   * Our fastest model
   */
  S.Literal("claude-3-5-haiku-20241022"),
  /**
   * Our previous most intelligent model
   */
  S.Literal("claude-3-5-sonnet-latest"),
  /**
   * Our previous most intelligent model
   */
  S.Literal("claude-3-5-sonnet-20241022"),
  S.Literal("claude-3-5-sonnet-20240620"),
  /**
   * Excels at writing and complex tasks
   */
  S.Literal("claude-3-opus-latest"),
  /**
   * Excels at writing and complex tasks
   */
  S.Literal("claude-3-opus-20240229"),
  /**
   * Balance of speed and intelligence
   */
  S.Literal("claude-3-sonnet-20240229"),
  /**
   * Our previous most fast and cost-effective
   */
  S.Literal("claude-3-haiku-20240307"),
  S.Literal("claude-2.1"),
  S.Literal("claude-2.0")
) {}

export class CacheControlEphemeralType extends S.Literal("ephemeral") {}

export class CacheControlEphemeral extends S.Struct({
  "type": CacheControlEphemeralType
}) {}

export class RequestCharLocationCitationType extends S.Literal("char_location") {}

export class RequestCharLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.NullOr(S.String.pipe(S.minLength(1), S.maxLength(255))),
  "end_char_index": S.Int,
  "start_char_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "type": RequestCharLocationCitationType
}) {}

export class RequestPageLocationCitationType extends S.Literal("page_location") {}

export class RequestPageLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.NullOr(S.String.pipe(S.minLength(1), S.maxLength(255))),
  "end_page_number": S.Int,
  "start_page_number": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "type": RequestPageLocationCitationType
}) {}

export class RequestContentBlockLocationCitationType extends S.Literal("content_block_location") {}

export class RequestContentBlockLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.NullOr(S.String.pipe(S.minLength(1), S.maxLength(255))),
  "end_block_index": S.Int,
  "start_block_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "type": RequestContentBlockLocationCitationType
}) {}

export class RequestWebSearchResultLocationCitationType extends S.Literal("web_search_result_location") {}

export class RequestWebSearchResultLocationCitation extends S.Struct({
  "cited_text": S.String,
  "encrypted_index": S.String,
  "title": S.NullOr(S.String.pipe(S.minLength(1), S.maxLength(255))),
  "type": RequestWebSearchResultLocationCitationType,
  "url": S.String.pipe(S.minLength(1), S.maxLength(2048))
}) {}

export class RequestTextBlockType extends S.Literal("text") {}

export class RequestTextBlock extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true }),
  "citations": S.optionalWith(
    S.Array(
      S.Union(
        RequestCharLocationCitation,
        RequestPageLocationCitation,
        RequestContentBlockLocationCitation,
        RequestWebSearchResultLocationCitation
      )
    ),
    { nullable: true }
  ),
  "text": S.String.pipe(S.minLength(1)),
  "type": RequestTextBlockType
}) {}

export class Base64ImageSourceMediaType extends S.Literal("image/jpeg", "image/png", "image/gif", "image/webp") {}

export class Base64ImageSourceType extends S.Literal("base64") {}

export class Base64ImageSource extends S.Struct({
  "data": S.String,
  "media_type": Base64ImageSourceMediaType,
  "type": Base64ImageSourceType
}) {}

export class URLImageSourceType extends S.Literal("url") {}

export class URLImageSource extends S.Struct({
  "type": URLImageSourceType,
  "url": S.String
}) {}

export class RequestImageBlockType extends S.Literal("image") {}

export class RequestImageBlock extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true }),
  "source": S.Union(Base64ImageSource, URLImageSource),
  "type": RequestImageBlockType
}) {}

export class RequestToolUseBlockType extends S.Literal("tool_use") {}

export class RequestToolUseBlock extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true }),
  "id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": S.String.pipe(S.minLength(1), S.maxLength(200)),
  "type": RequestToolUseBlockType
}) {}

export class RequestServerToolUseBlockName extends S.Literal("web_search") {}

export class RequestServerToolUseBlockType extends S.Literal("server_tool_use") {}

export class RequestServerToolUseBlock extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true }),
  "id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": RequestServerToolUseBlockName,
  "type": RequestServerToolUseBlockType
}) {}

export class RequestWebSearchResultBlockType extends S.Literal("web_search_result") {}

export class RequestWebSearchResultBlock extends S.Struct({
  "encrypted_content": S.String,
  "page_age": S.optionalWith(S.String, { nullable: true }),
  "title": S.String.pipe(S.minLength(1)),
  "type": RequestWebSearchResultBlockType,
  "url": S.String.pipe(S.minLength(1))
}) {}

export class WebSearchToolResultErrorCode
  extends S.Literal("invalid_tool_input", "unavailable", "max_uses_exceeded", "too_many_requests", "query_too_long")
{}

export class RequestWebSearchToolResultErrorType extends S.Literal("web_search_tool_result_error") {}

export class RequestWebSearchToolResultError extends S.Struct({
  "error_code": WebSearchToolResultErrorCode,
  "type": RequestWebSearchToolResultErrorType
}) {}

export class RequestWebSearchToolResultBlockType extends S.Literal("web_search_tool_result") {}

export class RequestWebSearchToolResultBlock extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true }),
  "content": S.Union(S.Array(RequestWebSearchResultBlock), RequestWebSearchToolResultError),
  "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
  "type": RequestWebSearchToolResultBlockType
}) {}

export class RequestToolResultBlockType extends S.Literal("tool_result") {}

export class RequestToolResultBlock extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true }),
  "content": S.optionalWith(S.Union(S.String, S.Array(S.Union(RequestTextBlock, RequestImageBlock))), {
    nullable: true
  }),
  "is_error": S.optionalWith(S.Boolean, { nullable: true }),
  "tool_use_id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "type": RequestToolResultBlockType
}) {}

export class RequestCitationsConfig extends S.Struct({
  "enabled": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class Base64PDFSourceMediaType extends S.Literal("application/pdf") {}

export class Base64PDFSourceType extends S.Literal("base64") {}

export class Base64PDFSource extends S.Struct({
  "data": S.String,
  "media_type": Base64PDFSourceMediaType,
  "type": Base64PDFSourceType
}) {}

export class PlainTextSourceMediaType extends S.Literal("text/plain") {}

export class PlainTextSourceType extends S.Literal("text") {}

export class PlainTextSource extends S.Struct({
  "data": S.String,
  "media_type": PlainTextSourceMediaType,
  "type": PlainTextSourceType
}) {}

export class ContentBlockSourceType extends S.Literal("content") {}

export class ContentBlockSource extends S.Struct({
  "content": S.Union(S.String, S.Array(S.Union(RequestTextBlock, RequestImageBlock))),
  "type": ContentBlockSourceType
}) {}

export class URLPDFSourceType extends S.Literal("url") {}

export class URLPDFSource extends S.Struct({
  "type": URLPDFSourceType,
  "url": S.String
}) {}

export class RequestDocumentBlockType extends S.Literal("document") {}

export class RequestDocumentBlock extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true }),
  "citations": S.optionalWith(RequestCitationsConfig, { nullable: true }),
  "context": S.optionalWith(S.String.pipe(S.minLength(1)), { nullable: true }),
  "source": S.Union(Base64PDFSource, PlainTextSource, ContentBlockSource, URLPDFSource),
  "title": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(500)), { nullable: true }),
  "type": RequestDocumentBlockType
}) {}

export class RequestThinkingBlockType extends S.Literal("thinking") {}

export class RequestThinkingBlock extends S.Struct({
  "signature": S.String,
  "thinking": S.String,
  "type": RequestThinkingBlockType
}) {}

export class RequestRedactedThinkingBlockType extends S.Literal("redacted_thinking") {}

export class RequestRedactedThinkingBlock extends S.Struct({
  "data": S.String,
  "type": RequestRedactedThinkingBlockType
}) {}

export class InputContentBlock extends S.Union(
  RequestTextBlock,
  RequestImageBlock,
  RequestToolUseBlock,
  RequestServerToolUseBlock,
  RequestWebSearchToolResultBlock,
  RequestToolResultBlock,
  RequestDocumentBlock,
  RequestThinkingBlock,
  RequestRedactedThinkingBlock
) {}

export class InputMessageRole extends S.Literal("user", "assistant") {}

export class InputMessage extends S.Struct({
  "content": S.Union(S.String, S.Array(InputContentBlock)),
  "role": InputMessageRole
}) {}

export class Metadata extends S.Struct({
  /**
   * An external identifier for the user who is associated with the request.
   *
   * This should be a uuid, hash value, or other opaque identifier. Anthropic may use this id to help detect abuse. Do not include any identifying information such as name, email address, or phone number.
   */
  "user_id": S.optionalWith(S.String.pipe(S.maxLength(256)), { nullable: true })
}) {}

export class ThinkingConfigEnabledType extends S.Literal("enabled") {}

export class ThinkingConfigEnabled extends S.Struct({
  /**
   * Determines how many tokens Claude can use for its internal reasoning process. Larger budgets can enable more thorough analysis for complex problems, improving response quality.
   *
   * Must be ≥1024 and less than `max_tokens`.
   *
   * See [extended thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking) for details.
   */
  "budget_tokens": S.Int.pipe(S.greaterThanOrEqualTo(1024)),
  "type": ThinkingConfigEnabledType
}) {}

export class ThinkingConfigDisabledType extends S.Literal("disabled") {}

export class ThinkingConfigDisabled extends S.Struct({
  "type": ThinkingConfigDisabledType
}) {}

/**
 * Configuration for enabling Claude's extended thinking.
 *
 * When enabled, responses include `thinking` content blocks showing Claude's thinking process before the final answer. Requires a minimum budget of 1,024 tokens and counts towards your `max_tokens` limit.
 *
 * See [extended thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking) for details.
 */
export class ThinkingConfigParam extends S.Union(ThinkingConfigEnabled, ThinkingConfigDisabled) {}

export class ToolChoiceAutoType extends S.Literal("auto") {}

/**
 * The model will automatically decide whether to use tools.
 */
export class ToolChoiceAuto extends S.Struct({
  /**
   * Whether to disable parallel tool use.
   *
   * Defaults to `false`. If set to `true`, the model will output at most one tool use.
   */
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true }),
  "type": ToolChoiceAutoType
}) {}

export class ToolChoiceAnyType extends S.Literal("any") {}

/**
 * The model will use any available tools.
 */
export class ToolChoiceAny extends S.Struct({
  /**
   * Whether to disable parallel tool use.
   *
   * Defaults to `false`. If set to `true`, the model will output exactly one tool use.
   */
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true }),
  "type": ToolChoiceAnyType
}) {}

export class ToolChoiceToolType extends S.Literal("tool") {}

/**
 * The model will use the specified tool with `tool_choice.name`.
 */
export class ToolChoiceTool extends S.Struct({
  /**
   * Whether to disable parallel tool use.
   *
   * Defaults to `false`. If set to `true`, the model will output exactly one tool use.
   */
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * The name of the tool to use.
   */
  "name": S.String,
  "type": ToolChoiceToolType
}) {}

export class ToolChoiceNoneType extends S.Literal("none") {}

/**
 * The model will not be allowed to use tools.
 */
export class ToolChoiceNone extends S.Struct({
  "type": ToolChoiceNoneType
}) {}

/**
 * How the model should use the provided tools. The model can use a specific tool, any available tool, decide by itself, or not use tools at all.
 */
export class ToolChoice extends S.Union(ToolChoiceAuto, ToolChoiceAny, ToolChoiceTool, ToolChoiceNone) {}

export class ToolTypeEnum extends S.Literal("custom") {}

export class InputSchemaType extends S.Literal("object") {}

export class InputSchema extends S.Struct({
  "properties": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "type": InputSchemaType
}) {}

export class Tool extends S.Struct({
  "type": S.optionalWith(ToolTypeEnum, { nullable: true }),
  /**
   * Description of what this tool does.
   *
   * Tool descriptions should be as detailed as possible. The more information that the model has about what the tool is and how to use it, the better it will perform. You can use natural language descriptions to reinforce important aspects of the tool input JSON schema.
   */
  "description": S.optionalWith(S.String, { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": S.String.pipe(S.minLength(1), S.maxLength(64), S.pattern(new RegExp("^[a-zA-Z0-9_-]{1,64}$"))),
  /**
   * [JSON schema](https://json-schema.org/draft/2020-12) for this tool's input.
   *
   * This defines the shape of the `input` that your tool accepts and that the model will produce.
   */
  "input_schema": InputSchema,
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true })
}) {}

/**
 * Name of the tool.
 *
 * This is how the tool will be called by the model and in `tool_use` blocks.
 */
export class BashTool20250124Name extends S.Literal("bash") {}

export class BashTool20250124Type extends S.Literal("bash_20250124") {}

export class BashTool20250124 extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": BashTool20250124Name,
  "type": BashTool20250124Type
}) {}

/**
 * Name of the tool.
 *
 * This is how the tool will be called by the model and in `tool_use` blocks.
 */
export class TextEditor20250124Name extends S.Literal("str_replace_editor") {}

export class TextEditor20250124Type extends S.Literal("text_editor_20250124") {}

export class TextEditor20250124 extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": TextEditor20250124Name,
  "type": TextEditor20250124Type
}) {}

/**
 * Name of the tool.
 *
 * This is how the tool will be called by the model and in `tool_use` blocks.
 */
export class WebSearchTool20250305Name extends S.Literal("web_search") {}

export class WebSearchTool20250305Type extends S.Literal("web_search_20250305") {}

export class UserLocationType extends S.Literal("approximate") {}

export class UserLocation extends S.Struct({
  /**
   * The city of the user.
   */
  "city": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(255)), { nullable: true }),
  /**
   * The two letter [ISO country code](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) of the user.
   */
  "country": S.optionalWith(S.String.pipe(S.minLength(2), S.maxLength(2)), { nullable: true }),
  /**
   * The region of the user.
   */
  "region": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(255)), { nullable: true }),
  /**
   * The [IANA timezone](https://nodatime.org/TimeZones) of the user.
   */
  "timezone": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(255)), { nullable: true }),
  "type": UserLocationType
}) {}

export class WebSearchTool20250305 extends S.Struct({
  /**
   * If provided, only these domains will be included in results. Cannot be used alongside `blocked_domains`.
   */
  "allowed_domains": S.optionalWith(S.Array(S.String), { nullable: true }),
  /**
   * If provided, these domains will never appear in results. Cannot be used alongside `allowed_domains`.
   */
  "blocked_domains": S.optionalWith(S.Array(S.String), { nullable: true }),
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true }),
  /**
   * Maximum number of times the tool can be used in the API request.
   */
  "max_uses": S.optionalWith(S.Int.pipe(S.greaterThan(0)), { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": WebSearchTool20250305Name,
  "type": WebSearchTool20250305Type,
  /**
   * Parameters for the user's location. Used to provide more relevant search results.
   */
  "user_location": S.optionalWith(UserLocation, { nullable: true })
}) {}

export class CreateMessageParams extends S.Class<CreateMessageParams>("CreateMessageParams")({
  "model": Model,
  /**
   * Input messages.
   *
   * Our models are trained to operate on alternating `user` and `assistant` conversational turns. When creating a new `Message`, you specify the prior conversational turns with the `messages` parameter, and the model then generates the next `Message` in the conversation. Consecutive `user` or `assistant` turns in your request will be combined into a single turn.
   *
   * Each input message must be an object with a `role` and `content`. You can specify a single `user`-role message, or you can include multiple `user` and `assistant` messages.
   *
   * If the final message uses the `assistant` role, the response content will continue immediately from the content in that message. This can be used to constrain part of the model's response.
   *
   * Example with a single `user` message:
   *
   * ```json
   * [{"role": "user", "content": "Hello, Claude"}]
   * ```
   *
   * Example with multiple conversational turns:
   *
   * ```json
   * [
   *   {"role": "user", "content": "Hello there."},
   *   {"role": "assistant", "content": "Hi, I'm Claude. How can I help you?"},
   *   {"role": "user", "content": "Can you explain LLMs in plain English?"},
   * ]
   * ```
   *
   * Example with a partially-filled response from Claude:
   *
   * ```json
   * [
   *   {"role": "user", "content": "What's the Greek name for Sun? (A) Sol (B) Helios (C) Sun"},
   *   {"role": "assistant", "content": "The best answer is ("},
   * ]
   * ```
   *
   * Each input message `content` may be either a single `string` or an array of content blocks, where each block has a specific `type`. Using a `string` for `content` is shorthand for an array of one content block of type `"text"`. The following input messages are equivalent:
   *
   * ```json
   * {"role": "user", "content": "Hello, Claude"}
   * ```
   *
   * ```json
   * {"role": "user", "content": [{"type": "text", "text": "Hello, Claude"}]}
   * ```
   *
   * Starting with Claude 3 models, you can also send image content blocks:
   *
   * ```json
   * {"role": "user", "content": [
   *   {
   *     "type": "image",
   *     "source": {
   *       "type": "base64",
   *       "media_type": "image/jpeg",
   *       "data": "/9j/4AAQSkZJRg...",
   *     }
   *   },
   *   {"type": "text", "text": "What is in this image?"}
   * ]}
   * ```
   *
   * We currently support the `base64` source type for images, and the `image/jpeg`, `image/png`, `image/gif`, and `image/webp` media types.
   *
   * See [examples](https://docs.anthropic.com/en/api/messages-examples#vision) for more input examples.
   *
   * Note that if you want to include a [system prompt](https://docs.anthropic.com/en/docs/system-prompts), you can use the top-level `system` parameter — there is no `"system"` role for input messages in the Messages API.
   *
   * There is a limit of 100000 messages in a single request.
   */
  "messages": S.Array(InputMessage),
  /**
   * The maximum number of tokens to generate before stopping.
   *
   * Note that our models may stop _before_ reaching this maximum. This parameter only specifies the absolute maximum number of tokens to generate.
   *
   * Different models have different maximum values for this parameter.  See [models](https://docs.anthropic.com/en/docs/models-overview) for details.
   */
  "max_tokens": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  /**
   * An object describing metadata about the request.
   */
  "metadata": S.optionalWith(Metadata, { nullable: true }),
  /**
   * Custom text sequences that will cause the model to stop generating.
   *
   * Our models will normally stop when they have naturally completed their turn, which will result in a response `stop_reason` of `"end_turn"`.
   *
   * If you want the model to stop generating when it encounters custom strings of text, you can use the `stop_sequences` parameter. If the model encounters one of the custom sequences, the response `stop_reason` value will be `"stop_sequence"` and the response `stop_sequence` value will contain the matched stop sequence.
   */
  "stop_sequences": S.optionalWith(S.Array(S.String), { nullable: true }),
  /**
   * Whether to incrementally stream the response using server-sent events.
   *
   * See [streaming](https://docs.anthropic.com/en/api/messages-streaming) for details.
   */
  "stream": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * System prompt.
   *
   * A system prompt is a way of providing context and instructions to Claude, such as specifying a particular goal or role. See our [guide to system prompts](https://docs.anthropic.com/en/docs/system-prompts).
   */
  "system": S.optionalWith(S.Union(S.String, S.Array(RequestTextBlock)), { nullable: true }),
  /**
   * Amount of randomness injected into the response.
   *
   * Defaults to `1.0`. Ranges from `0.0` to `1.0`. Use `temperature` closer to `0.0` for analytical / multiple choice, and closer to `1.0` for creative and generative tasks.
   *
   * Note that even with `temperature` of `0.0`, the results will not be fully deterministic.
   */
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true }),
  "thinking": S.optionalWith(ThinkingConfigParam, { nullable: true }),
  "tool_choice": S.optionalWith(ToolChoice, { nullable: true }),
  /**
   * Definitions of tools that the model may use.
   *
   * If you include `tools` in your API request, the model may return `tool_use` content blocks that represent the model's use of those tools. You can then run those tools using the tool input generated by the model and then optionally return results back to the model using `tool_result` content blocks.
   *
   * Each tool definition includes:
   *
   * * `name`: Name of the tool.
   * * `description`: Optional, but strongly-recommended description of the tool.
   * * `input_schema`: [JSON schema](https://json-schema.org/draft/2020-12) for the tool `input` shape that the model will produce in `tool_use` output content blocks.
   *
   * For example, if you defined `tools` as:
   *
   * ```json
   * [
   *   {
   *     "name": "get_stock_price",
   *     "description": "Get the current stock price for a given ticker symbol.",
   *     "input_schema": {
   *       "type": "object",
   *       "properties": {
   *         "ticker": {
   *           "type": "string",
   *           "description": "The stock ticker symbol, e.g. AAPL for Apple Inc."
   *         }
   *       },
   *       "required": ["ticker"]
   *     }
   *   }
   * ]
   * ```
   *
   * And then asked the model "What's the S&P 500 at today?", the model might produce `tool_use` content blocks in the response like this:
   *
   * ```json
   * [
   *   {
   *     "type": "tool_use",
   *     "id": "toolu_01D7FLrfh4GYq7yT1ULFeyMV",
   *     "name": "get_stock_price",
   *     "input": { "ticker": "^GSPC" }
   *   }
   * ]
   * ```
   *
   * You might then run your `get_stock_price` tool with `{"ticker": "^GSPC"}` as an input, and return the following back to the model in a subsequent `user` message:
   *
   * ```json
   * [
   *   {
   *     "type": "tool_result",
   *     "tool_use_id": "toolu_01D7FLrfh4GYq7yT1ULFeyMV",
   *     "content": "259.75 USD"
   *   }
   * ]
   * ```
   *
   * Tools can be used for workflows that include running client-side tools and functions, or more generally whenever you want the model to produce a particular JSON structure of output.
   *
   * See our [guide](https://docs.anthropic.com/en/docs/tool-use) for more details.
   */
  "tools": S.optionalWith(S.Array(S.Union(Tool, BashTool20250124, TextEditor20250124, WebSearchTool20250305)), {
    nullable: true
  }),
  /**
   * Only sample from the top K options for each subsequent token.
   *
   * Used to remove "long tail" low probability responses. [Learn more technical details here](https://towardsdatascience.com/how-to-sample-from-language-models-682bceb97277).
   *
   * Recommended for advanced use cases only. You usually only need to use `temperature`.
   */
  "top_k": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  /**
   * Use nucleus sampling.
   *
   * In nucleus sampling, we compute the cumulative distribution over all the options for each subsequent token in decreasing probability order and cut it off once it reaches a particular probability specified by `top_p`. You should either alter `temperature` or `top_p`, but not both.
   *
   * Recommended for advanced use cases only. You usually only need to use `temperature`.
   */
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true })
}) {}

/**
 * Object type.
 *
 * For Messages, this is always `"message"`.
 */
export class MessageType extends S.Literal("message") {}

/**
 * Conversational role of the generated message.
 *
 * This will always be `"assistant"`.
 */
export class MessageRole extends S.Literal("assistant") {}

export class ResponseCharLocationCitationType extends S.Literal("char_location") {}

export class ResponseCharLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.NullOr(S.String),
  "end_char_index": S.Int,
  "start_char_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "type": ResponseCharLocationCitationType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "char_location" as const)
  )
}) {}

export class ResponsePageLocationCitationType extends S.Literal("page_location") {}

export class ResponsePageLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.NullOr(S.String),
  "end_page_number": S.Int,
  "start_page_number": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "type": ResponsePageLocationCitationType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "page_location" as const)
  )
}) {}

export class ResponseContentBlockLocationCitationType extends S.Literal("content_block_location") {}

export class ResponseContentBlockLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.NullOr(S.String),
  "end_block_index": S.Int,
  "start_block_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "type": ResponseContentBlockLocationCitationType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "content_block_location" as const)
  )
}) {}

export class ResponseWebSearchResultLocationCitationType extends S.Literal("web_search_result_location") {}

export class ResponseWebSearchResultLocationCitation extends S.Struct({
  "cited_text": S.String,
  "encrypted_index": S.String,
  "title": S.NullOr(S.String),
  "type": ResponseWebSearchResultLocationCitationType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "web_search_result_location" as const)
  ),
  "url": S.String
}) {}

export class ResponseTextBlockType extends S.Literal("text") {}

export class ResponseTextBlock extends S.Struct({
  /**
   * Citations supporting the text block.
   *
   * The type of citation returned will depend on the type of document being cited. Citing a PDF results in `page_location`, plain text results in `char_location`, and content document results in `content_block_location`.
   */
  "citations": S.optionalWith(
    S.NullOr(
      S.Array(
        S.Union(
          ResponseCharLocationCitation,
          ResponsePageLocationCitation,
          ResponseContentBlockLocationCitation,
          ResponseWebSearchResultLocationCitation
        )
      )
    ),
    { default: () => null }
  ),
  "text": S.String.pipe(S.minLength(0), S.maxLength(5000000)),
  "type": ResponseTextBlockType.pipe(S.propertySignature, S.withConstructorDefault(() => "text" as const))
}) {}

export class ResponseToolUseBlockType extends S.Literal("tool_use") {}

export class ResponseToolUseBlock extends S.Struct({
  "id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": S.String.pipe(S.minLength(1)),
  "type": ResponseToolUseBlockType.pipe(S.propertySignature, S.withConstructorDefault(() => "tool_use" as const))
}) {}

export class ResponseServerToolUseBlockName extends S.Literal("web_search") {}

export class ResponseServerToolUseBlockType extends S.Literal("server_tool_use") {}

export class ResponseServerToolUseBlock extends S.Struct({
  "id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": ResponseServerToolUseBlockName,
  "type": ResponseServerToolUseBlockType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "server_tool_use" as const)
  )
}) {}

export class ResponseWebSearchToolResultErrorType extends S.Literal("web_search_tool_result_error") {}

export class ResponseWebSearchToolResultError extends S.Struct({
  "error_code": WebSearchToolResultErrorCode,
  "type": ResponseWebSearchToolResultErrorType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "web_search_tool_result_error" as const)
  )
}) {}

export class ResponseWebSearchResultBlockType extends S.Literal("web_search_result") {}

export class ResponseWebSearchResultBlock extends S.Struct({
  "encrypted_content": S.String,
  "page_age": S.optionalWith(S.NullOr(S.String), { default: () => null }),
  "title": S.String,
  "type": ResponseWebSearchResultBlockType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "web_search_result" as const)
  ),
  "url": S.String
}) {}

export class ResponseWebSearchToolResultBlockType extends S.Literal("web_search_tool_result") {}

export class ResponseWebSearchToolResultBlock extends S.Struct({
  "content": S.Union(ResponseWebSearchToolResultError, S.Array(ResponseWebSearchResultBlock)),
  "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
  "type": ResponseWebSearchToolResultBlockType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "web_search_tool_result" as const)
  )
}) {}

export class ResponseThinkingBlockType extends S.Literal("thinking") {}

export class ResponseThinkingBlock extends S.Struct({
  "signature": S.String,
  "thinking": S.String,
  "type": ResponseThinkingBlockType.pipe(S.propertySignature, S.withConstructorDefault(() => "thinking" as const))
}) {}

export class ResponseRedactedThinkingBlockType extends S.Literal("redacted_thinking") {}

export class ResponseRedactedThinkingBlock extends S.Struct({
  "data": S.String,
  "type": ResponseRedactedThinkingBlockType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "redacted_thinking" as const)
  )
}) {}

export class ContentBlock extends S.Union(
  ResponseTextBlock,
  ResponseToolUseBlock,
  ResponseServerToolUseBlock,
  ResponseWebSearchToolResultBlock,
  ResponseThinkingBlock,
  ResponseRedactedThinkingBlock
) {}

export class StopReason
  extends S.Literal("end_turn", "max_tokens", "stop_sequence", "tool_use", "pause_turn", "refusal")
{}

export class ServerToolUsage extends S.Struct({
  /**
   * The number of web search tool requests.
   */
  "web_search_requests": S.Int.pipe(S.greaterThanOrEqualTo(0)).pipe(
    S.propertySignature,
    S.withConstructorDefault(() => 0 as const)
  )
}) {}

export class Usage extends S.Struct({
  /**
   * The number of input tokens used to create the cache entry.
   */
  "cache_creation_input_tokens": S.optionalWith(S.NullOr(S.Int.pipe(S.greaterThanOrEqualTo(0))), {
    default: () => null
  }),
  /**
   * The number of input tokens read from the cache.
   */
  "cache_read_input_tokens": S.optionalWith(S.NullOr(S.Int.pipe(S.greaterThanOrEqualTo(0))), { default: () => null }),
  /**
   * The number of input tokens which were used.
   */
  "input_tokens": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  /**
   * The number of output tokens which were used.
   */
  "output_tokens": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  /**
   * The number of server tool requests.
   */
  "server_tool_use": S.optionalWith(S.NullOr(ServerToolUsage), { default: () => null })
}) {}

export class Message extends S.Class<Message>("Message")({
  /**
   * Unique object identifier.
   *
   * The format and length of IDs may change over time.
   */
  "id": S.String,
  /**
   * Object type.
   *
   * For Messages, this is always `"message"`.
   */
  "type": MessageType.pipe(S.propertySignature, S.withConstructorDefault(() => "message" as const)),
  /**
   * Conversational role of the generated message.
   *
   * This will always be `"assistant"`.
   */
  "role": MessageRole.pipe(S.propertySignature, S.withConstructorDefault(() => "assistant" as const)),
  /**
   * Content generated by the model.
   *
   * This is an array of content blocks, each of which has a `type` that determines its shape.
   *
   * Example:
   *
   * ```json
   * [{"type": "text", "text": "Hi, I'm Claude."}]
   * ```
   *
   * If the request input `messages` ended with an `assistant` turn, then the response `content` will continue directly from that last turn. You can use this to constrain the model's output.
   *
   * For example, if the input `messages` were:
   * ```json
   * [
   *   {"role": "user", "content": "What's the Greek name for Sun? (A) Sol (B) Helios (C) Sun"},
   *   {"role": "assistant", "content": "The best answer is ("}
   * ]
   * ```
   *
   * Then the response `content` might be:
   *
   * ```json
   * [{"type": "text", "text": "B)"}]
   * ```
   */
  "content": S.Array(ContentBlock),
  "model": Model,
  /**
   * The reason that we stopped.
   *
   * This may be one the following values:
   * * `"end_turn"`: the model reached a natural stopping point
   * * `"max_tokens"`: we exceeded the requested `max_tokens` or the model's maximum
   * * `"stop_sequence"`: one of your provided custom `stop_sequences` was generated
   * * `"tool_use"`: the model invoked one or more tools
   *
   * In non-streaming mode this value is always non-null. In streaming mode, it is null in the `message_start` event and non-null otherwise.
   */
  "stop_reason": S.NullOr(StopReason),
  /**
   * Which custom stop sequence was generated, if any.
   *
   * This value will be a non-null string if one of your custom stop sequences was generated.
   */
  "stop_sequence": S.optionalWith(S.NullOr(S.String), { default: () => null }),
  /**
   * Billing and rate-limit usage.
   *
   * Anthropic's API bills and rate-limits by token counts, as tokens represent the underlying cost to our systems.
   *
   * Under the hood, the API transforms requests into a format suitable for the model. The model's output then goes through a parsing stage before becoming an API response. As a result, the token counts in `usage` will not match one-to-one with the exact visible content of an API request or response.
   *
   * For example, `output_tokens` will be non-zero, even for an empty string response from Claude.
   *
   * Total input tokens in a request is the summation of `input_tokens`, `cache_creation_input_tokens`, and `cache_read_input_tokens`.
   */
  "usage": Usage
}) {}

export class InvalidRequestErrorType extends S.Literal("invalid_request_error") {}

export class InvalidRequestError extends S.Struct({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Invalid request" as const)),
  "type": InvalidRequestErrorType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "invalid_request_error" as const)
  )
}) {}

export class AuthenticationErrorType extends S.Literal("authentication_error") {}

export class AuthenticationError extends S.Struct({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Authentication error" as const)),
  "type": AuthenticationErrorType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "authentication_error" as const)
  )
}) {}

export class BillingErrorType extends S.Literal("billing_error") {}

export class BillingError extends S.Struct({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Billing error" as const)),
  "type": BillingErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "billing_error" as const))
}) {}

export class PermissionErrorType extends S.Literal("permission_error") {}

export class PermissionError extends S.Struct({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Permission denied" as const)),
  "type": PermissionErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "permission_error" as const))
}) {}

export class NotFoundErrorType extends S.Literal("not_found_error") {}

export class NotFoundError extends S.Struct({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Not found" as const)),
  "type": NotFoundErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "not_found_error" as const))
}) {}

export class RateLimitErrorType extends S.Literal("rate_limit_error") {}

export class RateLimitError extends S.Struct({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Rate limited" as const)),
  "type": RateLimitErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "rate_limit_error" as const))
}) {}

export class GatewayTimeoutErrorType extends S.Literal("timeout_error") {}

export class GatewayTimeoutError extends S.Struct({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Request timeout" as const)),
  "type": GatewayTimeoutErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "timeout_error" as const))
}) {}

export class APIErrorType extends S.Literal("api_error") {}

export class APIError extends S.Struct({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Internal server error" as const)),
  "type": APIErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "api_error" as const))
}) {}

export class OverloadedErrorType extends S.Literal("overloaded_error") {}

export class OverloadedError extends S.Struct({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Overloaded" as const)),
  "type": OverloadedErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "overloaded_error" as const))
}) {}

export class ErrorResponseType extends S.Literal("error") {}

export class ErrorResponse extends S.Class<ErrorResponse>("ErrorResponse")({
  "error": S.Union(
    InvalidRequestError,
    AuthenticationError,
    BillingError,
    PermissionError,
    NotFoundError,
    RateLimitError,
    GatewayTimeoutError,
    APIError,
    OverloadedError
  ),
  "type": ErrorResponseType.pipe(S.propertySignature, S.withConstructorDefault(() => "error" as const))
}) {}

export class CompletePostParams extends S.Struct({
  /**
   * The version of the Anthropic API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.anthropic.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true })
}) {}

export class CompletionRequest extends S.Class<CompletionRequest>("CompletionRequest")({
  "model": Model,
  /**
   * The prompt that you want Claude to complete.
   *
   * For proper response generation you will need to format your prompt using alternating `\n\nHuman:` and `\n\nAssistant:` conversational turns. For example:
   *
   * ```
   * "\n\nHuman: {userQuestion}\n\nAssistant:"
   * ```
   *
   * See [prompt validation](https://docs.anthropic.com/en/api/prompt-validation) and our guide to [prompt design](https://docs.anthropic.com/en/docs/intro-to-prompting) for more details.
   */
  "prompt": S.String.pipe(S.minLength(1)),
  /**
   * The maximum number of tokens to generate before stopping.
   *
   * Note that our models may stop _before_ reaching this maximum. This parameter only specifies the absolute maximum number of tokens to generate.
   */
  "max_tokens_to_sample": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  /**
   * Sequences that will cause the model to stop generating.
   *
   * Our models stop on `"\n\nHuman:"`, and may include additional built-in stop sequences in the future. By providing the stop_sequences parameter, you may include additional strings that will cause the model to stop generating.
   */
  "stop_sequences": S.optionalWith(S.Array(S.String), { nullable: true }),
  /**
   * Amount of randomness injected into the response.
   *
   * Defaults to `1.0`. Ranges from `0.0` to `1.0`. Use `temperature` closer to `0.0` for analytical / multiple choice, and closer to `1.0` for creative and generative tasks.
   *
   * Note that even with `temperature` of `0.0`, the results will not be fully deterministic.
   */
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true }),
  /**
   * Use nucleus sampling.
   *
   * In nucleus sampling, we compute the cumulative distribution over all the options for each subsequent token in decreasing probability order and cut it off once it reaches a particular probability specified by `top_p`. You should either alter `temperature` or `top_p`, but not both.
   *
   * Recommended for advanced use cases only. You usually only need to use `temperature`.
   */
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true }),
  /**
   * Only sample from the top K options for each subsequent token.
   *
   * Used to remove "long tail" low probability responses. [Learn more technical details here](https://towardsdatascience.com/how-to-sample-from-language-models-682bceb97277).
   *
   * Recommended for advanced use cases only. You usually only need to use `temperature`.
   */
  "top_k": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  /**
   * An object describing metadata about the request.
   */
  "metadata": S.optionalWith(Metadata, { nullable: true }),
  /**
   * Whether to incrementally stream the response using server-sent events.
   *
   * See [streaming](https://docs.anthropic.com/en/api/streaming) for details.
   */
  "stream": S.optionalWith(S.Boolean, { nullable: true })
}) {}

/**
 * Object type.
 *
 * For Text Completions, this is always `"completion"`.
 */
export class CompletionResponseType extends S.Literal("completion") {}

export class CompletionResponse extends S.Class<CompletionResponse>("CompletionResponse")({
  /**
   * The resulting completion up to and excluding the stop sequences.
   */
  "completion": S.String,
  /**
   * Unique object identifier.
   *
   * The format and length of IDs may change over time.
   */
  "id": S.String,
  "model": Model,
  /**
   * The reason that we stopped.
   *
   * This may be one the following values:
   * * `"stop_sequence"`: we reached a stop sequence — either provided by you via the `stop_sequences` parameter, or a stop sequence built into the model
   * * `"max_tokens"`: we exceeded `max_tokens_to_sample` or the model's maximum
   */
  "stop_reason": S.NullOr(S.String),
  /**
   * Object type.
   *
   * For Text Completions, this is always `"completion"`.
   */
  "type": CompletionResponseType.pipe(S.propertySignature, S.withConstructorDefault(() => "completion" as const))
}) {}

export class ModelsListParams extends S.Struct({
  /**
   * ID of the object to use as a cursor for pagination. When provided, returns the page of results immediately before this object.
   */
  "before_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * ID of the object to use as a cursor for pagination. When provided, returns the page of results immediately after this object.
   */
  "after_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * Number of items to return per page.
   *
   * Defaults to `20`. Ranges from `1` to `1000`.
   */
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(1000)), {
    nullable: true,
    default: () => 20 as const
  }),
  /**
   * The version of the Anthropic API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.anthropic.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Object type.
 *
 * For Models, this is always `"model"`.
 */
export class ModelInfoType extends S.Literal("model") {}

export class ModelInfo extends S.Struct({
  /**
   * RFC 3339 datetime string representing the time at which the model was released. May be set to an epoch value if the release date is unknown.
   */
  "created_at": S.String,
  /**
   * A human-readable name for the model.
   */
  "display_name": S.String,
  /**
   * Unique model identifier.
   */
  "id": S.String,
  /**
   * Object type.
   *
   * For Models, this is always `"model"`.
   */
  "type": ModelInfoType.pipe(S.propertySignature, S.withConstructorDefault(() => "model" as const))
}) {}

export class ListResponseModelInfo extends S.Class<ListResponseModelInfo>("ListResponseModelInfo")({
  "data": S.Array(ModelInfo),
  /**
   * First ID in the `data` list. Can be used as the `before_id` for the previous page.
   */
  "first_id": S.NullOr(S.String),
  /**
   * Indicates if there are more results in the requested page direction.
   */
  "has_more": S.Boolean,
  /**
   * Last ID in the `data` list. Can be used as the `after_id` for the next page.
   */
  "last_id": S.NullOr(S.String)
}) {}

export class ModelsGetParams extends S.Struct({
  /**
   * The version of the Anthropic API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.anthropic.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true })
}) {}

export class MessageBatchesListParams extends S.Struct({
  /**
   * ID of the object to use as a cursor for pagination. When provided, returns the page of results immediately before this object.
   */
  "before_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * ID of the object to use as a cursor for pagination. When provided, returns the page of results immediately after this object.
   */
  "after_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * Number of items to return per page.
   *
   * Defaults to `20`. Ranges from `1` to `1000`.
   */
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(1000)), {
    nullable: true,
    default: () => 20 as const
  }),
  /**
   * The version of the Anthropic API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.anthropic.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Processing status of the Message Batch.
 */
export class MessageBatchProcessingStatus extends S.Literal("in_progress", "canceling", "ended") {}

export class RequestCounts extends S.Struct({
  /**
   * Number of requests in the Message Batch that have been canceled.
   *
   * This is zero until processing of the entire Message Batch has ended.
   */
  "canceled": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  /**
   * Number of requests in the Message Batch that encountered an error.
   *
   * This is zero until processing of the entire Message Batch has ended.
   */
  "errored": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  /**
   * Number of requests in the Message Batch that have expired.
   *
   * This is zero until processing of the entire Message Batch has ended.
   */
  "expired": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  /**
   * Number of requests in the Message Batch that are processing.
   */
  "processing": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  /**
   * Number of requests in the Message Batch that have completed successfully.
   *
   * This is zero until processing of the entire Message Batch has ended.
   */
  "succeeded": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const))
}) {}

/**
 * Object type.
 *
 * For Message Batches, this is always `"message_batch"`.
 */
export class MessageBatchType extends S.Literal("message_batch") {}

export class MessageBatch extends S.Struct({
  /**
   * RFC 3339 datetime string representing the time at which the Message Batch was archived and its results became unavailable.
   */
  "archived_at": S.NullOr(S.String),
  /**
   * RFC 3339 datetime string representing the time at which cancellation was initiated for the Message Batch. Specified only if cancellation was initiated.
   */
  "cancel_initiated_at": S.NullOr(S.String),
  /**
   * RFC 3339 datetime string representing the time at which the Message Batch was created.
   */
  "created_at": S.String,
  /**
   * RFC 3339 datetime string representing the time at which processing for the Message Batch ended. Specified only once processing ends.
   *
   * Processing ends when every request in a Message Batch has either succeeded, errored, canceled, or expired.
   */
  "ended_at": S.NullOr(S.String),
  /**
   * RFC 3339 datetime string representing the time at which the Message Batch will expire and end processing, which is 24 hours after creation.
   */
  "expires_at": S.String,
  /**
   * Unique object identifier.
   *
   * The format and length of IDs may change over time.
   */
  "id": S.String,
  /**
   * Processing status of the Message Batch.
   */
  "processing_status": MessageBatchProcessingStatus,
  /**
   * Tallies requests within the Message Batch, categorized by their status.
   *
   * Requests start as `processing` and move to one of the other statuses only once processing of the entire batch ends. The sum of all values always matches the total number of requests in the batch.
   */
  "request_counts": RequestCounts,
  /**
   * URL to a `.jsonl` file containing the results of the Message Batch requests. Specified only once processing ends.
   *
   * Results in the file are not guaranteed to be in the same order as requests. Use the `custom_id` field to match results to requests.
   */
  "results_url": S.NullOr(S.String),
  /**
   * Object type.
   *
   * For Message Batches, this is always `"message_batch"`.
   */
  "type": MessageBatchType.pipe(S.propertySignature, S.withConstructorDefault(() => "message_batch" as const))
}) {}

export class ListResponseMessageBatch extends S.Class<ListResponseMessageBatch>("ListResponseMessageBatch")({
  "data": S.Array(MessageBatch),
  /**
   * First ID in the `data` list. Can be used as the `before_id` for the previous page.
   */
  "first_id": S.NullOr(S.String),
  /**
   * Indicates if there are more results in the requested page direction.
   */
  "has_more": S.Boolean,
  /**
   * Last ID in the `data` list. Can be used as the `after_id` for the next page.
   */
  "last_id": S.NullOr(S.String)
}) {}

export class MessageBatchesPostParams extends S.Struct({
  /**
   * The version of the Anthropic API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.anthropic.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class MessageBatchIndividualRequestParams extends S.Struct({
  /**
   * Developer-provided ID created for each request in a Message Batch. Useful for matching results to requests, as results may be given out of request order.
   *
   * Must be unique for each request within the Message Batch.
   */
  "custom_id": S.String.pipe(S.minLength(1), S.maxLength(64), S.pattern(new RegExp("^[a-zA-Z0-9_-]{1,64}$"))),
  /**
   * Messages API creation parameters for the individual request.
   *
   * See the [Messages API reference](/en/api/messages) for full documentation on available parameters.
   */
  "params": CreateMessageParams
}) {}

export class CreateMessageBatchParams extends S.Class<CreateMessageBatchParams>("CreateMessageBatchParams")({
  /**
   * List of requests for prompt completion. Each is an individual request to create a Message.
   */
  "requests": S.Array(MessageBatchIndividualRequestParams).pipe(S.minItems(1), S.maxItems(10000))
}) {}

export class MessageBatchesRetrieveParams extends S.Struct({
  /**
   * The version of the Anthropic API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.anthropic.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class MessageBatchesDeleteParams extends S.Struct({
  /**
   * The version of the Anthropic API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.anthropic.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Deleted object type.
 *
 * For Message Batches, this is always `"message_batch_deleted"`.
 */
export class DeleteMessageBatchResponseType extends S.Literal("message_batch_deleted") {}

export class DeleteMessageBatchResponse extends S.Class<DeleteMessageBatchResponse>("DeleteMessageBatchResponse")({
  /**
   * ID of the Message Batch.
   */
  "id": S.String,
  /**
   * Deleted object type.
   *
   * For Message Batches, this is always `"message_batch_deleted"`.
   */
  "type": DeleteMessageBatchResponseType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "message_batch_deleted" as const)
  )
}) {}

export class MessageBatchesCancelParams extends S.Struct({
  /**
   * The version of the Anthropic API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.anthropic.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class MessageBatchesResultsParams extends S.Struct({
  /**
   * The version of the Anthropic API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.anthropic.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class MessagesCountTokensPostParams extends S.Struct({
  /**
   * The version of the Anthropic API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.anthropic.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class CountMessageTokensParams extends S.Class<CountMessageTokensParams>("CountMessageTokensParams")({
  /**
   * Input messages.
   *
   * Our models are trained to operate on alternating `user` and `assistant` conversational turns. When creating a new `Message`, you specify the prior conversational turns with the `messages` parameter, and the model then generates the next `Message` in the conversation. Consecutive `user` or `assistant` turns in your request will be combined into a single turn.
   *
   * Each input message must be an object with a `role` and `content`. You can specify a single `user`-role message, or you can include multiple `user` and `assistant` messages.
   *
   * If the final message uses the `assistant` role, the response content will continue immediately from the content in that message. This can be used to constrain part of the model's response.
   *
   * Example with a single `user` message:
   *
   * ```json
   * [{"role": "user", "content": "Hello, Claude"}]
   * ```
   *
   * Example with multiple conversational turns:
   *
   * ```json
   * [
   *   {"role": "user", "content": "Hello there."},
   *   {"role": "assistant", "content": "Hi, I'm Claude. How can I help you?"},
   *   {"role": "user", "content": "Can you explain LLMs in plain English?"},
   * ]
   * ```
   *
   * Example with a partially-filled response from Claude:
   *
   * ```json
   * [
   *   {"role": "user", "content": "What's the Greek name for Sun? (A) Sol (B) Helios (C) Sun"},
   *   {"role": "assistant", "content": "The best answer is ("},
   * ]
   * ```
   *
   * Each input message `content` may be either a single `string` or an array of content blocks, where each block has a specific `type`. Using a `string` for `content` is shorthand for an array of one content block of type `"text"`. The following input messages are equivalent:
   *
   * ```json
   * {"role": "user", "content": "Hello, Claude"}
   * ```
   *
   * ```json
   * {"role": "user", "content": [{"type": "text", "text": "Hello, Claude"}]}
   * ```
   *
   * Starting with Claude 3 models, you can also send image content blocks:
   *
   * ```json
   * {"role": "user", "content": [
   *   {
   *     "type": "image",
   *     "source": {
   *       "type": "base64",
   *       "media_type": "image/jpeg",
   *       "data": "/9j/4AAQSkZJRg...",
   *     }
   *   },
   *   {"type": "text", "text": "What is in this image?"}
   * ]}
   * ```
   *
   * We currently support the `base64` source type for images, and the `image/jpeg`, `image/png`, `image/gif`, and `image/webp` media types.
   *
   * See [examples](https://docs.anthropic.com/en/api/messages-examples#vision) for more input examples.
   *
   * Note that if you want to include a [system prompt](https://docs.anthropic.com/en/docs/system-prompts), you can use the top-level `system` parameter — there is no `"system"` role for input messages in the Messages API.
   *
   * There is a limit of 100000 messages in a single request.
   */
  "messages": S.Array(InputMessage),
  "model": Model,
  /**
   * System prompt.
   *
   * A system prompt is a way of providing context and instructions to Claude, such as specifying a particular goal or role. See our [guide to system prompts](https://docs.anthropic.com/en/docs/system-prompts).
   */
  "system": S.optionalWith(S.Union(S.String, S.Array(RequestTextBlock)), { nullable: true }),
  "thinking": S.optionalWith(ThinkingConfigParam, { nullable: true }),
  "tool_choice": S.optionalWith(ToolChoice, { nullable: true }),
  /**
   * Definitions of tools that the model may use.
   *
   * If you include `tools` in your API request, the model may return `tool_use` content blocks that represent the model's use of those tools. You can then run those tools using the tool input generated by the model and then optionally return results back to the model using `tool_result` content blocks.
   *
   * Each tool definition includes:
   *
   * * `name`: Name of the tool.
   * * `description`: Optional, but strongly-recommended description of the tool.
   * * `input_schema`: [JSON schema](https://json-schema.org/draft/2020-12) for the tool `input` shape that the model will produce in `tool_use` output content blocks.
   *
   * For example, if you defined `tools` as:
   *
   * ```json
   * [
   *   {
   *     "name": "get_stock_price",
   *     "description": "Get the current stock price for a given ticker symbol.",
   *     "input_schema": {
   *       "type": "object",
   *       "properties": {
   *         "ticker": {
   *           "type": "string",
   *           "description": "The stock ticker symbol, e.g. AAPL for Apple Inc."
   *         }
   *       },
   *       "required": ["ticker"]
   *     }
   *   }
   * ]
   * ```
   *
   * And then asked the model "What's the S&P 500 at today?", the model might produce `tool_use` content blocks in the response like this:
   *
   * ```json
   * [
   *   {
   *     "type": "tool_use",
   *     "id": "toolu_01D7FLrfh4GYq7yT1ULFeyMV",
   *     "name": "get_stock_price",
   *     "input": { "ticker": "^GSPC" }
   *   }
   * ]
   * ```
   *
   * You might then run your `get_stock_price` tool with `{"ticker": "^GSPC"}` as an input, and return the following back to the model in a subsequent `user` message:
   *
   * ```json
   * [
   *   {
   *     "type": "tool_result",
   *     "tool_use_id": "toolu_01D7FLrfh4GYq7yT1ULFeyMV",
   *     "content": "259.75 USD"
   *   }
   * ]
   * ```
   *
   * Tools can be used for workflows that include running client-side tools and functions, or more generally whenever you want the model to produce a particular JSON structure of output.
   *
   * See our [guide](https://docs.anthropic.com/en/docs/tool-use) for more details.
   */
  "tools": S.optionalWith(S.Array(S.Union(Tool, BashTool20250124, TextEditor20250124, WebSearchTool20250305)), {
    nullable: true
  })
}) {}

export class CountMessageTokensResponse extends S.Class<CountMessageTokensResponse>("CountMessageTokensResponse")({
  /**
   * The total number of tokens across the provided list of messages, system prompt, and tools.
   */
  "input_tokens": S.Int
}) {}

export class BetaMessagesPostParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Anthropic API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.anthropic.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaCacheControlEphemeralType extends S.Literal("ephemeral") {}

export class BetaCacheControlEphemeral extends S.Struct({
  "type": BetaCacheControlEphemeralType
}) {}

export class BetaRequestCharLocationCitationType extends S.Literal("char_location") {}

export class BetaRequestCharLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.NullOr(S.String.pipe(S.minLength(1), S.maxLength(255))),
  "end_char_index": S.Int,
  "start_char_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "type": BetaRequestCharLocationCitationType
}) {}

export class BetaRequestPageLocationCitationType extends S.Literal("page_location") {}

export class BetaRequestPageLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.NullOr(S.String.pipe(S.minLength(1), S.maxLength(255))),
  "end_page_number": S.Int,
  "start_page_number": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "type": BetaRequestPageLocationCitationType
}) {}

export class BetaRequestContentBlockLocationCitationType extends S.Literal("content_block_location") {}

export class BetaRequestContentBlockLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.NullOr(S.String.pipe(S.minLength(1), S.maxLength(255))),
  "end_block_index": S.Int,
  "start_block_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "type": BetaRequestContentBlockLocationCitationType
}) {}

export class BetaRequestWebSearchResultLocationCitationType extends S.Literal("web_search_result_location") {}

export class BetaRequestWebSearchResultLocationCitation extends S.Struct({
  "cited_text": S.String,
  "encrypted_index": S.String,
  "title": S.NullOr(S.String.pipe(S.minLength(1), S.maxLength(255))),
  "type": BetaRequestWebSearchResultLocationCitationType,
  "url": S.String.pipe(S.minLength(1), S.maxLength(2048))
}) {}

export class BetaRequestTextBlockType extends S.Literal("text") {}

export class BetaRequestTextBlock extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  "citations": S.optionalWith(
    S.Array(
      S.Union(
        BetaRequestCharLocationCitation,
        BetaRequestPageLocationCitation,
        BetaRequestContentBlockLocationCitation,
        BetaRequestWebSearchResultLocationCitation
      )
    ),
    { nullable: true }
  ),
  "text": S.String.pipe(S.minLength(1)),
  "type": BetaRequestTextBlockType
}) {}

export class BetaBase64ImageSourceMediaType extends S.Literal("image/jpeg", "image/png", "image/gif", "image/webp") {}

export class BetaBase64ImageSourceType extends S.Literal("base64") {}

export class BetaBase64ImageSource extends S.Struct({
  "data": S.String,
  "media_type": BetaBase64ImageSourceMediaType,
  "type": BetaBase64ImageSourceType
}) {}

export class BetaURLImageSourceType extends S.Literal("url") {}

export class BetaURLImageSource extends S.Struct({
  "type": BetaURLImageSourceType,
  "url": S.String
}) {}

export class BetaRequestImageBlockType extends S.Literal("image") {}

export class BetaRequestImageBlock extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  "source": S.Union(BetaBase64ImageSource, BetaURLImageSource),
  "type": BetaRequestImageBlockType
}) {}

export class BetaRequestToolUseBlockType extends S.Literal("tool_use") {}

export class BetaRequestToolUseBlock extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  "id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": S.String.pipe(S.minLength(1), S.maxLength(200)),
  "type": BetaRequestToolUseBlockType
}) {}

export class BetaRequestServerToolUseBlockName extends S.Literal("web_search") {}

export class BetaRequestServerToolUseBlockType extends S.Literal("server_tool_use") {}

export class BetaRequestServerToolUseBlock extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  "id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": BetaRequestServerToolUseBlockName,
  "type": BetaRequestServerToolUseBlockType
}) {}

export class BetaRequestWebSearchResultBlockType extends S.Literal("web_search_result") {}

export class BetaRequestWebSearchResultBlock extends S.Struct({
  "encrypted_content": S.String,
  "page_age": S.optionalWith(S.String, { nullable: true }),
  "title": S.String.pipe(S.minLength(1)),
  "type": BetaRequestWebSearchResultBlockType,
  "url": S.String.pipe(S.minLength(1))
}) {}

export class BetaWebSearchToolResultErrorCode
  extends S.Literal("invalid_tool_input", "unavailable", "max_uses_exceeded", "too_many_requests", "query_too_long")
{}

export class BetaRequestWebSearchToolResultErrorType extends S.Literal("web_search_tool_result_error") {}

export class BetaRequestWebSearchToolResultError extends S.Struct({
  "error_code": BetaWebSearchToolResultErrorCode,
  "type": BetaRequestWebSearchToolResultErrorType
}) {}

export class BetaRequestWebSearchToolResultBlockType extends S.Literal("web_search_tool_result") {}

export class BetaRequestWebSearchToolResultBlock extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  "content": S.Union(S.Array(BetaRequestWebSearchResultBlock), BetaRequestWebSearchToolResultError),
  "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
  "type": BetaRequestWebSearchToolResultBlockType
}) {}

export class BetaRequestToolResultBlockType extends S.Literal("tool_result") {}

export class BetaRequestToolResultBlock extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  "content": S.optionalWith(S.Union(S.String, S.Array(S.Union(BetaRequestTextBlock, BetaRequestImageBlock))), {
    nullable: true
  }),
  "is_error": S.optionalWith(S.Boolean, { nullable: true }),
  "tool_use_id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "type": BetaRequestToolResultBlockType
}) {}

export class BetaRequestCitationsConfig extends S.Struct({
  "enabled": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class BetaBase64PDFSourceMediaType extends S.Literal("application/pdf") {}

export class BetaBase64PDFSourceType extends S.Literal("base64") {}

export class BetaBase64PDFSource extends S.Struct({
  "data": S.String,
  "media_type": BetaBase64PDFSourceMediaType,
  "type": BetaBase64PDFSourceType
}) {}

export class BetaPlainTextSourceMediaType extends S.Literal("text/plain") {}

export class BetaPlainTextSourceType extends S.Literal("text") {}

export class BetaPlainTextSource extends S.Struct({
  "data": S.String,
  "media_type": BetaPlainTextSourceMediaType,
  "type": BetaPlainTextSourceType
}) {}

export class BetaContentBlockSourceType extends S.Literal("content") {}

export class BetaContentBlockSource extends S.Struct({
  "content": S.Union(S.String, S.Array(S.Union(BetaRequestTextBlock, BetaRequestImageBlock))),
  "type": BetaContentBlockSourceType
}) {}

export class BetaURLPDFSourceType extends S.Literal("url") {}

export class BetaURLPDFSource extends S.Struct({
  "type": BetaURLPDFSourceType,
  "url": S.String
}) {}

export class BetaRequestDocumentBlockType extends S.Literal("document") {}

export class BetaRequestDocumentBlock extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  "citations": S.optionalWith(BetaRequestCitationsConfig, { nullable: true }),
  "context": S.optionalWith(S.String.pipe(S.minLength(1)), { nullable: true }),
  "source": S.Union(BetaBase64PDFSource, BetaPlainTextSource, BetaContentBlockSource, BetaURLPDFSource),
  "title": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(500)), { nullable: true }),
  "type": BetaRequestDocumentBlockType
}) {}

export class BetaRequestThinkingBlockType extends S.Literal("thinking") {}

export class BetaRequestThinkingBlock extends S.Struct({
  "signature": S.String,
  "thinking": S.String,
  "type": BetaRequestThinkingBlockType
}) {}

export class BetaRequestRedactedThinkingBlockType extends S.Literal("redacted_thinking") {}

export class BetaRequestRedactedThinkingBlock extends S.Struct({
  "data": S.String,
  "type": BetaRequestRedactedThinkingBlockType
}) {}

export class BetaInputContentBlock extends S.Union(
  BetaRequestTextBlock,
  BetaRequestImageBlock,
  BetaRequestToolUseBlock,
  BetaRequestServerToolUseBlock,
  BetaRequestWebSearchToolResultBlock,
  BetaRequestToolResultBlock,
  BetaRequestDocumentBlock,
  BetaRequestThinkingBlock,
  BetaRequestRedactedThinkingBlock
) {}

export class BetaInputMessageRole extends S.Literal("user", "assistant") {}

export class BetaInputMessage extends S.Struct({
  "content": S.Union(S.String, S.Array(BetaInputContentBlock)),
  "role": BetaInputMessageRole
}) {}

export class BetaMetadata extends S.Struct({
  /**
   * An external identifier for the user who is associated with the request.
   *
   * This should be a uuid, hash value, or other opaque identifier. Anthropic may use this id to help detect abuse. Do not include any identifying information such as name, email address, or phone number.
   */
  "user_id": S.optionalWith(S.String.pipe(S.maxLength(256)), { nullable: true })
}) {}

export class BetaThinkingConfigEnabledType extends S.Literal("enabled") {}

export class BetaThinkingConfigEnabled extends S.Struct({
  /**
   * Determines how many tokens Claude can use for its internal reasoning process. Larger budgets can enable more thorough analysis for complex problems, improving response quality.
   *
   * Must be ≥1024 and less than `max_tokens`.
   *
   * See [extended thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking) for details.
   */
  "budget_tokens": S.Int.pipe(S.greaterThanOrEqualTo(1024)),
  "type": BetaThinkingConfigEnabledType
}) {}

export class BetaThinkingConfigDisabledType extends S.Literal("disabled") {}

export class BetaThinkingConfigDisabled extends S.Struct({
  "type": BetaThinkingConfigDisabledType
}) {}

/**
 * Configuration for enabling Claude's extended thinking.
 *
 * When enabled, responses include `thinking` content blocks showing Claude's thinking process before the final answer. Requires a minimum budget of 1,024 tokens and counts towards your `max_tokens` limit.
 *
 * See [extended thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking) for details.
 */
export class BetaThinkingConfigParam extends S.Union(BetaThinkingConfigEnabled, BetaThinkingConfigDisabled) {}

export class BetaToolChoiceAutoType extends S.Literal("auto") {}

/**
 * The model will automatically decide whether to use tools.
 */
export class BetaToolChoiceAuto extends S.Struct({
  /**
   * Whether to disable parallel tool use.
   *
   * Defaults to `false`. If set to `true`, the model will output at most one tool use.
   */
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true }),
  "type": BetaToolChoiceAutoType
}) {}

export class BetaToolChoiceAnyType extends S.Literal("any") {}

/**
 * The model will use any available tools.
 */
export class BetaToolChoiceAny extends S.Struct({
  /**
   * Whether to disable parallel tool use.
   *
   * Defaults to `false`. If set to `true`, the model will output exactly one tool use.
   */
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true }),
  "type": BetaToolChoiceAnyType
}) {}

export class BetaToolChoiceToolType extends S.Literal("tool") {}

/**
 * The model will use the specified tool with `tool_choice.name`.
 */
export class BetaToolChoiceTool extends S.Struct({
  /**
   * Whether to disable parallel tool use.
   *
   * Defaults to `false`. If set to `true`, the model will output exactly one tool use.
   */
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * The name of the tool to use.
   */
  "name": S.String,
  "type": BetaToolChoiceToolType
}) {}

export class BetaToolChoiceNoneType extends S.Literal("none") {}

/**
 * The model will not be allowed to use tools.
 */
export class BetaToolChoiceNone extends S.Struct({
  "type": BetaToolChoiceNoneType
}) {}

/**
 * How the model should use the provided tools. The model can use a specific tool, any available tool, decide by itself, or not use tools at all.
 */
export class BetaToolChoice
  extends S.Union(BetaToolChoiceAuto, BetaToolChoiceAny, BetaToolChoiceTool, BetaToolChoiceNone)
{}

export class BetaToolTypeEnum extends S.Literal("custom") {}

export class BetaInputSchemaType extends S.Literal("object") {}

export class BetaInputSchema extends S.Struct({
  "properties": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "type": BetaInputSchemaType
}) {}

export class BetaTool extends S.Struct({
  "type": S.optionalWith(BetaToolTypeEnum, { nullable: true }),
  /**
   * Description of what this tool does.
   *
   * Tool descriptions should be as detailed as possible. The more information that the model has about what the tool is and how to use it, the better it will perform. You can use natural language descriptions to reinforce important aspects of the tool input JSON schema.
   */
  "description": S.optionalWith(S.String, { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": S.String.pipe(S.minLength(1), S.maxLength(64), S.pattern(new RegExp("^[a-zA-Z0-9_-]{1,64}$"))),
  /**
   * [JSON schema](https://json-schema.org/draft/2020-12) for this tool's input.
   *
   * This defines the shape of the `input` that your tool accepts and that the model will produce.
   */
  "input_schema": BetaInputSchema,
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true })
}) {}

/**
 * Name of the tool.
 *
 * This is how the tool will be called by the model and in `tool_use` blocks.
 */
export class BetaComputerUseTool20241022Name extends S.Literal("computer") {}

export class BetaComputerUseTool20241022Type extends S.Literal("computer_20241022") {}

export class BetaComputerUseTool20241022 extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  /**
   * The height of the display in pixels.
   */
  "display_height_px": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  /**
   * The X11 display number (e.g. 0, 1) for the display.
   */
  "display_number": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  /**
   * The width of the display in pixels.
   */
  "display_width_px": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": BetaComputerUseTool20241022Name,
  "type": BetaComputerUseTool20241022Type
}) {}

/**
 * Name of the tool.
 *
 * This is how the tool will be called by the model and in `tool_use` blocks.
 */
export class BetaBashTool20241022Name extends S.Literal("bash") {}

export class BetaBashTool20241022Type extends S.Literal("bash_20241022") {}

export class BetaBashTool20241022 extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": BetaBashTool20241022Name,
  "type": BetaBashTool20241022Type
}) {}

/**
 * Name of the tool.
 *
 * This is how the tool will be called by the model and in `tool_use` blocks.
 */
export class BetaTextEditor20241022Name extends S.Literal("str_replace_editor") {}

export class BetaTextEditor20241022Type extends S.Literal("text_editor_20241022") {}

export class BetaTextEditor20241022 extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": BetaTextEditor20241022Name,
  "type": BetaTextEditor20241022Type
}) {}

/**
 * Name of the tool.
 *
 * This is how the tool will be called by the model and in `tool_use` blocks.
 */
export class BetaComputerUseTool20250124Name extends S.Literal("computer") {}

export class BetaComputerUseTool20250124Type extends S.Literal("computer_20250124") {}

export class BetaComputerUseTool20250124 extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  /**
   * The height of the display in pixels.
   */
  "display_height_px": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  /**
   * The X11 display number (e.g. 0, 1) for the display.
   */
  "display_number": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  /**
   * The width of the display in pixels.
   */
  "display_width_px": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": BetaComputerUseTool20250124Name,
  "type": BetaComputerUseTool20250124Type
}) {}

/**
 * Name of the tool.
 *
 * This is how the tool will be called by the model and in `tool_use` blocks.
 */
export class BetaBashTool20250124Name extends S.Literal("bash") {}

export class BetaBashTool20250124Type extends S.Literal("bash_20250124") {}

export class BetaBashTool20250124 extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": BetaBashTool20250124Name,
  "type": BetaBashTool20250124Type
}) {}

/**
 * Name of the tool.
 *
 * This is how the tool will be called by the model and in `tool_use` blocks.
 */
export class BetaTextEditor20250124Name extends S.Literal("str_replace_editor") {}

export class BetaTextEditor20250124Type extends S.Literal("text_editor_20250124") {}

export class BetaTextEditor20250124 extends S.Struct({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": BetaTextEditor20250124Name,
  "type": BetaTextEditor20250124Type
}) {}

/**
 * Name of the tool.
 *
 * This is how the tool will be called by the model and in `tool_use` blocks.
 */
export class BetaWebSearchTool20250305Name extends S.Literal("web_search") {}

export class BetaWebSearchTool20250305Type extends S.Literal("web_search_20250305") {}

export class BetaUserLocationType extends S.Literal("approximate") {}

export class BetaUserLocation extends S.Struct({
  /**
   * The city of the user.
   */
  "city": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(255)), { nullable: true }),
  /**
   * The two letter [ISO country code](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) of the user.
   */
  "country": S.optionalWith(S.String.pipe(S.minLength(2), S.maxLength(2)), { nullable: true }),
  /**
   * The region of the user.
   */
  "region": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(255)), { nullable: true }),
  /**
   * The [IANA timezone](https://nodatime.org/TimeZones) of the user.
   */
  "timezone": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(255)), { nullable: true }),
  "type": BetaUserLocationType
}) {}

export class BetaWebSearchTool20250305 extends S.Struct({
  /**
   * If provided, only these domains will be included in results. Cannot be used alongside `blocked_domains`.
   */
  "allowed_domains": S.optionalWith(S.Array(S.String), { nullable: true }),
  /**
   * If provided, these domains will never appear in results. Cannot be used alongside `allowed_domains`.
   */
  "blocked_domains": S.optionalWith(S.Array(S.String), { nullable: true }),
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  /**
   * Maximum number of times the tool can be used in the API request.
   */
  "max_uses": S.optionalWith(S.Int.pipe(S.greaterThan(0)), { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": BetaWebSearchTool20250305Name,
  "type": BetaWebSearchTool20250305Type,
  /**
   * Parameters for the user's location. Used to provide more relevant search results.
   */
  "user_location": S.optionalWith(BetaUserLocation, { nullable: true })
}) {}

export class BetaCreateMessageParams extends S.Class<BetaCreateMessageParams>("BetaCreateMessageParams")({
  "model": Model,
  /**
   * Input messages.
   *
   * Our models are trained to operate on alternating `user` and `assistant` conversational turns. When creating a new `Message`, you specify the prior conversational turns with the `messages` parameter, and the model then generates the next `Message` in the conversation. Consecutive `user` or `assistant` turns in your request will be combined into a single turn.
   *
   * Each input message must be an object with a `role` and `content`. You can specify a single `user`-role message, or you can include multiple `user` and `assistant` messages.
   *
   * If the final message uses the `assistant` role, the response content will continue immediately from the content in that message. This can be used to constrain part of the model's response.
   *
   * Example with a single `user` message:
   *
   * ```json
   * [{"role": "user", "content": "Hello, Claude"}]
   * ```
   *
   * Example with multiple conversational turns:
   *
   * ```json
   * [
   *   {"role": "user", "content": "Hello there."},
   *   {"role": "assistant", "content": "Hi, I'm Claude. How can I help you?"},
   *   {"role": "user", "content": "Can you explain LLMs in plain English?"},
   * ]
   * ```
   *
   * Example with a partially-filled response from Claude:
   *
   * ```json
   * [
   *   {"role": "user", "content": "What's the Greek name for Sun? (A) Sol (B) Helios (C) Sun"},
   *   {"role": "assistant", "content": "The best answer is ("},
   * ]
   * ```
   *
   * Each input message `content` may be either a single `string` or an array of content blocks, where each block has a specific `type`. Using a `string` for `content` is shorthand for an array of one content block of type `"text"`. The following input messages are equivalent:
   *
   * ```json
   * {"role": "user", "content": "Hello, Claude"}
   * ```
   *
   * ```json
   * {"role": "user", "content": [{"type": "text", "text": "Hello, Claude"}]}
   * ```
   *
   * Starting with Claude 3 models, you can also send image content blocks:
   *
   * ```json
   * {"role": "user", "content": [
   *   {
   *     "type": "image",
   *     "source": {
   *       "type": "base64",
   *       "media_type": "image/jpeg",
   *       "data": "/9j/4AAQSkZJRg...",
   *     }
   *   },
   *   {"type": "text", "text": "What is in this image?"}
   * ]}
   * ```
   *
   * We currently support the `base64` source type for images, and the `image/jpeg`, `image/png`, `image/gif`, and `image/webp` media types.
   *
   * See [examples](https://docs.anthropic.com/en/api/messages-examples#vision) for more input examples.
   *
   * Note that if you want to include a [system prompt](https://docs.anthropic.com/en/docs/system-prompts), you can use the top-level `system` parameter — there is no `"system"` role for input messages in the Messages API.
   *
   * There is a limit of 100000 messages in a single request.
   */
  "messages": S.Array(BetaInputMessage),
  /**
   * The maximum number of tokens to generate before stopping.
   *
   * Note that our models may stop _before_ reaching this maximum. This parameter only specifies the absolute maximum number of tokens to generate.
   *
   * Different models have different maximum values for this parameter.  See [models](https://docs.anthropic.com/en/docs/models-overview) for details.
   */
  "max_tokens": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  /**
   * An object describing metadata about the request.
   */
  "metadata": S.optionalWith(BetaMetadata, { nullable: true }),
  /**
   * Custom text sequences that will cause the model to stop generating.
   *
   * Our models will normally stop when they have naturally completed their turn, which will result in a response `stop_reason` of `"end_turn"`.
   *
   * If you want the model to stop generating when it encounters custom strings of text, you can use the `stop_sequences` parameter. If the model encounters one of the custom sequences, the response `stop_reason` value will be `"stop_sequence"` and the response `stop_sequence` value will contain the matched stop sequence.
   */
  "stop_sequences": S.optionalWith(S.Array(S.String), { nullable: true }),
  /**
   * Whether to incrementally stream the response using server-sent events.
   *
   * See [streaming](https://docs.anthropic.com/en/api/messages-streaming) for details.
   */
  "stream": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * System prompt.
   *
   * A system prompt is a way of providing context and instructions to Claude, such as specifying a particular goal or role. See our [guide to system prompts](https://docs.anthropic.com/en/docs/system-prompts).
   */
  "system": S.optionalWith(S.Union(S.String, S.Array(BetaRequestTextBlock)), { nullable: true }),
  /**
   * Amount of randomness injected into the response.
   *
   * Defaults to `1.0`. Ranges from `0.0` to `1.0`. Use `temperature` closer to `0.0` for analytical / multiple choice, and closer to `1.0` for creative and generative tasks.
   *
   * Note that even with `temperature` of `0.0`, the results will not be fully deterministic.
   */
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true }),
  "thinking": S.optionalWith(BetaThinkingConfigParam, { nullable: true }),
  "tool_choice": S.optionalWith(BetaToolChoice, { nullable: true }),
  /**
   * Definitions of tools that the model may use.
   *
   * If you include `tools` in your API request, the model may return `tool_use` content blocks that represent the model's use of those tools. You can then run those tools using the tool input generated by the model and then optionally return results back to the model using `tool_result` content blocks.
   *
   * Each tool definition includes:
   *
   * * `name`: Name of the tool.
   * * `description`: Optional, but strongly-recommended description of the tool.
   * * `input_schema`: [JSON schema](https://json-schema.org/draft/2020-12) for the tool `input` shape that the model will produce in `tool_use` output content blocks.
   *
   * For example, if you defined `tools` as:
   *
   * ```json
   * [
   *   {
   *     "name": "get_stock_price",
   *     "description": "Get the current stock price for a given ticker symbol.",
   *     "input_schema": {
   *       "type": "object",
   *       "properties": {
   *         "ticker": {
   *           "type": "string",
   *           "description": "The stock ticker symbol, e.g. AAPL for Apple Inc."
   *         }
   *       },
   *       "required": ["ticker"]
   *     }
   *   }
   * ]
   * ```
   *
   * And then asked the model "What's the S&P 500 at today?", the model might produce `tool_use` content blocks in the response like this:
   *
   * ```json
   * [
   *   {
   *     "type": "tool_use",
   *     "id": "toolu_01D7FLrfh4GYq7yT1ULFeyMV",
   *     "name": "get_stock_price",
   *     "input": { "ticker": "^GSPC" }
   *   }
   * ]
   * ```
   *
   * You might then run your `get_stock_price` tool with `{"ticker": "^GSPC"}` as an input, and return the following back to the model in a subsequent `user` message:
   *
   * ```json
   * [
   *   {
   *     "type": "tool_result",
   *     "tool_use_id": "toolu_01D7FLrfh4GYq7yT1ULFeyMV",
   *     "content": "259.75 USD"
   *   }
   * ]
   * ```
   *
   * Tools can be used for workflows that include running client-side tools and functions, or more generally whenever you want the model to produce a particular JSON structure of output.
   *
   * See our [guide](https://docs.anthropic.com/en/docs/tool-use) for more details.
   */
  "tools": S.optionalWith(
    S.Array(
      S.Union(
        BetaTool,
        BetaComputerUseTool20241022,
        BetaBashTool20241022,
        BetaTextEditor20241022,
        BetaComputerUseTool20250124,
        BetaBashTool20250124,
        BetaTextEditor20250124,
        BetaWebSearchTool20250305
      )
    ),
    { nullable: true }
  ),
  /**
   * Only sample from the top K options for each subsequent token.
   *
   * Used to remove "long tail" low probability responses. [Learn more technical details here](https://towardsdatascience.com/how-to-sample-from-language-models-682bceb97277).
   *
   * Recommended for advanced use cases only. You usually only need to use `temperature`.
   */
  "top_k": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  /**
   * Use nucleus sampling.
   *
   * In nucleus sampling, we compute the cumulative distribution over all the options for each subsequent token in decreasing probability order and cut it off once it reaches a particular probability specified by `top_p`. You should either alter `temperature` or `top_p`, but not both.
   *
   * Recommended for advanced use cases only. You usually only need to use `temperature`.
   */
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true })
}) {}

/**
 * Object type.
 *
 * For Messages, this is always `"message"`.
 */
export class BetaMessageType extends S.Literal("message") {}

/**
 * Conversational role of the generated message.
 *
 * This will always be `"assistant"`.
 */
export class BetaMessageRole extends S.Literal("assistant") {}

export class BetaResponseCharLocationCitationType extends S.Literal("char_location") {}

export class BetaResponseCharLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.NullOr(S.String),
  "end_char_index": S.Int,
  "start_char_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "type": BetaResponseCharLocationCitationType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "char_location" as const)
  )
}) {}

export class BetaResponsePageLocationCitationType extends S.Literal("page_location") {}

export class BetaResponsePageLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.NullOr(S.String),
  "end_page_number": S.Int,
  "start_page_number": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "type": BetaResponsePageLocationCitationType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "page_location" as const)
  )
}) {}

export class BetaResponseContentBlockLocationCitationType extends S.Literal("content_block_location") {}

export class BetaResponseContentBlockLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.NullOr(S.String),
  "end_block_index": S.Int,
  "start_block_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "type": BetaResponseContentBlockLocationCitationType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "content_block_location" as const)
  )
}) {}

export class BetaResponseWebSearchResultLocationCitationType extends S.Literal("web_search_result_location") {}

export class BetaResponseWebSearchResultLocationCitation extends S.Struct({
  "cited_text": S.String,
  "encrypted_index": S.String,
  "title": S.NullOr(S.String),
  "type": BetaResponseWebSearchResultLocationCitationType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "web_search_result_location" as const)
  ),
  "url": S.String
}) {}

export class BetaResponseTextBlockType extends S.Literal("text") {}

export class BetaResponseTextBlock extends S.Struct({
  /**
   * Citations supporting the text block.
   *
   * The type of citation returned will depend on the type of document being cited. Citing a PDF results in `page_location`, plain text results in `char_location`, and content document results in `content_block_location`.
   */
  "citations": S.optionalWith(
    S.NullOr(
      S.Array(
        S.Union(
          BetaResponseCharLocationCitation,
          BetaResponsePageLocationCitation,
          BetaResponseContentBlockLocationCitation,
          BetaResponseWebSearchResultLocationCitation
        )
      )
    ),
    { default: () => null }
  ),
  "text": S.String.pipe(S.minLength(0), S.maxLength(5000000)),
  "type": BetaResponseTextBlockType.pipe(S.propertySignature, S.withConstructorDefault(() => "text" as const))
}) {}

export class BetaResponseToolUseBlockType extends S.Literal("tool_use") {}

export class BetaResponseToolUseBlock extends S.Struct({
  "id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": S.String.pipe(S.minLength(1)),
  "type": BetaResponseToolUseBlockType.pipe(S.propertySignature, S.withConstructorDefault(() => "tool_use" as const))
}) {}

export class BetaResponseServerToolUseBlockName extends S.Literal("web_search") {}

export class BetaResponseServerToolUseBlockType extends S.Literal("server_tool_use") {}

export class BetaResponseServerToolUseBlock extends S.Struct({
  "id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": BetaResponseServerToolUseBlockName,
  "type": BetaResponseServerToolUseBlockType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "server_tool_use" as const)
  )
}) {}

export class BetaResponseWebSearchToolResultErrorType extends S.Literal("web_search_tool_result_error") {}

export class BetaResponseWebSearchToolResultError extends S.Struct({
  "error_code": BetaWebSearchToolResultErrorCode,
  "type": BetaResponseWebSearchToolResultErrorType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "web_search_tool_result_error" as const)
  )
}) {}

export class BetaResponseWebSearchResultBlockType extends S.Literal("web_search_result") {}

export class BetaResponseWebSearchResultBlock extends S.Struct({
  "encrypted_content": S.String,
  "page_age": S.optionalWith(S.NullOr(S.String), { default: () => null }),
  "title": S.String,
  "type": BetaResponseWebSearchResultBlockType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "web_search_result" as const)
  ),
  "url": S.String
}) {}

export class BetaResponseWebSearchToolResultBlockType extends S.Literal("web_search_tool_result") {}

export class BetaResponseWebSearchToolResultBlock extends S.Struct({
  "content": S.Union(BetaResponseWebSearchToolResultError, S.Array(BetaResponseWebSearchResultBlock)),
  "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
  "type": BetaResponseWebSearchToolResultBlockType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "web_search_tool_result" as const)
  )
}) {}

export class BetaResponseThinkingBlockType extends S.Literal("thinking") {}

export class BetaResponseThinkingBlock extends S.Struct({
  "signature": S.String,
  "thinking": S.String,
  "type": BetaResponseThinkingBlockType.pipe(S.propertySignature, S.withConstructorDefault(() => "thinking" as const))
}) {}

export class BetaResponseRedactedThinkingBlockType extends S.Literal("redacted_thinking") {}

export class BetaResponseRedactedThinkingBlock extends S.Struct({
  "data": S.String,
  "type": BetaResponseRedactedThinkingBlockType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "redacted_thinking" as const)
  )
}) {}

export class BetaContentBlock extends S.Union(
  BetaResponseTextBlock,
  BetaResponseToolUseBlock,
  BetaResponseServerToolUseBlock,
  BetaResponseWebSearchToolResultBlock,
  BetaResponseThinkingBlock,
  BetaResponseRedactedThinkingBlock
) {}

export class BetaStopReason
  extends S.Literal("end_turn", "max_tokens", "stop_sequence", "tool_use", "pause_turn", "refusal")
{}

export class BetaServerToolUsage extends S.Struct({
  /**
   * The number of web search tool requests.
   */
  "web_search_requests": S.Int.pipe(S.greaterThanOrEqualTo(0)).pipe(
    S.propertySignature,
    S.withConstructorDefault(() => 0 as const)
  )
}) {}

export class BetaUsage extends S.Struct({
  /**
   * The number of input tokens used to create the cache entry.
   */
  "cache_creation_input_tokens": S.optionalWith(S.NullOr(S.Int.pipe(S.greaterThanOrEqualTo(0))), {
    default: () => null
  }),
  /**
   * The number of input tokens read from the cache.
   */
  "cache_read_input_tokens": S.optionalWith(S.NullOr(S.Int.pipe(S.greaterThanOrEqualTo(0))), { default: () => null }),
  /**
   * The number of input tokens which were used.
   */
  "input_tokens": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  /**
   * The number of output tokens which were used.
   */
  "output_tokens": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  /**
   * The number of server tool requests.
   */
  "server_tool_use": S.optionalWith(S.NullOr(BetaServerToolUsage), { default: () => null })
}) {}

export class BetaMessage extends S.Class<BetaMessage>("BetaMessage")({
  /**
   * Unique object identifier.
   *
   * The format and length of IDs may change over time.
   */
  "id": S.String,
  /**
   * Object type.
   *
   * For Messages, this is always `"message"`.
   */
  "type": BetaMessageType.pipe(S.propertySignature, S.withConstructorDefault(() => "message" as const)),
  /**
   * Conversational role of the generated message.
   *
   * This will always be `"assistant"`.
   */
  "role": BetaMessageRole.pipe(S.propertySignature, S.withConstructorDefault(() => "assistant" as const)),
  /**
   * Content generated by the model.
   *
   * This is an array of content blocks, each of which has a `type` that determines its shape.
   *
   * Example:
   *
   * ```json
   * [{"type": "text", "text": "Hi, I'm Claude."}]
   * ```
   *
   * If the request input `messages` ended with an `assistant` turn, then the response `content` will continue directly from that last turn. You can use this to constrain the model's output.
   *
   * For example, if the input `messages` were:
   * ```json
   * [
   *   {"role": "user", "content": "What's the Greek name for Sun? (A) Sol (B) Helios (C) Sun"},
   *   {"role": "assistant", "content": "The best answer is ("}
   * ]
   * ```
   *
   * Then the response `content` might be:
   *
   * ```json
   * [{"type": "text", "text": "B)"}]
   * ```
   */
  "content": S.Array(BetaContentBlock),
  "model": Model,
  /**
   * The reason that we stopped.
   *
   * This may be one the following values:
   * * `"end_turn"`: the model reached a natural stopping point
   * * `"max_tokens"`: we exceeded the requested `max_tokens` or the model's maximum
   * * `"stop_sequence"`: one of your provided custom `stop_sequences` was generated
   * * `"tool_use"`: the model invoked one or more tools
   *
   * In non-streaming mode this value is always non-null. In streaming mode, it is null in the `message_start` event and non-null otherwise.
   */
  "stop_reason": S.NullOr(BetaStopReason),
  /**
   * Which custom stop sequence was generated, if any.
   *
   * This value will be a non-null string if one of your custom stop sequences was generated.
   */
  "stop_sequence": S.optionalWith(S.NullOr(S.String), { default: () => null }),
  /**
   * Billing and rate-limit usage.
   *
   * Anthropic's API bills and rate-limits by token counts, as tokens represent the underlying cost to our systems.
   *
   * Under the hood, the API transforms requests into a format suitable for the model. The model's output then goes through a parsing stage before becoming an API response. As a result, the token counts in `usage` will not match one-to-one with the exact visible content of an API request or response.
   *
   * For example, `output_tokens` will be non-zero, even for an empty string response from Claude.
   *
   * Total input tokens in a request is the summation of `input_tokens`, `cache_creation_input_tokens`, and `cache_read_input_tokens`.
   */
  "usage": BetaUsage
}) {}

export class BetaInvalidRequestErrorType extends S.Literal("invalid_request_error") {}

export class BetaInvalidRequestError extends S.Struct({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Invalid request" as const)),
  "type": BetaInvalidRequestErrorType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "invalid_request_error" as const)
  )
}) {}

export class BetaAuthenticationErrorType extends S.Literal("authentication_error") {}

export class BetaAuthenticationError extends S.Struct({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Authentication error" as const)),
  "type": BetaAuthenticationErrorType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "authentication_error" as const)
  )
}) {}

export class BetaBillingErrorType extends S.Literal("billing_error") {}

export class BetaBillingError extends S.Struct({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Billing error" as const)),
  "type": BetaBillingErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "billing_error" as const))
}) {}

export class BetaPermissionErrorType extends S.Literal("permission_error") {}

export class BetaPermissionError extends S.Struct({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Permission denied" as const)),
  "type": BetaPermissionErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "permission_error" as const))
}) {}

export class BetaNotFoundErrorType extends S.Literal("not_found_error") {}

export class BetaNotFoundError extends S.Struct({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Not found" as const)),
  "type": BetaNotFoundErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "not_found_error" as const))
}) {}

export class BetaRateLimitErrorType extends S.Literal("rate_limit_error") {}

export class BetaRateLimitError extends S.Struct({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Rate limited" as const)),
  "type": BetaRateLimitErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "rate_limit_error" as const))
}) {}

export class BetaGatewayTimeoutErrorType extends S.Literal("timeout_error") {}

export class BetaGatewayTimeoutError extends S.Struct({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Request timeout" as const)),
  "type": BetaGatewayTimeoutErrorType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "timeout_error" as const)
  )
}) {}

export class BetaAPIErrorType extends S.Literal("api_error") {}

export class BetaAPIError extends S.Struct({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Internal server error" as const)),
  "type": BetaAPIErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "api_error" as const))
}) {}

export class BetaOverloadedErrorType extends S.Literal("overloaded_error") {}

export class BetaOverloadedError extends S.Struct({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Overloaded" as const)),
  "type": BetaOverloadedErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "overloaded_error" as const))
}) {}

export class BetaErrorResponseType extends S.Literal("error") {}

export class BetaErrorResponse extends S.Class<BetaErrorResponse>("BetaErrorResponse")({
  "error": S.Union(
    BetaInvalidRequestError,
    BetaAuthenticationError,
    BetaBillingError,
    BetaPermissionError,
    BetaNotFoundError,
    BetaRateLimitError,
    BetaGatewayTimeoutError,
    BetaAPIError,
    BetaOverloadedError
  ),
  "type": BetaErrorResponseType.pipe(S.propertySignature, S.withConstructorDefault(() => "error" as const))
}) {}

export class BetaModelsListParams extends S.Struct({
  /**
   * ID of the object to use as a cursor for pagination. When provided, returns the page of results immediately before this object.
   */
  "before_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * ID of the object to use as a cursor for pagination. When provided, returns the page of results immediately after this object.
   */
  "after_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * Number of items to return per page.
   *
   * Defaults to `20`. Ranges from `1` to `1000`.
   */
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(1000)), {
    nullable: true,
    default: () => 20 as const
  }),
  /**
   * The version of the Anthropic API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.anthropic.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Object type.
 *
 * For Models, this is always `"model"`.
 */
export class BetaModelInfoType extends S.Literal("model") {}

export class BetaModelInfo extends S.Struct({
  /**
   * RFC 3339 datetime string representing the time at which the model was released. May be set to an epoch value if the release date is unknown.
   */
  "created_at": S.String,
  /**
   * A human-readable name for the model.
   */
  "display_name": S.String,
  /**
   * Unique model identifier.
   */
  "id": S.String,
  /**
   * Object type.
   *
   * For Models, this is always `"model"`.
   */
  "type": BetaModelInfoType.pipe(S.propertySignature, S.withConstructorDefault(() => "model" as const))
}) {}

export class BetaListResponseModelInfo extends S.Class<BetaListResponseModelInfo>("BetaListResponseModelInfo")({
  "data": S.Array(BetaModelInfo),
  /**
   * First ID in the `data` list. Can be used as the `before_id` for the previous page.
   */
  "first_id": S.NullOr(S.String),
  /**
   * Indicates if there are more results in the requested page direction.
   */
  "has_more": S.Boolean,
  /**
   * Last ID in the `data` list. Can be used as the `after_id` for the next page.
   */
  "last_id": S.NullOr(S.String)
}) {}

export class BetaModelsGetParams extends S.Struct({
  /**
   * The version of the Anthropic API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.anthropic.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaMessageBatchesListParams extends S.Struct({
  /**
   * ID of the object to use as a cursor for pagination. When provided, returns the page of results immediately before this object.
   */
  "before_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * ID of the object to use as a cursor for pagination. When provided, returns the page of results immediately after this object.
   */
  "after_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * Number of items to return per page.
   *
   * Defaults to `20`. Ranges from `1` to `1000`.
   */
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(1000)), {
    nullable: true,
    default: () => 20 as const
  }),
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Anthropic API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.anthropic.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Processing status of the Message Batch.
 */
export class BetaMessageBatchProcessingStatus extends S.Literal("in_progress", "canceling", "ended") {}

export class BetaRequestCounts extends S.Struct({
  /**
   * Number of requests in the Message Batch that have been canceled.
   *
   * This is zero until processing of the entire Message Batch has ended.
   */
  "canceled": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  /**
   * Number of requests in the Message Batch that encountered an error.
   *
   * This is zero until processing of the entire Message Batch has ended.
   */
  "errored": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  /**
   * Number of requests in the Message Batch that have expired.
   *
   * This is zero until processing of the entire Message Batch has ended.
   */
  "expired": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  /**
   * Number of requests in the Message Batch that are processing.
   */
  "processing": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  /**
   * Number of requests in the Message Batch that have completed successfully.
   *
   * This is zero until processing of the entire Message Batch has ended.
   */
  "succeeded": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const))
}) {}

/**
 * Object type.
 *
 * For Message Batches, this is always `"message_batch"`.
 */
export class BetaMessageBatchType extends S.Literal("message_batch") {}

export class BetaMessageBatch extends S.Struct({
  /**
   * RFC 3339 datetime string representing the time at which the Message Batch was archived and its results became unavailable.
   */
  "archived_at": S.NullOr(S.String),
  /**
   * RFC 3339 datetime string representing the time at which cancellation was initiated for the Message Batch. Specified only if cancellation was initiated.
   */
  "cancel_initiated_at": S.NullOr(S.String),
  /**
   * RFC 3339 datetime string representing the time at which the Message Batch was created.
   */
  "created_at": S.String,
  /**
   * RFC 3339 datetime string representing the time at which processing for the Message Batch ended. Specified only once processing ends.
   *
   * Processing ends when every request in a Message Batch has either succeeded, errored, canceled, or expired.
   */
  "ended_at": S.NullOr(S.String),
  /**
   * RFC 3339 datetime string representing the time at which the Message Batch will expire and end processing, which is 24 hours after creation.
   */
  "expires_at": S.String,
  /**
   * Unique object identifier.
   *
   * The format and length of IDs may change over time.
   */
  "id": S.String,
  /**
   * Processing status of the Message Batch.
   */
  "processing_status": BetaMessageBatchProcessingStatus,
  /**
   * Tallies requests within the Message Batch, categorized by their status.
   *
   * Requests start as `processing` and move to one of the other statuses only once processing of the entire batch ends. The sum of all values always matches the total number of requests in the batch.
   */
  "request_counts": BetaRequestCounts,
  /**
   * URL to a `.jsonl` file containing the results of the Message Batch requests. Specified only once processing ends.
   *
   * Results in the file are not guaranteed to be in the same order as requests. Use the `custom_id` field to match results to requests.
   */
  "results_url": S.NullOr(S.String),
  /**
   * Object type.
   *
   * For Message Batches, this is always `"message_batch"`.
   */
  "type": BetaMessageBatchType.pipe(S.propertySignature, S.withConstructorDefault(() => "message_batch" as const))
}) {}

export class BetaListResponseMessageBatch
  extends S.Class<BetaListResponseMessageBatch>("BetaListResponseMessageBatch")({
    "data": S.Array(BetaMessageBatch),
    /**
     * First ID in the `data` list. Can be used as the `before_id` for the previous page.
     */
    "first_id": S.NullOr(S.String),
    /**
     * Indicates if there are more results in the requested page direction.
     */
    "has_more": S.Boolean,
    /**
     * Last ID in the `data` list. Can be used as the `after_id` for the next page.
     */
    "last_id": S.NullOr(S.String)
  })
{}

export class BetaMessageBatchesPostParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Anthropic API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.anthropic.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaMessageBatchIndividualRequestParams extends S.Struct({
  /**
   * Developer-provided ID created for each request in a Message Batch. Useful for matching results to requests, as results may be given out of request order.
   *
   * Must be unique for each request within the Message Batch.
   */
  "custom_id": S.String.pipe(S.minLength(1), S.maxLength(64), S.pattern(new RegExp("^[a-zA-Z0-9_-]{1,64}$"))),
  /**
   * Messages API creation parameters for the individual request.
   *
   * See the [Messages API reference](/en/api/messages) for full documentation on available parameters.
   */
  "params": BetaCreateMessageParams
}) {}

export class BetaCreateMessageBatchParams
  extends S.Class<BetaCreateMessageBatchParams>("BetaCreateMessageBatchParams")({
    /**
     * List of requests for prompt completion. Each is an individual request to create a Message.
     */
    "requests": S.Array(BetaMessageBatchIndividualRequestParams).pipe(S.minItems(1), S.maxItems(10000))
  })
{}

export class BetaMessageBatchesRetrieveParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Anthropic API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.anthropic.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaMessageBatchesDeleteParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Anthropic API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.anthropic.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * Deleted object type.
 *
 * For Message Batches, this is always `"message_batch_deleted"`.
 */
export class BetaDeleteMessageBatchResponseType extends S.Literal("message_batch_deleted") {}

export class BetaDeleteMessageBatchResponse
  extends S.Class<BetaDeleteMessageBatchResponse>("BetaDeleteMessageBatchResponse")({
    /**
     * ID of the Message Batch.
     */
    "id": S.String,
    /**
     * Deleted object type.
     *
     * For Message Batches, this is always `"message_batch_deleted"`.
     */
    "type": BetaDeleteMessageBatchResponseType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "message_batch_deleted" as const)
    )
  })
{}

export class BetaMessageBatchesCancelParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Anthropic API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.anthropic.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaMessageBatchesResultsParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Anthropic API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.anthropic.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaMessagesCountTokensPostParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Anthropic API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.anthropic.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaCountMessageTokensParams
  extends S.Class<BetaCountMessageTokensParams>("BetaCountMessageTokensParams")({
    /**
     * Input messages.
     *
     * Our models are trained to operate on alternating `user` and `assistant` conversational turns. When creating a new `Message`, you specify the prior conversational turns with the `messages` parameter, and the model then generates the next `Message` in the conversation. Consecutive `user` or `assistant` turns in your request will be combined into a single turn.
     *
     * Each input message must be an object with a `role` and `content`. You can specify a single `user`-role message, or you can include multiple `user` and `assistant` messages.
     *
     * If the final message uses the `assistant` role, the response content will continue immediately from the content in that message. This can be used to constrain part of the model's response.
     *
     * Example with a single `user` message:
     *
     * ```json
     * [{"role": "user", "content": "Hello, Claude"}]
     * ```
     *
     * Example with multiple conversational turns:
     *
     * ```json
     * [
     *   {"role": "user", "content": "Hello there."},
     *   {"role": "assistant", "content": "Hi, I'm Claude. How can I help you?"},
     *   {"role": "user", "content": "Can you explain LLMs in plain English?"},
     * ]
     * ```
     *
     * Example with a partially-filled response from Claude:
     *
     * ```json
     * [
     *   {"role": "user", "content": "What's the Greek name for Sun? (A) Sol (B) Helios (C) Sun"},
     *   {"role": "assistant", "content": "The best answer is ("},
     * ]
     * ```
     *
     * Each input message `content` may be either a single `string` or an array of content blocks, where each block has a specific `type`. Using a `string` for `content` is shorthand for an array of one content block of type `"text"`. The following input messages are equivalent:
     *
     * ```json
     * {"role": "user", "content": "Hello, Claude"}
     * ```
     *
     * ```json
     * {"role": "user", "content": [{"type": "text", "text": "Hello, Claude"}]}
     * ```
     *
     * Starting with Claude 3 models, you can also send image content blocks:
     *
     * ```json
     * {"role": "user", "content": [
     *   {
     *     "type": "image",
     *     "source": {
     *       "type": "base64",
     *       "media_type": "image/jpeg",
     *       "data": "/9j/4AAQSkZJRg...",
     *     }
     *   },
     *   {"type": "text", "text": "What is in this image?"}
     * ]}
     * ```
     *
     * We currently support the `base64` source type for images, and the `image/jpeg`, `image/png`, `image/gif`, and `image/webp` media types.
     *
     * See [examples](https://docs.anthropic.com/en/api/messages-examples#vision) for more input examples.
     *
     * Note that if you want to include a [system prompt](https://docs.anthropic.com/en/docs/system-prompts), you can use the top-level `system` parameter — there is no `"system"` role for input messages in the Messages API.
     *
     * There is a limit of 100000 messages in a single request.
     */
    "messages": S.Array(BetaInputMessage),
    "model": Model,
    /**
     * System prompt.
     *
     * A system prompt is a way of providing context and instructions to Claude, such as specifying a particular goal or role. See our [guide to system prompts](https://docs.anthropic.com/en/docs/system-prompts).
     */
    "system": S.optionalWith(S.Union(S.String, S.Array(BetaRequestTextBlock)), { nullable: true }),
    "thinking": S.optionalWith(BetaThinkingConfigParam, { nullable: true }),
    "tool_choice": S.optionalWith(BetaToolChoice, { nullable: true }),
    /**
     * Definitions of tools that the model may use.
     *
     * If you include `tools` in your API request, the model may return `tool_use` content blocks that represent the model's use of those tools. You can then run those tools using the tool input generated by the model and then optionally return results back to the model using `tool_result` content blocks.
     *
     * Each tool definition includes:
     *
     * * `name`: Name of the tool.
     * * `description`: Optional, but strongly-recommended description of the tool.
     * * `input_schema`: [JSON schema](https://json-schema.org/draft/2020-12) for the tool `input` shape that the model will produce in `tool_use` output content blocks.
     *
     * For example, if you defined `tools` as:
     *
     * ```json
     * [
     *   {
     *     "name": "get_stock_price",
     *     "description": "Get the current stock price for a given ticker symbol.",
     *     "input_schema": {
     *       "type": "object",
     *       "properties": {
     *         "ticker": {
     *           "type": "string",
     *           "description": "The stock ticker symbol, e.g. AAPL for Apple Inc."
     *         }
     *       },
     *       "required": ["ticker"]
     *     }
     *   }
     * ]
     * ```
     *
     * And then asked the model "What's the S&P 500 at today?", the model might produce `tool_use` content blocks in the response like this:
     *
     * ```json
     * [
     *   {
     *     "type": "tool_use",
     *     "id": "toolu_01D7FLrfh4GYq7yT1ULFeyMV",
     *     "name": "get_stock_price",
     *     "input": { "ticker": "^GSPC" }
     *   }
     * ]
     * ```
     *
     * You might then run your `get_stock_price` tool with `{"ticker": "^GSPC"}` as an input, and return the following back to the model in a subsequent `user` message:
     *
     * ```json
     * [
     *   {
     *     "type": "tool_result",
     *     "tool_use_id": "toolu_01D7FLrfh4GYq7yT1ULFeyMV",
     *     "content": "259.75 USD"
     *   }
     * ]
     * ```
     *
     * Tools can be used for workflows that include running client-side tools and functions, or more generally whenever you want the model to produce a particular JSON structure of output.
     *
     * See our [guide](https://docs.anthropic.com/en/docs/tool-use) for more details.
     */
    "tools": S.optionalWith(
      S.Array(
        S.Union(
          BetaTool,
          BetaComputerUseTool20241022,
          BetaBashTool20241022,
          BetaTextEditor20241022,
          BetaComputerUseTool20250124,
          BetaBashTool20250124,
          BetaTextEditor20250124,
          BetaWebSearchTool20250305
        )
      ),
      { nullable: true }
    )
  })
{}

export class BetaCountMessageTokensResponse
  extends S.Class<BetaCountMessageTokensResponse>("BetaCountMessageTokensResponse")({
    /**
     * The total number of tokens across the provided list of messages, system prompt, and tools.
     */
    "input_tokens": S.Int
  })
{}

export const make = (
  httpClient: HttpClient.HttpClient,
  options: {
    readonly transformClient?: ((client: HttpClient.HttpClient) => Effect.Effect<HttpClient.HttpClient>) | undefined
  } = {}
): Client => {
  const unexpectedStatus = (response: HttpClientResponse.HttpClientResponse) =>
    Effect.flatMap(
      Effect.orElseSucceed(response.json, () => "Unexpected status code"),
      (description) =>
        Effect.fail(
          new HttpClientError.ResponseError({
            request: response.request,
            response,
            reason: "StatusCode",
            description: typeof description === "string" ? description : JSON.stringify(description)
          })
        )
    )
  const withResponse: <A, E>(
    f: (response: HttpClientResponse.HttpClientResponse) => Effect.Effect<A, E>
  ) => (
    request: HttpClientRequest.HttpClientRequest
  ) => Effect.Effect<any, any> = options.transformClient
    ? (f) => (request) =>
      Effect.flatMap(
        Effect.flatMap(options.transformClient!(httpClient), (client) => client.execute(request)),
        f
      )
    : (f) => (request) => Effect.flatMap(httpClient.execute(request), f)
  const decodeSuccess = <A, I, R>(schema: S.Schema<A, I, R>) => (response: HttpClientResponse.HttpClientResponse) =>
    HttpClientResponse.schemaBodyJson(schema)(response)
  const decodeError =
    <const Tag extends string, A, I, R>(tag: Tag, schema: S.Schema<A, I, R>) =>
    (response: HttpClientResponse.HttpClientResponse) =>
      Effect.flatMap(
        HttpClientResponse.schemaBodyJson(schema)(response),
        (cause) => Effect.fail(ClientError(tag, cause, response))
      )
  return {
    httpClient,
    "messagesPost": (options) =>
      HttpClientRequest.post(`/v1/messages`).pipe(
        HttpClientRequest.setHeaders({ "anthropic-version": options.params?.["anthropic-version"] ?? undefined }),
        HttpClientRequest.bodyUnsafeJson(options.payload),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(Message),
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "completePost": (options) =>
      HttpClientRequest.post(`/v1/complete`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-version": options.params?.["anthropic-version"] ?? undefined,
          "anthropic-beta": options.params?.["anthropic-beta"] ?? undefined
        }),
        HttpClientRequest.bodyUnsafeJson(options.payload),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CompletionResponse),
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "modelsList": (options) =>
      HttpClientRequest.get(`/v1/models`).pipe(
        HttpClientRequest.setUrlParams({
          "before_id": options?.["before_id"] as any,
          "after_id": options?.["after_id"] as any,
          "limit": options?.["limit"] as any
        }),
        HttpClientRequest.setHeaders({
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined,
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListResponseModelInfo),
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "modelsGet": (modelId, options) =>
      HttpClientRequest.get(`/v1/models/${modelId}`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined,
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ModelInfo),
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "messageBatchesList": (options) =>
      HttpClientRequest.get(`/v1/messages/batches`).pipe(
        HttpClientRequest.setUrlParams({
          "before_id": options?.["before_id"] as any,
          "after_id": options?.["after_id"] as any,
          "limit": options?.["limit"] as any
        }),
        HttpClientRequest.setHeaders({
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListResponseMessageBatch),
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "messageBatchesPost": (options) =>
      HttpClientRequest.post(`/v1/messages/batches`).pipe(
        HttpClientRequest.setHeaders({ "anthropic-version": options.params?.["anthropic-version"] ?? undefined }),
        HttpClientRequest.bodyUnsafeJson(options.payload),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(MessageBatch),
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "messageBatchesRetrieve": (messageBatchId, options) =>
      HttpClientRequest.get(`/v1/messages/batches/${messageBatchId}`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(MessageBatch),
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "messageBatchesDelete": (messageBatchId, options) =>
      HttpClientRequest.del(`/v1/messages/batches/${messageBatchId}`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeleteMessageBatchResponse),
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "messageBatchesCancel": (messageBatchId, options) =>
      HttpClientRequest.post(`/v1/messages/batches/${messageBatchId}/cancel`).pipe(
        HttpClientRequest.setHeaders({ "anthropic-version": options?.["anthropic-version"] ?? undefined }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(MessageBatch),
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "messageBatchesResults": (messageBatchId, options) =>
      HttpClientRequest.get(`/v1/messages/batches/${messageBatchId}/results`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "messagesCountTokensPost": (options) =>
      HttpClientRequest.post(`/v1/messages/count_tokens`).pipe(
        HttpClientRequest.setHeaders({ "anthropic-version": options.params?.["anthropic-version"] ?? undefined }),
        HttpClientRequest.bodyUnsafeJson(options.payload),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CountMessageTokensResponse),
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "betaMessagesPost": (options) =>
      HttpClientRequest.post(`/v1/messages?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options.params?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options.params?.["anthropic-version"] ?? undefined
        }),
        HttpClientRequest.bodyUnsafeJson(options.payload),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BetaMessage),
          "4xx": decodeError("BetaErrorResponse", BetaErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "betaModelsList": (options) =>
      HttpClientRequest.get(`/v1/models?beta=true`).pipe(
        HttpClientRequest.setUrlParams({
          "before_id": options?.["before_id"] as any,
          "after_id": options?.["after_id"] as any,
          "limit": options?.["limit"] as any
        }),
        HttpClientRequest.setHeaders({
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined,
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BetaListResponseModelInfo),
          "4xx": decodeError("BetaErrorResponse", BetaErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "betaModelsGet": (modelId, options) =>
      HttpClientRequest.get(`/v1/models/${modelId}?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined,
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BetaModelInfo),
          "4xx": decodeError("BetaErrorResponse", BetaErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "betaMessageBatchesList": (options) =>
      HttpClientRequest.get(`/v1/messages/batches?beta=true`).pipe(
        HttpClientRequest.setUrlParams({
          "before_id": options?.["before_id"] as any,
          "after_id": options?.["after_id"] as any,
          "limit": options?.["limit"] as any
        }),
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BetaListResponseMessageBatch),
          "4xx": decodeError("BetaErrorResponse", BetaErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "betaMessageBatchesPost": (options) =>
      HttpClientRequest.post(`/v1/messages/batches?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options.params?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options.params?.["anthropic-version"] ?? undefined
        }),
        HttpClientRequest.bodyUnsafeJson(options.payload),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BetaMessageBatch),
          "4xx": decodeError("BetaErrorResponse", BetaErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "betaMessageBatchesRetrieve": (messageBatchId, options) =>
      HttpClientRequest.get(`/v1/messages/batches/${messageBatchId}?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BetaMessageBatch),
          "4xx": decodeError("BetaErrorResponse", BetaErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "betaMessageBatchesDelete": (messageBatchId, options) =>
      HttpClientRequest.del(`/v1/messages/batches/${messageBatchId}?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BetaDeleteMessageBatchResponse),
          "4xx": decodeError("BetaErrorResponse", BetaErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "betaMessageBatchesCancel": (messageBatchId, options) =>
      HttpClientRequest.post(`/v1/messages/batches/${messageBatchId}/cancel?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BetaMessageBatch),
          "4xx": decodeError("BetaErrorResponse", BetaErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "betaMessageBatchesResults": (messageBatchId, options) =>
      HttpClientRequest.get(`/v1/messages/batches/${messageBatchId}/results?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "4xx": decodeError("BetaErrorResponse", BetaErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "betaMessagesCountTokensPost": (options) =>
      HttpClientRequest.post(`/v1/messages/count_tokens?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options.params?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options.params?.["anthropic-version"] ?? undefined
        }),
        HttpClientRequest.bodyUnsafeJson(options.payload),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BetaCountMessageTokensResponse),
          "4xx": decodeError("BetaErrorResponse", BetaErrorResponse),
          orElse: unexpectedStatus
        }))
      )
  }
}

export interface Client {
  readonly httpClient: HttpClient.HttpClient
  /**
   * Send a structured list of input messages with text and/or image content, and the model will generate the next message in the conversation.
   *
   * The Messages API can be used for either single queries or stateless multi-turn conversations.
   *
   * Learn more about the Messages API in our [user guide](/en/docs/initial-setup)
   */
  readonly "messagesPost": (
    options: {
      readonly params?: typeof MessagesPostParams.Encoded | undefined
      readonly payload: typeof CreateMessageParams.Encoded
    }
  ) => Effect.Effect<
    typeof Message.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * [Legacy] Create a Text Completion.
   *
   * The Text Completions API is a legacy API. We recommend using the [Messages API](https://docs.anthropic.com/en/api/messages) going forward.
   *
   * Future models and features will not be compatible with Text Completions. See our [migration guide](https://docs.anthropic.com/en/api/migrating-from-text-completions-to-messages) for guidance in migrating from Text Completions to Messages.
   */
  readonly "completePost": (
    options: {
      readonly params?: typeof CompletePostParams.Encoded | undefined
      readonly payload: typeof CompletionRequest.Encoded
    }
  ) => Effect.Effect<
    typeof CompletionResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * List available models.
   *
   * The Models API response can be used to determine which models are available for use in the API. More recently released models are listed first.
   */
  readonly "modelsList": (
    options?: typeof ModelsListParams.Encoded | undefined
  ) => Effect.Effect<
    typeof ListResponseModelInfo.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Get a specific model.
   *
   * The Models API response can be used to determine information about a specific model or resolve a model alias to a model ID.
   */
  readonly "modelsGet": (
    modelId: string,
    options?: typeof ModelsGetParams.Encoded | undefined
  ) => Effect.Effect<
    typeof ModelInfo.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * List all Message Batches within a Workspace. Most recently created batches are returned first.
   *
   * Learn more about the Message Batches API in our [user guide](/en/docs/build-with-claude/batch-processing)
   */
  readonly "messageBatchesList": (
    options?: typeof MessageBatchesListParams.Encoded | undefined
  ) => Effect.Effect<
    typeof ListResponseMessageBatch.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Send a batch of Message creation requests.
   *
   * The Message Batches API can be used to process multiple Messages API requests at once. Once a Message Batch is created, it begins processing immediately. Batches can take up to 24 hours to complete.
   *
   * Learn more about the Message Batches API in our [user guide](/en/docs/build-with-claude/batch-processing)
   */
  readonly "messageBatchesPost": (
    options: {
      readonly params?: typeof MessageBatchesPostParams.Encoded | undefined
      readonly payload: typeof CreateMessageBatchParams.Encoded
    }
  ) => Effect.Effect<
    typeof MessageBatch.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * This endpoint is idempotent and can be used to poll for Message Batch completion. To access the results of a Message Batch, make a request to the `results_url` field in the response.
   *
   * Learn more about the Message Batches API in our [user guide](/en/docs/build-with-claude/batch-processing)
   */
  readonly "messageBatchesRetrieve": (
    messageBatchId: string,
    options?: typeof MessageBatchesRetrieveParams.Encoded | undefined
  ) => Effect.Effect<
    typeof MessageBatch.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Delete a Message Batch.
   *
   * Message Batches can only be deleted once they've finished processing. If you'd like to delete an in-progress batch, you must first cancel it.
   *
   * Learn more about the Message Batches API in our [user guide](/en/docs/build-with-claude/batch-processing)
   */
  readonly "messageBatchesDelete": (
    messageBatchId: string,
    options?: typeof MessageBatchesDeleteParams.Encoded | undefined
  ) => Effect.Effect<
    typeof DeleteMessageBatchResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Batches may be canceled any time before processing ends. Once cancellation is initiated, the batch enters a `canceling` state, at which time the system may complete any in-progress, non-interruptible requests before finalizing cancellation.
   *
   * The number of canceled requests is specified in `request_counts`. To determine which requests were canceled, check the individual results within the batch. Note that cancellation may not result in any canceled requests if they were non-interruptible.
   *
   * Learn more about the Message Batches API in our [user guide](/en/docs/build-with-claude/batch-processing)
   */
  readonly "messageBatchesCancel": (
    messageBatchId: string,
    options?: typeof MessageBatchesCancelParams.Encoded | undefined
  ) => Effect.Effect<
    typeof MessageBatch.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Streams the results of a Message Batch as a `.jsonl` file.
   *
   * Each line in the file is a JSON object containing the result of a single request in the Message Batch. Results are not guaranteed to be in the same order as requests. Use the `custom_id` field to match results to requests.
   *
   * Learn more about the Message Batches API in our [user guide](/en/docs/build-with-claude/batch-processing)
   */
  readonly "messageBatchesResults": (
    messageBatchId: string,
    options?: typeof MessageBatchesResultsParams.Encoded | undefined
  ) => Effect.Effect<
    void,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Count the number of tokens in a Message.
   *
   * The Token Count API can be used to count the number of tokens in a Message, including tools, images, and documents, without creating it.
   *
   * Learn more about token counting in our [user guide](/en/docs/build-with-claude/token-counting)
   */
  readonly "messagesCountTokensPost": (
    options: {
      readonly params?: typeof MessagesCountTokensPostParams.Encoded | undefined
      readonly payload: typeof CountMessageTokensParams.Encoded
    }
  ) => Effect.Effect<
    typeof CountMessageTokensResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Send a structured list of input messages with text and/or image content, and the model will generate the next message in the conversation.
   *
   * The Messages API can be used for either single queries or stateless multi-turn conversations.
   *
   * Learn more about the Messages API in our [user guide](/en/docs/initial-setup)
   */
  readonly "betaMessagesPost": (
    options: {
      readonly params?: typeof BetaMessagesPostParams.Encoded | undefined
      readonly payload: typeof BetaCreateMessageParams.Encoded
    }
  ) => Effect.Effect<
    typeof BetaMessage.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"BetaErrorResponse", typeof BetaErrorResponse.Type>
  >
  /**
   * List available models.
   *
   * The Models API response can be used to determine which models are available for use in the API. More recently released models are listed first.
   */
  readonly "betaModelsList": (
    options?: typeof BetaModelsListParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaListResponseModelInfo.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"BetaErrorResponse", typeof BetaErrorResponse.Type>
  >
  /**
   * Get a specific model.
   *
   * The Models API response can be used to determine information about a specific model or resolve a model alias to a model ID.
   */
  readonly "betaModelsGet": (
    modelId: string,
    options?: typeof BetaModelsGetParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaModelInfo.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"BetaErrorResponse", typeof BetaErrorResponse.Type>
  >
  /**
   * List all Message Batches within a Workspace. Most recently created batches are returned first.
   *
   * Learn more about the Message Batches API in our [user guide](/en/docs/build-with-claude/batch-processing)
   */
  readonly "betaMessageBatchesList": (
    options?: typeof BetaMessageBatchesListParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaListResponseMessageBatch.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"BetaErrorResponse", typeof BetaErrorResponse.Type>
  >
  /**
   * Send a batch of Message creation requests.
   *
   * The Message Batches API can be used to process multiple Messages API requests at once. Once a Message Batch is created, it begins processing immediately. Batches can take up to 24 hours to complete.
   *
   * Learn more about the Message Batches API in our [user guide](/en/docs/build-with-claude/batch-processing)
   */
  readonly "betaMessageBatchesPost": (
    options: {
      readonly params?: typeof BetaMessageBatchesPostParams.Encoded | undefined
      readonly payload: typeof BetaCreateMessageBatchParams.Encoded
    }
  ) => Effect.Effect<
    typeof BetaMessageBatch.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"BetaErrorResponse", typeof BetaErrorResponse.Type>
  >
  /**
   * This endpoint is idempotent and can be used to poll for Message Batch completion. To access the results of a Message Batch, make a request to the `results_url` field in the response.
   *
   * Learn more about the Message Batches API in our [user guide](/en/docs/build-with-claude/batch-processing)
   */
  readonly "betaMessageBatchesRetrieve": (
    messageBatchId: string,
    options?: typeof BetaMessageBatchesRetrieveParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaMessageBatch.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"BetaErrorResponse", typeof BetaErrorResponse.Type>
  >
  /**
   * Delete a Message Batch.
   *
   * Message Batches can only be deleted once they've finished processing. If you'd like to delete an in-progress batch, you must first cancel it.
   *
   * Learn more about the Message Batches API in our [user guide](/en/docs/build-with-claude/batch-processing)
   */
  readonly "betaMessageBatchesDelete": (
    messageBatchId: string,
    options?: typeof BetaMessageBatchesDeleteParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaDeleteMessageBatchResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"BetaErrorResponse", typeof BetaErrorResponse.Type>
  >
  /**
   * Batches may be canceled any time before processing ends. Once cancellation is initiated, the batch enters a `canceling` state, at which time the system may complete any in-progress, non-interruptible requests before finalizing cancellation.
   *
   * The number of canceled requests is specified in `request_counts`. To determine which requests were canceled, check the individual results within the batch. Note that cancellation may not result in any canceled requests if they were non-interruptible.
   *
   * Learn more about the Message Batches API in our [user guide](/en/docs/build-with-claude/batch-processing)
   */
  readonly "betaMessageBatchesCancel": (
    messageBatchId: string,
    options?: typeof BetaMessageBatchesCancelParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaMessageBatch.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"BetaErrorResponse", typeof BetaErrorResponse.Type>
  >
  /**
   * Streams the results of a Message Batch as a `.jsonl` file.
   *
   * Each line in the file is a JSON object containing the result of a single request in the Message Batch. Results are not guaranteed to be in the same order as requests. Use the `custom_id` field to match results to requests.
   *
   * Learn more about the Message Batches API in our [user guide](/en/docs/build-with-claude/batch-processing)
   */
  readonly "betaMessageBatchesResults": (
    messageBatchId: string,
    options?: typeof BetaMessageBatchesResultsParams.Encoded | undefined
  ) => Effect.Effect<
    void,
    HttpClientError.HttpClientError | ParseError | ClientError<"BetaErrorResponse", typeof BetaErrorResponse.Type>
  >
  /**
   * Count the number of tokens in a Message.
   *
   * The Token Count API can be used to count the number of tokens in a Message, including tools, images, and documents, without creating it.
   *
   * Learn more about token counting in our [user guide](/en/docs/build-with-claude/token-counting)
   */
  readonly "betaMessagesCountTokensPost": (
    options: {
      readonly params?: typeof BetaMessagesCountTokensPostParams.Encoded | undefined
      readonly payload: typeof BetaCountMessageTokensParams.Encoded
    }
  ) => Effect.Effect<
    typeof BetaCountMessageTokensResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"BetaErrorResponse", typeof BetaErrorResponse.Type>
  >
}

export interface ClientError<Tag extends string, E> {
  readonly _tag: Tag
  readonly request: HttpClientRequest.HttpClientRequest
  readonly response: HttpClientResponse.HttpClientResponse
  readonly cause: E
}

class ClientErrorImpl extends Data.Error<{
  _tag: string
  cause: any
  request: HttpClientRequest.HttpClientRequest
  response: HttpClientResponse.HttpClientResponse
}> {}

export const ClientError = <Tag extends string, E>(
  tag: Tag,
  cause: E,
  response: HttpClientResponse.HttpClientResponse
): ClientError<Tag, E> =>
  new ClientErrorImpl({
    _tag: tag,
    cause,
    response,
    request: response.request
  }) as any
