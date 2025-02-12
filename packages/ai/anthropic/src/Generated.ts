/**
 * @since 1.0.0
 */
import type * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientError from "@effect/platform/HttpClientError"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Effect from "effect/Effect"
import type { ParseError } from "effect/ParseResult"
import * as S from "effect/Schema"

export class MessagesPostParams extends S.Struct({
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class ModelEnum extends S.Literal(
  "claude-3-5-haiku-latest",
  "claude-3-5-haiku-20241022",
  "claude-3-5-sonnet-latest",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-3-opus-latest",
  "claude-3-opus-20240229",
  "claude-3-sonnet-20240229",
  "claude-3-haiku-20240307",
  "claude-2.1",
  "claude-2.0"
) {}

export class Model extends S.Union(S.String, ModelEnum) {}

export class InputMessageRole extends S.Literal("user", "assistant") {}

export class CacheControlEphemeralType extends S.Literal("ephemeral") {}

export class CacheControlEphemeral extends S.Struct({
  "type": CacheControlEphemeralType
}) {}

export class RequestCharLocationCitationType extends S.Literal("char_location") {}

export class RequestCharLocationCitation extends S.Struct({
  "type": RequestCharLocationCitationType,
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null),
  "start_char_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "end_char_index": S.Int
}) {}

export class RequestPageLocationCitationType extends S.Literal("page_location") {}

export class RequestPageLocationCitation extends S.Struct({
  "type": RequestPageLocationCitationType,
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null),
  "start_page_number": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "end_page_number": S.Int
}) {}

export class RequestContentBlockLocationCitationType extends S.Literal("content_block_location") {}

export class RequestContentBlockLocationCitation extends S.Struct({
  "type": RequestContentBlockLocationCitationType,
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null),
  "start_block_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "end_block_index": S.Int
}) {}

export class RequestTextBlockType extends S.Literal("text") {}

export class RequestTextBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(CacheControlEphemeral, S.Null), { nullable: true }),
  "citations": S.optionalWith(
    S.Union(
      S.Array(S.Union(RequestCharLocationCitation, RequestPageLocationCitation, RequestContentBlockLocationCitation)),
      S.Null
    ),
    { nullable: true }
  ),
  "text": S.String.pipe(S.minLength(1)),
  "type": RequestTextBlockType
}) {}

export class RequestImageBlockType extends S.Literal("image") {}

export class Base64ImageSourceType extends S.Literal("base64") {}

export class Base64ImageSourceMediaType extends S.Literal("image/jpeg", "image/png", "image/gif", "image/webp") {}

export class Base64ImageSource extends S.Struct({
  "type": Base64ImageSourceType,
  "media_type": Base64ImageSourceMediaType,
  "data": S.String
}) {}

export class RequestImageBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(CacheControlEphemeral, S.Null), { nullable: true }),
  "type": RequestImageBlockType,
  "source": Base64ImageSource
}) {}

export class RequestToolUseBlockType extends S.Literal("tool_use") {}

export class RequestToolUseBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(CacheControlEphemeral, S.Null), { nullable: true }),
  "type": RequestToolUseBlockType,
  "id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "name": S.String.pipe(S.minLength(1), S.maxLength(64), S.pattern(new RegExp("^[a-zA-Z0-9_-]{1,64}$"))),
  "input": S.Record({ key: S.String, value: S.Unknown })
}) {}

export class RequestToolResultBlockType extends S.Literal("tool_result") {}

export class RequestToolResultBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(CacheControlEphemeral, S.Null), { nullable: true }),
  "type": RequestToolResultBlockType,
  "tool_use_id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "is_error": S.optionalWith(S.Boolean, { nullable: true }),
  "content": S.optionalWith(S.Union(S.String, S.Array(S.Union(RequestTextBlock, RequestImageBlock))), {
    nullable: true
  })
}) {}

export class RequestDocumentBlockType extends S.Literal("document") {}

export class Base64PDFSourceType extends S.Literal("base64") {}

export class Base64PDFSourceMediaType extends S.Literal("application/pdf") {}

export class Base64PDFSource extends S.Struct({
  "type": Base64PDFSourceType,
  "media_type": Base64PDFSourceMediaType,
  "data": S.String
}) {}

export class PlainTextSourceType extends S.Literal("text") {}

export class PlainTextSourceMediaType extends S.Literal("text/plain") {}

export class PlainTextSource extends S.Struct({
  "type": PlainTextSourceType,
  "media_type": PlainTextSourceMediaType,
  "data": S.String
}) {}

export class ContentBlockSourceType extends S.Literal("content") {}

export class ContentBlockSource extends S.Struct({
  "type": ContentBlockSourceType,
  "content": S.Union(S.String, S.Array(S.Union(RequestTextBlock, RequestImageBlock)))
}) {}

export class RequestCitationsConfig extends S.Struct({
  "enabled": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class RequestDocumentBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(CacheControlEphemeral, S.Null), { nullable: true }),
  "type": RequestDocumentBlockType,
  "source": S.Union(Base64PDFSource, PlainTextSource, ContentBlockSource),
  "title": S.optionalWith(S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null), { nullable: true }),
  "context": S.optionalWith(S.Union(S.String.pipe(S.minLength(1)), S.Null), { nullable: true }),
  "citations": S.optionalWith(RequestCitationsConfig, { nullable: true })
}) {}

export class InputContentBlock extends S.Union(
  RequestTextBlock,
  RequestImageBlock,
  RequestToolUseBlock,
  RequestToolResultBlock,
  RequestDocumentBlock
) {}

export class InputMessage extends S.Struct({
  "role": InputMessageRole,
  "content": S.Union(S.String, S.Array(InputContentBlock))
}) {}

export class Metadata extends S.Struct({
  "user_id": S.optionalWith(S.Union(S.String.pipe(S.maxLength(256)), S.Null), { nullable: true })
}) {}

export class ToolChoiceAutoType extends S.Literal("auto") {}

export class ToolChoiceAuto extends S.Struct({
  "type": ToolChoiceAutoType,
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ToolChoiceAnyType extends S.Literal("any") {}

export class ToolChoiceAny extends S.Struct({
  "type": ToolChoiceAnyType,
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ToolChoiceToolType extends S.Literal("tool") {}

export class ToolChoiceTool extends S.Struct({
  "type": ToolChoiceToolType,
  "name": S.String,
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class ToolChoice extends S.Union(ToolChoiceAuto, ToolChoiceAny, ToolChoiceTool) {}

export class InputSchemaType extends S.Literal("object") {}

export class InputSchema extends S.Struct({
  "type": InputSchemaType,
  "properties": S.optionalWith(S.Union(S.Record({ key: S.String, value: S.Unknown }), S.Null), { nullable: true })
}) {}

export class Tool extends S.Struct({
  "description": S.optionalWith(S.String, { nullable: true }),
  "name": S.String.pipe(S.minLength(1), S.maxLength(64), S.pattern(new RegExp("^[a-zA-Z0-9_-]{1,64}$"))),
  "input_schema": InputSchema,
  "cache_control": S.optionalWith(S.Union(CacheControlEphemeral, S.Null), { nullable: true })
}) {}

export class CreateMessageParams extends S.Class<CreateMessageParams>("CreateMessageParams")({
  "model": Model,
  "messages": S.Array(InputMessage),
  "max_tokens": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "metadata": S.optionalWith(Metadata, { nullable: true }),
  "stop_sequences": S.optionalWith(S.Array(S.String), { nullable: true }),
  "stream": S.optionalWith(S.Boolean, { nullable: true }),
  "system": S.optionalWith(S.Union(S.String, S.Array(RequestTextBlock)), { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true }),
  "tool_choice": S.optionalWith(ToolChoice, { nullable: true }),
  "tools": S.optionalWith(S.Array(Tool), { nullable: true }),
  "top_k": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true })
}) {}

export class MessageType extends S.Literal("message") {}

export class MessageRole extends S.Literal("assistant") {}

export class ResponseTextBlockType extends S.Literal("text") {}

export class ResponseCharLocationCitationType extends S.Literal("char_location") {}

export class ResponseCharLocationCitation extends S.Struct({
  "type": ResponseCharLocationCitationType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "char_location" as const)
  ),
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String, S.Null),
  "start_char_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "end_char_index": S.Int
}) {}

export class ResponsePageLocationCitationType extends S.Literal("page_location") {}

export class ResponsePageLocationCitation extends S.Struct({
  "type": ResponsePageLocationCitationType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "page_location" as const)
  ),
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String, S.Null),
  "start_page_number": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "end_page_number": S.Int
}) {}

export class ResponseContentBlockLocationCitationType extends S.Literal("content_block_location") {}

export class ResponseContentBlockLocationCitation extends S.Struct({
  "type": ResponseContentBlockLocationCitationType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "content_block_location" as const)
  ),
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String, S.Null),
  "start_block_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "end_block_index": S.Int
}) {}

export class ResponseTextBlock extends S.Struct({
  "type": ResponseTextBlockType.pipe(S.propertySignature, S.withConstructorDefault(() => "text" as const)),
  "text": S.String.pipe(S.minLength(0), S.maxLength(5000000)),
  "citations": S.optionalWith(
    S.Union(
      S.Array(
        S.Union(ResponseCharLocationCitation, ResponsePageLocationCitation, ResponseContentBlockLocationCitation)
      ),
      S.Null
    ),
    { nullable: true, default: () => null }
  )
}) {}

export class ResponseToolUseBlockType extends S.Literal("tool_use") {}

export class ResponseToolUseBlock extends S.Struct({
  "type": ResponseToolUseBlockType.pipe(S.propertySignature, S.withConstructorDefault(() => "tool_use" as const)),
  "id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "name": S.String.pipe(S.minLength(1)),
  "input": S.Record({ key: S.String, value: S.Unknown })
}) {}

export class ContentBlock extends S.Union(ResponseTextBlock, ResponseToolUseBlock) {}

export class MessageStopReasonEnum extends S.Literal("end_turn", "max_tokens", "stop_sequence", "tool_use") {}

export class Usage extends S.Struct({
  "input_tokens": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "cache_creation_input_tokens": S.optionalWith(S.Union(S.Int.pipe(S.greaterThanOrEqualTo(0)), S.Null), {
    nullable: true,
    default: () => null
  }),
  "cache_read_input_tokens": S.optionalWith(S.Union(S.Int.pipe(S.greaterThanOrEqualTo(0)), S.Null), {
    nullable: true,
    default: () => null
  }),
  "output_tokens": S.Int.pipe(S.greaterThanOrEqualTo(0))
}) {}

export class Message extends S.Class<Message>("Message")({
  "id": S.String,
  "type": MessageType.pipe(S.propertySignature, S.withConstructorDefault(() => "message" as const)),
  "role": MessageRole.pipe(S.propertySignature, S.withConstructorDefault(() => "assistant" as const)),
  "content": S.Array(ContentBlock),
  "model": Model,
  "stop_reason": S.Union(MessageStopReasonEnum, S.Null),
  "stop_sequence": S.optionalWith(S.Union(S.String, S.Null), { nullable: true, default: () => null }),
  "usage": Usage
}) {}

export class ErrorResponseType extends S.Literal("error") {}

export class InvalidRequestErrorType extends S.Literal("invalid_request_error") {}

export class InvalidRequestError extends S.Struct({
  "type": InvalidRequestErrorType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "invalid_request_error" as const)
  ),
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Invalid request" as const))
}) {}

export class AuthenticationErrorType extends S.Literal("authentication_error") {}

export class AuthenticationError extends S.Struct({
  "type": AuthenticationErrorType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "authentication_error" as const)
  ),
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Authentication error" as const))
}) {}

export class BillingErrorType extends S.Literal("billing_error") {}

export class BillingError extends S.Struct({
  "type": BillingErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "billing_error" as const)),
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Billing error" as const))
}) {}

export class PermissionErrorType extends S.Literal("permission_error") {}

export class PermissionError extends S.Struct({
  "type": PermissionErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "permission_error" as const)),
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Permission denied" as const))
}) {}

export class NotFoundErrorType extends S.Literal("not_found_error") {}

export class NotFoundError extends S.Struct({
  "type": NotFoundErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "not_found_error" as const)),
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Not found" as const))
}) {}

export class RateLimitErrorType extends S.Literal("rate_limit_error") {}

export class RateLimitError extends S.Struct({
  "type": RateLimitErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "rate_limit_error" as const)),
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Rate limited" as const))
}) {}

export class GatewayTimeoutErrorType extends S.Literal("timeout_error") {}

export class GatewayTimeoutError extends S.Struct({
  "type": GatewayTimeoutErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "timeout_error" as const)),
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Request timeout" as const))
}) {}

export class APIErrorType extends S.Literal("api_error") {}

export class APIError extends S.Struct({
  "type": APIErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "api_error" as const)),
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Internal server error" as const))
}) {}

export class OverloadedErrorType extends S.Literal("overloaded_error") {}

export class OverloadedError extends S.Struct({
  "type": OverloadedErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "overloaded_error" as const)),
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Overloaded" as const))
}) {}

export class ErrorResponse extends S.Class<ErrorResponse>("ErrorResponse")({
  "type": ErrorResponseType.pipe(S.propertySignature, S.withConstructorDefault(() => "error" as const)),
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
  )
}) {}

export class CompletePostParams extends S.Struct({
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class CompletionRequest extends S.Class<CompletionRequest>("CompletionRequest")({
  "model": Model,
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
  "type": CompletionResponseType.pipe(S.propertySignature, S.withConstructorDefault(() => "completion" as const)),
  "id": S.String,
  "completion": S.String,
  "stop_reason": S.Union(S.String, S.Null),
  "model": Model
}) {}

export class ModelsListParams extends S.Struct({
  "before_id": S.optionalWith(S.String, { nullable: true }),
  "after_id": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(1000)), {
    nullable: true,
    default: () => 20 as const
  }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class ModelInfoType extends S.Literal("model") {}

export class ModelInfo extends S.Struct({
  "type": ModelInfoType.pipe(S.propertySignature, S.withConstructorDefault(() => "model" as const)),
  "id": S.String,
  "display_name": S.String,
  "created_at": S.String
}) {}

export class ListResponseModelInfo extends S.Class<ListResponseModelInfo>("ListResponseModelInfo")({
  "data": S.Array(ModelInfo),
  "has_more": S.Boolean,
  "first_id": S.Union(S.String, S.Null),
  "last_id": S.Union(S.String, S.Null)
}) {}

export class ModelsGetParams extends S.Struct({
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class MessageBatchesListParams extends S.Struct({
  "before_id": S.optionalWith(S.String, { nullable: true }),
  "after_id": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(1000)), {
    nullable: true,
    default: () => 20 as const
  }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class MessageBatchType extends S.Literal("message_batch") {}

export class MessageBatchProcessingStatus extends S.Literal("in_progress", "canceling", "ended") {}

export class RequestCounts extends S.Struct({
  "processing": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  "succeeded": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  "errored": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  "canceled": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  "expired": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const))
}) {}

export class MessageBatch extends S.Struct({
  "id": S.String,
  "type": MessageBatchType.pipe(S.propertySignature, S.withConstructorDefault(() => "message_batch" as const)),
  "processing_status": MessageBatchProcessingStatus,
  "request_counts": RequestCounts,
  "ended_at": S.Union(S.String, S.Null),
  "created_at": S.String,
  "expires_at": S.String,
  "archived_at": S.Union(S.String, S.Null),
  "cancel_initiated_at": S.Union(S.String, S.Null),
  "results_url": S.Union(S.String, S.Null)
}) {}

export class ListResponseMessageBatch extends S.Class<ListResponseMessageBatch>("ListResponseMessageBatch")({
  "data": S.Array(MessageBatch),
  "has_more": S.Boolean,
  "first_id": S.Union(S.String, S.Null),
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
  "type": DeleteMessageBatchResponseType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "message_batch_deleted" as const)
  )
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
  "tool_choice": S.optionalWith(ToolChoice, { nullable: true }),
  "tools": S.optionalWith(S.Array(Tool), { nullable: true }),
  "messages": S.Array(InputMessage),
  "system": S.optionalWith(S.Union(S.String, S.Array(RequestTextBlock)), { nullable: true }),
  "model": Model
}) {}

export class CountMessageTokensResponse extends S.Class<CountMessageTokensResponse>("CountMessageTokensResponse")({
  "input_tokens": S.Int
}) {}

export class BetaMessagesPostParams extends S.Struct({
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaInputMessageRole extends S.Literal("user", "assistant") {}

export class BetaCacheControlEphemeralType extends S.Literal("ephemeral") {}

export class BetaCacheControlEphemeral extends S.Struct({
  "type": BetaCacheControlEphemeralType
}) {}

export class BetaRequestCharLocationCitationType extends S.Literal("char_location") {}

export class BetaRequestCharLocationCitation extends S.Struct({
  "type": BetaRequestCharLocationCitationType,
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null),
  "start_char_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "end_char_index": S.Int
}) {}

export class BetaRequestPageLocationCitationType extends S.Literal("page_location") {}

export class BetaRequestPageLocationCitation extends S.Struct({
  "type": BetaRequestPageLocationCitationType,
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null),
  "start_page_number": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "end_page_number": S.Int
}) {}

export class BetaRequestContentBlockLocationCitationType extends S.Literal("content_block_location") {}

export class BetaRequestContentBlockLocationCitation extends S.Struct({
  "type": BetaRequestContentBlockLocationCitationType,
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null),
  "start_block_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "end_block_index": S.Int
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
          BetaRequestContentBlockLocationCitation
        )
      ),
      S.Null
    ),
    { nullable: true }
  ),
  "text": S.String.pipe(S.minLength(1)),
  "type": BetaRequestTextBlockType
}) {}

export class BetaRequestImageBlockType extends S.Literal("image") {}

export class BetaBase64ImageSourceType extends S.Literal("base64") {}

export class BetaBase64ImageSourceMediaType extends S.Literal("image/jpeg", "image/png", "image/gif", "image/webp") {}

export class BetaBase64ImageSource extends S.Struct({
  "type": BetaBase64ImageSourceType,
  "media_type": BetaBase64ImageSourceMediaType,
  "data": S.String
}) {}

export class BetaRequestImageBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "type": BetaRequestImageBlockType,
  "source": BetaBase64ImageSource
}) {}

export class BetaRequestToolUseBlockType extends S.Literal("tool_use") {}

export class BetaRequestToolUseBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "type": BetaRequestToolUseBlockType,
  "id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "name": S.String.pipe(S.minLength(1), S.maxLength(64), S.pattern(new RegExp("^[a-zA-Z0-9_-]{1,64}$"))),
  "input": S.Record({ key: S.String, value: S.Unknown })
}) {}

export class BetaRequestToolResultBlockType extends S.Literal("tool_result") {}

export class BetaRequestToolResultBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "type": BetaRequestToolResultBlockType,
  "tool_use_id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "is_error": S.optionalWith(S.Boolean, { nullable: true }),
  "content": S.optionalWith(S.Union(S.String, S.Array(S.Union(BetaRequestTextBlock, BetaRequestImageBlock))), {
    nullable: true
  })
}) {}

export class BetaRequestDocumentBlockType extends S.Literal("document") {}

export class BetaBase64PDFSourceType extends S.Literal("base64") {}

export class BetaBase64PDFSourceMediaType extends S.Literal("application/pdf") {}

export class BetaBase64PDFSource extends S.Struct({
  "type": BetaBase64PDFSourceType,
  "media_type": BetaBase64PDFSourceMediaType,
  "data": S.String
}) {}

export class BetaPlainTextSourceType extends S.Literal("text") {}

export class BetaPlainTextSourceMediaType extends S.Literal("text/plain") {}

export class BetaPlainTextSource extends S.Struct({
  "type": BetaPlainTextSourceType,
  "media_type": BetaPlainTextSourceMediaType,
  "data": S.String
}) {}

export class BetaContentBlockSourceType extends S.Literal("content") {}

export class BetaContentBlockSource extends S.Struct({
  "type": BetaContentBlockSourceType,
  "content": S.Union(S.String, S.Array(S.Union(BetaRequestTextBlock, BetaRequestImageBlock)))
}) {}

export class BetaRequestCitationsConfig extends S.Struct({
  "enabled": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class BetaRequestDocumentBlock extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "type": BetaRequestDocumentBlockType,
  "source": S.Union(BetaBase64PDFSource, BetaPlainTextSource, BetaContentBlockSource),
  "title": S.optionalWith(S.Union(S.String.pipe(S.minLength(1), S.maxLength(255)), S.Null), { nullable: true }),
  "context": S.optionalWith(S.Union(S.String.pipe(S.minLength(1)), S.Null), { nullable: true }),
  "citations": S.optionalWith(BetaRequestCitationsConfig, { nullable: true })
}) {}

export class BetaInputContentBlock extends S.Union(
  BetaRequestTextBlock,
  BetaRequestImageBlock,
  BetaRequestToolUseBlock,
  BetaRequestToolResultBlock,
  BetaRequestDocumentBlock
) {}

export class BetaInputMessage extends S.Struct({
  "role": BetaInputMessageRole,
  "content": S.Union(S.String, S.Array(BetaInputContentBlock))
}) {}

export class BetaMetadata extends S.Struct({
  "user_id": S.optionalWith(S.Union(S.String.pipe(S.maxLength(256)), S.Null), { nullable: true })
}) {}

export class BetaToolChoiceAutoType extends S.Literal("auto") {}

export class BetaToolChoiceAuto extends S.Struct({
  "type": BetaToolChoiceAutoType,
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class BetaToolChoiceAnyType extends S.Literal("any") {}

export class BetaToolChoiceAny extends S.Struct({
  "type": BetaToolChoiceAnyType,
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class BetaToolChoiceToolType extends S.Literal("tool") {}

export class BetaToolChoiceTool extends S.Struct({
  "type": BetaToolChoiceToolType,
  "name": S.String,
  "disable_parallel_tool_use": S.optionalWith(S.Boolean, { nullable: true })
}) {}

export class BetaToolChoice extends S.Union(BetaToolChoiceAuto, BetaToolChoiceAny, BetaToolChoiceTool) {}

export class BetaToolTypeEnum extends S.Literal("custom") {}

export class BetaInputSchemaType extends S.Literal("object") {}

export class BetaInputSchema extends S.Struct({
  "type": BetaInputSchemaType,
  "properties": S.optionalWith(S.Union(S.Record({ key: S.String, value: S.Unknown }), S.Null), { nullable: true })
}) {}

export class BetaTool extends S.Struct({
  "type": S.optionalWith(S.Union(S.Null, BetaToolTypeEnum), { nullable: true }),
  "description": S.optionalWith(S.String, { nullable: true }),
  "name": S.String.pipe(S.minLength(1), S.maxLength(64), S.pattern(new RegExp("^[a-zA-Z0-9_-]{1,64}$"))),
  "input_schema": BetaInputSchema,
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true })
}) {}

export class BetaComputerUseTool20241022Type extends S.Literal("computer_20241022") {}

export class BetaComputerUseTool20241022Name extends S.Literal("computer") {}

export class BetaComputerUseTool20241022 extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "type": BetaComputerUseTool20241022Type,
  "name": BetaComputerUseTool20241022Name,
  "display_height_px": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "display_width_px": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "display_number": S.optionalWith(S.Union(S.Int.pipe(S.greaterThanOrEqualTo(0)), S.Null), { nullable: true })
}) {}

export class BetaBashTool20241022Type extends S.Literal("bash_20241022") {}

export class BetaBashTool20241022Name extends S.Literal("bash") {}

export class BetaBashTool20241022 extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "type": BetaBashTool20241022Type,
  "name": BetaBashTool20241022Name
}) {}

export class BetaTextEditor20241022Type extends S.Literal("text_editor_20241022") {}

export class BetaTextEditor20241022Name extends S.Literal("str_replace_editor") {}

export class BetaTextEditor20241022 extends S.Struct({
  "cache_control": S.optionalWith(S.Union(BetaCacheControlEphemeral, S.Null), { nullable: true }),
  "type": BetaTextEditor20241022Type,
  "name": BetaTextEditor20241022Name
}) {}

export class BetaCreateMessageParams extends S.Class<BetaCreateMessageParams>("BetaCreateMessageParams")({
  "model": Model,
  "messages": S.Array(BetaInputMessage),
  "max_tokens": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "metadata": S.optionalWith(BetaMetadata, { nullable: true }),
  "stop_sequences": S.optionalWith(S.Array(S.String), { nullable: true }),
  "stream": S.optionalWith(S.Boolean, { nullable: true }),
  "system": S.optionalWith(S.Union(S.String, S.Array(BetaRequestTextBlock)), { nullable: true }),
  "temperature": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true }),
  "tool_choice": S.optionalWith(BetaToolChoice, { nullable: true }),
  "tools": S.optionalWith(
    S.Array(S.Union(BetaTool, BetaComputerUseTool20241022, BetaBashTool20241022, BetaTextEditor20241022)),
    { nullable: true }
  ),
  "top_k": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(0)), { nullable: true }),
  "top_p": S.optionalWith(S.Number.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(1)), { nullable: true })
}) {}

export class BetaMessageType extends S.Literal("message") {}

export class BetaMessageRole extends S.Literal("assistant") {}

export class BetaResponseTextBlockType extends S.Literal("text") {}

export class BetaResponseCharLocationCitationType extends S.Literal("char_location") {}

export class BetaResponseCharLocationCitation extends S.Struct({
  "type": BetaResponseCharLocationCitationType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "char_location" as const)
  ),
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String, S.Null),
  "start_char_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "end_char_index": S.Int
}) {}

export class BetaResponsePageLocationCitationType extends S.Literal("page_location") {}

export class BetaResponsePageLocationCitation extends S.Struct({
  "type": BetaResponsePageLocationCitationType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "page_location" as const)
  ),
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String, S.Null),
  "start_page_number": S.Int.pipe(S.greaterThanOrEqualTo(1)),
  "end_page_number": S.Int
}) {}

export class BetaResponseContentBlockLocationCitationType extends S.Literal("content_block_location") {}

export class BetaResponseContentBlockLocationCitation extends S.Struct({
  "type": BetaResponseContentBlockLocationCitationType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "content_block_location" as const)
  ),
  "cited_text": S.String,
  "document_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "document_title": S.Union(S.String, S.Null),
  "start_block_index": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "end_block_index": S.Int
}) {}

export class BetaResponseTextBlock extends S.Struct({
  "type": BetaResponseTextBlockType.pipe(S.propertySignature, S.withConstructorDefault(() => "text" as const)),
  "text": S.String.pipe(S.minLength(0), S.maxLength(5000000)),
  "citations": S.optionalWith(
    S.Union(
      S.Array(
        S.Union(
          BetaResponseCharLocationCitation,
          BetaResponsePageLocationCitation,
          BetaResponseContentBlockLocationCitation
        )
      ),
      S.Null
    ),
    { nullable: true, default: () => null }
  )
}) {}

export class BetaResponseToolUseBlockType extends S.Literal("tool_use") {}

export class BetaResponseToolUseBlock extends S.Struct({
  "type": BetaResponseToolUseBlockType.pipe(S.propertySignature, S.withConstructorDefault(() => "tool_use" as const)),
  "id": S.String.pipe(S.pattern(new RegExp("^[a-zA-Z0-9_-]+$"))),
  "name": S.String.pipe(S.minLength(1)),
  "input": S.Record({ key: S.String, value: S.Unknown })
}) {}

export class BetaContentBlock extends S.Union(BetaResponseTextBlock, BetaResponseToolUseBlock) {}

export class BetaMessageStopReasonEnum extends S.Literal("end_turn", "max_tokens", "stop_sequence", "tool_use") {}

export class BetaUsage extends S.Struct({
  "input_tokens": S.Int.pipe(S.greaterThanOrEqualTo(0)),
  "cache_creation_input_tokens": S.optionalWith(S.Union(S.Int.pipe(S.greaterThanOrEqualTo(0)), S.Null), {
    nullable: true,
    default: () => null
  }),
  "cache_read_input_tokens": S.optionalWith(S.Union(S.Int.pipe(S.greaterThanOrEqualTo(0)), S.Null), {
    nullable: true,
    default: () => null
  }),
  "output_tokens": S.Int.pipe(S.greaterThanOrEqualTo(0))
}) {}

export class BetaMessage extends S.Class<BetaMessage>("BetaMessage")({
  "id": S.String,
  "type": BetaMessageType.pipe(S.propertySignature, S.withConstructorDefault(() => "message" as const)),
  "role": BetaMessageRole.pipe(S.propertySignature, S.withConstructorDefault(() => "assistant" as const)),
  "content": S.Array(BetaContentBlock),
  "model": Model,
  "stop_reason": S.Union(BetaMessageStopReasonEnum, S.Null),
  "stop_sequence": S.optionalWith(S.Union(S.String, S.Null), { nullable: true, default: () => null }),
  "usage": BetaUsage
}) {}

export class BetaErrorResponseType extends S.Literal("error") {}

export class BetaInvalidRequestErrorType extends S.Literal("invalid_request_error") {}

export class BetaInvalidRequestError extends S.Struct({
  "type": BetaInvalidRequestErrorType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "invalid_request_error" as const)
  ),
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Invalid request" as const))
}) {}

export class BetaAuthenticationErrorType extends S.Literal("authentication_error") {}

export class BetaAuthenticationError extends S.Struct({
  "type": BetaAuthenticationErrorType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "authentication_error" as const)
  ),
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Authentication error" as const))
}) {}

export class BetaBillingErrorType extends S.Literal("billing_error") {}

export class BetaBillingError extends S.Struct({
  "type": BetaBillingErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "billing_error" as const)),
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Billing error" as const))
}) {}

export class BetaPermissionErrorType extends S.Literal("permission_error") {}

export class BetaPermissionError extends S.Struct({
  "type": BetaPermissionErrorType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "permission_error" as const)
  ),
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Permission denied" as const))
}) {}

export class BetaNotFoundErrorType extends S.Literal("not_found_error") {}

export class BetaNotFoundError extends S.Struct({
  "type": BetaNotFoundErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "not_found_error" as const)),
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Not found" as const))
}) {}

export class BetaRateLimitErrorType extends S.Literal("rate_limit_error") {}

export class BetaRateLimitError extends S.Struct({
  "type": BetaRateLimitErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "rate_limit_error" as const)),
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Rate limited" as const))
}) {}

export class BetaGatewayTimeoutErrorType extends S.Literal("timeout_error") {}

export class BetaGatewayTimeoutError extends S.Struct({
  "type": BetaGatewayTimeoutErrorType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "timeout_error" as const)
  ),
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Request timeout" as const))
}) {}

export class BetaAPIErrorType extends S.Literal("api_error") {}

export class BetaAPIError extends S.Struct({
  "type": BetaAPIErrorType.pipe(S.propertySignature, S.withConstructorDefault(() => "api_error" as const)),
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Internal server error" as const))
}) {}

export class BetaOverloadedErrorType extends S.Literal("overloaded_error") {}

export class BetaOverloadedError extends S.Struct({
  "type": BetaOverloadedErrorType.pipe(
    S.propertySignature,
    S.withConstructorDefault(() => "overloaded_error" as const)
  ),
  "message": S.String.pipe(S.propertySignature, S.withConstructorDefault(() => "Overloaded" as const))
}) {}

export class BetaErrorResponse extends S.Class<BetaErrorResponse>("BetaErrorResponse")({
  "type": BetaErrorResponseType.pipe(S.propertySignature, S.withConstructorDefault(() => "error" as const)),
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
  )
}) {}

export class BetaModelsListParams extends S.Struct({
  "before_id": S.optionalWith(S.String, { nullable: true }),
  "after_id": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(1000)), {
    nullable: true,
    default: () => 20 as const
  }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaModelInfoType extends S.Literal("model") {}

export class BetaModelInfo extends S.Struct({
  "type": BetaModelInfoType.pipe(S.propertySignature, S.withConstructorDefault(() => "model" as const)),
  "id": S.String,
  "display_name": S.String,
  "created_at": S.String
}) {}

export class BetaListResponseModelInfo extends S.Class<BetaListResponseModelInfo>("BetaListResponseModelInfo")({
  "data": S.Array(BetaModelInfo),
  "has_more": S.Boolean,
  "first_id": S.Union(S.String, S.Null),
  "last_id": S.Union(S.String, S.Null)
}) {}

export class BetaModelsGetParams extends S.Struct({
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaMessageBatchesListParams extends S.Struct({
  "before_id": S.optionalWith(S.String, { nullable: true }),
  "after_id": S.optionalWith(S.String, { nullable: true }),
  "limit": S.optionalWith(S.Int.pipe(S.greaterThanOrEqualTo(1), S.lessThanOrEqualTo(1000)), {
    nullable: true,
    default: () => 20 as const
  }),
  "anthropic-beta": S.optionalWith(S.String, { nullable: true }),
  "anthropic-version": S.optionalWith(S.String, { nullable: true }),
  "x-api-key": S.optionalWith(S.String, { nullable: true })
}) {}

export class BetaMessageBatchType extends S.Literal("message_batch") {}

export class BetaMessageBatchProcessingStatus extends S.Literal("in_progress", "canceling", "ended") {}

export class BetaRequestCounts extends S.Struct({
  "processing": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  "succeeded": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  "errored": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  "canceled": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const)),
  "expired": S.Int.pipe(S.propertySignature, S.withConstructorDefault(() => 0 as const))
}) {}

export class BetaMessageBatch extends S.Struct({
  "id": S.String,
  "type": BetaMessageBatchType.pipe(S.propertySignature, S.withConstructorDefault(() => "message_batch" as const)),
  "processing_status": BetaMessageBatchProcessingStatus,
  "request_counts": BetaRequestCounts,
  "ended_at": S.Union(S.String, S.Null),
  "created_at": S.String,
  "expires_at": S.String,
  "archived_at": S.Union(S.String, S.Null),
  "cancel_initiated_at": S.Union(S.String, S.Null),
  "results_url": S.Union(S.String, S.Null)
}) {}

export class BetaListResponseMessageBatch
  extends S.Class<BetaListResponseMessageBatch>("BetaListResponseMessageBatch")({
    "data": S.Array(BetaMessageBatch),
    "has_more": S.Boolean,
    "first_id": S.Union(S.String, S.Null),
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
    "type": BetaDeleteMessageBatchResponseType.pipe(
      S.propertySignature,
      S.withConstructorDefault(() => "message_batch_deleted" as const)
    )
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
    "tool_choice": S.optionalWith(BetaToolChoice, { nullable: true }),
    "tools": S.optionalWith(
      S.Array(S.Union(BetaTool, BetaComputerUseTool20241022, BetaBashTool20241022, BetaTextEditor20241022)),
      { nullable: true }
    ),
    "messages": S.Array(BetaInputMessage),
    "system": S.optionalWith(S.Union(S.String, S.Array(BetaRequestTextBlock)), { nullable: true }),
    "model": Model
  })
{}

export class BetaCountMessageTokensResponse
  extends S.Class<BetaCountMessageTokensResponse>("BetaCountMessageTokensResponse")({
    "input_tokens": S.Int
  })
{}

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
    "messagesPost": (options) =>
      HttpClientRequest.make("POST")(`/v1/messages`).pipe(
        HttpClientRequest.setHeaders({ "anthropic-version": options.params["anthropic-version"] ?? undefined }),
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options.payload)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(Message)(r),
                "NaN": (r) => decodeError(r, ErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        ),
        Effect.scoped
      ),
    "completePost": (options) =>
      HttpClientRequest.make("POST")(`/v1/complete`).pipe(
        HttpClientRequest.setHeaders({ "anthropic-version": options.params["anthropic-version"] ?? undefined }),
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options.payload)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(CompletionResponse)(r),
                "NaN": (r) => decodeError(r, ErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        ),
        Effect.scoped
      ),
    "modelsList": (options) =>
      HttpClientRequest.make("GET")(`/v1/models`).pipe(
        HttpClientRequest.setUrlParams({
          "before_id": options["before_id"],
          "after_id": options["after_id"],
          "limit": options["limit"]
        }),
        HttpClientRequest.setHeaders({
          "anthropic-version": options["anthropic-version"] ?? undefined,
          "x-api-key": options["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ListResponseModelInfo)(r),
                "NaN": (r) => decodeError(r, ErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        ),
        Effect.scoped
      ),
    "modelsGet": (modelId, options) =>
      HttpClientRequest.make("GET")(`/v1/models/${modelId}`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-version": options["anthropic-version"] ?? undefined,
          "x-api-key": options["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ModelInfo)(r),
                "NaN": (r) => decodeError(r, ErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        ),
        Effect.scoped
      ),
    "messageBatchesList": (options) =>
      HttpClientRequest.make("GET")(`/v1/messages/batches`).pipe(
        HttpClientRequest.setUrlParams({
          "before_id": options["before_id"],
          "after_id": options["after_id"],
          "limit": options["limit"]
        }),
        HttpClientRequest.setHeaders({
          "anthropic-version": options["anthropic-version"] ?? undefined,
          "x-api-key": options["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(ListResponseMessageBatch)(r),
                "NaN": (r) => decodeError(r, ErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        ),
        Effect.scoped
      ),
    "messageBatchesPost": (options) =>
      HttpClientRequest.make("POST")(`/v1/messages/batches`).pipe(
        HttpClientRequest.setHeaders({ "anthropic-version": options.params["anthropic-version"] ?? undefined }),
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options.payload)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(MessageBatch)(r),
                "NaN": (r) => decodeError(r, ErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        ),
        Effect.scoped
      ),
    "messageBatchesRetrieve": (messageBatchId, options) =>
      HttpClientRequest.make("GET")(`/v1/messages/batches/${messageBatchId}`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-version": options["anthropic-version"] ?? undefined,
          "x-api-key": options["x-api-key"] ?? undefined
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
                  "NaN": (r) => decodeError(r, ErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        ),
        Effect.scoped
      ),
    "messageBatchesDelete": (messageBatchId, options) =>
      HttpClientRequest.make("DELETE")(`/v1/messages/batches/${messageBatchId}`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-version": options["anthropic-version"] ?? undefined,
          "x-api-key": options["x-api-key"] ?? undefined
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
                  "NaN": (r) => decodeError(r, ErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        ),
        Effect.scoped
      ),
    "messageBatchesCancel": (messageBatchId, options) =>
      HttpClientRequest.make("POST")(`/v1/messages/batches/${messageBatchId}/cancel`).pipe(
        HttpClientRequest.setHeaders({ "anthropic-version": options["anthropic-version"] ?? undefined }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "200": (r) => HttpClientResponse.schemaBodyJson(MessageBatch)(r),
                  "NaN": (r) => decodeError(r, ErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        ),
        Effect.scoped
      ),
    "messageBatchesResults": (messageBatchId, options) =>
      HttpClientRequest.make("GET")(`/v1/messages/batches/${messageBatchId}/results`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-version": options["anthropic-version"] ?? undefined,
          "x-api-key": options["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "NaN": (r) => decodeError(r, ErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        ),
        Effect.scoped
      ),
    "messagesCountTokensPost": (options) =>
      HttpClientRequest.make("POST")(`/v1/messages/count_tokens`).pipe(
        HttpClientRequest.setHeaders({ "anthropic-version": options.params["anthropic-version"] ?? undefined }),
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options.payload)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(CountMessageTokensResponse)(r),
                "NaN": (r) => decodeError(r, ErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        ),
        Effect.scoped
      ),
    "betaMessagesPost": (options) =>
      HttpClientRequest.make("POST")(`/v1/messages?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options.params["anthropic-beta"] ?? undefined,
          "anthropic-version": options.params["anthropic-version"] ?? undefined
        }),
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options.payload)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(BetaMessage)(r),
                "NaN": (r) => decodeError(r, BetaErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        ),
        Effect.scoped
      ),
    "betaModelsList": (options) =>
      HttpClientRequest.make("GET")(`/v1/models?beta=true`).pipe(
        HttpClientRequest.setUrlParams({
          "before_id": options["before_id"],
          "after_id": options["after_id"],
          "limit": options["limit"]
        }),
        HttpClientRequest.setHeaders({
          "anthropic-version": options["anthropic-version"] ?? undefined,
          "x-api-key": options["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(BetaListResponseModelInfo)(r),
                "NaN": (r) => decodeError(r, BetaErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        ),
        Effect.scoped
      ),
    "betaModelsGet": (modelId, options) =>
      HttpClientRequest.make("GET")(`/v1/models/${modelId}?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-version": options["anthropic-version"] ?? undefined,
          "x-api-key": options["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(BetaModelInfo)(r),
                "NaN": (r) => decodeError(r, BetaErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        ),
        Effect.scoped
      ),
    "betaMessageBatchesList": (options) =>
      HttpClientRequest.make("GET")(`/v1/messages/batches?beta=true`).pipe(
        HttpClientRequest.setUrlParams({
          "before_id": options["before_id"],
          "after_id": options["after_id"],
          "limit": options["limit"]
        }),
        HttpClientRequest.setHeaders({
          "anthropic-beta": options["anthropic-beta"] ?? undefined,
          "anthropic-version": options["anthropic-version"] ?? undefined,
          "x-api-key": options["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(BetaListResponseMessageBatch)(r),
                "NaN": (r) => decodeError(r, BetaErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        ),
        Effect.scoped
      ),
    "betaMessageBatchesPost": (options) =>
      HttpClientRequest.make("POST")(`/v1/messages/batches?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options.params["anthropic-beta"] ?? undefined,
          "anthropic-version": options.params["anthropic-version"] ?? undefined
        }),
        (req) => Effect.orDie(HttpClientRequest.bodyJson(req, options.payload)),
        Effect.flatMap((request) =>
          Effect.flatMap(applyClientTransform(httpClient), (httpClient) =>
            Effect.flatMap(
              httpClient.execute(request),
              HttpClientResponse.matchStatus({
                "200": (r) => HttpClientResponse.schemaBodyJson(BetaMessageBatch)(r),
                "NaN": (r) => decodeError(r, BetaErrorResponse),
                orElse: (response) => unexpectedStatus(request, response)
              })
            ))
        ),
        Effect.scoped
      ),
    "betaMessageBatchesRetrieve": (messageBatchId, options) =>
      HttpClientRequest.make("GET")(`/v1/messages/batches/${messageBatchId}?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options["anthropic-beta"] ?? undefined,
          "anthropic-version": options["anthropic-version"] ?? undefined,
          "x-api-key": options["x-api-key"] ?? undefined
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
                  "NaN": (r) => decodeError(r, BetaErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        ),
        Effect.scoped
      ),
    "betaMessageBatchesDelete": (messageBatchId, options) =>
      HttpClientRequest.make("DELETE")(`/v1/messages/batches/${messageBatchId}?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options["anthropic-beta"] ?? undefined,
          "anthropic-version": options["anthropic-version"] ?? undefined,
          "x-api-key": options["x-api-key"] ?? undefined
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
                  "NaN": (r) => decodeError(r, BetaErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        ),
        Effect.scoped
      ),
    "betaMessageBatchesCancel": (messageBatchId, options) =>
      HttpClientRequest.make("POST")(`/v1/messages/batches/${messageBatchId}/cancel?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options["anthropic-beta"] ?? undefined,
          "anthropic-version": options["anthropic-version"] ?? undefined
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
                  "NaN": (r) => decodeError(r, BetaErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        ),
        Effect.scoped
      ),
    "betaMessageBatchesResults": (messageBatchId, options) =>
      HttpClientRequest.make("GET")(`/v1/messages/batches/${messageBatchId}/results?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options["anthropic-beta"] ?? undefined,
          "anthropic-version": options["anthropic-version"] ?? undefined,
          "x-api-key": options["x-api-key"] ?? undefined
        }),
        Effect.succeed,
        Effect.flatMap((request) =>
          Effect.flatMap(
            applyClientTransform(httpClient),
            (httpClient) =>
              Effect.flatMap(
                httpClient.execute(request),
                HttpClientResponse.matchStatus({
                  "NaN": (r) => decodeError(r, BetaErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        ),
        Effect.scoped
      ),
    "betaMessagesCountTokensPost": (options) =>
      HttpClientRequest.make("POST")(`/v1/messages/count_tokens?beta=true`).pipe(
        HttpClientRequest.setHeaders({
          "anthropic-beta": options.params["anthropic-beta"] ?? undefined,
          "anthropic-version": options.params["anthropic-version"] ?? undefined
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
                  "NaN": (r) => decodeError(r, BetaErrorResponse),
                  orElse: (response) => unexpectedStatus(request, response)
                })
              )
          )
        ),
        Effect.scoped
      )
  }
}

export interface Client {
  readonly "messagesPost": (
    options: {
      readonly params: typeof MessagesPostParams.Encoded
      readonly payload: typeof CreateMessageParams.Encoded
    }
  ) => Effect.Effect<typeof Message.Type, HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type>
  readonly "completePost": (
    options: { readonly params: typeof CompletePostParams.Encoded; readonly payload: typeof CompletionRequest.Encoded }
  ) => Effect.Effect<
    typeof CompletionResponse.Type,
    HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type
  >
  readonly "modelsList": (
    options: typeof ModelsListParams.Encoded
  ) => Effect.Effect<
    typeof ListResponseModelInfo.Type,
    HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type
  >
  readonly "modelsGet": (
    modelId: string,
    options: typeof ModelsGetParams.Encoded
  ) => Effect.Effect<typeof ModelInfo.Type, HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type>
  readonly "messageBatchesList": (
    options: typeof MessageBatchesListParams.Encoded
  ) => Effect.Effect<
    typeof ListResponseMessageBatch.Type,
    HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type
  >
  readonly "messageBatchesPost": (
    options: {
      readonly params: typeof MessageBatchesPostParams.Encoded
      readonly payload: typeof CreateMessageBatchParams.Encoded
    }
  ) => Effect.Effect<typeof MessageBatch.Type, HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type>
  readonly "messageBatchesRetrieve": (
    messageBatchId: string,
    options: typeof MessageBatchesRetrieveParams.Encoded
  ) => Effect.Effect<typeof MessageBatch.Type, HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type>
  readonly "messageBatchesDelete": (
    messageBatchId: string,
    options: typeof MessageBatchesDeleteParams.Encoded
  ) => Effect.Effect<
    typeof DeleteMessageBatchResponse.Type,
    HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type
  >
  readonly "messageBatchesCancel": (
    messageBatchId: string,
    options: typeof MessageBatchesCancelParams.Encoded
  ) => Effect.Effect<typeof MessageBatch.Type, HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type>
  readonly "messageBatchesResults": (
    messageBatchId: string,
    options: typeof MessageBatchesResultsParams.Encoded
  ) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type>
  readonly "messagesCountTokensPost": (
    options: {
      readonly params: typeof MessagesCountTokensPostParams.Encoded
      readonly payload: typeof CountMessageTokensParams.Encoded
    }
  ) => Effect.Effect<
    typeof CountMessageTokensResponse.Type,
    HttpClientError.HttpClientError | ParseError | typeof ErrorResponse.Type
  >
  readonly "betaMessagesPost": (
    options: {
      readonly params: typeof BetaMessagesPostParams.Encoded
      readonly payload: typeof BetaCreateMessageParams.Encoded
    }
  ) => Effect.Effect<
    typeof BetaMessage.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
  readonly "betaModelsList": (
    options: typeof BetaModelsListParams.Encoded
  ) => Effect.Effect<
    typeof BetaListResponseModelInfo.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
  readonly "betaModelsGet": (
    modelId: string,
    options: typeof BetaModelsGetParams.Encoded
  ) => Effect.Effect<
    typeof BetaModelInfo.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
  readonly "betaMessageBatchesList": (
    options: typeof BetaMessageBatchesListParams.Encoded
  ) => Effect.Effect<
    typeof BetaListResponseMessageBatch.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
  readonly "betaMessageBatchesPost": (
    options: {
      readonly params: typeof BetaMessageBatchesPostParams.Encoded
      readonly payload: typeof BetaCreateMessageBatchParams.Encoded
    }
  ) => Effect.Effect<
    typeof BetaMessageBatch.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
  readonly "betaMessageBatchesRetrieve": (
    messageBatchId: string,
    options: typeof BetaMessageBatchesRetrieveParams.Encoded
  ) => Effect.Effect<
    typeof BetaMessageBatch.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
  readonly "betaMessageBatchesDelete": (
    messageBatchId: string,
    options: typeof BetaMessageBatchesDeleteParams.Encoded
  ) => Effect.Effect<
    typeof BetaDeleteMessageBatchResponse.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
  readonly "betaMessageBatchesCancel": (
    messageBatchId: string,
    options: typeof BetaMessageBatchesCancelParams.Encoded
  ) => Effect.Effect<
    typeof BetaMessageBatch.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
  readonly "betaMessageBatchesResults": (
    messageBatchId: string,
    options: typeof BetaMessageBatchesResultsParams.Encoded
  ) => Effect.Effect<void, HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type>
  readonly "betaMessagesCountTokensPost": (
    options: {
      readonly params: typeof BetaMessagesCountTokensPostParams.Encoded
      readonly payload: typeof BetaCountMessageTokensParams.Encoded
    }
  ) => Effect.Effect<
    typeof BetaCountMessageTokensResponse.Type,
    HttpClientError.HttpClientError | ParseError | typeof BetaErrorResponse.Type
  >
}
