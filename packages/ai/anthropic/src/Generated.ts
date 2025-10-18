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
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The model that will complete your prompt.\n\nSee [models](https://docs.anthropic.com/en/docs/models-overview) for additional details and options.
 */
export class Model extends S.Union(
  /**
   * High-performance model with early extended thinking
   */
  S.Literal("claude-3-7-sonnet-latest"),
  /**
   * High-performance model with early extended thinking
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
   * Hybrid model, capable of near-instant responses and extended thinking
   */
  S.Literal("claude-haiku-4-5"),
  /**
   * Hybrid model, capable of near-instant responses and extended thinking
   */
  S.Literal("claude-haiku-4-5-20251001"),
  /**
   * High-performance model with extended thinking
   */
  S.Literal("claude-sonnet-4-20250514"),
  /**
   * High-performance model with extended thinking
   */
  S.Literal("claude-sonnet-4-0"),
  /**
   * High-performance model with extended thinking
   */
  S.Literal("claude-4-sonnet-20250514"),
  /**
   * Our best model for real-world agents and coding
   */
  S.Literal("claude-sonnet-4-5"),
  /**
   * Our best model for real-world agents and coding
   */
  S.Literal("claude-sonnet-4-5-20250929"),
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
   * Our most capable model
   */
  S.Literal("claude-opus-4-0"),
  /**
   * Our most capable model
   */
  S.Literal("claude-opus-4-20250514"),
  /**
   * Our most capable model
   */
  S.Literal("claude-4-opus-20250514"),
  /**
   * Our most capable model
   */
  S.Literal("claude-opus-4-1-20250805"),
  /**
   * Excels at writing and complex tasks
   */
  S.Literal("claude-3-opus-latest"),
  /**
   * Excels at writing and complex tasks
   */
  S.Literal("claude-3-opus-20240229"),
  /**
   * Our previous most fast and cost-effective
   */
  S.Literal("claude-3-haiku-20240307")
) {}

/**
 * The time-to-live for the cache control breakpoint.
 *
 * This may be one the following values:
 * - `5m`: 5 minutes
 * - `1h`: 1 hour
 *
 * Defaults to `5m`.
 */
export class CacheControlEphemeralTtl extends S.Literal("5m", "1h") {}

export class CacheControlEphemeral extends S.Class<CacheControlEphemeral>("CacheControlEphemeral")({
  /**
   * The time-to-live for the cache control breakpoint.
   *
   * This may be one the following values:
   * - `5m`: 5 minutes
   * - `1h`: 1 hour
   *
   * Defaults to `5m`.
   */
  "ttl": S.optionalWith(CacheControlEphemeralTtl, { nullable: true }),
  "type": S.Literal("ephemeral")
}) {}

export class RequestCharLocationCitation extends S.Class<RequestCharLocationCitation>("RequestCharLocationCitation")({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.NullOr(S.String.pipe(S.minLength(1), S.maxLength(255))),
  "end_char_index": S.Int,
  "start_char_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "type": S.Literal("char_location")
}) {}

export class RequestPageLocationCitation extends S.Class<RequestPageLocationCitation>("RequestPageLocationCitation")({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.NullOr(S.String.pipe(S.minLength(1), S.maxLength(255))),
  "end_page_number": S.Int,
  "start_page_number": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "type": S.Literal("page_location")
}) {}

export class RequestContentBlockLocationCitation
  extends S.Class<RequestContentBlockLocationCitation>("RequestContentBlockLocationCitation")({
    "cited_text": S.String,
    "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "document_title": S.NullOr(S.String.pipe(S.minLength(1), S.maxLength(255))),
    "end_block_index": S.Int,
    "start_block_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "type": S.Literal("content_block_location")
  })
{}

export class RequestWebSearchResultLocationCitation
  extends S.Class<RequestWebSearchResultLocationCitation>("RequestWebSearchResultLocationCitation")({
    "cited_text": S.String,
    "encrypted_index": S.String,
    "title": S.NullOr(S.String.pipe(S.minLength(1), S.maxLength(512))),
    "type": S.Literal("web_search_result_location"),
    "url": S.String.pipe(S.minLength(1), S.maxLength(2048))
  })
{}

export class RequestSearchResultLocationCitation
  extends S.Class<RequestSearchResultLocationCitation>("RequestSearchResultLocationCitation")({
    "cited_text": S.String,
    "end_block_index": S.Int,
    "search_result_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "source": S.String,
    "start_block_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "title": S.NullOr(S.String),
    "type": S.Literal("search_result_location")
  })
{}

export class RequestTextBlock extends S.Class<RequestTextBlock>("RequestTextBlock")({
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
        RequestWebSearchResultLocationCitation,
        RequestSearchResultLocationCitation
      )
    ),
    { nullable: true }
  ),
  "text": S.String.pipe(S.minLength(1)),
  "type": S.Literal("text")
}) {}

export class Base64ImageSourceMediaType extends S.Literal("image/jpeg", "image/png", "image/gif", "image/webp") {}

export class Base64ImageSource extends S.Class<Base64ImageSource>("Base64ImageSource")({
  "data": S.String,
  "media_type": Base64ImageSourceMediaType,
  "type": S.Literal("base64")
}) {}

export class URLImageSource extends S.Class<URLImageSource>("URLImageSource")({
  "type": S.Literal("url"),
  "url": S.String
}) {}

export class RequestImageBlock extends S.Class<RequestImageBlock>("RequestImageBlock")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true }),
  "source": S.Union(Base64ImageSource, URLImageSource),
  "type": S.Literal("image")
}) {}

export class RequestCitationsConfig extends S.Class<RequestCitationsConfig>("RequestCitationsConfig")({
  "enabled": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class Base64PDFSource extends S.Class<Base64PDFSource>("Base64PDFSource")({
  "data": S.String,
  "media_type": S.Literal("application/pdf"),
  "type": S.Literal("base64")
}) {}

export class PlainTextSource extends S.Class<PlainTextSource>("PlainTextSource")({
  "data": S.String,
  "media_type": S.Literal("text/plain"),
  "type": S.Literal("text")
}) {}

export class ContentBlockSource extends S.Class<ContentBlockSource>("ContentBlockSource")({
  "content": S.Union(S.String, S.Array(S.Union(RequestTextBlock, RequestImageBlock))),
  "type": S.Literal("content")
}) {}

export class URLPDFSource extends S.Class<URLPDFSource>("URLPDFSource")({
  "type": S.Literal("url"),
  "url": S.String
}) {}

export class RequestDocumentBlock extends S.Class<RequestDocumentBlock>("RequestDocumentBlock")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true }),
  "citations": S.optionalWith(RequestCitationsConfig, { nullable: true }),
  "context": S.optionalWith(S.String.pipe(S.minLength(1)), { nullable: true }),
  "source": S.Union(Base64PDFSource, PlainTextSource, ContentBlockSource, URLPDFSource),
  "title": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(500)), { nullable: true }),
  "type": S.Literal("document")
}) {}

export class RequestSearchResultBlock extends S.Class<RequestSearchResultBlock>("RequestSearchResultBlock")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true }),
  "citations": S.optionalWith(RequestCitationsConfig, { nullable: true }),
  "content": S.Array(RequestTextBlock),
  "source": S.String,
  "title": S.String,
  "type": S.Literal("search_result")
}) {}

export class RequestThinkingBlock extends S.Class<RequestThinkingBlock>("RequestThinkingBlock")({
  "signature": S.String,
  "thinking": S.String,
  "type": S.Literal("thinking")
}) {}

export class RequestRedactedThinkingBlock
  extends S.Class<RequestRedactedThinkingBlock>("RequestRedactedThinkingBlock")({
    "data": S.String,
    "type": S.Literal("redacted_thinking")
  })
{}

export class RequestToolUseBlock extends S.Class<RequestToolUseBlock>("RequestToolUseBlock")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true }),
  "id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": S.String.pipe(S.minLength(1), S.maxLength(200)),
  "type": S.Literal("tool_use")
}) {}

export class RequestToolResultBlock extends S.Class<RequestToolResultBlock>("RequestToolResultBlock")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true }),
  "content": S.optionalWith(
    S.Union(
      S.String,
      S.Array(S.Union(RequestTextBlock, RequestImageBlock, RequestSearchResultBlock, RequestDocumentBlock))
    ),
    { nullable: true }
  ),
  "is_error": S.optionalWith(S.Boolean, { nullable: true }),
  "tool_use_id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "type": S.Literal("tool_result")
}) {}

export class RequestServerToolUseBlock extends S.Class<RequestServerToolUseBlock>("RequestServerToolUseBlock")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true }),
  "id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": S.Literal("web_search"),
  "type": S.Literal("server_tool_use")
}) {}

export class RequestWebSearchResultBlock extends S.Class<RequestWebSearchResultBlock>("RequestWebSearchResultBlock")({
  "encrypted_content": S.String,
  "page_age": S.optionalWith(S.String, { nullable: true }),
  "title": S.String,
  "type": S.Literal("web_search_result"),
  "url": S.String
}) {}

export class WebSearchToolResultErrorCode
  extends S.Literal("invalid_tool_input", "unavailable", "max_uses_exceeded", "too_many_requests", "query_too_long")
{}

export class RequestWebSearchToolResultError
  extends S.Class<RequestWebSearchToolResultError>("RequestWebSearchToolResultError")({
    "error_code": WebSearchToolResultErrorCode,
    "type": S.Literal("web_search_tool_result_error")
  })
{}

export class RequestWebSearchToolResultBlock
  extends S.Class<RequestWebSearchToolResultBlock>("RequestWebSearchToolResultBlock")({
    /**
     * Create a cache control breakpoint at this content block.
     */
    "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true }),
    "content": S.Union(S.Array(RequestWebSearchResultBlock), RequestWebSearchToolResultError),
    "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
    "type": S.Literal("web_search_tool_result")
  })
{}

export class InputContentBlock extends S.Union(
  /**
   * Regular text content.
   */
  RequestTextBlock,
  /**
   * Image content specified directly as base64 data or as a reference via a URL.
   */
  RequestImageBlock,
  /**
   * Document content, either specified directly as base64 data, as text, or as a reference via a URL.
   */
  RequestDocumentBlock,
  /**
   * A search result block containing source, title, and content from search operations.
   */
  RequestSearchResultBlock,
  /**
   * A block specifying internal thinking by the model.
   */
  RequestThinkingBlock,
  /**
   * A block specifying internal, redacted thinking by the model.
   */
  RequestRedactedThinkingBlock,
  /**
   * A block indicating a tool use by the model.
   */
  RequestToolUseBlock,
  /**
   * A block specifying the results of a tool use by the model.
   */
  RequestToolResultBlock,
  RequestServerToolUseBlock,
  RequestWebSearchToolResultBlock
) {}

export class InputMessageRole extends S.Literal("user", "assistant") {}

export class InputMessage extends S.Class<InputMessage>("InputMessage")({
  "content": S.Union(S.String, S.Array(InputContentBlock)),
  "role": InputMessageRole
}) {}

export class Metadata extends S.Class<Metadata>("Metadata")({
  /**
   * An external identifier for the user who is associated with the request.
   *
   * This should be a uuid, hash value, or other opaque identifier. Anthropic may use this id to help detect abuse. Do not include any identifying information such as name, email address, or phone number.
   */
  "user_id": S.optionalWith(S.String.pipe(S.maxLength(256)), { nullable: true })
}) {}

/**
 * Determines whether to use priority capacity (if available) or standard capacity for this request.
 *
 * Anthropic offers different levels of service for your API requests. See [service-tiers](https://docs.claude.com/en/api/service-tiers) for details.
 */
export class CreateMessageParamsServiceTier extends S.Literal("auto", "standard_only") {}

export class ThinkingConfigEnabled extends S.Class<ThinkingConfigEnabled>("ThinkingConfigEnabled")({
  /**
   * Determines how many tokens Claude can use for its internal reasoning process. Larger budgets can enable more thorough analysis for complex problems, improving response quality.
   *
   * Must be ≥1024 and less than `max_tokens`.
   *
   * See [extended thinking](https://docs.claude.com/en/docs/build-with-claude/extended-thinking) for details.
   */
  "budget_tokens": S.Int.pipe(S.greaterThanOrEqualTo(1024)),
  "type": S.Literal("enabled")
}) {}

export class ThinkingConfigDisabled extends S.Class<ThinkingConfigDisabled>("ThinkingConfigDisabled")({
  "type": S.Literal("disabled")
}) {}

/**
 * Configuration for enabling Claude's extended thinking.
 *
 * When enabled, responses include `thinking` content blocks showing Claude's thinking process before the final answer. Requires a minimum budget of 1,024 tokens and counts towards your `max_tokens` limit.
 *
 * See [extended thinking](https://docs.claude.com/en/docs/build-with-claude/extended-thinking) for details.
 */
export class ThinkingConfigParam extends S.Union(ThinkingConfigEnabled, ThinkingConfigDisabled) {}

/**
 * The model will automatically decide whether to use tools.
 */
export class ToolChoiceAuto extends S.Class<ToolChoiceAuto>("ToolChoiceAuto")({
  /**
   * Whether to disable parallel tool use.
   *
   * Defaults to `false`. If set to `true`, the model will output at most one tool use.
   */
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true }),
  "type": S.Literal("auto")
}) {}

/**
 * The model will use any available tools.
 */
export class ToolChoiceAny extends S.Class<ToolChoiceAny>("ToolChoiceAny")({
  /**
   * Whether to disable parallel tool use.
   *
   * Defaults to `false`. If set to `true`, the model will output exactly one tool use.
   */
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true }),
  "type": S.Literal("any")
}) {}

/**
 * The model will use the specified tool with `tool_choice.name`.
 */
export class ToolChoiceTool extends S.Class<ToolChoiceTool>("ToolChoiceTool")({
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
  "type": S.Literal("tool")
}) {}

/**
 * The model will not be allowed to use tools.
 */
export class ToolChoiceNone extends S.Class<ToolChoiceNone>("ToolChoiceNone")({
  "type": S.Literal("none")
}) {}

/**
 * How the model should use the provided tools. The model can use a specific tool, any available tool, decide by itself, or not use tools at all.
 */
export class ToolChoice extends S.Union(ToolChoiceAuto, ToolChoiceAny, ToolChoiceTool, ToolChoiceNone) {}

export class InputSchema extends S.Class<InputSchema>("InputSchema")({
  "properties": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Array(S.String), { nullable: true }),
  "type": S.Literal("object")
}) {}

export class Tool extends S.Class<Tool>("Tool")({
  "type": S.optionalWith(S.Literal("custom"), { nullable: true }),
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
  "name": S.String.pipe(S.minLength(1), S.maxLength(128), S.pattern(new RegExp("^[a-zA-Z0-9_-]{1,128}$"))),
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

export class BashTool20250124 extends S.Class<BashTool20250124>("BashTool20250124")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": S.Literal("bash"),
  "type": S.Literal("bash_20250124")
}) {}

export class TextEditor20250124 extends S.Class<TextEditor20250124>("TextEditor20250124")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": S.Literal("str_replace_editor"),
  "type": S.Literal("text_editor_20250124")
}) {}

export class TextEditor20250429 extends S.Class<TextEditor20250429>("TextEditor20250429")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": S.Literal("str_replace_based_edit_tool"),
  "type": S.Literal("text_editor_20250429")
}) {}

export class TextEditor20250728 extends S.Class<TextEditor20250728>("TextEditor20250728")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(CacheControlEphemeral, { nullable: true }),
  /**
   * Maximum number of characters to display when viewing a file. If not specified, defaults to displaying the full file.
   */
  "max_characters": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1)), { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": S.Literal("str_replace_based_edit_tool"),
  "type": S.Literal("text_editor_20250728")
}) {}

export class UserLocation extends S.Class<UserLocation>("UserLocation")({
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
  "type": S.Literal("approximate")
}) {}

export class WebSearchTool20250305 extends S.Class<WebSearchTool20250305>("WebSearchTool20250305")({
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
  "name": S.Literal("web_search"),
  "type": S.Literal("web_search_20250305"),
  /**
   * Parameters for the user's location. Used to provide more relevant search results.
   */
  "user_location": S.optionalWith(UserLocation, { nullable: true })
}) {}

export class CreateMessageParams extends S.Class<CreateMessageParams>("CreateMessageParams")({
  "model": S.Union(S.String, Model),
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
   * See [input examples](https://docs.claude.com/en/api/messages-examples).
   *
   * Note that if you want to include a [system prompt](https://docs.claude.com/en/docs/system-prompts), you can use the top-level `system` parameter — there is no `"system"` role for input messages in the Messages API.
   *
   * There is a limit of 100,000 messages in a single request.
   */
  "messages": S.Array(InputMessage),
  /**
   * The maximum number of tokens to generate before stopping.
   *
   * Note that our models may stop _before_ reaching this maximum. This parameter only specifies the absolute maximum number of tokens to generate.
   *
   * Different models have different maximum values for this parameter.  See [models](https://docs.claude.com/en/docs/models-overview) for details.
   */
  "max_tokens": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  /**
   * An object describing metadata about the request.
   */
  "metadata": S.optionalWith(Metadata, { nullable: true }),
  /**
   * Determines whether to use priority capacity (if available) or standard capacity for this request.
   *
   * Anthropic offers different levels of service for your API requests. See [service-tiers](https://docs.claude.com/en/api/service-tiers) for details.
   */
  "service_tier": S.optionalWith(CreateMessageParamsServiceTier, { nullable: true }),
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
   * See [streaming](https://docs.claude.com/en/api/messages-streaming) for details.
   */
  "stream": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * System prompt.
   *
   * A system prompt is a way of providing context and instructions to Claude, such as specifying a particular goal or role. See our [guide to system prompts](https://docs.claude.com/en/docs/system-prompts).
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
   * There are two types of tools: **client tools** and **server tools**. The behavior described below applies to client tools. For [server tools](https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview\#server-tools), see their individual documentation as each has its own behavior (e.g., the [web search tool](https://docs.claude.com/en/docs/agents-and-tools/tool-use/web-search-tool)).
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
   * See our [guide](https://docs.claude.com/en/docs/tool-use) for more details.
   */
  "tools": S.optionalWith(
    S.Array(
      S.Union(Tool, BashTool20250124, TextEditor20250124, TextEditor20250429, TextEditor20250728, WebSearchTool20250305)
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

export class ResponseCharLocationCitation
  extends S.Class<ResponseCharLocationCitation>("ResponseCharLocationCitation")({
    "cited_text": S.String,
    "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "document_title": S.NullOr(S.String),
    "end_char_index": S.Int,
    "file_id": S.optionalWith(S.NullOr(S.String), { default: () => null }),
    "start_char_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "type": S.Literal("char_location").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "char_location" as const)
    )
  })
{}

export class ResponsePageLocationCitation
  extends S.Class<ResponsePageLocationCitation>("ResponsePageLocationCitation")({
    "cited_text": S.String,
    "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "document_title": S.NullOr(S.String),
    "end_page_number": S.Int,
    "file_id": S.optionalWith(S.NullOr(S.String), { default: () => null }),
    "start_page_number": S.Int.pipe(S.greaterThanOrEqualTo(1)),
    "type": S.Literal("page_location").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "page_location" as const)
    )
  })
{}

export class ResponseContentBlockLocationCitation
  extends S.Class<ResponseContentBlockLocationCitation>("ResponseContentBlockLocationCitation")({
    "cited_text": S.String,
    "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "document_title": S.NullOr(S.String),
    "end_block_index": S.Int,
    "file_id": S.optionalWith(S.NullOr(S.String), { default: () => null }),
    "start_block_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "type": S.Literal("content_block_location").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "content_block_location" as const)
    )
  })
{}

export class ResponseWebSearchResultLocationCitation
  extends S.Class<ResponseWebSearchResultLocationCitation>("ResponseWebSearchResultLocationCitation")({
    "cited_text": S.String,
    "encrypted_index": S.String,
    "title": S.NullOr(S.String.pipe(S.maxLength(512))),
    "type": S.Literal("web_search_result_location").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "web_search_result_location" as const)
    ),
    "url": S.String
  })
{}

export class ResponseSearchResultLocationCitation
  extends S.Class<ResponseSearchResultLocationCitation>("ResponseSearchResultLocationCitation")({
    "cited_text": S.String,
    "end_block_index": S.Int,
    "search_result_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "source": S.String,
    "start_block_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "title": S.NullOr(S.String),
    "type": S.Literal("search_result_location").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "search_result_location" as const)
    )
  })
{}

export class ResponseTextBlock extends S.Class<ResponseTextBlock>("ResponseTextBlock")({
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
          ResponseWebSearchResultLocationCitation,
          ResponseSearchResultLocationCitation
        )
      )
    ),
    { default: () => null }
  ),
  "text": S.String.pipe(S.minLength(0), S.maxLength(5000000)),
  "type": S.Literal("text").pipe(S.propertySignature, S.withConstructorDefault(() => "text" as const))
}) {}

export class ResponseThinkingBlock extends S.Class<ResponseThinkingBlock>("ResponseThinkingBlock")({
  "signature": S.String,
  "thinking": S.String,
  "type": S.Literal("thinking").pipe(S.propertySignature, S.withConstructorDefault(() => "thinking" as const))
}) {}

export class ResponseRedactedThinkingBlock
  extends S.Class<ResponseRedactedThinkingBlock>("ResponseRedactedThinkingBlock")({
    "data": S.String,
    "type": S.Literal("redacted_thinking").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "redacted_thinking" as const)
    )
  })
{}

export class ResponseToolUseBlock extends S.Class<ResponseToolUseBlock>("ResponseToolUseBlock")({
  "id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": S.String.pipe(S.minLength(1)),
  "type": S.Literal("tool_use").pipe(S.propertySignature, S.withConstructorDefault(() => "tool_use" as const))
}) {}

export class ResponseServerToolUseBlock extends S.Class<ResponseServerToolUseBlock>("ResponseServerToolUseBlock")({
  "id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": S.Literal("web_search"),
  "type": S.Literal("server_tool_use").pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "server_tool_use" as const)
  )
}) {}

export class ResponseWebSearchToolResultError
  extends S.Class<ResponseWebSearchToolResultError>("ResponseWebSearchToolResultError")({
    "error_code": WebSearchToolResultErrorCode,
    "type": S.Literal("web_search_tool_result_error").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "web_search_tool_result_error" as const)
    )
  })
{}

export class ResponseWebSearchResultBlock
  extends S.Class<ResponseWebSearchResultBlock>("ResponseWebSearchResultBlock")({
    "encrypted_content": S.String,
    "page_age": S.optionalWith(S.NullOr(S.String), { default: () => null }),
    "title": S.String,
    "type": S.Literal("web_search_result").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "web_search_result" as const)
    ),
    "url": S.String
  })
{}

export class ResponseWebSearchToolResultBlock
  extends S.Class<ResponseWebSearchToolResultBlock>("ResponseWebSearchToolResultBlock")({
    "content": S.Union(ResponseWebSearchToolResultError, S.Array(ResponseWebSearchResultBlock)),
    "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
    "type": S.Literal("web_search_tool_result").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "web_search_tool_result" as const)
    )
  })
{}

export class ContentBlock extends S.Union(
  ResponseTextBlock,
  ResponseThinkingBlock,
  ResponseRedactedThinkingBlock,
  ResponseToolUseBlock,
  ResponseServerToolUseBlock,
  ResponseWebSearchToolResultBlock
) {}

export class StopReason
  extends S.Literal("end_turn", "max_tokens", "stop_sequence", "tool_use", "pause_turn", "refusal")
{}

export class CacheCreation extends S.Class<CacheCreation>("CacheCreation")({
  /**
   * The number of input tokens used to create the 1 hour cache entry.
   */
  "ephemeral_1h_input_tokens": S.Int.pipe(S.greaterThanOrEqualTo(0)).pipe(
    S.propertySignature,
    S.withConstructorDefault(() => 0 as const)
  ),
  /**
   * The number of input tokens used to create the 5 minute cache entry.
   */
  "ephemeral_5m_input_tokens": S.Int.pipe(S.greaterThanOrEqualTo(0)).pipe(
    S.propertySignature,
    S.withConstructorDefault(() => 0 as const)
  )
}) {}

export class ServerToolUsage extends S.Class<ServerToolUsage>("ServerToolUsage")({
  /**
   * The number of web search tool requests.
   */
  "web_search_requests": S.Int.pipe(S.greaterThanOrEqualTo(0)).pipe(
    S.propertySignature,
    S.withConstructorDefault(() => 0 as const)
  )
}) {}

export class UsageServiceTierEnum extends S.Literal("standard", "priority", "batch") {}

export class Usage extends S.Class<Usage>("Usage")({
  /**
   * Breakdown of cached tokens by TTL
   */
  "cache_creation": S.optionalWith(S.NullOr(CacheCreation), { default: () => null }),
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
  "server_tool_use": S.optionalWith(S.NullOr(ServerToolUsage), { default: () => null }),
  /**
   * If the request used the priority, standard, or batch tier.
   */
  "service_tier": S.optionalWith(S.NullOr(UsageServiceTierEnum), { default: () => null })
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
  "type": S.Literal("message").pipe(S.propertySignature, S.withConstructorDefault(() => "message" as const)),
  /**
   * Conversational role of the generated message.
   *
   * This will always be `"assistant"`.
   */
  "role": S.Literal("assistant").pipe(S.propertySignature, S.withConstructorDefault(() => "assistant" as const)),
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
  "model": S.Union(S.String, Model),
  /**
   * The reason that we stopped.
   *
   * This may be one the following values:
   * * `"end_turn"`: the model reached a natural stopping point
   * * `"max_tokens"`: we exceeded the requested `max_tokens` or the model's maximum
   * * `"stop_sequence"`: one of your provided custom `stop_sequences` was generated
   * * `"tool_use"`: the model invoked one or more tools
   * * `"pause_turn"`: we paused a long-running turn. You may provide the response back as-is in a subsequent request to let the model continue.
   * * `"refusal"`: when streaming classifiers intervene to handle potential policy violations
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

export class InvalidRequestError extends S.Class<InvalidRequestError>("InvalidRequestError")({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Invalid request" as const)),
  "type": S.Literal("invalid_request_error").pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "invalid_request_error" as const)
  )
}) {}

export class AuthenticationError extends S.Class<AuthenticationError>("AuthenticationError")({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Authentication error" as const)),
  "type": S.Literal("authentication_error").pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "authentication_error" as const)
  )
}) {}

export class BillingError extends S.Class<BillingError>("BillingError")({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Billing error" as const)),
  "type": S.Literal("billing_error").pipe(S.propertySignature, S.withConstructorDefault(() => "billing_error" as const))
}) {}

export class PermissionError extends S.Class<PermissionError>("PermissionError")({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Permission denied" as const)),
  "type": S.Literal("permission_error").pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "permission_error" as const)
  )
}) {}

export class NotFoundError extends S.Class<NotFoundError>("NotFoundError")({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Not found" as const)),
  "type": S.Literal("not_found_error").pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "not_found_error" as const)
  )
}) {}

export class RateLimitError extends S.Class<RateLimitError>("RateLimitError")({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Rate limited" as const)),
  "type": S.Literal("rate_limit_error").pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "rate_limit_error" as const)
  )
}) {}

export class GatewayTimeoutError extends S.Class<GatewayTimeoutError>("GatewayTimeoutError")({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Request timeout" as const)),
  "type": S.Literal("timeout_error").pipe(S.propertySignature, S.withConstructorDefault(() => "timeout_error" as const))
}) {}

export class APIError extends S.Class<APIError>("APIError")({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Internal server error" as const)),
  "type": S.Literal("api_error").pipe(S.propertySignature, S.withConstructorDefault(() => "api_error" as const))
}) {}

export class OverloadedError extends S.Class<OverloadedError>("OverloadedError")({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Overloaded" as const)),
  "type": S.Literal("overloaded_error").pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "overloaded_error" as const)
  )
}) {}

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
  "request_id": S.optionalWith(S.NullOr(S.String), { default: () => null }),
  "type": S.Literal("error").pipe(S.propertySignature, S.withConstructorDefault(() => "error" as const))
}) {}

export class CompletePostParams extends S.Struct({
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
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
  "model": S.Union(S.String, Model),
  /**
   * The prompt that you want Claude to complete.
   *
   * For proper response generation you will need to format your prompt using alternating `\n\nHuman:` and `\n\nAssistant:` conversational turns. For example:
   *
   * ```
   * "\n\nHuman: {userQuestion}\n\nAssistant:"
   * ```
   *
   * See [prompt validation](https://docs.claude.com/en/api/prompt-validation) and our guide to [prompt design](https://docs.claude.com/en/docs/intro-to-prompting) for more details.
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
   * See [streaming](https://docs.claude.com/en/api/streaming) for details.
   */
  "stream": S.optionalWith(S.Boolean, { nullable: true })
}) {}

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
  "model": S.Union(S.String, Model),
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
  "type": S.Literal("completion").pipe(S.propertySignature, S.withConstructorDefault(() => "completion" as const))
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
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
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

export class ModelInfo extends S.Class<ModelInfo>("ModelInfo")({
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
  "type": S.Literal("model").pipe(S.propertySignature, S.withConstructorDefault(() => "model" as const))
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
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
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
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
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

export class RequestCounts extends S.Class<RequestCounts>("RequestCounts")({
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

export class MessageBatch extends S.Class<MessageBatch>("MessageBatch")({
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
  "type": S.Literal("message_batch").pipe(S.propertySignature, S.withConstructorDefault(() => "message_batch" as const))
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
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class MessageBatchIndividualRequestParams
  extends S.Class<MessageBatchIndividualRequestParams>("MessageBatchIndividualRequestParams")({
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
  })
{}

export class CreateMessageBatchParams extends S.Class<CreateMessageBatchParams>("CreateMessageBatchParams")({
  /**
   * List of requests for prompt completion. Each is an individual request to create a Message.
   */
  "requests": S.NonEmptyArray(MessageBatchIndividualRequestParams).pipe(S.minItems(1), S.maxItems(10000))
}) {}

export class MessageBatchesRetrieveParams extends S.Struct({
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
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
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

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
  "type": S.Literal("message_batch_deleted").pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "message_batch_deleted" as const)
  )
}) {}

export class MessageBatchesCancelParams extends S.Struct({
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class MessageBatchesResultsParams extends S.Struct({
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
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
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
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
   * See [input examples](https://docs.claude.com/en/api/messages-examples).
   *
   * Note that if you want to include a [system prompt](https://docs.claude.com/en/docs/system-prompts), you can use the top-level `system` parameter — there is no `"system"` role for input messages in the Messages API.
   *
   * There is a limit of 100,000 messages in a single request.
   */
  "messages": S.Array(InputMessage),
  "model": S.Union(S.String, Model),
  /**
   * System prompt.
   *
   * A system prompt is a way of providing context and instructions to Claude, such as specifying a particular goal or role. See our [guide to system prompts](https://docs.claude.com/en/docs/system-prompts).
   */
  "system": S.optionalWith(S.Union(S.String, S.Array(RequestTextBlock)), { nullable: true }),
  "thinking": S.optionalWith(ThinkingConfigParam, { nullable: true }),
  "tool_choice": S.optionalWith(ToolChoice, { nullable: true }),
  /**
   * Definitions of tools that the model may use.
   *
   * If you include `tools` in your API request, the model may return `tool_use` content blocks that represent the model's use of those tools. You can then run those tools using the tool input generated by the model and then optionally return results back to the model using `tool_result` content blocks.
   *
   * There are two types of tools: **client tools** and **server tools**. The behavior described below applies to client tools. For [server tools](https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview\#server-tools), see their individual documentation as each has its own behavior (e.g., the [web search tool](https://docs.claude.com/en/docs/agents-and-tools/tool-use/web-search-tool)).
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
   * See our [guide](https://docs.claude.com/en/docs/tool-use) for more details.
   */
  "tools": S.optionalWith(
    S.Array(
      S.Union(Tool, BashTool20250124, TextEditor20250124, TextEditor20250429, TextEditor20250728, WebSearchTool20250305)
    ),
    { nullable: true }
  )
}) {}

export class CountMessageTokensResponse extends S.Class<CountMessageTokensResponse>("CountMessageTokensResponse")({
  /**
   * The total number of tokens across the provided list of messages, system prompt, and tools.
   */
  "input_tokens": S.Int
}) {}

export class ListFilesV1FilesGetParams extends S.Struct({
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
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class FileMetadataSchema extends S.Class<FileMetadataSchema>("FileMetadataSchema")({
  /**
   * RFC 3339 datetime string representing when the file was created.
   */
  "created_at": S.String,
  /**
   * Whether the file can be downloaded.
   */
  "downloadable": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  /**
   * Original filename of the uploaded file.
   */
  "filename": S.String.pipe(S.minLength(1), S.maxLength(500)),
  /**
   * Unique object identifier.
   *
   * The format and length of IDs may change over time.
   */
  "id": S.String,
  /**
   * MIME type of the file.
   */
  "mime_type": S.String.pipe(S.minLength(1), S.maxLength(255)),
  /**
   * Size of the file in bytes.
   */
  "size_bytes": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  /**
   * Object type.
   *
   * For files, this is always `"file"`.
   */
  "type": S.Literal("file")
}) {}

export class FileListResponse extends S.Class<FileListResponse>("FileListResponse")({
  /**
   * List of file metadata objects.
   */
  "data": S.Array(FileMetadataSchema),
  /**
   * ID of the first file in this page of results.
   */
  "first_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * Whether there are more results available.
   */
  "has_more": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  /**
   * ID of the last file in this page of results.
   */
  "last_id": S.optionalWith(S.String, { nullable: true })
}) {}

export class UploadFileV1FilesPostParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class UploadFileV1FilesPostRequest
  extends S.Class<UploadFileV1FilesPostRequest>("UploadFileV1FilesPostRequest")({
    /**
     * The file to upload
     */
    "file": S.instanceOf(globalThis.Blob)
  })
{}

export class GetFileMetadataV1FilesFileIdGetParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class DeleteFileV1FilesFileIdDeleteParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class FileDeleteResponse extends S.Class<FileDeleteResponse>("FileDeleteResponse")({
  /**
   * ID of the deleted file.
   */
  "id": S.String,
  /**
   * Deleted object type.
   *
   * For file deletion, this is always `"file_deleted"`.
   */
  "type": S.optionalWith(S.Literal("file_deleted"), { nullable: true, default: () => "file_deleted" as const })
}) {}

export class DownloadFileV1FilesFileIdContentGetParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class ListSkillsV1SkillsGetParams extends S.Struct({
  /**
   * Pagination token for fetching a specific page of results.
   *
   * Pass the value from a previous response's `next_page` field to get the next page of results.
   */
  "page": S.optionalWith(S.String, { nullable: true }),
  /**
   * Number of results to return per page.
   *
   * Maximum value is 100. Defaults to 20.
   */
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  /**
   * Filter skills by source.
   *
   * If provided, only skills from the specified source will be returned:
   * * `"custom"`: only return user-created skills
   * * `"anthropic"`: only return Anthropic-created skills
   */
  "source": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class Skill extends S.Class<Skill>("Skill")({
  /**
   * ISO 8601 timestamp of when the skill was created.
   */
  "created_at": S.String,
  /**
   * Display title for the skill.
   *
   * This is a human-readable label that is not included in the prompt sent to the model.
   */
  "display_title": S.NullOr(S.String),
  /**
   * Unique identifier for the skill.
   *
   * The format and length of IDs may change over time.
   */
  "id": S.String,
  /**
   * The latest version identifier for the skill.
   *
   * This represents the most recent version of the skill that has been created.
   */
  "latest_version": S.NullOr(S.String),
  /**
   * Source of the skill.
   *
   * This may be one of the following values:
   * * `"custom"`: the skill was created by a user
   * * `"anthropic"`: the skill was created by Anthropic
   */
  "source": S.String,
  /**
   * Object type.
   *
   * For Skills, this is always `"skill"`.
   */
  "type": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "skill" as const)),
  /**
   * ISO 8601 timestamp of when the skill was last updated.
   */
  "updated_at": S.String
}) {}

export class ListSkillsResponse extends S.Class<ListSkillsResponse>("ListSkillsResponse")({
  /**
   * List of skills.
   */
  "data": S.Array(Skill),
  /**
   * Whether there are more results available.
   *
   * If `true`, there are additional results that can be fetched using the `next_page` token.
   */
  "has_more": S.Boolean,
  /**
   * Token for fetching the next page of results.
   *
   * If `null`, there are no more results available. Pass this value to the `page_token` parameter in the next request to get the next page.
   */
  "next_page": S.NullOr(S.String)
}) {}

export class CreateSkillV1SkillsPostParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class BodyCreateSkillV1SkillsPost extends S.Class<BodyCreateSkillV1SkillsPost>("BodyCreateSkillV1SkillsPost")({
  /**
   * Display title for the skill.
   *
   * This is a human-readable label that is not included in the prompt sent to the model.
   */
  "display_title": S.optionalWith(S.String, { nullable: true }),
  /**
   * Files to upload for the skill.
   *
   * All files must be in the same top-level directory and must include a SKILL.md file at the root of that directory.
   */
  "files": S.optionalWith(S.Array(S.instanceOf(globalThis.Blob)), { nullable: true })
}) {}

export class CreateSkillResponse extends S.Class<CreateSkillResponse>("CreateSkillResponse")({
  /**
   * ISO 8601 timestamp of when the skill was created.
   */
  "created_at": S.String,
  /**
   * Display title for the skill.
   *
   * This is a human-readable label that is not included in the prompt sent to the model.
   */
  "display_title": S.NullOr(S.String),
  /**
   * Unique identifier for the skill.
   *
   * The format and length of IDs may change over time.
   */
  "id": S.String,
  /**
   * The latest version identifier for the skill.
   *
   * This represents the most recent version of the skill that has been created.
   */
  "latest_version": S.NullOr(S.String),
  /**
   * Source of the skill.
   *
   * This may be one of the following values:
   * * `"custom"`: the skill was created by a user
   * * `"anthropic"`: the skill was created by Anthropic
   */
  "source": S.String,
  /**
   * Object type.
   *
   * For Skills, this is always `"skill"`.
   */
  "type": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "skill" as const)),
  /**
   * ISO 8601 timestamp of when the skill was last updated.
   */
  "updated_at": S.String
}) {}

export class GetSkillV1SkillsSkillIdGetParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class GetSkillResponse extends S.Class<GetSkillResponse>("GetSkillResponse")({
  /**
   * ISO 8601 timestamp of when the skill was created.
   */
  "created_at": S.String,
  /**
   * Display title for the skill.
   *
   * This is a human-readable label that is not included in the prompt sent to the model.
   */
  "display_title": S.NullOr(S.String),
  /**
   * Unique identifier for the skill.
   *
   * The format and length of IDs may change over time.
   */
  "id": S.String,
  /**
   * The latest version identifier for the skill.
   *
   * This represents the most recent version of the skill that has been created.
   */
  "latest_version": S.NullOr(S.String),
  /**
   * Source of the skill.
   *
   * This may be one of the following values:
   * * `"custom"`: the skill was created by a user
   * * `"anthropic"`: the skill was created by Anthropic
   */
  "source": S.String,
  /**
   * Object type.
   *
   * For Skills, this is always `"skill"`.
   */
  "type": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "skill" as const)),
  /**
   * ISO 8601 timestamp of when the skill was last updated.
   */
  "updated_at": S.String
}) {}

export class DeleteSkillV1SkillsSkillIdDeleteParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class DeleteSkillResponse extends S.Class<DeleteSkillResponse>("DeleteSkillResponse")({
  /**
   * Unique identifier for the skill.
   *
   * The format and length of IDs may change over time.
   */
  "id": S.String,
  /**
   * Deleted object type.
   *
   * For Skills, this is always `"skill_deleted"`.
   */
  "type": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "skill_deleted" as const))
}) {}

export class ListSkillVersionsV1SkillsSkillIdVersionsGetParams extends S.Struct({
  /**
   * Optionally set to the `next_page` token from the previous response.
   */
  "page": S.optionalWith(S.String, { nullable: true }),
  /**
   * Number of items to return per page.
   *
   * Defaults to `20`. Ranges from `1` to `1000`.
   */
  "limit": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class SkillVersion extends S.Class<SkillVersion>("SkillVersion")({
  /**
   * ISO 8601 timestamp of when the skill version was created.
   */
  "created_at": S.String,
  /**
   * Description of the skill version.
   *
   * This is extracted from the SKILL.md file in the skill upload.
   */
  "description": S.String,
  /**
   * Directory name of the skill version.
   *
   * This is the top-level directory name that was extracted from the uploaded files.
   */
  "directory": S.String,
  /**
   * Unique identifier for the skill version.
   *
   * The format and length of IDs may change over time.
   */
  "id": S.String,
  /**
   * Human-readable name of the skill version.
   *
   * This is extracted from the SKILL.md file in the skill upload.
   */
  "name": S.String,
  /**
   * Identifier for the skill that this version belongs to.
   */
  "skill_id": S.String,
  /**
   * Object type.
   *
   * For Skill Versions, this is always `"skill_version"`.
   */
  "type": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "skill_version" as const)),
  /**
   * Version identifier for the skill.
   *
   * Each version is identified by a Unix epoch timestamp (e.g., "1759178010641129").
   */
  "version": S.String
}) {}

export class ListSkillVersionsResponse extends S.Class<ListSkillVersionsResponse>("ListSkillVersionsResponse")({
  /**
   * List of skill versions.
   */
  "data": S.Array(SkillVersion),
  /**
   * Indicates if there are more results in the requested page direction.
   */
  "has_more": S.Boolean,
  /**
   * Token to provide in as `page` in the subsequent request to retrieve the next page of data.
   */
  "next_page": S.NullOr(S.String)
}) {}

export class CreateSkillVersionV1SkillsSkillIdVersionsPostParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class BodyCreateSkillVersionV1SkillsSkillIdVersionsPost
  extends S.Class<BodyCreateSkillVersionV1SkillsSkillIdVersionsPost>(
    "BodyCreateSkillVersionV1SkillsSkillIdVersionsPost"
  )({
    /**
     * Files to upload for the skill.
     *
     * All files must be in the same top-level directory and must include a SKILL.md file at the root of that directory.
     */
    "files": S.optionalWith(S.Array(S.instanceOf(globalThis.Blob)), { nullable: true })
  })
{}

export class CreateSkillVersionResponse extends S.Class<CreateSkillVersionResponse>("CreateSkillVersionResponse")({
  /**
   * ISO 8601 timestamp of when the skill version was created.
   */
  "created_at": S.String,
  /**
   * Description of the skill version.
   *
   * This is extracted from the SKILL.md file in the skill upload.
   */
  "description": S.String,
  /**
   * Directory name of the skill version.
   *
   * This is the top-level directory name that was extracted from the uploaded files.
   */
  "directory": S.String,
  /**
   * Unique identifier for the skill version.
   *
   * The format and length of IDs may change over time.
   */
  "id": S.String,
  /**
   * Human-readable name of the skill version.
   *
   * This is extracted from the SKILL.md file in the skill upload.
   */
  "name": S.String,
  /**
   * Identifier for the skill that this version belongs to.
   */
  "skill_id": S.String,
  /**
   * Object type.
   *
   * For Skill Versions, this is always `"skill_version"`.
   */
  "type": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "skill_version" as const)),
  /**
   * Version identifier for the skill.
   *
   * Each version is identified by a Unix epoch timestamp (e.g., "1759178010641129").
   */
  "version": S.String
}) {}

export class GetSkillVersionV1SkillsSkillIdVersionsVersionGetParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class GetSkillVersionResponse extends S.Class<GetSkillVersionResponse>("GetSkillVersionResponse")({
  /**
   * ISO 8601 timestamp of when the skill version was created.
   */
  "created_at": S.String,
  /**
   * Description of the skill version.
   *
   * This is extracted from the SKILL.md file in the skill upload.
   */
  "description": S.String,
  /**
   * Directory name of the skill version.
   *
   * This is the top-level directory name that was extracted from the uploaded files.
   */
  "directory": S.String,
  /**
   * Unique identifier for the skill version.
   *
   * The format and length of IDs may change over time.
   */
  "id": S.String,
  /**
   * Human-readable name of the skill version.
   *
   * This is extracted from the SKILL.md file in the skill upload.
   */
  "name": S.String,
  /**
   * Identifier for the skill that this version belongs to.
   */
  "skill_id": S.String,
  /**
   * Object type.
   *
   * For Skill Versions, this is always `"skill_version"`.
   */
  "type": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "skill_version" as const)),
  /**
   * Version identifier for the skill.
   *
   * Each version is identified by a Unix epoch timestamp (e.g., "1759178010641129").
   */
  "version": S.String
}) {}

export class DeleteSkillVersionV1SkillsSkillIdVersionsVersionDeleteParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class DeleteSkillVersionResponse extends S.Class<DeleteSkillVersionResponse>("DeleteSkillVersionResponse")({
  /**
   * Version identifier for the skill.
   *
   * Each version is identified by a Unix epoch timestamp (e.g., "1759178010641129").
   */
  "id": S.String,
  /**
   * Deleted object type.
   *
   * For Skill Versions, this is always `"skill_version_deleted"`.
   */
  "type": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "skill_version_deleted" as const))
}) {}

export class BetaMessagesPostParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

/**
 * The time-to-live for the cache control breakpoint.
 *
 * This may be one the following values:
 * - `5m`: 5 minutes
 * - `1h`: 1 hour
 *
 * Defaults to `5m`.
 */
export class BetaCacheControlEphemeralTtl extends S.Literal("5m", "1h") {}

export class BetaCacheControlEphemeral extends S.Class<BetaCacheControlEphemeral>("BetaCacheControlEphemeral")({
  /**
   * The time-to-live for the cache control breakpoint.
   *
   * This may be one the following values:
   * - `5m`: 5 minutes
   * - `1h`: 1 hour
   *
   * Defaults to `5m`.
   */
  "ttl": S.optionalWith(BetaCacheControlEphemeralTtl, { nullable: true }),
  "type": S.Literal("ephemeral")
}) {}

export class BetaRequestCharLocationCitation
  extends S.Class<BetaRequestCharLocationCitation>("BetaRequestCharLocationCitation")({
    "cited_text": S.String,
    "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "document_title": S.NullOr(S.String.pipe(S.minLength(1), S.maxLength(255))),
    "end_char_index": S.Int,
    "start_char_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "type": S.Literal("char_location")
  })
{}

export class BetaRequestPageLocationCitation
  extends S.Class<BetaRequestPageLocationCitation>("BetaRequestPageLocationCitation")({
    "cited_text": S.String,
    "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "document_title": S.NullOr(S.String.pipe(S.minLength(1), S.maxLength(255))),
    "end_page_number": S.Int,
    "start_page_number": S.Int.pipe(S.greaterThanOrEqualTo(1)),
    "type": S.Literal("page_location")
  })
{}

export class BetaRequestContentBlockLocationCitation
  extends S.Class<BetaRequestContentBlockLocationCitation>("BetaRequestContentBlockLocationCitation")({
    "cited_text": S.String,
    "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "document_title": S.NullOr(S.String.pipe(S.minLength(1), S.maxLength(255))),
    "end_block_index": S.Int,
    "start_block_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "type": S.Literal("content_block_location")
  })
{}

export class BetaRequestWebSearchResultLocationCitation
  extends S.Class<BetaRequestWebSearchResultLocationCitation>("BetaRequestWebSearchResultLocationCitation")({
    "cited_text": S.String,
    "encrypted_index": S.String,
    "title": S.NullOr(S.String.pipe(S.minLength(1), S.maxLength(512))),
    "type": S.Literal("web_search_result_location"),
    "url": S.String.pipe(S.minLength(1), S.maxLength(2048))
  })
{}

export class BetaRequestSearchResultLocationCitation
  extends S.Class<BetaRequestSearchResultLocationCitation>("BetaRequestSearchResultLocationCitation")({
    "cited_text": S.String,
    "end_block_index": S.Int,
    "search_result_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "source": S.String,
    "start_block_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "title": S.NullOr(S.String),
    "type": S.Literal("search_result_location")
  })
{}

export class BetaRequestTextBlock extends S.Class<BetaRequestTextBlock>("BetaRequestTextBlock")({
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
        BetaRequestWebSearchResultLocationCitation,
        BetaRequestSearchResultLocationCitation
      )
    ),
    { nullable: true }
  ),
  "text": S.String.pipe(S.minLength(1)),
  "type": S.Literal("text")
}) {}

export class BetaBase64ImageSourceMediaType extends S.Literal("image/jpeg", "image/png", "image/gif", "image/webp") {}

export class BetaBase64ImageSource extends S.Class<BetaBase64ImageSource>("BetaBase64ImageSource")({
  "data": S.String,
  "media_type": BetaBase64ImageSourceMediaType,
  "type": S.Literal("base64")
}) {}

export class BetaURLImageSource extends S.Class<BetaURLImageSource>("BetaURLImageSource")({
  "type": S.Literal("url"),
  "url": S.String
}) {}

export class BetaFileImageSource extends S.Class<BetaFileImageSource>("BetaFileImageSource")({
  "file_id": S.String,
  "type": S.Literal("file")
}) {}

export class BetaRequestImageBlock extends S.Class<BetaRequestImageBlock>("BetaRequestImageBlock")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  "source": S.Union(BetaBase64ImageSource, BetaURLImageSource, BetaFileImageSource),
  "type": S.Literal("image")
}) {}

export class BetaRequestCitationsConfig extends S.Class<BetaRequestCitationsConfig>("BetaRequestCitationsConfig")({
  "enabled": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class BetaBase64PDFSource extends S.Class<BetaBase64PDFSource>("BetaBase64PDFSource")({
  "data": S.String,
  "media_type": S.Literal("application/pdf"),
  "type": S.Literal("base64")
}) {}

export class BetaPlainTextSource extends S.Class<BetaPlainTextSource>("BetaPlainTextSource")({
  "data": S.String,
  "media_type": S.Literal("text/plain"),
  "type": S.Literal("text")
}) {}

export class BetaContentBlockSource extends S.Class<BetaContentBlockSource>("BetaContentBlockSource")({
  "content": S.Union(S.String, S.Array(S.Union(BetaRequestTextBlock, BetaRequestImageBlock))),
  "type": S.Literal("content")
}) {}

export class BetaURLPDFSource extends S.Class<BetaURLPDFSource>("BetaURLPDFSource")({
  "type": S.Literal("url"),
  "url": S.String
}) {}

export class BetaFileDocumentSource extends S.Class<BetaFileDocumentSource>("BetaFileDocumentSource")({
  "file_id": S.String,
  "type": S.Literal("file")
}) {}

export class BetaRequestDocumentBlock extends S.Class<BetaRequestDocumentBlock>("BetaRequestDocumentBlock")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  "citations": S.optionalWith(BetaRequestCitationsConfig, { nullable: true }),
  "context": S.optionalWith(S.String.pipe(S.minLength(1)), { nullable: true }),
  "source": S.Union(
    BetaBase64PDFSource,
    BetaPlainTextSource,
    BetaContentBlockSource,
    BetaURLPDFSource,
    BetaFileDocumentSource
  ),
  "title": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(500)), { nullable: true }),
  "type": S.Literal("document")
}) {}

export class BetaRequestSearchResultBlock
  extends S.Class<BetaRequestSearchResultBlock>("BetaRequestSearchResultBlock")({
    /**
     * Create a cache control breakpoint at this content block.
     */
    "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
    "citations": S.optionalWith(BetaRequestCitationsConfig, { nullable: true }),
    "content": S.Array(BetaRequestTextBlock),
    "source": S.String,
    "title": S.String,
    "type": S.Literal("search_result")
  })
{}

export class BetaRequestThinkingBlock extends S.Class<BetaRequestThinkingBlock>("BetaRequestThinkingBlock")({
  "signature": S.String,
  "thinking": S.String,
  "type": S.Literal("thinking")
}) {}

export class BetaRequestRedactedThinkingBlock
  extends S.Class<BetaRequestRedactedThinkingBlock>("BetaRequestRedactedThinkingBlock")({
    "data": S.String,
    "type": S.Literal("redacted_thinking")
  })
{}

export class BetaRequestToolUseBlock extends S.Class<BetaRequestToolUseBlock>("BetaRequestToolUseBlock")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  "id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": S.String.pipe(S.minLength(1), S.maxLength(200)),
  "type": S.Literal("tool_use")
}) {}

export class BetaRequestToolResultBlock extends S.Class<BetaRequestToolResultBlock>("BetaRequestToolResultBlock")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  "content": S.optionalWith(
    S.Union(
      S.String,
      S.Array(
        S.Union(BetaRequestTextBlock, BetaRequestImageBlock, BetaRequestSearchResultBlock, BetaRequestDocumentBlock)
      )
    ),
    { nullable: true }
  ),
  "is_error": S.optionalWith(S.Boolean, { nullable: true }),
  "tool_use_id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "type": S.Literal("tool_result")
}) {}

export class BetaRequestServerToolUseBlockName
  extends S.Literal("web_search", "web_fetch", "code_execution", "bash_code_execution", "text_editor_code_execution")
{}

export class BetaRequestServerToolUseBlock
  extends S.Class<BetaRequestServerToolUseBlock>("BetaRequestServerToolUseBlock")({
    /**
     * Create a cache control breakpoint at this content block.
     */
    "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
    "id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
    "input": S.Record({ key: S.String, value: S.Unknown }),
    "name": BetaRequestServerToolUseBlockName,
    "type": S.Literal("server_tool_use")
  })
{}

export class BetaRequestWebSearchResultBlock
  extends S.Class<BetaRequestWebSearchResultBlock>("BetaRequestWebSearchResultBlock")({
    "encrypted_content": S.String,
    "page_age": S.optionalWith(S.String, { nullable: true }),
    "title": S.String,
    "type": S.Literal("web_search_result"),
    "url": S.String
  })
{}

export class BetaWebSearchToolResultErrorCode
  extends S.Literal("invalid_tool_input", "unavailable", "max_uses_exceeded", "too_many_requests", "query_too_long")
{}

export class BetaRequestWebSearchToolResultError
  extends S.Class<BetaRequestWebSearchToolResultError>("BetaRequestWebSearchToolResultError")({
    "error_code": BetaWebSearchToolResultErrorCode,
    "type": S.Literal("web_search_tool_result_error")
  })
{}

export class BetaRequestWebSearchToolResultBlock
  extends S.Class<BetaRequestWebSearchToolResultBlock>("BetaRequestWebSearchToolResultBlock")({
    /**
     * Create a cache control breakpoint at this content block.
     */
    "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
    "content": S.Union(S.Array(BetaRequestWebSearchResultBlock), BetaRequestWebSearchToolResultError),
    "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
    "type": S.Literal("web_search_tool_result")
  })
{}

export class BetaWebFetchToolResultErrorCode extends S.Literal(
  "invalid_tool_input",
  "url_too_long",
  "url_not_allowed",
  "url_not_accessible",
  "unsupported_content_type",
  "too_many_requests",
  "max_uses_exceeded",
  "unavailable"
) {}

export class BetaRequestWebFetchToolResultError
  extends S.Class<BetaRequestWebFetchToolResultError>("BetaRequestWebFetchToolResultError")({
    "error_code": BetaWebFetchToolResultErrorCode,
    "type": S.Literal("web_fetch_tool_result_error")
  })
{}

export class BetaRequestWebFetchResultBlock
  extends S.Class<BetaRequestWebFetchResultBlock>("BetaRequestWebFetchResultBlock")({
    "content": BetaRequestDocumentBlock,
    /**
     * ISO 8601 timestamp when the content was retrieved
     */
    "retrieved_at": S.optionalWith(S.String, { nullable: true }),
    "type": S.Literal("web_fetch_result"),
    /**
     * Fetched content URL
     */
    "url": S.String
  })
{}

export class BetaRequestWebFetchToolResultBlock
  extends S.Class<BetaRequestWebFetchToolResultBlock>("BetaRequestWebFetchToolResultBlock")({
    /**
     * Create a cache control breakpoint at this content block.
     */
    "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
    "content": S.Union(BetaRequestWebFetchToolResultError, BetaRequestWebFetchResultBlock),
    "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
    "type": S.Literal("web_fetch_tool_result")
  })
{}

export class BetaCodeExecutionToolResultErrorCode
  extends S.Literal("invalid_tool_input", "unavailable", "too_many_requests", "execution_time_exceeded")
{}

export class BetaRequestCodeExecutionToolResultError
  extends S.Class<BetaRequestCodeExecutionToolResultError>("BetaRequestCodeExecutionToolResultError")({
    "error_code": BetaCodeExecutionToolResultErrorCode,
    "type": S.Literal("code_execution_tool_result_error")
  })
{}

export class BetaRequestCodeExecutionOutputBlock
  extends S.Class<BetaRequestCodeExecutionOutputBlock>("BetaRequestCodeExecutionOutputBlock")({
    "file_id": S.String,
    "type": S.Literal("code_execution_output")
  })
{}

export class BetaRequestCodeExecutionResultBlock
  extends S.Class<BetaRequestCodeExecutionResultBlock>("BetaRequestCodeExecutionResultBlock")({
    "content": S.Array(BetaRequestCodeExecutionOutputBlock),
    "return_code": S.Int,
    "stderr": S.String,
    "stdout": S.String,
    "type": S.Literal("code_execution_result")
  })
{}

export class BetaRequestCodeExecutionToolResultBlock
  extends S.Class<BetaRequestCodeExecutionToolResultBlock>("BetaRequestCodeExecutionToolResultBlock")({
    /**
     * Create a cache control breakpoint at this content block.
     */
    "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
    "content": S.Union(BetaRequestCodeExecutionToolResultError, BetaRequestCodeExecutionResultBlock),
    "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
    "type": S.Literal("code_execution_tool_result")
  })
{}

export class BetaBashCodeExecutionToolResultErrorCode extends S.Literal(
  "invalid_tool_input",
  "unavailable",
  "too_many_requests",
  "execution_time_exceeded",
  "output_file_too_large"
) {}

export class BetaRequestBashCodeExecutionToolResultError
  extends S.Class<BetaRequestBashCodeExecutionToolResultError>("BetaRequestBashCodeExecutionToolResultError")({
    "error_code": BetaBashCodeExecutionToolResultErrorCode,
    "type": S.Literal("bash_code_execution_tool_result_error")
  })
{}

export class BetaRequestBashCodeExecutionOutputBlock
  extends S.Class<BetaRequestBashCodeExecutionOutputBlock>("BetaRequestBashCodeExecutionOutputBlock")({
    "file_id": S.String,
    "type": S.Literal("bash_code_execution_output")
  })
{}

export class BetaRequestBashCodeExecutionResultBlock
  extends S.Class<BetaRequestBashCodeExecutionResultBlock>("BetaRequestBashCodeExecutionResultBlock")({
    "content": S.Array(BetaRequestBashCodeExecutionOutputBlock),
    "return_code": S.Int,
    "stderr": S.String,
    "stdout": S.String,
    "type": S.Literal("bash_code_execution_result")
  })
{}

export class BetaRequestBashCodeExecutionToolResultBlock
  extends S.Class<BetaRequestBashCodeExecutionToolResultBlock>("BetaRequestBashCodeExecutionToolResultBlock")({
    /**
     * Create a cache control breakpoint at this content block.
     */
    "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
    "content": S.Union(BetaRequestBashCodeExecutionToolResultError, BetaRequestBashCodeExecutionResultBlock),
    "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
    "type": S.Literal("bash_code_execution_tool_result")
  })
{}

export class BetaTextEditorCodeExecutionToolResultErrorCode extends S.Literal(
  "invalid_tool_input",
  "unavailable",
  "too_many_requests",
  "execution_time_exceeded",
  "file_not_found"
) {}

export class BetaRequestTextEditorCodeExecutionToolResultError
  extends S.Class<BetaRequestTextEditorCodeExecutionToolResultError>(
    "BetaRequestTextEditorCodeExecutionToolResultError"
  )({
    "error_code": BetaTextEditorCodeExecutionToolResultErrorCode,
    "error_message": S.optionalWith(S.String, { nullable: true }),
    "type": S.Literal("text_editor_code_execution_tool_result_error")
  })
{}

export class BetaRequestTextEditorCodeExecutionViewResultBlockFileType extends S.Literal("text", "image", "pdf") {}

export class BetaRequestTextEditorCodeExecutionViewResultBlock
  extends S.Class<BetaRequestTextEditorCodeExecutionViewResultBlock>(
    "BetaRequestTextEditorCodeExecutionViewResultBlock"
  )({
    "content": S.String,
    "file_type": BetaRequestTextEditorCodeExecutionViewResultBlockFileType,
    "num_lines": S.optionalWith(S.Int, { nullable: true }),
    "start_line": S.optionalWith(S.Int, { nullable: true }),
    "total_lines": S.optionalWith(S.Int, { nullable: true }),
    "type": S.Literal("text_editor_code_execution_view_result")
  })
{}

export class BetaRequestTextEditorCodeExecutionCreateResultBlock
  extends S.Class<BetaRequestTextEditorCodeExecutionCreateResultBlock>(
    "BetaRequestTextEditorCodeExecutionCreateResultBlock"
  )({
    "is_file_update": S.Boolean,
    "type": S.Literal("text_editor_code_execution_create_result")
  })
{}

export class BetaRequestTextEditorCodeExecutionStrReplaceResultBlock
  extends S.Class<BetaRequestTextEditorCodeExecutionStrReplaceResultBlock>(
    "BetaRequestTextEditorCodeExecutionStrReplaceResultBlock"
  )({
    "lines": S.optionalWith(S.Array(S.String), { nullable: true }),
    "new_lines": S.optionalWith(S.Int, { nullable: true }),
    "new_start": S.optionalWith(S.Int, { nullable: true }),
    "old_lines": S.optionalWith(S.Int, { nullable: true }),
    "old_start": S.optionalWith(S.Int, { nullable: true }),
    "type": S.Literal("text_editor_code_execution_str_replace_result")
  })
{}

export class BetaRequestTextEditorCodeExecutionToolResultBlock
  extends S.Class<BetaRequestTextEditorCodeExecutionToolResultBlock>(
    "BetaRequestTextEditorCodeExecutionToolResultBlock"
  )({
    /**
     * Create a cache control breakpoint at this content block.
     */
    "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
    "content": S.Union(
      BetaRequestTextEditorCodeExecutionToolResultError,
      BetaRequestTextEditorCodeExecutionViewResultBlock,
      BetaRequestTextEditorCodeExecutionCreateResultBlock,
      BetaRequestTextEditorCodeExecutionStrReplaceResultBlock
    ),
    "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
    "type": S.Literal("text_editor_code_execution_tool_result")
  })
{}

export class BetaRequestMCPToolUseBlock extends S.Class<BetaRequestMCPToolUseBlock>("BetaRequestMCPToolUseBlock")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  "id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": S.String,
  /**
   * The name of the MCP server
   */
  "server_name": S.String,
  "type": S.Literal("mcp_tool_use")
}) {}

export class BetaRequestMCPToolResultBlock
  extends S.Class<BetaRequestMCPToolResultBlock>("BetaRequestMCPToolResultBlock")({
    /**
     * Create a cache control breakpoint at this content block.
     */
    "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
    "content": S.optionalWith(S.Union(S.String, S.Array(BetaRequestTextBlock)), { nullable: true }),
    "is_error": S.optionalWith(S.Boolean, { nullable: true }),
    "tool_use_id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
    "type": S.Literal("mcp_tool_result")
  })
{}

/**
 * A content block that represents a file to be uploaded to the container
 * Files uploaded via this block will be available in the container's input directory.
 */
export class BetaRequestContainerUploadBlock
  extends S.Class<BetaRequestContainerUploadBlock>("BetaRequestContainerUploadBlock")({
    /**
     * Create a cache control breakpoint at this content block.
     */
    "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
    "file_id": S.String,
    "type": S.Literal("container_upload")
  })
{}

export class BetaInputContentBlock extends S.Union(
  /**
   * Regular text content.
   */
  BetaRequestTextBlock,
  /**
   * Image content specified directly as base64 data or as a reference via a URL.
   */
  BetaRequestImageBlock,
  /**
   * Document content, either specified directly as base64 data, as text, or as a reference via a URL.
   */
  BetaRequestDocumentBlock,
  /**
   * A search result block containing source, title, and content from search operations.
   */
  BetaRequestSearchResultBlock,
  /**
   * A block specifying internal thinking by the model.
   */
  BetaRequestThinkingBlock,
  /**
   * A block specifying internal, redacted thinking by the model.
   */
  BetaRequestRedactedThinkingBlock,
  /**
   * A block indicating a tool use by the model.
   */
  BetaRequestToolUseBlock,
  /**
   * A block specifying the results of a tool use by the model.
   */
  BetaRequestToolResultBlock,
  BetaRequestServerToolUseBlock,
  BetaRequestWebSearchToolResultBlock,
  BetaRequestWebFetchToolResultBlock,
  BetaRequestCodeExecutionToolResultBlock,
  BetaRequestBashCodeExecutionToolResultBlock,
  BetaRequestTextEditorCodeExecutionToolResultBlock,
  BetaRequestMCPToolUseBlock,
  BetaRequestMCPToolResultBlock,
  BetaRequestContainerUploadBlock
) {}

export class BetaInputMessageRole extends S.Literal("user", "assistant") {}

export class BetaInputMessage extends S.Class<BetaInputMessage>("BetaInputMessage")({
  "content": S.Union(S.String, S.Array(BetaInputContentBlock)),
  "role": BetaInputMessageRole
}) {}

/**
 * Type of skill - either 'anthropic' (built-in) or 'custom' (user-defined)
 */
export class BetaSkillParamsType extends S.Literal("anthropic", "custom") {}

/**
 * Specification for a skill to be loaded in a container (request model).
 */
export class BetaSkillParams extends S.Class<BetaSkillParams>("BetaSkillParams")({
  /**
   * Skill ID
   */
  "skill_id": S.String.pipe(S.minLength(1), S.maxLength(64)),
  /**
   * Type of skill - either 'anthropic' (built-in) or 'custom' (user-defined)
   */
  "type": BetaSkillParamsType,
  /**
   * Skill version or 'latest' for most recent version
   */
  "version": S.optionalWith(S.String.pipe(S.minLength(1), S.maxLength(64)), { nullable: true })
}) {}

/**
 * Container parameters with skills to be loaded.
 */
export class BetaContainerParams extends S.Class<BetaContainerParams>("BetaContainerParams")({
  /**
   * Container id
   */
  "id": S.optionalWith(S.String, { nullable: true }),
  /**
   * List of skills to load in the container
   */
  "skills": S.optionalWith(S.Array(BetaSkillParams).pipe(S.maxItems(8)), { nullable: true })
}) {}

export class BetaInputTokensClearAtLeast extends S.Class<BetaInputTokensClearAtLeast>("BetaInputTokensClearAtLeast")({
  "type": S.Literal("input_tokens"),
  "value": S.Int.pipe(S.greaterThanOrEqualTo(0))
}) {}

export class BetaToolUsesKeep extends S.Class<BetaToolUsesKeep>("BetaToolUsesKeep")({
  "type": S.Literal("tool_uses"),
  "value": S.Int.pipe(S.greaterThanOrEqualTo(0))
}) {}

export class BetaInputTokensTrigger extends S.Class<BetaInputTokensTrigger>("BetaInputTokensTrigger")({
  "type": S.Literal("input_tokens"),
  "value": S.Int.pipe(S.greaterThanOrEqualTo(1))
}) {}

export class BetaToolUsesTrigger extends S.Class<BetaToolUsesTrigger>("BetaToolUsesTrigger")({
  "type": S.Literal("tool_uses"),
  "value": S.Int.pipe(S.greaterThanOrEqualTo(1))
}) {}

export class BetaClearToolUses20250919 extends S.Class<BetaClearToolUses20250919>("BetaClearToolUses20250919")({
  /**
   * Minimum number of tokens that must be cleared when triggered. Context will only be modified if at least this many tokens can be removed.
   */
  "clear_at_least": S.optionalWith(BetaInputTokensClearAtLeast, { nullable: true }),
  /**
   * Whether to clear all tool inputs (bool) or specific tool inputs to clear (list)
   */
  "clear_tool_inputs": S.optionalWith(S.Union(S.Boolean, S.Array(S.String)), { nullable: true }),
  /**
   * Tool names whose uses are preserved from clearing
   */
  "exclude_tools": S.optionalWith(S.Array(S.String), { nullable: true }),
  /**
   * Number of tool uses to retain in the conversation
   */
  "keep": S.optionalWith(BetaToolUsesKeep, { nullable: true }),
  /**
   * Condition that triggers the context management strategy
   */
  "trigger": S.optionalWith(S.Union(BetaInputTokensTrigger, BetaToolUsesTrigger), { nullable: true }),
  "type": S.Literal("clear_tool_uses_20250919")
}) {}

export class BetaContextManagementConfig extends S.Class<BetaContextManagementConfig>("BetaContextManagementConfig")({
  /**
   * List of context management edits to apply
   */
  "edits": S.optionalWith(S.Array(BetaClearToolUses20250919), { nullable: true })
}) {}

export class BetaRequestMCPServerToolConfiguration
  extends S.Class<BetaRequestMCPServerToolConfiguration>("BetaRequestMCPServerToolConfiguration")({
    "allowed_tools": S.optionalWith(S.Array(S.String), { nullable: true }),
    "enabled": S.optionalWith(S.Boolean, { nullable: true })
  })
{}

export class BetaRequestMCPServerURLDefinition
  extends S.Class<BetaRequestMCPServerURLDefinition>("BetaRequestMCPServerURLDefinition")({
    "authorization_token": S.optionalWith(S.String, { nullable: true }),
    "name": S.String,
    "tool_configuration": S.optionalWith(BetaRequestMCPServerToolConfiguration, { nullable: true }),
    "type": S.Literal("url"),
    "url": S.String
  })
{}

export class BetaMetadata extends S.Class<BetaMetadata>("BetaMetadata")({
  /**
   * An external identifier for the user who is associated with the request.
   *
   * This should be a uuid, hash value, or other opaque identifier. Anthropic may use this id to help detect abuse. Do not include any identifying information such as name, email address, or phone number.
   */
  "user_id": S.optionalWith(S.String.pipe(S.maxLength(256)), { nullable: true })
}) {}

/**
 * Determines whether to use priority capacity (if available) or standard capacity for this request.
 *
 * Anthropic offers different levels of service for your API requests. See [service-tiers](https://docs.claude.com/en/api/service-tiers) for details.
 */
export class BetaCreateMessageParamsServiceTier extends S.Literal("auto", "standard_only") {}

export class BetaThinkingConfigEnabled extends S.Class<BetaThinkingConfigEnabled>("BetaThinkingConfigEnabled")({
  /**
   * Determines how many tokens Claude can use for its internal reasoning process. Larger budgets can enable more thorough analysis for complex problems, improving response quality.
   *
   * Must be ≥1024 and less than `max_tokens`.
   *
   * See [extended thinking](https://docs.claude.com/en/docs/build-with-claude/extended-thinking) for details.
   */
  "budget_tokens": S.Int.pipe(S.greaterThanOrEqualTo(1024)),
  "type": S.Literal("enabled")
}) {}

export class BetaThinkingConfigDisabled extends S.Class<BetaThinkingConfigDisabled>("BetaThinkingConfigDisabled")({
  "type": S.Literal("disabled")
}) {}

/**
 * Configuration for enabling Claude's extended thinking.
 *
 * When enabled, responses include `thinking` content blocks showing Claude's thinking process before the final answer. Requires a minimum budget of 1,024 tokens and counts towards your `max_tokens` limit.
 *
 * See [extended thinking](https://docs.claude.com/en/docs/build-with-claude/extended-thinking) for details.
 */
export class BetaThinkingConfigParam extends S.Union(BetaThinkingConfigEnabled, BetaThinkingConfigDisabled) {}

/**
 * The model will automatically decide whether to use tools.
 */
export class BetaToolChoiceAuto extends S.Class<BetaToolChoiceAuto>("BetaToolChoiceAuto")({
  /**
   * Whether to disable parallel tool use.
   *
   * Defaults to `false`. If set to `true`, the model will output at most one tool use.
   */
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true }),
  "type": S.Literal("auto")
}) {}

/**
 * The model will use any available tools.
 */
export class BetaToolChoiceAny extends S.Class<BetaToolChoiceAny>("BetaToolChoiceAny")({
  /**
   * Whether to disable parallel tool use.
   *
   * Defaults to `false`. If set to `true`, the model will output exactly one tool use.
   */
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true }),
  "type": S.Literal("any")
}) {}

/**
 * The model will use the specified tool with `tool_choice.name`.
 */
export class BetaToolChoiceTool extends S.Class<BetaToolChoiceTool>("BetaToolChoiceTool")({
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
  "type": S.Literal("tool")
}) {}

/**
 * The model will not be allowed to use tools.
 */
export class BetaToolChoiceNone extends S.Class<BetaToolChoiceNone>("BetaToolChoiceNone")({
  "type": S.Literal("none")
}) {}

/**
 * How the model should use the provided tools. The model can use a specific tool, any available tool, decide by itself, or not use tools at all.
 */
export class BetaToolChoice
  extends S.Union(BetaToolChoiceAuto, BetaToolChoiceAny, BetaToolChoiceTool, BetaToolChoiceNone)
{}

export class BetaInputSchema extends S.Class<BetaInputSchema>("BetaInputSchema")({
  "properties": S.optionalWith(S.Record({ key: S.String, value: S.Unknown }), { nullable: true }),
  "required": S.optionalWith(S.Array(S.String), { nullable: true }),
  "type": S.Literal("object")
}) {}

export class BetaTool extends S.Class<BetaTool>("BetaTool")({
  "type": S.optionalWith(S.Literal("custom"), { nullable: true }),
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
  "name": S.String.pipe(S.minLength(1), S.maxLength(128), S.pattern(new RegExp("^[a-zA-Z0-9_-]{1,128}$"))),
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

export class BetaBashTool20241022 extends S.Class<BetaBashTool20241022>("BetaBashTool20241022")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": S.Literal("bash"),
  "type": S.Literal("bash_20241022")
}) {}

export class BetaBashTool20250124 extends S.Class<BetaBashTool20250124>("BetaBashTool20250124")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": S.Literal("bash"),
  "type": S.Literal("bash_20250124")
}) {}

export class BetaCodeExecutionTool20250522
  extends S.Class<BetaCodeExecutionTool20250522>("BetaCodeExecutionTool20250522")({
    /**
     * Create a cache control breakpoint at this content block.
     */
    "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
    /**
     * Name of the tool.
     *
     * This is how the tool will be called by the model and in `tool_use` blocks.
     */
    "name": S.Literal("code_execution"),
    "type": S.Literal("code_execution_20250522")
  })
{}

export class BetaCodeExecutionTool20250825
  extends S.Class<BetaCodeExecutionTool20250825>("BetaCodeExecutionTool20250825")({
    /**
     * Create a cache control breakpoint at this content block.
     */
    "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
    /**
     * Name of the tool.
     *
     * This is how the tool will be called by the model and in `tool_use` blocks.
     */
    "name": S.Literal("code_execution"),
    "type": S.Literal("code_execution_20250825")
  })
{}

export class BetaComputerUseTool20241022 extends S.Class<BetaComputerUseTool20241022>("BetaComputerUseTool20241022")({
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
  "name": S.Literal("computer"),
  "type": S.Literal("computer_20241022")
}) {}

export class BetaMemoryTool20250818 extends S.Class<BetaMemoryTool20250818>("BetaMemoryTool20250818")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": S.Literal("memory"),
  "type": S.Literal("memory_20250818")
}) {}

export class BetaComputerUseTool20250124 extends S.Class<BetaComputerUseTool20250124>("BetaComputerUseTool20250124")({
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
  "name": S.Literal("computer"),
  "type": S.Literal("computer_20250124")
}) {}

export class BetaTextEditor20241022 extends S.Class<BetaTextEditor20241022>("BetaTextEditor20241022")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": S.Literal("str_replace_editor"),
  "type": S.Literal("text_editor_20241022")
}) {}

export class BetaTextEditor20250124 extends S.Class<BetaTextEditor20250124>("BetaTextEditor20250124")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": S.Literal("str_replace_editor"),
  "type": S.Literal("text_editor_20250124")
}) {}

export class BetaTextEditor20250429 extends S.Class<BetaTextEditor20250429>("BetaTextEditor20250429")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": S.Literal("str_replace_based_edit_tool"),
  "type": S.Literal("text_editor_20250429")
}) {}

export class BetaTextEditor20250728 extends S.Class<BetaTextEditor20250728>("BetaTextEditor20250728")({
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  /**
   * Maximum number of characters to display when viewing a file. If not specified, defaults to displaying the full file.
   */
  "max_characters": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1)), { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": S.Literal("str_replace_based_edit_tool"),
  "type": S.Literal("text_editor_20250728")
}) {}

export class BetaUserLocation extends S.Class<BetaUserLocation>("BetaUserLocation")({
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
  "type": S.Literal("approximate")
}) {}

export class BetaWebSearchTool20250305 extends S.Class<BetaWebSearchTool20250305>("BetaWebSearchTool20250305")({
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
  "name": S.Literal("web_search"),
  "type": S.Literal("web_search_20250305"),
  /**
   * Parameters for the user's location. Used to provide more relevant search results.
   */
  "user_location": S.optionalWith(BetaUserLocation, { nullable: true })
}) {}

export class BetaWebFetchTool20250910 extends S.Class<BetaWebFetchTool20250910>("BetaWebFetchTool20250910")({
  /**
   * List of domains to allow fetching from
   */
  "allowed_domains": S.optionalWith(S.Array(S.String), { nullable: true }),
  /**
   * List of domains to block fetching from
   */
  "blocked_domains": S.optionalWith(S.Array(S.String), { nullable: true }),
  /**
   * Create a cache control breakpoint at this content block.
   */
  "cache_control": S.optionalWith(BetaCacheControlEphemeral, { nullable: true }),
  /**
   * Citations configuration for fetched documents. Citations are disabled by default.
   */
  "citations": S.optionalWith(BetaRequestCitationsConfig, { nullable: true }),
  /**
   * Maximum number of tokens used by including web page text content in the context. The limit is approximate and does not apply to binary content such as PDFs.
   */
  "max_content_tokens": S.optionalWith(S.Int.pipe(S.greaterThan(0)), { nullable: true }),
  /**
   * Maximum number of times the tool can be used in the API request.
   */
  "max_uses": S.optionalWith(S.Int.pipe(S.greaterThan(0)), { nullable: true }),
  /**
   * Name of the tool.
   *
   * This is how the tool will be called by the model and in `tool_use` blocks.
   */
  "name": S.Literal("web_fetch"),
  "type": S.Literal("web_fetch_20250910")
}) {}

export class BetaCreateMessageParams extends S.Class<BetaCreateMessageParams>("BetaCreateMessageParams")({
  "model": S.Union(S.String, Model),
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
   * See [input examples](https://docs.claude.com/en/api/messages-examples).
   *
   * Note that if you want to include a [system prompt](https://docs.claude.com/en/docs/system-prompts), you can use the top-level `system` parameter — there is no `"system"` role for input messages in the Messages API.
   *
   * There is a limit of 100,000 messages in a single request.
   */
  "messages": S.Array(BetaInputMessage),
  /**
   * Container identifier for reuse across requests.
   */
  "container": S.optionalWith(S.Union(BetaContainerParams, S.String), { nullable: true }),
  /**
   * Context management configuration.
   *
   * This allows you to control how Claude manages context across multiple requests, such as whether to clear function results or not.
   */
  "context_management": S.optionalWith(BetaContextManagementConfig, { nullable: true }),
  /**
   * The maximum number of tokens to generate before stopping.
   *
   * Note that our models may stop _before_ reaching this maximum. This parameter only specifies the absolute maximum number of tokens to generate.
   *
   * Different models have different maximum values for this parameter.  See [models](https://docs.claude.com/en/docs/models-overview) for details.
   */
  "max_tokens": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  /**
   * MCP servers to be utilized in this request
   */
  "mcp_servers": S.optionalWith(S.Array(BetaRequestMCPServerURLDefinition).pipe(S.maxItems(20)), { nullable: true }),
  /**
   * An object describing metadata about the request.
   */
  "metadata": S.optionalWith(BetaMetadata, { nullable: true }),
  /**
   * Determines whether to use priority capacity (if available) or standard capacity for this request.
   *
   * Anthropic offers different levels of service for your API requests. See [service-tiers](https://docs.claude.com/en/api/service-tiers) for details.
   */
  "service_tier": S.optionalWith(BetaCreateMessageParamsServiceTier, { nullable: true }),
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
   * See [streaming](https://docs.claude.com/en/api/messages-streaming) for details.
   */
  "stream": S.optionalWith(S.Boolean, { nullable: true }),
  /**
   * System prompt.
   *
   * A system prompt is a way of providing context and instructions to Claude, such as specifying a particular goal or role. See our [guide to system prompts](https://docs.claude.com/en/docs/system-prompts).
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
   * There are two types of tools: **client tools** and **server tools**. The behavior described below applies to client tools. For [server tools](https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview\#server-tools), see their individual documentation as each has its own behavior (e.g., the [web search tool](https://docs.claude.com/en/docs/agents-and-tools/tool-use/web-search-tool)).
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
   * See our [guide](https://docs.claude.com/en/docs/tool-use) for more details.
   */
  "tools": S.optionalWith(
    S.Array(
      S.Union(
        BetaTool,
        BetaBashTool20241022,
        BetaBashTool20250124,
        BetaCodeExecutionTool20250522,
        BetaCodeExecutionTool20250825,
        BetaComputerUseTool20241022,
        BetaMemoryTool20250818,
        BetaComputerUseTool20250124,
        BetaTextEditor20241022,
        BetaTextEditor20250124,
        BetaTextEditor20250429,
        BetaTextEditor20250728,
        BetaWebSearchTool20250305,
        BetaWebFetchTool20250910
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

export class BetaResponseCharLocationCitation
  extends S.Class<BetaResponseCharLocationCitation>("BetaResponseCharLocationCitation")({
    "cited_text": S.String,
    "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "document_title": S.NullOr(S.String),
    "end_char_index": S.Int,
    "file_id": S.optionalWith(S.NullOr(S.String), { default: () => null }),
    "start_char_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "type": S.Literal("char_location").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "char_location" as const)
    )
  })
{}

export class BetaResponsePageLocationCitation
  extends S.Class<BetaResponsePageLocationCitation>("BetaResponsePageLocationCitation")({
    "cited_text": S.String,
    "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "document_title": S.NullOr(S.String),
    "end_page_number": S.Int,
    "file_id": S.optionalWith(S.NullOr(S.String), { default: () => null }),
    "start_page_number": S.Int.pipe(S.greaterThanOrEqualTo(1)),
    "type": S.Literal("page_location").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "page_location" as const)
    )
  })
{}

export class BetaResponseContentBlockLocationCitation
  extends S.Class<BetaResponseContentBlockLocationCitation>("BetaResponseContentBlockLocationCitation")({
    "cited_text": S.String,
    "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "document_title": S.NullOr(S.String),
    "end_block_index": S.Int,
    "file_id": S.optionalWith(S.NullOr(S.String), { default: () => null }),
    "start_block_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "type": S.Literal("content_block_location").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "content_block_location" as const)
    )
  })
{}

export class BetaResponseWebSearchResultLocationCitation
  extends S.Class<BetaResponseWebSearchResultLocationCitation>("BetaResponseWebSearchResultLocationCitation")({
    "cited_text": S.String,
    "encrypted_index": S.String,
    "title": S.NullOr(S.String.pipe(S.maxLength(512))),
    "type": S.Literal("web_search_result_location").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "web_search_result_location" as const)
    ),
    "url": S.String
  })
{}

export class BetaResponseSearchResultLocationCitation
  extends S.Class<BetaResponseSearchResultLocationCitation>("BetaResponseSearchResultLocationCitation")({
    "cited_text": S.String,
    "end_block_index": S.Int,
    "search_result_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "source": S.String,
    "start_block_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    "title": S.NullOr(S.String),
    "type": S.Literal("search_result_location").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "search_result_location" as const)
    )
  })
{}

export class BetaResponseTextBlock extends S.Class<BetaResponseTextBlock>("BetaResponseTextBlock")({
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
          BetaResponseWebSearchResultLocationCitation,
          BetaResponseSearchResultLocationCitation
        )
      )
    ),
    { default: () => null }
  ),
  "text": S.String.pipe(S.minLength(0), S.maxLength(5000000)),
  "type": S.Literal("text").pipe(S.propertySignature, S.withConstructorDefault(() => "text" as const))
}) {}

export class BetaResponseThinkingBlock extends S.Class<BetaResponseThinkingBlock>("BetaResponseThinkingBlock")({
  "signature": S.String,
  "thinking": S.String,
  "type": S.Literal("thinking").pipe(S.propertySignature, S.withConstructorDefault(() => "thinking" as const))
}) {}

export class BetaResponseRedactedThinkingBlock
  extends S.Class<BetaResponseRedactedThinkingBlock>("BetaResponseRedactedThinkingBlock")({
    "data": S.String,
    "type": S.Literal("redacted_thinking").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "redacted_thinking" as const)
    )
  })
{}

export class BetaResponseToolUseBlock extends S.Class<BetaResponseToolUseBlock>("BetaResponseToolUseBlock")({
  "id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": S.String.pipe(S.minLength(1)),
  "type": S.Literal("tool_use").pipe(S.propertySignature, S.withConstructorDefault(() => "tool_use" as const))
}) {}

export class BetaResponseServerToolUseBlockName
  extends S.Literal("web_search", "web_fetch", "code_execution", "bash_code_execution", "text_editor_code_execution")
{}

export class BetaResponseServerToolUseBlock
  extends S.Class<BetaResponseServerToolUseBlock>("BetaResponseServerToolUseBlock")({
    "id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
    "input": S.Record({ key: S.String, value: S.Unknown }),
    "name": BetaResponseServerToolUseBlockName,
    "type": S.Literal("server_tool_use").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "server_tool_use" as const)
    )
  })
{}

export class BetaResponseWebSearchToolResultError
  extends S.Class<BetaResponseWebSearchToolResultError>("BetaResponseWebSearchToolResultError")({
    "error_code": BetaWebSearchToolResultErrorCode,
    "type": S.Literal("web_search_tool_result_error").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "web_search_tool_result_error" as const)
    )
  })
{}

export class BetaResponseWebSearchResultBlock
  extends S.Class<BetaResponseWebSearchResultBlock>("BetaResponseWebSearchResultBlock")({
    "encrypted_content": S.String,
    "page_age": S.optionalWith(S.NullOr(S.String), { default: () => null }),
    "title": S.String,
    "type": S.Literal("web_search_result").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "web_search_result" as const)
    ),
    "url": S.String
  })
{}

export class BetaResponseWebSearchToolResultBlock
  extends S.Class<BetaResponseWebSearchToolResultBlock>("BetaResponseWebSearchToolResultBlock")({
    "content": S.Union(BetaResponseWebSearchToolResultError, S.Array(BetaResponseWebSearchResultBlock)),
    "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
    "type": S.Literal("web_search_tool_result").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "web_search_tool_result" as const)
    )
  })
{}

export class BetaResponseWebFetchToolResultError
  extends S.Class<BetaResponseWebFetchToolResultError>("BetaResponseWebFetchToolResultError")({
    "error_code": BetaWebFetchToolResultErrorCode,
    "type": S.Literal("web_fetch_tool_result_error").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "web_fetch_tool_result_error" as const)
    )
  })
{}

export class BetaResponseCitationsConfig extends S.Class<BetaResponseCitationsConfig>("BetaResponseCitationsConfig")({
  "enabled": S.Boolean.pipe(S.propertySignature, S.withConstructorDefault(() => false as const))
}) {}

export class BetaResponseDocumentBlock extends S.Class<BetaResponseDocumentBlock>("BetaResponseDocumentBlock")({
  /**
   * Citation configuration for the document
   */
  "citations": S.optionalWith(S.NullOr(BetaResponseCitationsConfig), { default: () => null }),
  "source": S.Union(BetaBase64PDFSource, BetaPlainTextSource),
  /**
   * The title of the document
   */
  "title": S.optionalWith(S.NullOr(S.String), { default: () => null }),
  "type": S.Literal("document").pipe(S.propertySignature, S.withConstructorDefault(() => "document" as const))
}) {}

export class BetaResponseWebFetchResultBlock
  extends S.Class<BetaResponseWebFetchResultBlock>("BetaResponseWebFetchResultBlock")({
    "content": BetaResponseDocumentBlock,
    /**
     * ISO 8601 timestamp when the content was retrieved
     */
    "retrieved_at": S.optionalWith(S.NullOr(S.String), { default: () => null }),
    "type": S.Literal("web_fetch_result").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "web_fetch_result" as const)
    ),
    /**
     * Fetched content URL
     */
    "url": S.String
  })
{}

export class BetaResponseWebFetchToolResultBlock
  extends S.Class<BetaResponseWebFetchToolResultBlock>("BetaResponseWebFetchToolResultBlock")({
    "content": S.Union(BetaResponseWebFetchToolResultError, BetaResponseWebFetchResultBlock),
    "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
    "type": S.Literal("web_fetch_tool_result").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "web_fetch_tool_result" as const)
    )
  })
{}

export class BetaResponseCodeExecutionToolResultError
  extends S.Class<BetaResponseCodeExecutionToolResultError>("BetaResponseCodeExecutionToolResultError")({
    "error_code": BetaCodeExecutionToolResultErrorCode,
    "type": S.Literal("code_execution_tool_result_error").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "code_execution_tool_result_error" as const)
    )
  })
{}

export class BetaResponseCodeExecutionOutputBlock
  extends S.Class<BetaResponseCodeExecutionOutputBlock>("BetaResponseCodeExecutionOutputBlock")({
    "file_id": S.String,
    "type": S.Literal("code_execution_output").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "code_execution_output" as const)
    )
  })
{}

export class BetaResponseCodeExecutionResultBlock
  extends S.Class<BetaResponseCodeExecutionResultBlock>("BetaResponseCodeExecutionResultBlock")({
    "content": S.Array(BetaResponseCodeExecutionOutputBlock),
    "return_code": S.Int,
    "stderr": S.String,
    "stdout": S.String,
    "type": S.Literal("code_execution_result").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "code_execution_result" as const)
    )
  })
{}

export class BetaResponseCodeExecutionToolResultBlock
  extends S.Class<BetaResponseCodeExecutionToolResultBlock>("BetaResponseCodeExecutionToolResultBlock")({
    "content": S.Union(BetaResponseCodeExecutionToolResultError, BetaResponseCodeExecutionResultBlock),
    "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
    "type": S.Literal("code_execution_tool_result").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "code_execution_tool_result" as const)
    )
  })
{}

export class BetaResponseBashCodeExecutionToolResultError
  extends S.Class<BetaResponseBashCodeExecutionToolResultError>("BetaResponseBashCodeExecutionToolResultError")({
    "error_code": BetaBashCodeExecutionToolResultErrorCode,
    "type": S.Literal("bash_code_execution_tool_result_error").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "bash_code_execution_tool_result_error" as const)
    )
  })
{}

export class BetaResponseBashCodeExecutionOutputBlock
  extends S.Class<BetaResponseBashCodeExecutionOutputBlock>("BetaResponseBashCodeExecutionOutputBlock")({
    "file_id": S.String,
    "type": S.Literal("bash_code_execution_output").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "bash_code_execution_output" as const)
    )
  })
{}

export class BetaResponseBashCodeExecutionResultBlock
  extends S.Class<BetaResponseBashCodeExecutionResultBlock>("BetaResponseBashCodeExecutionResultBlock")({
    "content": S.Array(BetaResponseBashCodeExecutionOutputBlock),
    "return_code": S.Int,
    "stderr": S.String,
    "stdout": S.String,
    "type": S.Literal("bash_code_execution_result").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "bash_code_execution_result" as const)
    )
  })
{}

export class BetaResponseBashCodeExecutionToolResultBlock
  extends S.Class<BetaResponseBashCodeExecutionToolResultBlock>("BetaResponseBashCodeExecutionToolResultBlock")({
    "content": S.Union(BetaResponseBashCodeExecutionToolResultError, BetaResponseBashCodeExecutionResultBlock),
    "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
    "type": S.Literal("bash_code_execution_tool_result").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "bash_code_execution_tool_result" as const)
    )
  })
{}

export class BetaResponseTextEditorCodeExecutionToolResultError
  extends S.Class<BetaResponseTextEditorCodeExecutionToolResultError>(
    "BetaResponseTextEditorCodeExecutionToolResultError"
  )({
    "error_code": BetaTextEditorCodeExecutionToolResultErrorCode,
    "error_message": S.optionalWith(S.NullOr(S.String), { default: () => null }),
    "type": S.Literal("text_editor_code_execution_tool_result_error").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "text_editor_code_execution_tool_result_error" as const)
    )
  })
{}

export class BetaResponseTextEditorCodeExecutionViewResultBlockFileType extends S.Literal("text", "image", "pdf") {}

export class BetaResponseTextEditorCodeExecutionViewResultBlock
  extends S.Class<BetaResponseTextEditorCodeExecutionViewResultBlock>(
    "BetaResponseTextEditorCodeExecutionViewResultBlock"
  )({
    "content": S.String,
    "file_type": BetaResponseTextEditorCodeExecutionViewResultBlockFileType,
    "num_lines": S.optionalWith(S.NullOr(S.Int), { default: () => null }),
    "start_line": S.optionalWith(S.NullOr(S.Int), { default: () => null }),
    "total_lines": S.optionalWith(S.NullOr(S.Int), { default: () => null }),
    "type": S.Literal("text_editor_code_execution_view_result").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "text_editor_code_execution_view_result" as const)
    )
  })
{}

export class BetaResponseTextEditorCodeExecutionCreateResultBlock
  extends S.Class<BetaResponseTextEditorCodeExecutionCreateResultBlock>(
    "BetaResponseTextEditorCodeExecutionCreateResultBlock"
  )({
    "is_file_update": S.Boolean,
    "type": S.Literal("text_editor_code_execution_create_result").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "text_editor_code_execution_create_result" as const)
    )
  })
{}

export class BetaResponseTextEditorCodeExecutionStrReplaceResultBlock
  extends S.Class<BetaResponseTextEditorCodeExecutionStrReplaceResultBlock>(
    "BetaResponseTextEditorCodeExecutionStrReplaceResultBlock"
  )({
    "lines": S.optionalWith(S.NullOr(S.Array(S.String)), { default: () => null }),
    "new_lines": S.optionalWith(S.NullOr(S.Int), { default: () => null }),
    "new_start": S.optionalWith(S.NullOr(S.Int), { default: () => null }),
    "old_lines": S.optionalWith(S.NullOr(S.Int), { default: () => null }),
    "old_start": S.optionalWith(S.NullOr(S.Int), { default: () => null }),
    "type": S.Literal("text_editor_code_execution_str_replace_result").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "text_editor_code_execution_str_replace_result" as const)
    )
  })
{}

export class BetaResponseTextEditorCodeExecutionToolResultBlock
  extends S.Class<BetaResponseTextEditorCodeExecutionToolResultBlock>(
    "BetaResponseTextEditorCodeExecutionToolResultBlock"
  )({
    "content": S.Union(
      BetaResponseTextEditorCodeExecutionToolResultError,
      BetaResponseTextEditorCodeExecutionViewResultBlock,
      BetaResponseTextEditorCodeExecutionCreateResultBlock,
      BetaResponseTextEditorCodeExecutionStrReplaceResultBlock
    ),
    "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
    "type": S.Literal("text_editor_code_execution_tool_result").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "text_editor_code_execution_tool_result" as const)
    )
  })
{}

export class BetaResponseMCPToolUseBlock extends S.Class<BetaResponseMCPToolUseBlock>("BetaResponseMCPToolUseBlock")({
  "id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  /**
   * The name of the MCP tool
   */
  "name": S.String,
  /**
   * The name of the MCP server
   */
  "server_name": S.String,
  "type": S.Literal("mcp_tool_use").pipe(S.propertySignature, S.withConstructorDefault(() => "mcp_tool_use" as const))
}) {}

export class BetaResponseMCPToolResultBlock
  extends S.Class<BetaResponseMCPToolResultBlock>("BetaResponseMCPToolResultBlock")({
    "content": S.Union(S.String, S.Array(BetaResponseTextBlock)),
    "is_error": S.Boolean.pipe(S.propertySignature, S.withConstructorDefault(() => false as const)),
    "tool_use_id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
    "type": S.Literal("mcp_tool_result").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "mcp_tool_result" as const)
    )
  })
{}

/**
 * Response model for a file uploaded to the container.
 */
export class BetaResponseContainerUploadBlock
  extends S.Class<BetaResponseContainerUploadBlock>("BetaResponseContainerUploadBlock")({
    "file_id": S.String,
    "type": S.Literal("container_upload").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "container_upload" as const)
    )
  })
{}

export class BetaContentBlock extends S.Union(
  BetaResponseTextBlock,
  BetaResponseThinkingBlock,
  BetaResponseRedactedThinkingBlock,
  BetaResponseToolUseBlock,
  BetaResponseServerToolUseBlock,
  BetaResponseWebSearchToolResultBlock,
  BetaResponseWebFetchToolResultBlock,
  BetaResponseCodeExecutionToolResultBlock,
  BetaResponseBashCodeExecutionToolResultBlock,
  BetaResponseTextEditorCodeExecutionToolResultBlock,
  BetaResponseMCPToolUseBlock,
  BetaResponseMCPToolResultBlock,
  BetaResponseContainerUploadBlock
) {}

export class BetaStopReason extends S.Literal(
  "end_turn",
  "max_tokens",
  "stop_sequence",
  "tool_use",
  "pause_turn",
  "refusal",
  "model_context_window_exceeded"
) {}

export class BetaCacheCreation extends S.Class<BetaCacheCreation>("BetaCacheCreation")({
  /**
   * The number of input tokens used to create the 1 hour cache entry.
   */
  "ephemeral_1h_input_tokens": S.Int.pipe(S.greaterThanOrEqualTo(0)).pipe(
    S.propertySignature,
    S.withConstructorDefault(() => 0 as const)
  ),
  /**
   * The number of input tokens used to create the 5 minute cache entry.
   */
  "ephemeral_5m_input_tokens": S.Int.pipe(S.greaterThanOrEqualTo(0)).pipe(
    S.propertySignature,
    S.withConstructorDefault(() => 0 as const)
  )
}) {}

export class BetaServerToolUsage extends S.Class<BetaServerToolUsage>("BetaServerToolUsage")({
  /**
   * The number of web fetch tool requests.
   */
  "web_fetch_requests": S.Int.pipe(S.greaterThanOrEqualTo(0)).pipe(
    S.propertySignature,
    S.withConstructorDefault(() => 0 as const)
  ),
  /**
   * The number of web search tool requests.
   */
  "web_search_requests": S.Int.pipe(S.greaterThanOrEqualTo(0)).pipe(
    S.propertySignature,
    S.withConstructorDefault(() => 0 as const)
  )
}) {}

export class BetaUsageServiceTierEnum extends S.Literal("standard", "priority", "batch") {}

export class BetaUsage extends S.Class<BetaUsage>("BetaUsage")({
  /**
   * Breakdown of cached tokens by TTL
   */
  "cache_creation": S.optionalWith(S.NullOr(BetaCacheCreation), { default: () => null }),
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
  "server_tool_use": S.optionalWith(S.NullOr(BetaServerToolUsage), { default: () => null }),
  /**
   * If the request used the priority, standard, or batch tier.
   */
  "service_tier": S.optionalWith(S.NullOr(BetaUsageServiceTierEnum), { default: () => null })
}) {}

export class BetaResponseClearToolUses20250919Edit
  extends S.Class<BetaResponseClearToolUses20250919Edit>("BetaResponseClearToolUses20250919Edit")({
    /**
     * Number of input tokens cleared by this edit.
     */
    "cleared_input_tokens": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    /**
     * Number of tool uses that were cleared.
     */
    "cleared_tool_uses": S.Int.pipe(S.greaterThanOrEqualTo(0)),
    /**
     * The type of context management edit applied.
     */
    "type": S.Literal("clear_tool_uses_20250919").pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "clear_tool_uses_20250919" as const)
    )
  })
{}

export class BetaResponseContextManagement
  extends S.Class<BetaResponseContextManagement>("BetaResponseContextManagement")({
    /**
     * List of context management edits that were applied.
     */
    "applied_edits": S.Array(BetaResponseClearToolUses20250919Edit)
  })
{}

/**
 * Type of skill - either 'anthropic' (built-in) or 'custom' (user-defined)
 */
export class BetaSkillType extends S.Literal("anthropic", "custom") {}

/**
 * A skill that was loaded in a container (response model).
 */
export class BetaSkill extends S.Class<BetaSkill>("BetaSkill")({
  /**
   * Skill ID
   */
  "skill_id": S.String.pipe(S.minLength(1), S.maxLength(64)),
  /**
   * Type of skill - either 'anthropic' (built-in) or 'custom' (user-defined)
   */
  "type": BetaSkillType,
  /**
   * Skill version or 'latest' for most recent version
   */
  "version": S.String.pipe(S.minLength(1), S.maxLength(64))
}) {}

/**
 * Information about the container used in the request (for the code execution tool)
 */
export class BetaContainer extends S.Class<BetaContainer>("BetaContainer")({
  /**
   * The time at which the container will expire.
   */
  "expires_at": S.String,
  /**
   * Identifier for the container used in this request
   */
  "id": S.String,
  /**
   * Skills loaded in the container
   */
  "skills": S.optionalWith(S.NullOr(S.Array(BetaSkill)), { default: () => null })
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
  "type": S.Literal("message").pipe(S.propertySignature, S.withConstructorDefault(() => "message" as const)),
  /**
   * Conversational role of the generated message.
   *
   * This will always be `"assistant"`.
   */
  "role": S.Literal("assistant").pipe(S.propertySignature, S.withConstructorDefault(() => "assistant" as const)),
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
  "model": S.Union(S.String, Model),
  /**
   * The reason that we stopped.
   *
   * This may be one the following values:
   * * `"end_turn"`: the model reached a natural stopping point
   * * `"max_tokens"`: we exceeded the requested `max_tokens` or the model's maximum
   * * `"stop_sequence"`: one of your provided custom `stop_sequences` was generated
   * * `"tool_use"`: the model invoked one or more tools
   * * `"pause_turn"`: we paused a long-running turn. You may provide the response back as-is in a subsequent request to let the model continue.
   * * `"refusal"`: when streaming classifiers intervene to handle potential policy violations
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
  "usage": BetaUsage,
  /**
   * Context management response.
   *
   * Information about context management strategies applied during the request.
   */
  "context_management": S.optionalWith(S.NullOr(BetaResponseContextManagement), { default: () => null }),
  /**
   * Information about the container used in this request.
   *
   * This will be non-null if a container tool (e.g. code execution) was used.
   */
  "container": S.optionalWith(S.NullOr(BetaContainer), { default: () => null })
}) {}

export class BetaInvalidRequestError extends S.Class<BetaInvalidRequestError>("BetaInvalidRequestError")({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Invalid request" as const)),
  "type": S.Literal("invalid_request_error").pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "invalid_request_error" as const)
  )
}) {}

export class BetaAuthenticationError extends S.Class<BetaAuthenticationError>("BetaAuthenticationError")({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Authentication error" as const)),
  "type": S.Literal("authentication_error").pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "authentication_error" as const)
  )
}) {}

export class BetaBillingError extends S.Class<BetaBillingError>("BetaBillingError")({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Billing error" as const)),
  "type": S.Literal("billing_error").pipe(S.propertySignature, S.withConstructorDefault(() => "billing_error" as const))
}) {}

export class BetaPermissionError extends S.Class<BetaPermissionError>("BetaPermissionError")({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Permission denied" as const)),
  "type": S.Literal("permission_error").pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "permission_error" as const)
  )
}) {}

export class BetaNotFoundError extends S.Class<BetaNotFoundError>("BetaNotFoundError")({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Not found" as const)),
  "type": S.Literal("not_found_error").pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "not_found_error" as const)
  )
}) {}

export class BetaRateLimitError extends S.Class<BetaRateLimitError>("BetaRateLimitError")({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Rate limited" as const)),
  "type": S.Literal("rate_limit_error").pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "rate_limit_error" as const)
  )
}) {}

export class BetaGatewayTimeoutError extends S.Class<BetaGatewayTimeoutError>("BetaGatewayTimeoutError")({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Request timeout" as const)),
  "type": S.Literal("timeout_error").pipe(S.propertySignature, S.withConstructorDefault(() => "timeout_error" as const))
}) {}

export class BetaAPIError extends S.Class<BetaAPIError>("BetaAPIError")({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Internal server error" as const)),
  "type": S.Literal("api_error").pipe(S.propertySignature, S.withConstructorDefault(() => "api_error" as const))
}) {}

export class BetaOverloadedError extends S.Class<BetaOverloadedError>("BetaOverloadedError")({
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Overloaded" as const)),
  "type": S.Literal("overloaded_error").pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "overloaded_error" as const)
  )
}) {}

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
  "request_id": S.optionalWith(S.NullOr(S.String), { default: () => null }),
  "type": S.Literal("error").pipe(S.propertySignature, S.withConstructorDefault(() => "error" as const))
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
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
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

export class BetaModelInfo extends S.Class<BetaModelInfo>("BetaModelInfo")({
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
  "type": S.Literal("model").pipe(S.propertySignature, S.withConstructorDefault(() => "model" as const))
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
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
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
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
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

export class BetaRequestCounts extends S.Class<BetaRequestCounts>("BetaRequestCounts")({
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

export class BetaMessageBatch extends S.Class<BetaMessageBatch>("BetaMessageBatch")({
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
  "type": S.Literal("message_batch").pipe(S.propertySignature, S.withConstructorDefault(() => "message_batch" as const))
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
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaMessageBatchIndividualRequestParams
  extends S.Class<BetaMessageBatchIndividualRequestParams>("BetaMessageBatchIndividualRequestParams")({
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
  })
{}

export class BetaCreateMessageBatchParams
  extends S.Class<BetaCreateMessageBatchParams>("BetaCreateMessageBatchParams")({
    /**
     * List of requests for prompt completion. Each is an individual request to create a Message.
     */
    "requests": S.NonEmptyArray(BetaMessageBatchIndividualRequestParams).pipe(S.minItems(1), S.maxItems(10000))
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
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
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
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

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
    "type": S.Literal("message_batch_deleted").pipe(
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
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
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
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
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
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaCountMessageTokensParams
  extends S.Class<BetaCountMessageTokensParams>("BetaCountMessageTokensParams")({
    /**
     * Context management configuration.
     *
     * This allows you to control how Claude manages context across multiple requests, such as whether to clear function results or not.
     */
    "context_management": S.optionalWith(BetaContextManagementConfig, { nullable: true }),
    /**
     * MCP servers to be utilized in this request
     */
    "mcp_servers": S.optionalWith(S.Array(BetaRequestMCPServerURLDefinition).pipe(S.maxItems(20)), { nullable: true }),
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
     * See [input examples](https://docs.claude.com/en/api/messages-examples).
     *
     * Note that if you want to include a [system prompt](https://docs.claude.com/en/docs/system-prompts), you can use the top-level `system` parameter — there is no `"system"` role for input messages in the Messages API.
     *
     * There is a limit of 100,000 messages in a single request.
     */
    "messages": S.Array(BetaInputMessage),
    "model": S.Union(S.String, Model),
    /**
     * System prompt.
     *
     * A system prompt is a way of providing context and instructions to Claude, such as specifying a particular goal or role. See our [guide to system prompts](https://docs.claude.com/en/docs/system-prompts).
     */
    "system": S.optionalWith(S.Union(S.String, S.Array(BetaRequestTextBlock)), { nullable: true }),
    "thinking": S.optionalWith(BetaThinkingConfigParam, { nullable: true }),
    "tool_choice": S.optionalWith(BetaToolChoice, { nullable: true }),
    /**
     * Definitions of tools that the model may use.
     *
     * If you include `tools` in your API request, the model may return `tool_use` content blocks that represent the model's use of those tools. You can then run those tools using the tool input generated by the model and then optionally return results back to the model using `tool_result` content blocks.
     *
     * There are two types of tools: **client tools** and **server tools**. The behavior described below applies to client tools. For [server tools](https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview\#server-tools), see their individual documentation as each has its own behavior (e.g., the [web search tool](https://docs.claude.com/en/docs/agents-and-tools/tool-use/web-search-tool)).
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
     * See our [guide](https://docs.claude.com/en/docs/tool-use) for more details.
     */
    "tools": S.optionalWith(
      S.Array(
        S.Union(
          BetaTool,
          BetaBashTool20241022,
          BetaBashTool20250124,
          BetaCodeExecutionTool20250522,
          BetaCodeExecutionTool20250825,
          BetaComputerUseTool20241022,
          BetaMemoryTool20250818,
          BetaComputerUseTool20250124,
          BetaTextEditor20241022,
          BetaTextEditor20250124,
          BetaTextEditor20250429,
          BetaTextEditor20250728,
          BetaWebSearchTool20250305,
          BetaWebFetchTool20250910
        )
      ),
      { nullable: true }
    )
  })
{}

export class BetaContextManagementResponse
  extends S.Class<BetaContextManagementResponse>("BetaContextManagementResponse")({
    /**
     * The original token count before context management was applied
     */
    "original_input_tokens": S.Int
  })
{}

export class BetaCountMessageTokensResponse
  extends S.Class<BetaCountMessageTokensResponse>("BetaCountMessageTokensResponse")({
    /**
     * Information about context management applied to the message.
     */
    "context_management": S.NullOr(BetaContextManagementResponse),
    /**
     * The total number of tokens across the provided list of messages, system prompt, and tools.
     */
    "input_tokens": S.Int
  })
{}

export class BetaListFilesV1FilesGetParams extends S.Struct({
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
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaFileMetadataSchema extends S.Class<BetaFileMetadataSchema>("BetaFileMetadataSchema")({
  /**
   * RFC 3339 datetime string representing when the file was created.
   */
  "created_at": S.String,
  /**
   * Whether the file can be downloaded.
   */
  "downloadable": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  /**
   * Original filename of the uploaded file.
   */
  "filename": S.String.pipe(S.minLength(1), S.maxLength(500)),
  /**
   * Unique object identifier.
   *
   * The format and length of IDs may change over time.
   */
  "id": S.String,
  /**
   * MIME type of the file.
   */
  "mime_type": S.String.pipe(S.minLength(1), S.maxLength(255)),
  /**
   * Size of the file in bytes.
   */
  "size_bytes": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  /**
   * Object type.
   *
   * For files, this is always `"file"`.
   */
  "type": S.Literal("file")
}) {}

export class BetaFileListResponse extends S.Class<BetaFileListResponse>("BetaFileListResponse")({
  /**
   * List of file metadata objects.
   */
  "data": S.Array(BetaFileMetadataSchema),
  /**
   * ID of the first file in this page of results.
   */
  "first_id": S.optionalWith(S.String, { nullable: true }),
  /**
   * Whether there are more results available.
   */
  "has_more": S.optionalWith(S.Boolean, { nullable: true, default: () => false as const }),
  /**
   * ID of the last file in this page of results.
   */
  "last_id": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaUploadFileV1FilesPostParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaUploadFileV1FilesPostRequest
  extends S.Class<BetaUploadFileV1FilesPostRequest>("BetaUploadFileV1FilesPostRequest")({
    /**
     * The file to upload
     */
    "file": S.instanceOf(globalThis.Blob)
  })
{}

export class BetaGetFileMetadataV1FilesFileIdGetParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaDeleteFileV1FilesFileIdDeleteParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaFileDeleteResponse extends S.Class<BetaFileDeleteResponse>("BetaFileDeleteResponse")({
  /**
   * ID of the deleted file.
   */
  "id": S.String,
  /**
   * Deleted object type.
   *
   * For file deletion, this is always `"file_deleted"`.
   */
  "type": S.optionalWith(S.Literal("file_deleted"), { nullable: true, default: () => "file_deleted" as const })
}) {}

export class BetaDownloadFileV1FilesFileIdContentGetParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaListSkillsV1SkillsGetParams extends S.Struct({
  /**
   * Pagination token for fetching a specific page of results.
   *
   * Pass the value from a previous response's `next_page` field to get the next page of results.
   */
  "page": S.optionalWith(S.String, { nullable: true }),
  /**
   * Number of results to return per page.
   *
   * Maximum value is 100. Defaults to 20.
   */
  "limit": S.optionalWith(S.Int, { nullable: true, default: () => 20 as const }),
  /**
   * Filter skills by source.
   *
   * If provided, only skills from the specified source will be returned:
   * * `"custom"`: only return user-created skills
   * * `"anthropic"`: only return Anthropic-created skills
   */
  "source": S.optionalWith(S.String, { nullable: true }),
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaapiSchemasSkillsSkill extends S.Class<BetaapiSchemasSkillsSkill>("BetaapiSchemasSkillsSkill")({
  /**
   * ISO 8601 timestamp of when the skill was created.
   */
  "created_at": S.String,
  /**
   * Display title for the skill.
   *
   * This is a human-readable label that is not included in the prompt sent to the model.
   */
  "display_title": S.NullOr(S.String),
  /**
   * Unique identifier for the skill.
   *
   * The format and length of IDs may change over time.
   */
  "id": S.String,
  /**
   * The latest version identifier for the skill.
   *
   * This represents the most recent version of the skill that has been created.
   */
  "latest_version": S.NullOr(S.String),
  /**
   * Source of the skill.
   *
   * This may be one of the following values:
   * * `"custom"`: the skill was created by a user
   * * `"anthropic"`: the skill was created by Anthropic
   */
  "source": S.String,
  /**
   * Object type.
   *
   * For Skills, this is always `"skill"`.
   */
  "type": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "skill" as const)),
  /**
   * ISO 8601 timestamp of when the skill was last updated.
   */
  "updated_at": S.String
}) {}

export class BetaListSkillsResponse extends S.Class<BetaListSkillsResponse>("BetaListSkillsResponse")({
  /**
   * List of skills.
   */
  "data": S.Array(BetaapiSchemasSkillsSkill),
  /**
   * Whether there are more results available.
   *
   * If `true`, there are additional results that can be fetched using the `next_page` token.
   */
  "has_more": S.Boolean,
  /**
   * Token for fetching the next page of results.
   *
   * If `null`, there are no more results available. Pass this value to the `page_token` parameter in the next request to get the next page.
   */
  "next_page": S.NullOr(S.String)
}) {}

export class BetaCreateSkillV1SkillsPostParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaBodyCreateSkillV1SkillsPost
  extends S.Class<BetaBodyCreateSkillV1SkillsPost>("BetaBodyCreateSkillV1SkillsPost")({
    /**
     * Display title for the skill.
     *
     * This is a human-readable label that is not included in the prompt sent to the model.
     */
    "display_title": S.optionalWith(S.String, { nullable: true }),
    /**
     * Files to upload for the skill.
     *
     * All files must be in the same top-level directory and must include a SKILL.md file at the root of that directory.
     */
    "files": S.optionalWith(S.Array(S.instanceOf(globalThis.Blob)), { nullable: true })
  })
{}

export class BetaCreateSkillResponse extends S.Class<BetaCreateSkillResponse>("BetaCreateSkillResponse")({
  /**
   * ISO 8601 timestamp of when the skill was created.
   */
  "created_at": S.String,
  /**
   * Display title for the skill.
   *
   * This is a human-readable label that is not included in the prompt sent to the model.
   */
  "display_title": S.NullOr(S.String),
  /**
   * Unique identifier for the skill.
   *
   * The format and length of IDs may change over time.
   */
  "id": S.String,
  /**
   * The latest version identifier for the skill.
   *
   * This represents the most recent version of the skill that has been created.
   */
  "latest_version": S.NullOr(S.String),
  /**
   * Source of the skill.
   *
   * This may be one of the following values:
   * * `"custom"`: the skill was created by a user
   * * `"anthropic"`: the skill was created by Anthropic
   */
  "source": S.String,
  /**
   * Object type.
   *
   * For Skills, this is always `"skill"`.
   */
  "type": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "skill" as const)),
  /**
   * ISO 8601 timestamp of when the skill was last updated.
   */
  "updated_at": S.String
}) {}

export class BetaGetSkillV1SkillsSkillIdGetParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaGetSkillResponse extends S.Class<BetaGetSkillResponse>("BetaGetSkillResponse")({
  /**
   * ISO 8601 timestamp of when the skill was created.
   */
  "created_at": S.String,
  /**
   * Display title for the skill.
   *
   * This is a human-readable label that is not included in the prompt sent to the model.
   */
  "display_title": S.NullOr(S.String),
  /**
   * Unique identifier for the skill.
   *
   * The format and length of IDs may change over time.
   */
  "id": S.String,
  /**
   * The latest version identifier for the skill.
   *
   * This represents the most recent version of the skill that has been created.
   */
  "latest_version": S.NullOr(S.String),
  /**
   * Source of the skill.
   *
   * This may be one of the following values:
   * * `"custom"`: the skill was created by a user
   * * `"anthropic"`: the skill was created by Anthropic
   */
  "source": S.String,
  /**
   * Object type.
   *
   * For Skills, this is always `"skill"`.
   */
  "type": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "skill" as const)),
  /**
   * ISO 8601 timestamp of when the skill was last updated.
   */
  "updated_at": S.String
}) {}

export class BetaDeleteSkillV1SkillsSkillIdDeleteParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaDeleteSkillResponse extends S.Class<BetaDeleteSkillResponse>("BetaDeleteSkillResponse")({
  /**
   * Unique identifier for the skill.
   *
   * The format and length of IDs may change over time.
   */
  "id": S.String,
  /**
   * Deleted object type.
   *
   * For Skills, this is always `"skill_deleted"`.
   */
  "type": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "skill_deleted" as const))
}) {}

export class BetaListSkillVersionsV1SkillsSkillIdVersionsGetParams extends S.Struct({
  /**
   * Optionally set to the `next_page` token from the previous response.
   */
  "page": S.optionalWith(S.String, { nullable: true }),
  /**
   * Number of items to return per page.
   *
   * Defaults to `20`. Ranges from `1` to `1000`.
   */
  "limit": S.optionalWith(S.Int, { nullable: true }),
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaSkillVersion extends S.Class<BetaSkillVersion>("BetaSkillVersion")({
  /**
   * ISO 8601 timestamp of when the skill version was created.
   */
  "created_at": S.String,
  /**
   * Description of the skill version.
   *
   * This is extracted from the SKILL.md file in the skill upload.
   */
  "description": S.String,
  /**
   * Directory name of the skill version.
   *
   * This is the top-level directory name that was extracted from the uploaded files.
   */
  "directory": S.String,
  /**
   * Unique identifier for the skill version.
   *
   * The format and length of IDs may change over time.
   */
  "id": S.String,
  /**
   * Human-readable name of the skill version.
   *
   * This is extracted from the SKILL.md file in the skill upload.
   */
  "name": S.String,
  /**
   * Identifier for the skill that this version belongs to.
   */
  "skill_id": S.String,
  /**
   * Object type.
   *
   * For Skill Versions, this is always `"skill_version"`.
   */
  "type": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "skill_version" as const)),
  /**
   * Version identifier for the skill.
   *
   * Each version is identified by a Unix epoch timestamp (e.g., "1759178010641129").
   */
  "version": S.String
}) {}

export class BetaListSkillVersionsResponse
  extends S.Class<BetaListSkillVersionsResponse>("BetaListSkillVersionsResponse")({
    /**
     * List of skill versions.
     */
    "data": S.Array(BetaSkillVersion),
    /**
     * Indicates if there are more results in the requested page direction.
     */
    "has_more": S.Boolean,
    /**
     * Token to provide in as `page` in the subsequent request to retrieve the next page of data.
     */
    "next_page": S.NullOr(S.String)
  })
{}

export class BetaCreateSkillVersionV1SkillsSkillIdVersionsPostParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaBodyCreateSkillVersionV1SkillsSkillIdVersionsPost
  extends S.Class<BetaBodyCreateSkillVersionV1SkillsSkillIdVersionsPost>(
    "BetaBodyCreateSkillVersionV1SkillsSkillIdVersionsPost"
  )({
    /**
     * Files to upload for the skill.
     *
     * All files must be in the same top-level directory and must include a SKILL.md file at the root of that directory.
     */
    "files": S.optionalWith(S.Array(S.instanceOf(globalThis.Blob)), { nullable: true })
  })
{}

export class BetaCreateSkillVersionResponse
  extends S.Class<BetaCreateSkillVersionResponse>("BetaCreateSkillVersionResponse")({
    /**
     * ISO 8601 timestamp of when the skill version was created.
     */
    "created_at": S.String,
    /**
     * Description of the skill version.
     *
     * This is extracted from the SKILL.md file in the skill upload.
     */
    "description": S.String,
    /**
     * Directory name of the skill version.
     *
     * This is the top-level directory name that was extracted from the uploaded files.
     */
    "directory": S.String,
    /**
     * Unique identifier for the skill version.
     *
     * The format and length of IDs may change over time.
     */
    "id": S.String,
    /**
     * Human-readable name of the skill version.
     *
     * This is extracted from the SKILL.md file in the skill upload.
     */
    "name": S.String,
    /**
     * Identifier for the skill that this version belongs to.
     */
    "skill_id": S.String,
    /**
     * Object type.
     *
     * For Skill Versions, this is always `"skill_version"`.
     */
    "type": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "skill_version" as const)),
    /**
     * Version identifier for the skill.
     *
     * Each version is identified by a Unix epoch timestamp (e.g., "1759178010641129").
     */
    "version": S.String
  })
{}

export class BetaGetSkillVersionV1SkillsSkillIdVersionsVersionGetParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaGetSkillVersionResponse extends S.Class<BetaGetSkillVersionResponse>("BetaGetSkillVersionResponse")({
  /**
   * ISO 8601 timestamp of when the skill version was created.
   */
  "created_at": S.String,
  /**
   * Description of the skill version.
   *
   * This is extracted from the SKILL.md file in the skill upload.
   */
  "description": S.String,
  /**
   * Directory name of the skill version.
   *
   * This is the top-level directory name that was extracted from the uploaded files.
   */
  "directory": S.String,
  /**
   * Unique identifier for the skill version.
   *
   * The format and length of IDs may change over time.
   */
  "id": S.String,
  /**
   * Human-readable name of the skill version.
   *
   * This is extracted from the SKILL.md file in the skill upload.
   */
  "name": S.String,
  /**
   * Identifier for the skill that this version belongs to.
   */
  "skill_id": S.String,
  /**
   * Object type.
   *
   * For Skill Versions, this is always `"skill_version"`.
   */
  "type": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "skill_version" as const)),
  /**
   * Version identifier for the skill.
   *
   * Each version is identified by a Unix epoch timestamp (e.g., "1759178010641129").
   */
  "version": S.String
}) {}

export class BetaDeleteSkillVersionV1SkillsSkillIdVersionsVersionDeleteParams extends S.Struct({
  /**
   * Optional header to specify the beta version(s) you want to use.
   *
   * To use multiple betas, use a comma separated list like `beta1,beta2` or specify the header multiple times for each beta.
   */
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  /**
   * The version of the Claude API you want to use.
   *
   * Read more about versioning and our version history [here](https://docs.claude.com/en/api/versioning).
   */
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  /**
   * Your unique API key for authentication.
   *
   * This key is required in the header of all API requests, to authenticate your account and access Anthropic's services. Get your API key through the [Console](https://console.anthropic.com/settings/keys). Each key is scoped to a Workspace.
   */
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaDeleteSkillVersionResponse
  extends S.Class<BetaDeleteSkillVersionResponse>("BetaDeleteSkillVersionResponse")({
    /**
     * Version identifier for the skill.
     *
     * Each version is identified by a Unix epoch timestamp (e.g., "1759178010641129").
     */
    "id": S.String,
    /**
     * Deleted object type.
     *
     * For Skill Versions, this is always `"skill_version_deleted"`.
     */
    "type": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "skill_version_deleted" as const))
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
    "listFilesV1FilesGet": (options) =>
      HttpClientRequest.get(`/v1/files`).pipe(
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
          "2xx": decodeSuccess(FileListResponse),
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "uploadFileV1FilesPost": (options) =>
      HttpClientRequest.post(`/v1/files`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options.params?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options.params?.["anthropic-version"] ?? undefined
        }),
        HttpClientRequest.bodyFormDataRecord(options.payload as any),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(FileMetadataSchema),
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "getFileMetadataV1FilesFileIdGet": (fileId, options) =>
      HttpClientRequest.get(`/v1/files/${fileId}`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(FileMetadataSchema),
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "deleteFileV1FilesFileIdDelete": (fileId, options) =>
      HttpClientRequest.del(`/v1/files/${fileId}`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(FileDeleteResponse),
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "downloadFileV1FilesFileIdContentGet": (fileId, options) =>
      HttpClientRequest.get(`/v1/files/${fileId}/content`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          orElse: unexpectedStatus
        }))
      ),
    "listSkillsV1SkillsGet": (options) =>
      HttpClientRequest.get(`/v1/skills`).pipe(
        HttpClientRequest.setUrlParams({
          "page": options?.["page"] as any,
          "limit": options?.["limit"] as any,
          "source": options?.["source"] as any
        }),
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListSkillsResponse),
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createSkillV1SkillsPost": (options) =>
      HttpClientRequest.post(`/v1/skills`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options.params?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options.params?.["anthropic-version"] ?? undefined
        }),
        HttpClientRequest.bodyFormDataRecord(options.payload as any),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CreateSkillResponse),
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "getSkillV1SkillsSkillIdGet": (skillId, options) =>
      HttpClientRequest.get(`/v1/skills/${skillId}`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GetSkillResponse),
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "deleteSkillV1SkillsSkillIdDelete": (skillId, options) =>
      HttpClientRequest.del(`/v1/skills/${skillId}`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeleteSkillResponse),
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "listSkillVersionsV1SkillsSkillIdVersionsGet": (skillId, options) =>
      HttpClientRequest.get(`/v1/skills/${skillId}/versions`).pipe(
        HttpClientRequest.setUrlParams({ "page": options?.["page"] as any, "limit": options?.["limit"] as any }),
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(ListSkillVersionsResponse),
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "createSkillVersionV1SkillsSkillIdVersionsPost": (skillId, options) =>
      HttpClientRequest.post(`/v1/skills/${skillId}/versions`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options.params?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options.params?.["anthropic-version"] ?? undefined
        }),
        HttpClientRequest.bodyFormDataRecord(options.payload as any),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(CreateSkillVersionResponse),
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "getSkillVersionV1SkillsSkillIdVersionsVersionGet": (skillId, version, options) =>
      HttpClientRequest.get(`/v1/skills/${skillId}/versions/${version}`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(GetSkillVersionResponse),
          "4xx": decodeError("ErrorResponse", ErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "deleteSkillVersionV1SkillsSkillIdVersionsVersionDelete": (skillId, version, options) =>
      HttpClientRequest.del(`/v1/skills/${skillId}/versions/${version}`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(DeleteSkillVersionResponse),
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
      ),
    "betaListFilesV1FilesGet": (options) =>
      HttpClientRequest.get(`/v1/files?beta=true`).pipe(
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
          "2xx": decodeSuccess(BetaFileListResponse),
          "4xx": decodeError("BetaErrorResponse", BetaErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "betaUploadFileV1FilesPost": (options) =>
      HttpClientRequest.post(`/v1/files?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options.params?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options.params?.["anthropic-version"] ?? undefined
        }),
        HttpClientRequest.bodyFormDataRecord(options.payload as any),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BetaFileMetadataSchema),
          "4xx": decodeError("BetaErrorResponse", BetaErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "betaGetFileMetadataV1FilesFileIdGet": (fileId, options) =>
      HttpClientRequest.get(`/v1/files/${fileId}?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BetaFileMetadataSchema),
          "4xx": decodeError("BetaErrorResponse", BetaErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "betaDeleteFileV1FilesFileIdDelete": (fileId, options) =>
      HttpClientRequest.del(`/v1/files/${fileId}?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BetaFileDeleteResponse),
          "4xx": decodeError("BetaErrorResponse", BetaErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "betaDownloadFileV1FilesFileIdContentGet": (fileId, options) =>
      HttpClientRequest.get(`/v1/files/${fileId}/content?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          orElse: unexpectedStatus
        }))
      ),
    "betaListSkillsV1SkillsGet": (options) =>
      HttpClientRequest.get(`/v1/skills?beta=true`).pipe(
        HttpClientRequest.setUrlParams({
          "page": options?.["page"] as any,
          "limit": options?.["limit"] as any,
          "source": options?.["source"] as any
        }),
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BetaListSkillsResponse),
          "4xx": decodeError("BetaErrorResponse", BetaErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "betaCreateSkillV1SkillsPost": (options) =>
      HttpClientRequest.post(`/v1/skills?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options.params?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options.params?.["anthropic-version"] ?? undefined
        }),
        HttpClientRequest.bodyFormDataRecord(options.payload as any),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BetaCreateSkillResponse),
          "4xx": decodeError("BetaErrorResponse", BetaErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "betaGetSkillV1SkillsSkillIdGet": (skillId, options) =>
      HttpClientRequest.get(`/v1/skills/${skillId}?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BetaGetSkillResponse),
          "4xx": decodeError("BetaErrorResponse", BetaErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "betaDeleteSkillV1SkillsSkillIdDelete": (skillId, options) =>
      HttpClientRequest.del(`/v1/skills/${skillId}?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BetaDeleteSkillResponse),
          "4xx": decodeError("BetaErrorResponse", BetaErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "betaListSkillVersionsV1SkillsSkillIdVersionsGet": (skillId, options) =>
      HttpClientRequest.get(`/v1/skills/${skillId}/versions?beta=true`).pipe(
        HttpClientRequest.setUrlParams({ "page": options?.["page"] as any, "limit": options?.["limit"] as any }),
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BetaListSkillVersionsResponse),
          "4xx": decodeError("BetaErrorResponse", BetaErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "betaCreateSkillVersionV1SkillsSkillIdVersionsPost": (skillId, options) =>
      HttpClientRequest.post(`/v1/skills/${skillId}/versions?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options.params?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options.params?.["anthropic-version"] ?? undefined
        }),
        HttpClientRequest.bodyFormDataRecord(options.payload as any),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BetaCreateSkillVersionResponse),
          "4xx": decodeError("BetaErrorResponse", BetaErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "betaGetSkillVersionV1SkillsSkillIdVersionsVersionGet": (skillId, version, options) =>
      HttpClientRequest.get(`/v1/skills/${skillId}/versions/${version}?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BetaGetSkillVersionResponse),
          "4xx": decodeError("BetaErrorResponse", BetaErrorResponse),
          orElse: unexpectedStatus
        }))
      ),
    "betaDeleteSkillVersionV1SkillsSkillIdVersionsVersionDelete": (skillId, version, options) =>
      HttpClientRequest.del(`/v1/skills/${skillId}/versions/${version}?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        withResponse(HttpClientResponse.matchStatus({
          "2xx": decodeSuccess(BetaDeleteSkillVersionResponse),
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
   * The Text Completions API is a legacy API. We recommend using the [Messages API](https://docs.claude.com/en/api/messages) going forward.
   *
   * Future models and features will not be compatible with Text Completions. See our [migration guide](https://docs.claude.com/en/api/migrating-from-text-completions-to-messages) for guidance in migrating from Text Completions to Messages.
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
   * List Files
   */
  readonly "listFilesV1FilesGet": (
    options?: typeof ListFilesV1FilesGetParams.Encoded | undefined
  ) => Effect.Effect<
    typeof FileListResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Upload File
   */
  readonly "uploadFileV1FilesPost": (
    options: {
      readonly params?: typeof UploadFileV1FilesPostParams.Encoded | undefined
      readonly payload: typeof UploadFileV1FilesPostRequest.Encoded
    }
  ) => Effect.Effect<
    typeof FileMetadataSchema.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Get File Metadata
   */
  readonly "getFileMetadataV1FilesFileIdGet": (
    fileId: string,
    options?: typeof GetFileMetadataV1FilesFileIdGetParams.Encoded | undefined
  ) => Effect.Effect<
    typeof FileMetadataSchema.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Delete File
   */
  readonly "deleteFileV1FilesFileIdDelete": (
    fileId: string,
    options?: typeof DeleteFileV1FilesFileIdDeleteParams.Encoded | undefined
  ) => Effect.Effect<
    typeof FileDeleteResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Download File
   */
  readonly "downloadFileV1FilesFileIdContentGet": (
    fileId: string,
    options?: typeof DownloadFileV1FilesFileIdContentGetParams.Encoded | undefined
  ) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError>
  /**
   * List Skills
   */
  readonly "listSkillsV1SkillsGet": (
    options?: typeof ListSkillsV1SkillsGetParams.Encoded | undefined
  ) => Effect.Effect<
    typeof ListSkillsResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Create Skill
   */
  readonly "createSkillV1SkillsPost": (
    options: {
      readonly params?: typeof CreateSkillV1SkillsPostParams.Encoded | undefined
      readonly payload: typeof BodyCreateSkillV1SkillsPost.Encoded
    }
  ) => Effect.Effect<
    typeof CreateSkillResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Get Skill
   */
  readonly "getSkillV1SkillsSkillIdGet": (
    skillId: string,
    options?: typeof GetSkillV1SkillsSkillIdGetParams.Encoded | undefined
  ) => Effect.Effect<
    typeof GetSkillResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Delete Skill
   */
  readonly "deleteSkillV1SkillsSkillIdDelete": (
    skillId: string,
    options?: typeof DeleteSkillV1SkillsSkillIdDeleteParams.Encoded | undefined
  ) => Effect.Effect<
    typeof DeleteSkillResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * List Skill Versions
   */
  readonly "listSkillVersionsV1SkillsSkillIdVersionsGet": (
    skillId: string,
    options?: typeof ListSkillVersionsV1SkillsSkillIdVersionsGetParams.Encoded | undefined
  ) => Effect.Effect<
    typeof ListSkillVersionsResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Create Skill Version
   */
  readonly "createSkillVersionV1SkillsSkillIdVersionsPost": (
    skillId: string,
    options: {
      readonly params?: typeof CreateSkillVersionV1SkillsSkillIdVersionsPostParams.Encoded | undefined
      readonly payload: typeof BodyCreateSkillVersionV1SkillsSkillIdVersionsPost.Encoded
    }
  ) => Effect.Effect<
    typeof CreateSkillVersionResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Get Skill Version
   */
  readonly "getSkillVersionV1SkillsSkillIdVersionsVersionGet": (
    skillId: string,
    version: string,
    options?: typeof GetSkillVersionV1SkillsSkillIdVersionsVersionGetParams.Encoded | undefined
  ) => Effect.Effect<
    typeof GetSkillVersionResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"ErrorResponse", typeof ErrorResponse.Type>
  >
  /**
   * Delete Skill Version
   */
  readonly "deleteSkillVersionV1SkillsSkillIdVersionsVersionDelete": (
    skillId: string,
    version: string,
    options?: typeof DeleteSkillVersionV1SkillsSkillIdVersionsVersionDeleteParams.Encoded | undefined
  ) => Effect.Effect<
    typeof DeleteSkillVersionResponse.Type,
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
  /**
   * List Files
   */
  readonly "betaListFilesV1FilesGet": (
    options?: typeof BetaListFilesV1FilesGetParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaFileListResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"BetaErrorResponse", typeof BetaErrorResponse.Type>
  >
  /**
   * Upload File
   */
  readonly "betaUploadFileV1FilesPost": (
    options: {
      readonly params?: typeof BetaUploadFileV1FilesPostParams.Encoded | undefined
      readonly payload: typeof BetaUploadFileV1FilesPostRequest.Encoded
    }
  ) => Effect.Effect<
    typeof BetaFileMetadataSchema.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"BetaErrorResponse", typeof BetaErrorResponse.Type>
  >
  /**
   * Get File Metadata
   */
  readonly "betaGetFileMetadataV1FilesFileIdGet": (
    fileId: string,
    options?: typeof BetaGetFileMetadataV1FilesFileIdGetParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaFileMetadataSchema.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"BetaErrorResponse", typeof BetaErrorResponse.Type>
  >
  /**
   * Delete File
   */
  readonly "betaDeleteFileV1FilesFileIdDelete": (
    fileId: string,
    options?: typeof BetaDeleteFileV1FilesFileIdDeleteParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaFileDeleteResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"BetaErrorResponse", typeof BetaErrorResponse.Type>
  >
  /**
   * Download File
   */
  readonly "betaDownloadFileV1FilesFileIdContentGet": (
    fileId: string,
    options?: typeof BetaDownloadFileV1FilesFileIdContentGetParams.Encoded | undefined
  ) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError>
  /**
   * List Skills
   */
  readonly "betaListSkillsV1SkillsGet": (
    options?: typeof BetaListSkillsV1SkillsGetParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaListSkillsResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"BetaErrorResponse", typeof BetaErrorResponse.Type>
  >
  /**
   * Create Skill
   */
  readonly "betaCreateSkillV1SkillsPost": (
    options: {
      readonly params?: typeof BetaCreateSkillV1SkillsPostParams.Encoded | undefined
      readonly payload: typeof BetaBodyCreateSkillV1SkillsPost.Encoded
    }
  ) => Effect.Effect<
    typeof BetaCreateSkillResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"BetaErrorResponse", typeof BetaErrorResponse.Type>
  >
  /**
   * Get Skill
   */
  readonly "betaGetSkillV1SkillsSkillIdGet": (
    skillId: string,
    options?: typeof BetaGetSkillV1SkillsSkillIdGetParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaGetSkillResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"BetaErrorResponse", typeof BetaErrorResponse.Type>
  >
  /**
   * Delete Skill
   */
  readonly "betaDeleteSkillV1SkillsSkillIdDelete": (
    skillId: string,
    options?: typeof BetaDeleteSkillV1SkillsSkillIdDeleteParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaDeleteSkillResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"BetaErrorResponse", typeof BetaErrorResponse.Type>
  >
  /**
   * List Skill Versions
   */
  readonly "betaListSkillVersionsV1SkillsSkillIdVersionsGet": (
    skillId: string,
    options?: typeof BetaListSkillVersionsV1SkillsSkillIdVersionsGetParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaListSkillVersionsResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"BetaErrorResponse", typeof BetaErrorResponse.Type>
  >
  /**
   * Create Skill Version
   */
  readonly "betaCreateSkillVersionV1SkillsSkillIdVersionsPost": (
    skillId: string,
    options: {
      readonly params?: typeof BetaCreateSkillVersionV1SkillsSkillIdVersionsPostParams.Encoded | undefined
      readonly payload: typeof BetaBodyCreateSkillVersionV1SkillsSkillIdVersionsPost.Encoded
    }
  ) => Effect.Effect<
    typeof BetaCreateSkillVersionResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"BetaErrorResponse", typeof BetaErrorResponse.Type>
  >
  /**
   * Get Skill Version
   */
  readonly "betaGetSkillVersionV1SkillsSkillIdVersionsVersionGet": (
    skillId: string,
    version: string,
    options?: typeof BetaGetSkillVersionV1SkillsSkillIdVersionsVersionGetParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaGetSkillVersionResponse.Type,
    HttpClientError.HttpClientError | ParseError | ClientError<"BetaErrorResponse", typeof BetaErrorResponse.Type>
  >
  /**
   * Delete Skill Version
   */
  readonly "betaDeleteSkillVersionV1SkillsSkillIdVersionsVersionDelete": (
    skillId: string,
    version: string,
    options?: typeof BetaDeleteSkillVersionV1SkillsSkillIdVersionsVersionDeleteParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaDeleteSkillVersionResponse.Type,
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
