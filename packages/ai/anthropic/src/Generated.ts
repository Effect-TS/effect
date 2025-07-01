/**
 * @since 1.0.0
 */
import type * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientError from "@effect/platform/HttpClientError"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import type * as UrlParams from "@effect/platform/UrlParams"
import * as Effect from "effect/Effect"
import type { ParseError } from "effect/ParseResult"
import * as S from "effect/Schema"

export class MessagesPostParams extends S.Struct({
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class Model extends S.Literal(
  "claude-3-7-sonnet-latest",
  "claude-3-7-sonnet-20250219",
  "claude-3-5-haiku-latest",
  "claude-3-5-haiku-20241022",
  "claude-sonnet-4-20250514",
  "claude-sonnet-4-0",
  "claude-4-sonnet-20250514",
  "claude-3-5-sonnet-latest",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-opus-4-0",
  "claude-opus-4-20250514",
  "claude-4-opus-20250514",
  "claude-3-opus-latest",
  "claude-3-opus-20240229",
  "claude-3-sonnet-20240229",
  "claude-3-haiku-20240307",
  "claude-2.1",
  "claude-2.0"
) {}

export class CacheControlEphemeralType extends S.Literal("ephemeral") {}

export class CacheControlEphemeral extends S.Struct({
  "type": CacheControlEphemeralType
}) {}

export class RequestServerToolUseBlockName extends S.Literal("web_search") {}

export class RequestServerToolUseBlockType extends S.Literal("server_tool_use") {}

export class RequestServerToolUseBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(CacheControlEphemeral, S.Null), { nullable: true }),
  "id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": RequestServerToolUseBlockName,
  "type": RequestServerToolUseBlockType
}) {}

export class RequestWebSearchResultBlockType extends S.Literal("web_search_result") {}

export class RequestWebSearchResultBlock extends S.Struct({
  "encrypted_content": S.String,
  "page_age": S.optionalWith(S.Union(S.String, S.Null), { nullable: true }),
  "title": S.String,
  "type": RequestWebSearchResultBlockType,
  "url": S.String
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
  "cache_control": S.optionalWith(S.Union(CacheControlEphemeral, S.Null), { nullable: true }),
  "content": S.Union(S.Array(RequestWebSearchResultBlock), RequestWebSearchToolResultError),
  "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
  "type": RequestWebSearchToolResultBlockType
}) {}

export class RequestCharLocationCitationType extends S.Literal("char_location") {}

export class RequestCharLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null),
  "end_char_index": S.Int,
  "start_char_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "type": RequestCharLocationCitationType
}) {}

export class RequestPageLocationCitationType extends S.Literal("page_location") {}

export class RequestPageLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null),
  "end_page_number": S.Int,
  "start_page_number": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "type": RequestPageLocationCitationType
}) {}

export class RequestContentBlockLocationCitationType extends S.Literal("content_block_location") {}

export class RequestContentBlockLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null),
  "end_block_index": S.Int,
  "start_block_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "type": RequestContentBlockLocationCitationType
}) {}

export class RequestWebSearchResultLocationCitationType extends S.Literal("web_search_result_location") {}

export class RequestWebSearchResultLocationCitation extends S.Struct({
  "cited_text": S.String,
  "encrypted_index": S.String,
  "title": S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null),
  "type": RequestWebSearchResultLocationCitationType,
  "url": S.String.pipe(S.minLength(1), S.maxLength(2048))
}) {}

export class RequestTextBlockType extends S.Literal("text") {}

export class RequestTextBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(CacheControlEphemeral, S.Null), { nullable: true }),
  "citations": S.optionalWith(
    S.Union(
      S.Array(
        S.Union(
          RequestCharLocationCitation,
          RequestPageLocationCitation,
          RequestContentBlockLocationCitation,
          RequestWebSearchResultLocationCitation
        )
      ),
      S.Null
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
  "cache_control": S.optionalWith(S.Union(CacheControlEphemeral, S.Null), { nullable: true }),
  "source": S.Union(Base64ImageSource, URLImageSource),
  "type": RequestImageBlockType
}) {}

export class RequestToolUseBlockType extends S.Literal("tool_use") {}

export class RequestToolUseBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(CacheControlEphemeral, S.Null), { nullable: true }),
  "id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": S.String.pipe(S.minLength(1), S.maxLength(200)),
  "type": RequestToolUseBlockType
}) {}

export class RequestToolResultBlockType extends S.Literal("tool_result") {}

export class RequestToolResultBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(CacheControlEphemeral, S.Null), { nullable: true }),
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
  "cache_control": S.optionalWith(S.Union(CacheControlEphemeral, S.Null), { nullable: true }),
  "citations": S.optionalWith(RequestCitationsConfig, { nullable: true }),
  "context": S.optionalWith(S.Union(S.String.pipe(S.minLength(1)), S.Null), { nullable: true }),
  "source": S.Union(Base64PDFSource, PlainTextSource, ContentBlockSource, URLPDFSource),
  "title": S.optionalWith(S.Union(S.String.pipe(S.minLength(1), S.maxLength(500)), S.Null), { nullable: true }),
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
  RequestServerToolUseBlock,
  RequestWebSearchToolResultBlock,
  RequestTextBlock,
  RequestImageBlock,
  RequestToolUseBlock,
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
  "user_id": S.optionalWith(S.Union(S.String.pipe(S.maxLength(256)), S.Null), { nullable: true })
}) {}

export class CreateMessageParamsServiceTier extends S.Literal("auto", "standard_only") {}

export class ThinkingConfigEnabledType extends S.Literal("enabled") {}

export class ThinkingConfigEnabled extends S.Struct({
  "budget_tokens": S.Int.pipe(S.greaterThanOrEqualTo(1024)),
  "type": ThinkingConfigEnabledType
}) {}

export class ThinkingConfigDisabledType extends S.Literal("disabled") {}

export class ThinkingConfigDisabled extends S.Struct({
  "type": ThinkingConfigDisabledType
}) {}

export class ThinkingConfigParam extends S.Union(ThinkingConfigEnabled, ThinkingConfigDisabled) {}

export class ToolChoiceAutoType extends S.Literal("auto") {}

export class ToolChoiceAuto extends S.Struct({
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true }),
  "type": ToolChoiceAutoType
}) {}

export class ToolChoiceAnyType extends S.Literal("any") {}

export class ToolChoiceAny extends S.Struct({
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true }),
  "type": ToolChoiceAnyType
}) {}

export class ToolChoiceToolType extends S.Literal("tool") {}

export class ToolChoiceTool extends S.Struct({
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true }),
  "name": S.String,
  "type": ToolChoiceToolType
}) {}

export class ToolChoiceNoneType extends S.Literal("none") {}

export class ToolChoiceNone extends S.Struct({
  "type": ToolChoiceNoneType
}) {}

export class ToolChoice extends S.Union(ToolChoiceAuto, ToolChoiceAny, ToolChoiceTool, ToolChoiceNone) {}

export class ToolTypeEnum extends S.Literal("custom") {}

export class InputSchemaType extends S.Literal("object") {}

export class InputSchema extends S.Struct({
  "properties": S.optionalWith(S.Union(S.Record({ key: S.String, value: S.Unknown }), S.Null), { nullable: true }),
  "required": S.optionalWith(S.Union(S.Array(S.String), S.Null), { nullable: true }),
  "type": InputSchemaType
}) {}

export class Tool extends S.Struct({
  "type": S.optionalWith(S.Union(S.Null, ToolTypeEnum), { nullable: true }),
  "description": S.optionalWith(S.String, { nullable: true }),
  "name": S.String.pipe(S.minLength(1), S.maxLength(64), S.pattern(new RegExp("^[a-zA-Z0-9_-]{1,64}$"))),
  "input_schema": InputSchema,
  "cache_control": S.optionalWith(S.Union(CacheControlEphemeral, S.Null), { nullable: true })
}) {}

export class BashTool20250124Name extends S.Literal("bash") {}

export class BashTool20250124Type extends S.Literal("bash_20250124") {}

export class BashTool20250124 extends S.Struct({
  "cache_control": S.optionalWith(S.Union(CacheControlEphemeral, S.Null), { nullable: true }),
  "name": BashTool20250124Name,
  "type": BashTool20250124Type
}) {}

export class TextEditor20250124Name extends S.Literal("str_replace_editor") {}

export class TextEditor20250124Type extends S.Literal("text_editor_20250124") {}

export class TextEditor20250124 extends S.Struct({
  "cache_control": S.optionalWith(S.Union(CacheControlEphemeral, S.Null), { nullable: true }),
  "name": TextEditor20250124Name,
  "type": TextEditor20250124Type
}) {}

export class TextEditor20250429Name extends S.Literal("str_replace_based_edit_tool") {}

export class TextEditor20250429Type extends S.Literal("text_editor_20250429") {}

export class TextEditor20250429 extends S.Struct({
  "cache_control": S.optionalWith(S.Union(CacheControlEphemeral, S.Null), { nullable: true }),
  "name": TextEditor20250429Name,
  "type": TextEditor20250429Type
}) {}

export class WebSearchTool20250305Name extends S.Literal("web_search") {}

export class WebSearchTool20250305Type extends S.Literal("web_search_20250305") {}

export class UserLocationType extends S.Literal("approximate") {}

export class UserLocation extends S.Struct({
  "city": S.optionalWith(S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null), { nullable: true }),
  "country": S.optionalWith(S.Union(S.String.pipe(S.minLength(2), S.maxLength(2)), S.Null), { nullable: true }),
  "region": S.optionalWith(S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null), { nullable: true }),
  "timezone": S.optionalWith(S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null), { nullable: true }),
  "type": UserLocationType
}) {}

export class WebSearchTool20250305 extends S.Struct({
  "allowed_domains": S.optionalWith(S.Union(S.Array(S.String), S.Null), { nullable: true }),
  "blocked_domains": S.optionalWith(S.Union(S.Array(S.String), S.Null), { nullable: true }),
  "cache_control": S.optionalWith(S.Union(CacheControlEphemeral, S.Null), { nullable: true }),
  "max_uses": S.optionalWith(S.Union(S.Int.pipe(S.greaterThan(0)), S.Null), { nullable: true }),
  "name": WebSearchTool20250305Name,
  "type": WebSearchTool20250305Type,
  "user_location": S.optionalWith(S.Union(UserLocation, S.Null), { nullable: true })
}) {}

export class CreateMessageParams extends S.Class<CreateMessageParams>("CreateMessageParams")({
  "model": S.Union(S.String, Model),
  "messages": S.Array(InputMessage),
  "max_tokens": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "metadata": S.optionalWith(Metadata, { nullable: true }),
  "service_tier": S.optionalWith(CreateMessageParamsServiceTier, { nullable: true }),
  "stop_sequences": S.optionalWith(S.Array(S.String), { nullable: true }),
  "stream": S.optionalWith(S.Boolean, { nullable: true }),
  "system": S.optionalWith(S.Union(S.String, S.Array(RequestTextBlock)), { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true }),
  "thinking": S.optionalWith(ThinkingConfigParam, { nullable: true }),
  "tool_choice": S.optionalWith(ToolChoice, { nullable: true }),
  "tools": S.optionalWith(
    S.Array(S.Union(Tool, BashTool20250124, TextEditor20250124, TextEditor20250429, WebSearchTool20250305)),
    { nullable: true }
  ),
  "top_k": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true })
}) {}

export class MessageType extends S.Literal("message") {}

export class MessageRole extends S.Literal("assistant") {}

export class ResponseCharLocationCitationType extends S.Literal("char_location") {}

export class ResponseCharLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String, S.Null),
  "end_char_index": S.Int,
  "start_char_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "type": ResponseCharLocationCitationType
}) {}

export class ResponsePageLocationCitationType extends S.Literal("page_location") {}

export class ResponsePageLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String, S.Null),
  "end_page_number": S.Int,
  "start_page_number": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "type": ResponsePageLocationCitationType
}) {}

export class ResponseContentBlockLocationCitationType extends S.Literal("content_block_location") {}

export class ResponseContentBlockLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String, S.Null),
  "end_block_index": S.Int,
  "start_block_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "type": ResponseContentBlockLocationCitationType
}) {}

export class ResponseWebSearchResultLocationCitationType extends S.Literal("web_search_result_location") {}

export class ResponseWebSearchResultLocationCitation extends S.Struct({
  "cited_text": S.String,
  "encrypted_index": S.String,
  "title": S.Union(S.String, S.Null),
  "type": ResponseWebSearchResultLocationCitationType,
  "url": S.String
}) {}

export class ResponseTextBlockType extends S.Literal("text") {}

export class ResponseTextBlock extends S.Struct({
  "citations": S.optional(S.NullOr(
    S.Array(
      S.Union(
        ResponseCharLocationCitation,
        ResponsePageLocationCitation,
        ResponseContentBlockLocationCitation,
        ResponseWebSearchResultLocationCitation
      )
    )
  )),
  "text": S.String.pipe(S.minLength(0), S.maxLength(5000000)),
  "type": ResponseTextBlockType
}) {}

export class ResponseToolUseBlockType extends S.Literal("tool_use") {}

export class ResponseToolUseBlock extends S.Struct({
  "id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": S.String.pipe(S.minLength(1)),
  "type": ResponseToolUseBlockType
}) {}

export class ResponseServerToolUseBlockName extends S.Literal("web_search") {}

export class ResponseServerToolUseBlockType extends S.Literal("server_tool_use") {}

export class ResponseServerToolUseBlock extends S.Struct({
  "id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": ResponseServerToolUseBlockName,
  "type": ResponseServerToolUseBlockType
}) {}

export class ResponseWebSearchToolResultErrorType extends S.Literal("web_search_tool_result_error") {}

export class ResponseWebSearchToolResultError extends S.Struct({
  "error_code": WebSearchToolResultErrorCode,
  "type": ResponseWebSearchToolResultErrorType
}) {}

export class ResponseWebSearchResultBlockType extends S.Literal("web_search_result") {}

export class ResponseWebSearchResultBlock extends S.Struct({
  "encrypted_content": S.String,
  "page_age": S.NullOr(S.Union(S.String, S.Null)),
  "title": S.String,
  "type": ResponseWebSearchResultBlockType,
  "url": S.String
}) {}

export class ResponseWebSearchToolResultBlockType extends S.Literal("web_search_tool_result") {}

export class ResponseWebSearchToolResultBlock extends S.Struct({
  "content": S.Union(ResponseWebSearchToolResultError, S.Array(ResponseWebSearchResultBlock)),
  "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
  "type": ResponseWebSearchToolResultBlockType
}) {}

export class ResponseThinkingBlockType extends S.Literal("thinking") {}

export class ResponseThinkingBlock extends S.Struct({
  "signature": S.String,
  "thinking": S.String,
  "type": ResponseThinkingBlockType
}) {}

export class ResponseRedactedThinkingBlockType extends S.Literal("redacted_thinking") {}

export class ResponseRedactedThinkingBlock extends S.Struct({
  "data": S.String,
  "type": ResponseRedactedThinkingBlockType
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
  "web_search_requests": S.Int.pipe(S.greaterThanOrEqualTo(0))
}) {}

export class UsageServiceTierEnum extends S.Literal("standard", "priority", "batch") {}

export class Usage extends S.Struct({
  "cache_creation_input_tokens": S.NullOr(S.Union(S.Int.pipe(S.greaterThanOrEqualTo(0)), S.Null)),
  "cache_read_input_tokens": S.NullOr(S.Union(S.Int.pipe(S.greaterThanOrEqualTo(0)), S.Null)),
  "input_tokens": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "output_tokens": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "server_tool_use": S.optional(S.NullOr(ServerToolUsage)),
  "service_tier": S.NullOr(S.Union(UsageServiceTierEnum, S.Null))
}) {}

export class Message extends S.Class<Message>("Message")({
  "id": S.String,
  "type": MessageType,
  "role": MessageRole,
  "content": S.Array(ContentBlock),
  "model": S.Union(S.String, Model),
  "stop_reason": S.Union(StopReason, S.Null),
  "stop_sequence": S.NullOr(S.Union(S.String, S.Null)),
  "usage": Usage
}) {}

export class InvalidRequestErrorType extends S.Literal("invalid_request_error") {}

export class InvalidRequestError extends S.Struct({
  "message": S.String,
  "type": InvalidRequestErrorType
}) {}

export class AuthenticationErrorType extends S.Literal("authentication_error") {}

export class AuthenticationError extends S.Struct({
  "message": S.String,
  "type": AuthenticationErrorType
}) {}

export class BillingErrorType extends S.Literal("billing_error") {}

export class BillingError extends S.Struct({
  "message": S.String,
  "type": BillingErrorType
}) {}

export class PermissionErrorType extends S.Literal("permission_error") {}

export class PermissionError extends S.Struct({
  "message": S.String,
  "type": PermissionErrorType
}) {}

export class NotFoundErrorType extends S.Literal("not_found_error") {}

export class NotFoundError extends S.Struct({
  "message": S.String,
  "type": NotFoundErrorType
}) {}

export class RateLimitErrorType extends S.Literal("rate_limit_error") {}

export class RateLimitError extends S.Struct({
  "message": S.String,
  "type": RateLimitErrorType
}) {}

export class GatewayTimeoutErrorType extends S.Literal("timeout_error") {}

export class GatewayTimeoutError extends S.Struct({
  "message": S.String,
  "type": GatewayTimeoutErrorType
}) {}

export class APIErrorType extends S.Literal("api_error") {}

export class APIError extends S.Struct({
  "message": S.String,
  "type": APIErrorType
}) {}

export class OverloadedErrorType extends S.Literal("overloaded_error") {}

export class OverloadedError extends S.Struct({
  "message": S.String,
  "type": OverloadedErrorType
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
  "type": ErrorResponseType
}) {}

export class CompletePostParams extends S.Struct({
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "anthropic-beta": S.optionalWith(S.String, { nullable: true })
}) {}

export class CompletionRequest extends S.Class<CompletionRequest>("CompletionRequest")({
  "model": S.Union(S.String, Model),
  "prompt": S.String.pipe(S.minLength(1)),
  "max_tokens_to_sample": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "stop_sequences": S.optionalWith(S.Array(S.String), { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true }),
  "top_k": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "metadata": S.optionalWith(Metadata, { nullable: true }),
  "stream": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class CompletionResponseType extends S.Literal("completion") {}

export class CompletionResponse extends S.Class<CompletionResponse>("CompletionResponse")({
  "completion": S.String,
  "id": S.String,
  "model": S.Union(S.String, Model),
  "stop_reason": S.Union(S.String, S.Null),
  "type": CompletionResponseType
}) {}

export class ModelsListParams extends S.Struct({
  "before_id": S.optionalWith(S.String, { nullable: true }),
  "after_id": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(1000)), { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true }),
  "anthropic-beta": S.optionalWith(S.String, { nullable: true })
}) {}

export class ModelInfoType extends S.Literal("model") {}

export class ModelInfo extends S.Struct({
  "created_at": S.String,
  "display_name": S.String,
  "id": S.String,
  "type": ModelInfoType
}) {}

export class ListResponseModelInfo extends S.Class<ListResponseModelInfo>("ListResponseModelInfo")({
  "data": S.Array(ModelInfo),
  "first_id": S.Union(S.String, S.Null),
  "has_more": S.Boolean,
  "last_id": S.Union(S.String, S.Null)
}) {}

export class ModelsGetParams extends S.Struct({
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true }),
  "anthropic-beta": S.optionalWith(S.String, { nullable: true })
}) {}

export class MessageBatchesListParams extends S.Struct({
  "before_id": S.optionalWith(S.String, { nullable: true }),
  "after_id": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(1000)), { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class MessageBatchProcessingStatus extends S.Literal("in_progress", "canceling", "ended") {}

export class RequestCounts extends S.Struct({
  "canceled": S.Int,
  "errored": S.Int,
  "expired": S.Int,
  "processing": S.Int,
  "succeeded": S.Int
}) {}

export class MessageBatchType extends S.Literal("message_batch") {}

export class MessageBatch extends S.Struct({
  "archived_at": S.Union(S.String, S.Null),
  "cancel_initiated_at": S.Union(S.String, S.Null),
  "created_at": S.String,
  "ended_at": S.Union(S.String, S.Null),
  "expires_at": S.String,
  "id": S.String,
  "processing_status": MessageBatchProcessingStatus,
  "request_counts": RequestCounts,
  "results_url": S.Union(S.String, S.Null),
  "type": MessageBatchType
}) {}

export class ListResponseMessageBatch extends S.Class<ListResponseMessageBatch>("ListResponseMessageBatch")({
  "data": S.Array(MessageBatch),
  "first_id": S.Union(S.String, S.Null),
  "has_more": S.Boolean,
  "last_id": S.Union(S.String, S.Null)
}) {}

export class MessageBatchesPostParams extends S.Struct({
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class MessageBatchIndividualRequestParams extends S.Struct({
  "custom_id": S.String.pipe(S.minLength(1), S.maxLength(64), S.pattern(new RegExp("^[a-zA-Z0-9_-]{1,64}$"))),
  "params": CreateMessageParams
}) {}

export class CreateMessageBatchParams extends S.Class<CreateMessageBatchParams>("CreateMessageBatchParams")({
  "requests": S.Array(MessageBatchIndividualRequestParams).pipe(S.minItems(1), S.maxItems(10000))
}) {}

export class MessageBatchesRetrieveParams extends S.Struct({
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class MessageBatchesDeleteParams extends S.Struct({
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class DeleteMessageBatchResponseType extends S.Literal("message_batch_deleted") {}

export class DeleteMessageBatchResponse extends S.Class<DeleteMessageBatchResponse>("DeleteMessageBatchResponse")({
  "id": S.String,
  "type": DeleteMessageBatchResponseType
}) {}

export class MessageBatchesCancelParams extends S.Struct({
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class MessageBatchesResultsParams extends S.Struct({
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class MessagesCountTokensPostParams extends S.Struct({
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class CountMessageTokensParams extends S.Class<CountMessageTokensParams>("CountMessageTokensParams")({
  "messages": S.Array(InputMessage),
  "model": S.Union(S.String, Model),
  "system": S.optionalWith(S.Union(S.String, S.Array(RequestTextBlock)), { nullable: true }),
  "thinking": S.optionalWith(ThinkingConfigParam, { nullable: true }),
  "tool_choice": S.optionalWith(ToolChoice, { nullable: true }),
  "tools": S.optionalWith(
    S.Array(S.Union(Tool, BashTool20250124, TextEditor20250124, TextEditor20250429, WebSearchTool20250305)),
    { nullable: true }
  )
}) {}

export class CountMessageTokensResponse extends S.Class<CountMessageTokensResponse>("CountMessageTokensResponse")({
  "input_tokens": S.Int
}) {}

export class ListFilesV1FilesGetParams extends S.Struct({
  "before_id": S.optionalWith(S.String, { nullable: true }),
  "after_id": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(1000)), { nullable: true }),
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class FileMetadataSchemaType extends S.Literal("file") {}

export class FileMetadataSchema extends S.Struct({
  "created_at": S.String,
  "downloadable": S.optionalWith(S.Boolean, { nullable: true }),
  "filename": S.String.pipe(S.minLength(1), S.maxLength(500)),
  "id": S.String,
  "mime_type": S.String.pipe(S.minLength(1), S.maxLength(255)),
  "size_bytes": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "type": FileMetadataSchemaType
}) {}

export class FileListResponse extends S.Class<FileListResponse>("FileListResponse")({
  "data": S.Array(FileMetadataSchema),
  "first_id": S.optionalWith(S.Union(S.String, S.Null), { nullable: true }),
  "has_more": S.optionalWith(S.Boolean, { nullable: true }),
  "last_id": S.optionalWith(S.Union(S.String, S.Null), { nullable: true })
}) {}

export class UploadFileV1FilesPostParams extends S.Struct({
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class GetFileMetadataV1FilesFileIdGetParams extends S.Struct({
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class DeleteFileV1FilesFileIdDeleteParams extends S.Struct({
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class FileDeleteResponseType extends S.Literal("file_deleted") {}

export class FileDeleteResponse extends S.Class<FileDeleteResponse>("FileDeleteResponse")({
  "id": S.String,
  "type": S.optionalWith(FileDeleteResponseType, { nullable: true })
}) {}

export class DownloadFileV1FilesFileIdContentGetParams extends S.Struct({
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaMessagesPostParams extends S.Struct({
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaCacheControlEphemeralTtl extends S.Literal("5m", "1h") {}

export class BetaCacheControlEphemeralType extends S.Literal("ephemeral") {}

export class BetaCacheControlEphemeral extends S.Struct({
  "ttl": S.optionalWith(BetaCacheControlEphemeralTtl, { nullable: true }),
  "type": BetaCacheControlEphemeralType
}) {}

export class BetaRequestServerToolUseBlockName extends S.Literal("web_search", "code_execution") {}

export class BetaRequestServerToolUseBlockType extends S.Literal("server_tool_use") {}

export class BetaRequestServerToolUseBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": BetaRequestServerToolUseBlockName,
  "type": BetaRequestServerToolUseBlockType
}) {}

export class BetaRequestWebSearchResultBlockType extends S.Literal("web_search_result") {}

export class BetaRequestWebSearchResultBlock extends S.Struct({
  "encrypted_content": S.String,
  "page_age": S.optionalWith(S.Union(S.String, S.Null), { nullable: true }),
  "title": S.String,
  "type": BetaRequestWebSearchResultBlockType,
  "url": S.String
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
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "content": S.Union(S.Array(BetaRequestWebSearchResultBlock), BetaRequestWebSearchToolResultError),
  "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
  "type": BetaRequestWebSearchToolResultBlockType
}) {}

export class BetaCodeExecutionToolResultErrorCode
  extends S.Literal("invalid_tool_input", "unavailable", "too_many_requests", "execution_time_exceeded")
{}

export class BetaRequestCodeExecutionToolResultErrorType extends S.Literal("code_execution_tool_result_error") {}

export class BetaRequestCodeExecutionToolResultError extends S.Struct({
  "error_code": BetaCodeExecutionToolResultErrorCode,
  "type": BetaRequestCodeExecutionToolResultErrorType
}) {}

export class BetaRequestCodeExecutionOutputBlockType extends S.Literal("code_execution_output") {}

export class BetaRequestCodeExecutionOutputBlock extends S.Struct({
  "file_id": S.String,
  "type": BetaRequestCodeExecutionOutputBlockType
}) {}

export class BetaRequestCodeExecutionResultBlockType extends S.Literal("code_execution_result") {}

export class BetaRequestCodeExecutionResultBlock extends S.Struct({
  "content": S.Array(BetaRequestCodeExecutionOutputBlock),
  "return_code": S.Int,
  "stderr": S.String,
  "stdout": S.String,
  "type": BetaRequestCodeExecutionResultBlockType
}) {}

export class BetaRequestCodeExecutionToolResultBlockType extends S.Literal("code_execution_tool_result") {}

export class BetaRequestCodeExecutionToolResultBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "content": S.Union(BetaRequestCodeExecutionToolResultError, BetaRequestCodeExecutionResultBlock),
  "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
  "type": BetaRequestCodeExecutionToolResultBlockType
}) {}

export class BetaRequestMCPToolUseBlockType extends S.Literal("mcp_tool_use") {}

export class BetaRequestMCPToolUseBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": S.String,
  "server_name": S.String,
  "type": BetaRequestMCPToolUseBlockType
}) {}

export class BetaRequestCharLocationCitationType extends S.Literal("char_location") {}

export class BetaRequestCharLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null),
  "end_char_index": S.Int,
  "start_char_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "type": BetaRequestCharLocationCitationType
}) {}

export class BetaRequestPageLocationCitationType extends S.Literal("page_location") {}

export class BetaRequestPageLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null),
  "end_page_number": S.Int,
  "start_page_number": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "type": BetaRequestPageLocationCitationType
}) {}

export class BetaRequestContentBlockLocationCitationType extends S.Literal("content_block_location") {}

export class BetaRequestContentBlockLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null),
  "end_block_index": S.Int,
  "start_block_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "type": BetaRequestContentBlockLocationCitationType
}) {}

export class BetaRequestWebSearchResultLocationCitationType extends S.Literal("web_search_result_location") {}

export class BetaRequestWebSearchResultLocationCitation extends S.Struct({
  "cited_text": S.String,
  "encrypted_index": S.String,
  "title": S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null),
  "type": BetaRequestWebSearchResultLocationCitationType,
  "url": S.String.pipe(S.minLength(1), S.maxLength(2048))
}) {}

export class BetaRequestTextBlockType extends S.Literal("text") {}

export class BetaRequestTextBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "citations": S.optionalWith(
    S.Union(
      S.Array(
        S.Union(
          BetaRequestCharLocationCitation,
          BetaRequestPageLocationCitation,
          BetaRequestContentBlockLocationCitation,
          BetaRequestWebSearchResultLocationCitation
        )
      ),
      S.Null
    ),
    { nullable: true }
  ),
  "text": S.String.pipe(S.minLength(1)),
  "type": BetaRequestTextBlockType
}) {}

export class BetaRequestMCPToolResultBlockType extends S.Literal("mcp_tool_result") {}

export class BetaRequestMCPToolResultBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "content": S.optionalWith(S.Union(S.String, S.Array(BetaRequestTextBlock)), { nullable: true }),
  "is_error": S.optionalWith(S.Boolean, { nullable: true }),
  "tool_use_id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "type": BetaRequestMCPToolResultBlockType
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

export class BetaFileImageSourceType extends S.Literal("file") {}

export class BetaFileImageSource extends S.Struct({
  "file_id": S.String,
  "type": BetaFileImageSourceType
}) {}

export class BetaRequestImageBlockType extends S.Literal("image") {}

export class BetaRequestImageBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "source": S.Union(BetaBase64ImageSource, BetaURLImageSource, BetaFileImageSource),
  "type": BetaRequestImageBlockType
}) {}

export class BetaRequestToolUseBlockType extends S.Literal("tool_use") {}

export class BetaRequestToolUseBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": S.String.pipe(S.minLength(1), S.maxLength(200)),
  "type": BetaRequestToolUseBlockType
}) {}

export class BetaRequestToolResultBlockType extends S.Literal("tool_result") {}

export class BetaRequestToolResultBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
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

export class BetaFileDocumentSourceType extends S.Literal("file") {}

export class BetaFileDocumentSource extends S.Struct({
  "file_id": S.String,
  "type": BetaFileDocumentSourceType
}) {}

export class BetaRequestDocumentBlockType extends S.Literal("document") {}

export class BetaRequestDocumentBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "citations": S.optionalWith(BetaRequestCitationsConfig, { nullable: true }),
  "context": S.optionalWith(S.Union(S.String.pipe(S.minLength(1)), S.Null), { nullable: true }),
  "source": S.Union(
    BetaBase64PDFSource,
    BetaPlainTextSource,
    BetaContentBlockSource,
    BetaURLPDFSource,
    BetaFileDocumentSource
  ),
  "title": S.optionalWith(S.Union(S.String.pipe(S.minLength(1), S.maxLength(500)), S.Null), { nullable: true }),
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

export class BetaRequestContainerUploadBlockType extends S.Literal("container_upload") {}

export class BetaRequestContainerUploadBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "file_id": S.String,
  "type": BetaRequestContainerUploadBlockType
}) {}

export class BetaInputContentBlock extends S.Union(
  BetaRequestServerToolUseBlock,
  BetaRequestWebSearchToolResultBlock,
  BetaRequestCodeExecutionToolResultBlock,
  BetaRequestMCPToolUseBlock,
  BetaRequestMCPToolResultBlock,
  BetaRequestTextBlock,
  BetaRequestImageBlock,
  BetaRequestToolUseBlock,
  BetaRequestToolResultBlock,
  BetaRequestDocumentBlock,
  BetaRequestThinkingBlock,
  BetaRequestRedactedThinkingBlock,
  BetaRequestContainerUploadBlock
) {}

export class BetaInputMessageRole extends S.Literal("user", "assistant") {}

export class BetaInputMessage extends S.Struct({
  "content": S.Union(S.String, S.Array(BetaInputContentBlock)),
  "role": BetaInputMessageRole
}) {}

export class BetaRequestMCPServerToolConfiguration extends S.Struct({
  "allowed_tools": S.optionalWith(S.Union(S.Array(S.String), S.Null), { nullable: true }),
  "enabled": S.optionalWith(S.Union(S.Boolean, S.Null), { nullable: true })
}) {}

export class BetaRequestMCPServerURLDefinitionType extends S.Literal("url") {}

export class BetaRequestMCPServerURLDefinition extends S.Struct({
  "authorization_token": S.optionalWith(S.Union(S.String, S.Null), { nullable: true }),
  "name": S.String,
  "tool_configuration": S.optionalWith(S.Union(BetaRequestMCPServerToolConfiguration, S.Null), { nullable: true }),
  "type": BetaRequestMCPServerURLDefinitionType,
  "url": S.String
}) {}

export class BetaMetadata extends S.Struct({
  "user_id": S.optionalWith(S.Union(S.String.pipe(S.maxLength(256)), S.Null), { nullable: true })
}) {}

export class BetaCreateMessageParamsServiceTier extends S.Literal("auto", "standard_only") {}

export class BetaThinkingConfigEnabledType extends S.Literal("enabled") {}

export class BetaThinkingConfigEnabled extends S.Struct({
  "budget_tokens": S.Int.pipe(S.greaterThanOrEqualTo(1024)),
  "type": BetaThinkingConfigEnabledType
}) {}

export class BetaThinkingConfigDisabledType extends S.Literal("disabled") {}

export class BetaThinkingConfigDisabled extends S.Struct({
  "type": BetaThinkingConfigDisabledType
}) {}

export class BetaThinkingConfigParam extends S.Union(BetaThinkingConfigEnabled, BetaThinkingConfigDisabled) {}

export class BetaToolChoiceAutoType extends S.Literal("auto") {}

export class BetaToolChoiceAuto extends S.Struct({
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true }),
  "type": BetaToolChoiceAutoType
}) {}

export class BetaToolChoiceAnyType extends S.Literal("any") {}

export class BetaToolChoiceAny extends S.Struct({
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true }),
  "type": BetaToolChoiceAnyType
}) {}

export class BetaToolChoiceToolType extends S.Literal("tool") {}

export class BetaToolChoiceTool extends S.Struct({
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true }),
  "name": S.String,
  "type": BetaToolChoiceToolType
}) {}

export class BetaToolChoiceNoneType extends S.Literal("none") {}

export class BetaToolChoiceNone extends S.Struct({
  "type": BetaToolChoiceNoneType
}) {}

export class BetaToolChoice
  extends S.Union(BetaToolChoiceAuto, BetaToolChoiceAny, BetaToolChoiceTool, BetaToolChoiceNone)
{}

export class BetaToolTypeEnum extends S.Literal("custom") {}

export class BetaInputSchemaType extends S.Literal("object") {}

export class BetaInputSchema extends S.Struct({
  "properties": S.optionalWith(S.Union(S.Record({ key: S.String, value: S.Unknown }), S.Null), { nullable: true }),
  "required": S.optionalWith(S.Union(S.Array(S.String), S.Null), { nullable: true }),
  "type": BetaInputSchemaType
}) {}

export class BetaTool extends S.Struct({
  "type": S.optionalWith(S.Union(S.Null, BetaToolTypeEnum), { nullable: true }),
  "description": S.optionalWith(S.String, { nullable: true }),
  "name": S.String.pipe(S.minLength(1), S.maxLength(64), S.pattern(new RegExp("^[a-zA-Z0-9_-]{1,64}$"))),
  "input_schema": BetaInputSchema,
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true })
}) {}

export class BetaComputerUseTool20241022Name extends S.Literal("computer") {}

export class BetaComputerUseTool20241022Type extends S.Literal("computer_20241022") {}

export class BetaComputerUseTool20241022 extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "display_height_px": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "display_number": S.optionalWith(S.Union(S.Int.pipe(S.greaterThanOrEqualTo(0)), S.Null), { nullable: true }),
  "display_width_px": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "name": BetaComputerUseTool20241022Name,
  "type": BetaComputerUseTool20241022Type
}) {}

export class BetaBashTool20241022Name extends S.Literal("bash") {}

export class BetaBashTool20241022Type extends S.Literal("bash_20241022") {}

export class BetaBashTool20241022 extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "name": BetaBashTool20241022Name,
  "type": BetaBashTool20241022Type
}) {}

export class BetaTextEditor20241022Name extends S.Literal("str_replace_editor") {}

export class BetaTextEditor20241022Type extends S.Literal("text_editor_20241022") {}

export class BetaTextEditor20241022 extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "name": BetaTextEditor20241022Name,
  "type": BetaTextEditor20241022Type
}) {}

export class BetaComputerUseTool20250124Name extends S.Literal("computer") {}

export class BetaComputerUseTool20250124Type extends S.Literal("computer_20250124") {}

export class BetaComputerUseTool20250124 extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "display_height_px": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "display_number": S.optionalWith(S.Union(S.Int.pipe(S.greaterThanOrEqualTo(0)), S.Null), { nullable: true }),
  "display_width_px": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "name": BetaComputerUseTool20250124Name,
  "type": BetaComputerUseTool20250124Type
}) {}

export class BetaBashTool20250124Name extends S.Literal("bash") {}

export class BetaBashTool20250124Type extends S.Literal("bash_20250124") {}

export class BetaBashTool20250124 extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "name": BetaBashTool20250124Name,
  "type": BetaBashTool20250124Type
}) {}

export class BetaTextEditor20250124Name extends S.Literal("str_replace_editor") {}

export class BetaTextEditor20250124Type extends S.Literal("text_editor_20250124") {}

export class BetaTextEditor20250124 extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "name": BetaTextEditor20250124Name,
  "type": BetaTextEditor20250124Type
}) {}

export class BetaTextEditor20250429Name extends S.Literal("str_replace_based_edit_tool") {}

export class BetaTextEditor20250429Type extends S.Literal("text_editor_20250429") {}

export class BetaTextEditor20250429 extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "name": BetaTextEditor20250429Name,
  "type": BetaTextEditor20250429Type
}) {}

export class BetaWebSearchTool20250305Name extends S.Literal("web_search") {}

export class BetaWebSearchTool20250305Type extends S.Literal("web_search_20250305") {}

export class BetaUserLocationType extends S.Literal("approximate") {}

export class BetaUserLocation extends S.Struct({
  "city": S.optionalWith(S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null), { nullable: true }),
  "country": S.optionalWith(S.Union(S.String.pipe(S.minLength(2), S.maxLength(2)), S.Null), { nullable: true }),
  "region": S.optionalWith(S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null), { nullable: true }),
  "timezone": S.optionalWith(S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null), { nullable: true }),
  "type": BetaUserLocationType
}) {}

export class BetaWebSearchTool20250305 extends S.Struct({
  "allowed_domains": S.optionalWith(S.Union(S.Array(S.String), S.Null), { nullable: true }),
  "blocked_domains": S.optionalWith(S.Union(S.Array(S.String), S.Null), { nullable: true }),
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "max_uses": S.optionalWith(S.Union(S.Int.pipe(S.greaterThan(0)), S.Null), { nullable: true }),
  "name": BetaWebSearchTool20250305Name,
  "type": BetaWebSearchTool20250305Type,
  "user_location": S.optionalWith(S.Union(BetaUserLocation, S.Null), { nullable: true })
}) {}

export class BetaCodeExecutionTool20250522Name extends S.Literal("code_execution") {}

export class BetaCodeExecutionTool20250522Type extends S.Literal("code_execution_20250522") {}

export class BetaCodeExecutionTool20250522 extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "name": BetaCodeExecutionTool20250522Name,
  "type": BetaCodeExecutionTool20250522Type
}) {}

export class BetaCreateMessageParams extends S.Class<BetaCreateMessageParams>("BetaCreateMessageParams")({
  "model": S.Union(S.String, Model),
  "messages": S.Array(BetaInputMessage),
  "container": S.optionalWith(S.Union(S.String, S.Null), { nullable: true }),
  "max_tokens": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "mcp_servers": S.optionalWith(S.Array(BetaRequestMCPServerURLDefinition).pipe(S.maxItems(20)), { nullable: true }),
  "metadata": S.optionalWith(BetaMetadata, { nullable: true }),
  "service_tier": S.optionalWith(BetaCreateMessageParamsServiceTier, { nullable: true }),
  "stop_sequences": S.optionalWith(S.Array(S.String), { nullable: true }),
  "stream": S.optionalWith(S.Boolean, { nullable: true }),
  "system": S.optionalWith(S.Union(S.String, S.Array(BetaRequestTextBlock)), { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true }),
  "thinking": S.optionalWith(BetaThinkingConfigParam, { nullable: true }),
  "tool_choice": S.optionalWith(BetaToolChoice, { nullable: true }),
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
        BetaTextEditor20250429,
        BetaWebSearchTool20250305,
        BetaCodeExecutionTool20250522
      )
    ),
    { nullable: true }
  ),
  "top_k": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true })
}) {}

export class BetaMessageType extends S.Literal("message") {}

export class BetaMessageRole extends S.Literal("assistant") {}

export class BetaResponseCharLocationCitationType extends S.Literal("char_location") {}

export class BetaResponseCharLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String, S.Null),
  "end_char_index": S.Int,
  "start_char_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "type": BetaResponseCharLocationCitationType
}) {}

export class BetaResponsePageLocationCitationType extends S.Literal("page_location") {}

export class BetaResponsePageLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String, S.Null),
  "end_page_number": S.Int,
  "start_page_number": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "type": BetaResponsePageLocationCitationType
}) {}

export class BetaResponseContentBlockLocationCitationType extends S.Literal("content_block_location") {}

export class BetaResponseContentBlockLocationCitation extends S.Struct({
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String, S.Null),
  "end_block_index": S.Int,
  "start_block_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "type": BetaResponseContentBlockLocationCitationType
}) {}

export class BetaResponseWebSearchResultLocationCitationType extends S.Literal("web_search_result_location") {}

export class BetaResponseWebSearchResultLocationCitation extends S.Struct({
  "cited_text": S.String,
  "encrypted_index": S.String,
  "title": S.Union(S.String, S.Null),
  "type": BetaResponseWebSearchResultLocationCitationType,
  "url": S.String
}) {}

export class BetaResponseTextBlockType extends S.Literal("text") {}

export class BetaResponseTextBlock extends S.Struct({
  "citations": S.optional(S.NullOr(
    S.Array(
      S.Union(
        BetaResponseCharLocationCitation,
        BetaResponsePageLocationCitation,
        BetaResponseContentBlockLocationCitation,
        BetaResponseWebSearchResultLocationCitation
      )
    )
  )),
  "text": S.String.pipe(S.minLength(0), S.maxLength(5000000)),
  "type": BetaResponseTextBlockType
}) {}

export class BetaResponseToolUseBlockType extends S.Literal("tool_use") {}

export class BetaResponseToolUseBlock extends S.Struct({
  "id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": S.String.pipe(S.minLength(1)),
  "type": BetaResponseToolUseBlockType
}) {}

export class BetaResponseServerToolUseBlockName extends S.Literal("web_search", "code_execution") {}

export class BetaResponseServerToolUseBlockType extends S.Literal("server_tool_use") {}

export class BetaResponseServerToolUseBlock extends S.Struct({
  "id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": BetaResponseServerToolUseBlockName,
  "type": BetaResponseServerToolUseBlockType
}) {}

export class BetaResponseWebSearchToolResultErrorType extends S.Literal("web_search_tool_result_error") {}

export class BetaResponseWebSearchToolResultError extends S.Struct({
  "error_code": BetaWebSearchToolResultErrorCode,
  "type": BetaResponseWebSearchToolResultErrorType
}) {}

export class BetaResponseWebSearchResultBlockType extends S.Literal("web_search_result") {}

export class BetaResponseWebSearchResultBlock extends S.Struct({
  "encrypted_content": S.String,
  "page_age": S.NullOr(S.Union(S.String, S.Null)),
  "title": S.String,
  "type": BetaResponseWebSearchResultBlockType,
  "url": S.String
}) {}

export class BetaResponseWebSearchToolResultBlockType extends S.Literal("web_search_tool_result") {}

export class BetaResponseWebSearchToolResultBlock extends S.Struct({
  "content": S.Union(BetaResponseWebSearchToolResultError, S.Array(BetaResponseWebSearchResultBlock)),
  "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
  "type": BetaResponseWebSearchToolResultBlockType
}) {}

export class BetaResponseCodeExecutionToolResultErrorType extends S.Literal("code_execution_tool_result_error") {}

export class BetaResponseCodeExecutionToolResultError extends S.Struct({
  "error_code": BetaCodeExecutionToolResultErrorCode,
  "type": BetaResponseCodeExecutionToolResultErrorType
}) {}

export class BetaResponseCodeExecutionOutputBlockType extends S.Literal("code_execution_output") {}

export class BetaResponseCodeExecutionOutputBlock extends S.Struct({
  "file_id": S.String,
  "type": BetaResponseCodeExecutionOutputBlockType
}) {}

export class BetaResponseCodeExecutionResultBlockType extends S.Literal("code_execution_result") {}

export class BetaResponseCodeExecutionResultBlock extends S.Struct({
  "content": S.Array(BetaResponseCodeExecutionOutputBlock),
  "return_code": S.Int,
  "stderr": S.String,
  "stdout": S.String,
  "type": BetaResponseCodeExecutionResultBlockType
}) {}

export class BetaResponseCodeExecutionToolResultBlockType extends S.Literal("code_execution_tool_result") {}

export class BetaResponseCodeExecutionToolResultBlock extends S.Struct({
  "content": S.Union(BetaResponseCodeExecutionToolResultError, BetaResponseCodeExecutionResultBlock),
  "tool_use_id": S.String.pipe(S.pattern(new RegExp("^srvtoolu_[a-zA-Z0-9_]+$"))),
  "type": BetaResponseCodeExecutionToolResultBlockType
}) {}

export class BetaResponseMCPToolUseBlockType extends S.Literal("mcp_tool_use") {}

export class BetaResponseMCPToolUseBlock extends S.Struct({
  "id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "input": S.Record({ key: S.String, value: S.Unknown }),
  "name": S.String,
  "server_name": S.String,
  "type": BetaResponseMCPToolUseBlockType
}) {}

export class BetaResponseMCPToolResultBlockType extends S.Literal("mcp_tool_result") {}

export class BetaResponseMCPToolResultBlock extends S.Struct({
  "content": S.Union(S.String, S.Array(BetaResponseTextBlock)),
  "is_error": S.Boolean,
  "tool_use_id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "type": BetaResponseMCPToolResultBlockType
}) {}

export class BetaResponseContainerUploadBlockType extends S.Literal("container_upload") {}

export class BetaResponseContainerUploadBlock extends S.Struct({
  "file_id": S.String,
  "type": BetaResponseContainerUploadBlockType
}) {}

export class BetaResponseThinkingBlockType extends S.Literal("thinking") {}

export class BetaResponseThinkingBlock extends S.Struct({
  "signature": S.String,
  "thinking": S.String,
  "type": BetaResponseThinkingBlockType
}) {}

export class BetaResponseRedactedThinkingBlockType extends S.Literal("redacted_thinking") {}

export class BetaResponseRedactedThinkingBlock extends S.Struct({
  "data": S.String,
  "type": BetaResponseRedactedThinkingBlockType
}) {}

export class BetaContentBlock extends S.Union(
  BetaResponseTextBlock,
  BetaResponseToolUseBlock,
  BetaResponseServerToolUseBlock,
  BetaResponseWebSearchToolResultBlock,
  BetaResponseCodeExecutionToolResultBlock,
  BetaResponseMCPToolUseBlock,
  BetaResponseMCPToolResultBlock,
  BetaResponseContainerUploadBlock,
  BetaResponseThinkingBlock,
  BetaResponseRedactedThinkingBlock
) {}

export class BetaStopReason
  extends S.Literal("end_turn", "max_tokens", "stop_sequence", "tool_use", "pause_turn", "refusal")
{}

export class BetaCacheCreation extends S.Struct({
  "ephemeral_1h_input_tokens": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "ephemeral_5m_input_tokens": S.Int.pipe(S.greaterThanOrEqualTo(0))
}) {}

export class BetaServerToolUsage extends S.Struct({
  "web_search_requests": S.Int.pipe(S.greaterThanOrEqualTo(0))
}) {}

export class BetaUsageServiceTierEnum extends S.Literal("standard", "priority", "batch") {}

export class BetaUsage extends S.Struct({
  "cache_creation": S.NullOr(S.Union(BetaCacheCreation, S.Null)),
  "cache_creation_input_tokens": S.NullOr(S.Union(S.Int.pipe(S.greaterThanOrEqualTo(0)), S.Null)),
  "cache_read_input_tokens": S.NullOr(S.Union(S.Int.pipe(S.greaterThanOrEqualTo(0)), S.Null)),
  "input_tokens": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "output_tokens": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "server_tool_use": S.optional(S.NullOr(BetaServerToolUsage)),
  "service_tier": S.NullOr(S.Union(BetaUsageServiceTierEnum, S.Null))
}) {}

export class BetaContainer extends S.Struct({
  "expires_at": S.String,
  "id": S.String
}) {}

export class BetaMessage extends S.Class<BetaMessage>("BetaMessage")({
  "id": S.String,
  "type": BetaMessageType,
  "role": BetaMessageRole,
  "content": S.Array(BetaContentBlock),
  "model": S.Union(S.String, Model),
  "stop_reason": S.Union(BetaStopReason, S.Null),
  "stop_sequence": S.NullOr(S.Union(S.String, S.Null)),
  "usage": BetaUsage,
  "container": S.NullOr(S.Union(BetaContainer, S.Null))
}) {}

export class BetaInvalidRequestErrorType extends S.Literal("invalid_request_error") {}

export class BetaInvalidRequestError extends S.Struct({
  "message": S.String,
  "type": BetaInvalidRequestErrorType
}) {}

export class BetaAuthenticationErrorType extends S.Literal("authentication_error") {}

export class BetaAuthenticationError extends S.Struct({
  "message": S.String,
  "type": BetaAuthenticationErrorType
}) {}

export class BetaBillingErrorType extends S.Literal("billing_error") {}

export class BetaBillingError extends S.Struct({
  "message": S.String,
  "type": BetaBillingErrorType
}) {}

export class BetaPermissionErrorType extends S.Literal("permission_error") {}

export class BetaPermissionError extends S.Struct({
  "message": S.String,
  "type": BetaPermissionErrorType
}) {}

export class BetaNotFoundErrorType extends S.Literal("not_found_error") {}

export class BetaNotFoundError extends S.Struct({
  "message": S.String,
  "type": BetaNotFoundErrorType
}) {}

export class BetaRateLimitErrorType extends S.Literal("rate_limit_error") {}

export class BetaRateLimitError extends S.Struct({
  "message": S.String,
  "type": BetaRateLimitErrorType
}) {}

export class BetaGatewayTimeoutErrorType extends S.Literal("timeout_error") {}

export class BetaGatewayTimeoutError extends S.Struct({
  "message": S.String,
  "type": BetaGatewayTimeoutErrorType
}) {}

export class BetaAPIErrorType extends S.Literal("api_error") {}

export class BetaAPIError extends S.Struct({
  "message": S.String,
  "type": BetaAPIErrorType
}) {}

export class BetaOverloadedErrorType extends S.Literal("overloaded_error") {}

export class BetaOverloadedError extends S.Struct({
  "message": S.String,
  "type": BetaOverloadedErrorType
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
  "type": BetaErrorResponseType
}) {}

export class BetaModelsListParams extends S.Struct({
  "before_id": S.optionalWith(S.String, { nullable: true }),
  "after_id": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(1000)), { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true }),
  "anthropic-beta": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaModelInfoType extends S.Literal("model") {}

export class BetaModelInfo extends S.Struct({
  "created_at": S.String,
  "display_name": S.String,
  "id": S.String,
  "type": BetaModelInfoType
}) {}

export class BetaListResponseModelInfo extends S.Class<BetaListResponseModelInfo>("BetaListResponseModelInfo")({
  "data": S.Array(BetaModelInfo),
  "first_id": S.Union(S.String, S.Null),
  "has_more": S.Boolean,
  "last_id": S.Union(S.String, S.Null)
}) {}

export class BetaModelsGetParams extends S.Struct({
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true }),
  "anthropic-beta": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaMessageBatchesListParams extends S.Struct({
  "before_id": S.optionalWith(S.String, { nullable: true }),
  "after_id": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(1000)), { nullable: true }),
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaMessageBatchProcessingStatus extends S.Literal("in_progress", "canceling", "ended") {}

export class BetaRequestCounts extends S.Struct({
  "canceled": S.Int,
  "errored": S.Int,
  "expired": S.Int,
  "processing": S.Int,
  "succeeded": S.Int
}) {}

export class BetaMessageBatchType extends S.Literal("message_batch") {}

export class BetaMessageBatch extends S.Struct({
  "archived_at": S.Union(S.String, S.Null),
  "cancel_initiated_at": S.Union(S.String, S.Null),
  "created_at": S.String,
  "ended_at": S.Union(S.String, S.Null),
  "expires_at": S.String,
  "id": S.String,
  "processing_status": BetaMessageBatchProcessingStatus,
  "request_counts": BetaRequestCounts,
  "results_url": S.Union(S.String, S.Null),
  "type": BetaMessageBatchType
}) {}

export class BetaListResponseMessageBatch
  extends S.Class<BetaListResponseMessageBatch>("BetaListResponseMessageBatch")({
    "data": S.Array(BetaMessageBatch),
    "first_id": S.Union(S.String, S.Null),
    "has_more": S.Boolean,
    "last_id": S.Union(S.String, S.Null)
  })
{}

export class BetaMessageBatchesPostParams extends S.Struct({
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaMessageBatchIndividualRequestParams extends S.Struct({
  "custom_id": S.String.pipe(S.minLength(1), S.maxLength(64), S.pattern(new RegExp("^[a-zA-Z0-9_-]{1,64}$"))),
  "params": BetaCreateMessageParams
}) {}

export class BetaCreateMessageBatchParams
  extends S.Class<BetaCreateMessageBatchParams>("BetaCreateMessageBatchParams")({
    "requests": S.Array(BetaMessageBatchIndividualRequestParams).pipe(S.minItems(1), S.maxItems(10000))
  })
{}

export class BetaMessageBatchesRetrieveParams extends S.Struct({
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaMessageBatchesDeleteParams extends S.Struct({
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaDeleteMessageBatchResponseType extends S.Literal("message_batch_deleted") {}

export class BetaDeleteMessageBatchResponse
  extends S.Class<BetaDeleteMessageBatchResponse>("BetaDeleteMessageBatchResponse")({
    "id": S.String,
    "type": BetaDeleteMessageBatchResponseType
  })
{}

export class BetaMessageBatchesCancelParams extends S.Struct({
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaMessageBatchesResultsParams extends S.Struct({
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaMessagesCountTokensPostParams extends S.Struct({
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaCountMessageTokensParams
  extends S.Class<BetaCountMessageTokensParams>("BetaCountMessageTokensParams")({
    "mcp_servers": S.optionalWith(S.Array(BetaRequestMCPServerURLDefinition).pipe(S.maxItems(20)), { nullable: true }),
    "messages": S.Array(BetaInputMessage),
    "model": S.Union(S.String, Model),
    "system": S.optionalWith(S.Union(S.String, S.Array(BetaRequestTextBlock)), { nullable: true }),
    "thinking": S.optionalWith(BetaThinkingConfigParam, { nullable: true }),
    "tool_choice": S.optionalWith(BetaToolChoice, { nullable: true }),
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
          BetaTextEditor20250429,
          BetaWebSearchTool20250305,
          BetaCodeExecutionTool20250522
        )
      ),
      { nullable: true }
    )
  })
{}

export class BetaCountMessageTokensResponse
  extends S.Class<BetaCountMessageTokensResponse>("BetaCountMessageTokensResponse")({
    "input_tokens": S.Int
  })
{}

export class BetaListFilesV1FilesGetParams extends S.Struct({
  "before_id": S.optionalWith(S.String, { nullable: true }),
  "after_id": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(1000)), { nullable: true }),
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaFileMetadataSchemaType extends S.Literal("file") {}

export class BetaFileMetadataSchema extends S.Struct({
  "created_at": S.String,
  "downloadable": S.optionalWith(S.Boolean, { nullable: true }),
  "filename": S.String.pipe(S.minLength(1), S.maxLength(500)),
  "id": S.String,
  "mime_type": S.String.pipe(S.minLength(1), S.maxLength(255)),
  "size_bytes": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "type": BetaFileMetadataSchemaType
}) {}

export class BetaFileListResponse extends S.Class<BetaFileListResponse>("BetaFileListResponse")({
  "data": S.Array(BetaFileMetadataSchema),
  "first_id": S.optionalWith(S.Union(S.String, S.Null), { nullable: true }),
  "has_more": S.optionalWith(S.Boolean, { nullable: true }),
  "last_id": S.optionalWith(S.Union(S.String, S.Null), { nullable: true })
}) {}

export class BetaUploadFileV1FilesPostParams extends S.Struct({
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaGetFileMetadataV1FilesFileIdGetParams extends S.Struct({
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaDeleteFileV1FilesFileIdDeleteParams extends S.Struct({
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaFileDeleteResponseType extends S.Literal("file_deleted") {}

export class BetaFileDeleteResponse extends S.Class<BetaFileDeleteResponse>("BetaFileDeleteResponse")({
  "id": S.String,
  "type": S.optionalWith(BetaFileDeleteResponseType, { nullable: true })
}) {}

export class BetaDownloadFileV1FilesFileIdContentGetParams extends S.Struct({
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export const make = (
  httpClient: HttpClient.HttpClient,
  options: {
    readonly transformClient?: ((client: HttpClient.HttpClient) => Effect.Effect<HttpClient.HttpClient>) | undefined
  } = {}
): Client => {
  const unexpectedStatus = (
    request: HttpClientRequest.HttpClientRequest,
    response: HttpClientResponse.HttpClientResponse
  ) =>
    Effect.flatMap(
      Effect.orElseSucceed(response.text, () => "Unexpected status code"),
      (description) =>
        Effect.fail(
          new HttpClientError.ResponseError({
            request,
            response,
            reason: "StatusCode",
            description
          })
        )
    )
  const applyClientTransform = (client: HttpClient.HttpClient): Effect.Effect<HttpClient.HttpClient> =>
    options.transformClient ? options.transformClient(client) : Effect.succeed(client)
  const decodeError = <A, I, R>(response: HttpClientResponse.HttpClientResponse, schema: S.Schema<A, I, R>) =>
    Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)(response), Effect.fail)
  return {
    httpClient,
    "messagesPost": (options) =>
      HttpClientRequest.make("POST")(`/v1/messages`).pipe(
        HttpClientRequest.setHeaders({ "anthropic-version": options.params?.["anthropic-version"] ?? undefined }),
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options.payload)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(Message)(r),
                "4xx": (r) => decodeError(r, ErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "completePost": (options) =>
      HttpClientRequest.make("POST")(`/v1/complete`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-version": options.params?.["anthropic-version"] ?? undefined,
          "anthropic-beta": options.params?.["anthropic-beta"] ?? undefined
        }),
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options.payload)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(CompletionResponse)(r),
                "4xx": (r) => decodeError(r, ErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "modelsList": (options) =>
      HttpClientRequest.make("GET")(`/v1/models`).pipe(
        HttpClientRequest.setUrlParams({
          "before_id": options?.["before_id"] as UrlParams.Coercible,
          "after_id": options?.["after_id"] as UrlParams.Coercible,
          "limit": options?.["limit"] as UrlParams.Coercible
        }),
        HttpClientRequest.setHeaders({
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined,
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ListResponseModelInfo)(r),
                "4xx": (r) => decodeError(r, ErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "modelsGet": (modelId, options) =>
      HttpClientRequest.make("GET")(`/v1/models/${modelId}`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined,
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ModelInfo)(r),
                "4xx": (r) => decodeError(r, ErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "messageBatchesList": (options) =>
      HttpClientRequest.make("GET")(`/v1/messages/batches`).pipe(
        HttpClientRequest.setUrlParams({
          "before_id": options?.["before_id"] as UrlParams.Coercible,
          "after_id": options?.["after_id"] as UrlParams.Coercible,
          "limit": options?.["limit"] as UrlParams.Coercible
        }),
        HttpClientRequest.setHeaders({
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ListResponseMessageBatch)(r),
                "4xx": (r) => decodeError(r, ErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "messageBatchesPost": (options) =>
      HttpClientRequest.make("POST")(`/v1/messages/batches`).pipe(
        HttpClientRequest.setHeaders({ "anthropic-version": options.params?.["anthropic-version"] ?? undefined }),
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options.payload)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(MessageBatch)(r),
                "4xx": (r) => decodeError(r, ErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "messageBatchesRetrieve": (messageBatchId, options) =>
      HttpClientRequest.make("GET")(`/v1/messages/batches/${messageBatchId}`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(MessageBatch)(r),
                  "4xx": (r) => decodeError(r, ErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "messageBatchesDelete": (messageBatchId, options) =>
      HttpClientRequest.make("DELETE")(`/v1/messages/batches/${messageBatchId}`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(DeleteMessageBatchResponse)(r),
                  "4xx": (r) => decodeError(r, ErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "messageBatchesCancel": (messageBatchId, options) =>
      HttpClientRequest.make("POST")(`/v1/messages/batches/${messageBatchId}/cancel`).pipe(
        HttpClientRequest.setHeaders({ "anthropic-version": options?.["anthropic-version"] ?? undefined }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(MessageBatch)(r),
                  "4xx": (r) => decodeError(r, ErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "messageBatchesResults": (messageBatchId, options) =>
      HttpClientRequest.make("GET")(`/v1/messages/batches/${messageBatchId}/results`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "4xx": (r) => decodeError(r, ErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "messagesCountTokensPost": (options) =>
      HttpClientRequest.make("POST")(`/v1/messages/count_tokens`).pipe(
        HttpClientRequest.setHeaders({ "anthropic-version": options.params?.["anthropic-version"] ?? undefined }),
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options.payload)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(CountMessageTokensResponse)(r),
                "4xx": (r) => decodeError(r, ErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "listFilesV1FilesGet": (options) =>
      HttpClientRequest.make("GET")(`/v1/files`).pipe(
        HttpClientRequest.setUrlParams({
          "before_id": options?.["before_id"] as UrlParams.Coercible,
          "after_id": options?.["after_id"] as UrlParams.Coercible,
          "limit": options?.["limit"] as UrlParams.Coercible
        }),
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(FileListResponse)(r),
                "4xx": (r) => decodeError(r, ErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "uploadFileV1FilesPost": (options) =>
      HttpClientRequest.make("POST")(`/v1/files`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options.params?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options.params?.["anthropic-version"] ?? undefined
        }),
        HttpClientRequest.bodyFormData(options.payload),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(FileMetadataSchema)(r),
                "4xx": (r) => decodeError(r, ErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "getFileMetadataV1FilesFileIdGet": (fileId, options) =>
      HttpClientRequest.make("GET")(`/v1/files/${fileId}`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(FileMetadataSchema)(r),
                "4xx": (r) => decodeError(r, ErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "deleteFileV1FilesFileIdDelete": (fileId, options) =>
      HttpClientRequest.make("DELETE")(`/v1/files/${fileId}`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(FileDeleteResponse)(r),
                "4xx": (r) => decodeError(r, ErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "downloadFileV1FilesFileIdContentGet": (fileId, options) =>
      HttpClientRequest.make("GET")(`/v1/files/${fileId}/content`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "betaMessagesPost": (options) =>
      HttpClientRequest.make("POST")(`/v1/messages?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options.params?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options.params?.["anthropic-version"] ?? undefined
        }),
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options.payload)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(BetaMessage)(r),
                "4xx": (r) => decodeError(r, BetaErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "betaModelsList": (options) =>
      HttpClientRequest.make("GET")(`/v1/models?beta=true`).pipe(
        HttpClientRequest.setUrlParams({
          "before_id": options?.["before_id"] as UrlParams.Coercible,
          "after_id": options?.["after_id"] as UrlParams.Coercible,
          "limit": options?.["limit"] as UrlParams.Coercible
        }),
        HttpClientRequest.setHeaders({
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined,
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(BetaListResponseModelInfo)(r),
                "4xx": (r) => decodeError(r, BetaErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "betaModelsGet": (modelId, options) =>
      HttpClientRequest.make("GET")(`/v1/models/${modelId}?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined,
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(BetaModelInfo)(r),
                "4xx": (r) => decodeError(r, BetaErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "betaMessageBatchesList": (options) =>
      HttpClientRequest.make("GET")(`/v1/messages/batches?beta=true`).pipe(
        HttpClientRequest.setUrlParams({
          "before_id": options?.["before_id"] as UrlParams.Coercible,
          "after_id": options?.["after_id"] as UrlParams.Coercible,
          "limit": options?.["limit"] as UrlParams.Coercible
        }),
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(BetaListResponseMessageBatch)(r),
                "4xx": (r) => decodeError(r, BetaErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "betaMessageBatchesPost": (options) =>
      HttpClientRequest.make("POST")(`/v1/messages/batches?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options.params?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options.params?.["anthropic-version"] ?? undefined
        }),
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options.payload)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(BetaMessageBatch)(r),
                "4xx": (r) => decodeError(r, BetaErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "betaMessageBatchesRetrieve": (messageBatchId, options) =>
      HttpClientRequest.make("GET")(`/v1/messages/batches/${messageBatchId}?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(BetaMessageBatch)(r),
                  "4xx": (r) => decodeError(r, BetaErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "betaMessageBatchesDelete": (messageBatchId, options) =>
      HttpClientRequest.make("DELETE")(`/v1/messages/batches/${messageBatchId}?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(BetaDeleteMessageBatchResponse)(r),
                  "4xx": (r) => decodeError(r, BetaErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "betaMessageBatchesCancel": (messageBatchId, options) =>
      HttpClientRequest.make("POST")(`/v1/messages/batches/${messageBatchId}/cancel?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(BetaMessageBatch)(r),
                  "4xx": (r) => decodeError(r, BetaErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "betaMessageBatchesResults": (messageBatchId, options) =>
      HttpClientRequest.make("GET")(`/v1/messages/batches/${messageBatchId}/results?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "4xx": (r) => decodeError(r, BetaErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "betaMessagesCountTokensPost": (options) =>
      HttpClientRequest.make("POST")(`/v1/messages/count_tokens?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options.params?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options.params?.["anthropic-version"] ?? undefined
        }),
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options.payload)),
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(BetaCountMessageTokensResponse)(r),
                  "4xx": (r) => decodeError(r, BetaErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "betaListFilesV1FilesGet": (options) =>
      HttpClientRequest.make("GET")(`/v1/files?beta=true`).pipe(
        HttpClientRequest.setUrlParams({
          "before_id": options?.["before_id"] as UrlParams.Coercible,
          "after_id": options?.["after_id"] as UrlParams.Coercible,
          "limit": options?.["limit"] as UrlParams.Coercible
        }),
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(BetaFileListResponse)(r),
                "4xx": (r) => decodeError(r, BetaErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "betaUploadFileV1FilesPost": (options) =>
      HttpClientRequest.make("POST")(`/v1/files?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options.params?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options.params?.["anthropic-version"] ?? undefined
        }),
        HttpClientRequest.bodyFormData(options.payload),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(BetaFileMetadataSchema)(r),
                "4xx": (r) => decodeError(r, BetaErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        )
      ),
    "betaGetFileMetadataV1FilesFileIdGet": (fileId, options) =>
      HttpClientRequest.make("GET")(`/v1/files/${fileId}?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(BetaFileMetadataSchema)(r),
                  "4xx": (r) => decodeError(r, BetaErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "betaDeleteFileV1FilesFileIdDelete": (fileId, options) =>
      HttpClientRequest.make("DELETE")(`/v1/files/${fileId}?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(BetaFileDeleteResponse)(r),
                  "4xx": (r) => decodeError(r, BetaErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      ),
    "betaDownloadFileV1FilesFileIdContentGet": (fileId, options) =>
      HttpClientRequest.make("GET")(`/v1/files/${fileId}/content?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options?.["anthropic-beta"] ?? undefined,
          "anthropic-version": options?.["anthropic-version"] ?? undefined,
          "x-api-key": options?.["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        )
      )
  }
}

export interface Client {
  readonly httpClient: HttpClient.HttpClient
  readonly "messagesPost": (
    options: {
      readonly params?: typeof MessagesPostParams.Encoded | undefined
      readonly payload: typeof CreateMessageParams.Encoded
    }
  ) => Effect.Effect<typeof Message.Type, HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type>
  readonly "completePost": (
    options: {
      readonly params?: typeof CompletePostParams.Encoded | undefined
      readonly payload: typeof CompletionRequest.Encoded
    }
  ) => Effect.Effect<
    typeof CompletionResponse.Type,
    HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type
  >
  readonly "modelsList": (
    options?: typeof ModelsListParams.Encoded | undefined
  ) => Effect.Effect<
    typeof ListResponseModelInfo.Type,
    HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type
  >
  readonly "modelsGet": (
    modelId: string,
    options?: typeof ModelsGetParams.Encoded | undefined
  ) => Effect.Effect<typeof ModelInfo.Type, HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type>
  readonly "messageBatchesList": (
    options?: typeof MessageBatchesListParams.Encoded | undefined
  ) => Effect.Effect<
    typeof ListResponseMessageBatch.Type,
    HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type
  >
  readonly "messageBatchesPost": (
    options: {
      readonly params?: typeof MessageBatchesPostParams.Encoded | undefined
      readonly payload: typeof CreateMessageBatchParams.Encoded
    }
  ) => Effect.Effect<typeof MessageBatch.Type, HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type>
  readonly "messageBatchesRetrieve": (
    messageBatchId: string,
    options?: typeof MessageBatchesRetrieveParams.Encoded | undefined
  ) => Effect.Effect<typeof MessageBatch.Type, HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type>
  readonly "messageBatchesDelete": (
    messageBatchId: string,
    options?: typeof MessageBatchesDeleteParams.Encoded | undefined
  ) => Effect.Effect<
    typeof DeleteMessageBatchResponse.Type,
    HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type
  >
  readonly "messageBatchesCancel": (
    messageBatchId: string,
    options?: typeof MessageBatchesCancelParams.Encoded | undefined
  ) => Effect.Effect<typeof MessageBatch.Type, HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type>
  readonly "messageBatchesResults": (
    messageBatchId: string,
    options?: typeof MessageBatchesResultsParams.Encoded | undefined
  ) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type>
  readonly "messagesCountTokensPost": (
    options: {
      readonly params?: typeof MessagesCountTokensPostParams.Encoded | undefined
      readonly payload: typeof CountMessageTokensParams.Encoded
    }
  ) => Effect.Effect<
    typeof CountMessageTokensResponse.Type,
    HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type
  >
  readonly "listFilesV1FilesGet": (
    options?: typeof ListFilesV1FilesGetParams.Encoded | undefined
  ) => Effect.Effect<
    typeof FileListResponse.Type,
    HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type
  >
  readonly "uploadFileV1FilesPost": (
    options: {
      readonly params?: typeof UploadFileV1FilesPostParams.Encoded | undefined
      readonly payload: globalThis.FormData
    }
  ) => Effect.Effect<
    typeof FileMetadataSchema.Type,
    HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type
  >
  readonly "getFileMetadataV1FilesFileIdGet": (
    fileId: string,
    options?: typeof GetFileMetadataV1FilesFileIdGetParams.Encoded | undefined
  ) => Effect.Effect<
    typeof FileMetadataSchema.Type,
    HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type
  >
  readonly "deleteFileV1FilesFileIdDelete": (
    fileId: string,
    options?: typeof DeleteFileV1FilesFileIdDeleteParams.Encoded | undefined
  ) => Effect.Effect<
    typeof FileDeleteResponse.Type,
    HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type
  >
  readonly "downloadFileV1FilesFileIdContentGet": (
    fileId: string,
    options?: typeof DownloadFileV1FilesFileIdContentGetParams.Encoded | undefined
  ) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError>
  readonly "betaMessagesPost": (
    options: {
      readonly params?: typeof BetaMessagesPostParams.Encoded | undefined
      readonly payload: typeof BetaCreateMessageParams.Encoded
    }
  ) => Effect.Effect<
    typeof BetaMessage.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
  readonly "betaModelsList": (
    options?: typeof BetaModelsListParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaListResponseModelInfo.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
  readonly "betaModelsGet": (
    modelId: string,
    options?: typeof BetaModelsGetParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaModelInfo.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
  readonly "betaMessageBatchesList": (
    options?: typeof BetaMessageBatchesListParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaListResponseMessageBatch.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
  readonly "betaMessageBatchesPost": (
    options: {
      readonly params?: typeof BetaMessageBatchesPostParams.Encoded | undefined
      readonly payload: typeof BetaCreateMessageBatchParams.Encoded
    }
  ) => Effect.Effect<
    typeof BetaMessageBatch.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
  readonly "betaMessageBatchesRetrieve": (
    messageBatchId: string,
    options?: typeof BetaMessageBatchesRetrieveParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaMessageBatch.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
  readonly "betaMessageBatchesDelete": (
    messageBatchId: string,
    options?: typeof BetaMessageBatchesDeleteParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaDeleteMessageBatchResponse.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
  readonly "betaMessageBatchesCancel": (
    messageBatchId: string,
    options?: typeof BetaMessageBatchesCancelParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaMessageBatch.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
  readonly "betaMessageBatchesResults": (
    messageBatchId: string,
    options?: typeof BetaMessageBatchesResultsParams.Encoded | undefined
  ) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type>
  readonly "betaMessagesCountTokensPost": (
    options: {
      readonly params?: typeof BetaMessagesCountTokensPostParams.Encoded | undefined
      readonly payload: typeof BetaCountMessageTokensParams.Encoded
    }
  ) => Effect.Effect<
    typeof BetaCountMessageTokensResponse.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
  readonly "betaListFilesV1FilesGet": (
    options?: typeof BetaListFilesV1FilesGetParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaFileListResponse.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
  readonly "betaUploadFileV1FilesPost": (
    options: {
      readonly params?: typeof BetaUploadFileV1FilesPostParams.Encoded | undefined
      readonly payload: globalThis.FormData
    }
  ) => Effect.Effect<
    typeof BetaFileMetadataSchema.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
  readonly "betaGetFileMetadataV1FilesFileIdGet": (
    fileId: string,
    options?: typeof BetaGetFileMetadataV1FilesFileIdGetParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaFileMetadataSchema.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
  readonly "betaDeleteFileV1FilesFileIdDelete": (
    fileId: string,
    options?: typeof BetaDeleteFileV1FilesFileIdDeleteParams.Encoded | undefined
  ) => Effect.Effect<
    typeof BetaFileDeleteResponse.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
  readonly "betaDownloadFileV1FilesFileIdContentGet": (
    fileId: string,
    options?: typeof BetaDownloadFileV1FilesFileIdContentGetParams.Encoded | undefined
  ) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError>
}
