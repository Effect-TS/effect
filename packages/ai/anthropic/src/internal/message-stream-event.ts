import type * as Generated from "../Generated.js"

/** @internal */
export type MessageStreamEvent =
  | Ping
  | ErrorEvent
  | MessageStartEvent
  | MessageDeltaEvent
  | MessageStopEvent
  | ContentBlockStartEvent
  | ContentBlockDeltaEvent
  | ContentBlockStopEvent

/** @internal */
export interface Ping {
  readonly type: "ping"
}

/** @internal */
export interface MessageStartEvent {
  readonly type: "message_start"
  readonly message: typeof Generated.Message.Encoded
}

/** @internal */
export interface MessageDeltaEvent {
  readonly type: "message_delta"
  readonly delta: {
    readonly stop_reason:
      | "end_turn"
      | "max_tokens"
      | "stop_sequence"
      | "tool_use"
    readonly stop_sequence: string | null
  }
  readonly usage: {
    readonly output_tokens: number
  }
}

/** @internal */
export interface MessageStopEvent {
  readonly type: "message_stop"
}

/** @internal */
export interface ContentBlockStartEvent {
  readonly type: "content_block_start"
  readonly index: number
  readonly content_block: typeof Generated.ContentBlock.Encoded
}

/** @internal */
export interface ContentBlockDeltaEvent {
  readonly type: "content_block_delta"
  readonly index: number
  readonly delta:
    | CitationsDelta
    | InputJsonContentBlockDelta
    | SignatureDelta
    | TextContentBlockDelta
    | ThinkingDelta
}

/** @internal */
export interface CitationsDelta {
  readonly type: "citations_delta"
  readonly citation: NonNullable<
    (typeof Generated.ResponseTextBlock.Encoded)["citations"]
  >[number]
}

/** @internal */
export interface InputJsonContentBlockDelta {
  readonly type: "input_json_delta"
  readonly partial_json: string
}

/** @internal */
export interface SignatureDelta {
  readonly type: "signature_delta"
  readonly signature: string
}

/** @internal */
export interface TextContentBlockDelta {
  readonly type: "text_delta"
  readonly text: string
}

/** @internal */
export interface ThinkingDelta {
  readonly type: "thinking_delta"
  readonly thinking: string
}

/** @internal */
export interface ContentBlockStopEvent {
  readonly type: "content_block_stop"
  readonly index: number
}

/** @internal */
export interface ErrorEvent {
  readonly type: "error"
  readonly error: {
    readonly type:
      | "api_error"
      | "authentication_error"
      | "invalid_request_error"
      | "not_found_error"
      | "overloaded_error"
      | "permission_error"
      | "rate_limit_error"
      | "request_too_large"
    readonly message: string
  }
}

/** @internal */
export type RawToolCall = {
  readonly id: string
  readonly name: string
  params: string
}
