/**
 * Schemas for Codex CLI session JSONL logs. Codex writes each turn of a CLI
 * interaction as a discrete JSON object; this module provides decoding and
 * encoding guarantees so we can parse logs, perform migrations, and assert on
 * historical behaviour with confidence.
 *
 * @since 0.0.0
 */
import * as Schema from "effect/Schema"

const Timestamp = Schema.String
const Identifier = Schema.String

const GitInfo = Schema.Struct({
  commit_hash: Schema.String,
  branch: Schema.String,
  repository_url: Schema.String
})

const SessionMetaPayload = Schema.Struct({
  id: Identifier,
  timestamp: Timestamp,
  cwd: Schema.String,
  originator: Schema.String,
  cli_version: Schema.String,
  instructions: Schema.String,
  git: Schema.optional(GitInfo)
})

const SandboxPolicy = Schema.Struct({
  mode: Schema.String,
  network_access: Schema.optional(Schema.Boolean),
  exclude_tmpdir_env_var: Schema.optional(Schema.Boolean),
  exclude_slash_tmp: Schema.optional(Schema.Boolean)
})

const MessageFragmentPayload = Schema.Struct({
  type: Schema.Literal("input_text", "output_text"),
  text: Schema.String
})

const ResponseMessagePayload = Schema.Struct({
  type: Schema.Literal("message"),
  role: Schema.String,
  content: Schema.Array(MessageFragmentPayload)
})

const ResponseFunctionCallPayload = Schema.Struct({
  type: Schema.Literal("function_call"),
  name: Schema.String,
  arguments: Schema.String,
  call_id: Schema.String
})

const ResponseFunctionCallOutputPayload = Schema.Struct({
  type: Schema.Literal("function_call_output"),
  call_id: Schema.String,
  output: Schema.String
})

const SummaryFragmentPayload = Schema.Struct({
  type: Schema.Literal("summary_text"),
  text: Schema.String
})

const ResponseReasoningPayload = Schema.Struct({
  type: Schema.Literal("reasoning"),
  summary: Schema.Array(SummaryFragmentPayload),
  content: Schema.Unknown,
  encrypted_content: Schema.String
})

const TokenUsage = Schema.Struct({
  input_tokens: Schema.Number,
  cached_input_tokens: Schema.Number,
  output_tokens: Schema.Number,
  reasoning_output_tokens: Schema.Number,
  total_tokens: Schema.Number
})

const TokenInfo = Schema.Struct({
  total_token_usage: TokenUsage,
  last_token_usage: TokenUsage,
  model_context_window: Schema.Number
})

const RateLimitInfo = Schema.Struct({
  used_percent: Schema.Number,
  window_minutes: Schema.Number,
  resets_in_seconds: Schema.Number
})

const RateLimits = Schema.Struct({
  primary: Schema.optional(RateLimitInfo),
  secondary: Schema.optional(RateLimitInfo)
})

const TokenCountPayload = Schema.Struct({
  type: Schema.Literal("token_count"),
  info: Schema.NullOr(TokenInfo),
  rate_limits: Schema.optional(Schema.NullOr(RateLimits))
})

const TurnAbortedPayload = Schema.Struct({
  type: Schema.Literal("turn_aborted"),
  reason: Schema.String
})

const AgentReasoningPayload = Schema.Struct({
  type: Schema.Literal("agent_reasoning"),
  text: Schema.String
})

const AgentMessagePayload = Schema.Struct({
  type: Schema.Literal("agent_message"),
  message: Schema.String
})

const UserMessagePayload = Schema.Struct({
  type: Schema.Literal("user_message"),
  message: Schema.String,
  kind: Schema.String
})

const EnteredReviewPayload = Schema.Struct({
  type: Schema.Literal("entered_review_mode"),
  prompt: Schema.String,
  user_facing_hint: Schema.String
})

const ExitedReviewPayload = Schema.Struct({
  type: Schema.Literal("exited_review_mode"),
  review_output: Schema.String
})

const LegacyMessagePayload = Schema.Struct({
  type: Schema.Literal("message"),
  timestamp: Schema.optional(Timestamp),
  id: Schema.NullOr(Identifier),
  role: Schema.String,
  content: Schema.Array(MessageFragmentPayload)
})

const LegacyReasoningPayload = Schema.Struct({
  type: Schema.Literal("reasoning"),
  timestamp: Schema.optional(Timestamp),
  id: Identifier,
  summary: Schema.Array(SummaryFragmentPayload),
  content: Schema.Unknown,
  encrypted_content: Schema.String
})

const LegacyFunctionCallPayload = Schema.Struct({
  type: Schema.Literal("function_call"),
  timestamp: Schema.optional(Timestamp),
  id: Schema.NullOr(Identifier),
  name: Schema.String,
  arguments: Schema.String,
  call_id: Schema.String
})

const LegacyFunctionCallOutputPayload = Schema.Struct({
  type: Schema.Literal("function_call_output"),
  timestamp: Schema.optional(Timestamp),
  call_id: Schema.String,
  output: Schema.String
})

const CompactedPayload = Schema.Struct({
  message: Schema.String
})

const SessionHeaderSchema = Schema.Struct({
  id: Identifier,
  timestamp: Timestamp,
  instructions: Schema.String,
  git: Schema.optional(GitInfo)
})

const SessionMetaSchema = Schema.Struct({
  timestamp: Timestamp,
  type: Schema.Literal("session_meta"),
  payload: SessionMetaPayload
})

const TurnContextSchema = Schema.Struct({
  timestamp: Timestamp,
  type: Schema.Literal("turn_context"),
  payload: Schema.Struct({
    cwd: Schema.String,
    approval_policy: Schema.String,
    model: Schema.String,
    effort: Schema.NullOr(Schema.String),
    summary: Schema.optional(Schema.String),
    sandbox_policy: Schema.optional(SandboxPolicy)
  })
})

const MessageFragmentSchema = MessageFragmentPayload
const SummaryFragmentSchema = SummaryFragmentPayload

const ResponsePayloadSchema = Schema.Union(
  ResponseMessagePayload,
  ResponseFunctionCallPayload,
  ResponseFunctionCallOutputPayload,
  ResponseReasoningPayload
)

const ResponseItemSchema = Schema.Struct({
  timestamp: Timestamp,
  type: Schema.Literal("response_item"),
  payload: ResponsePayloadSchema
})

const EventPayloadSchema = Schema.Union(
  TokenCountPayload,
  TurnAbortedPayload,
  AgentReasoningPayload,
  AgentMessagePayload,
  UserMessagePayload,
  EnteredReviewPayload,
  ExitedReviewPayload
)

const EventMessageSchema = Schema.Struct({
  timestamp: Timestamp,
  type: Schema.Literal("event_msg"),
  payload: EventPayloadSchema
})

const CompactedSchema = Schema.Struct({
  timestamp: Timestamp,
  type: Schema.Literal("compacted"),
  payload: CompactedPayload
})

const SessionEntrySchema = Schema.Union(
  SessionHeaderSchema,
  SessionMetaSchema,
  TurnContextSchema,
  ResponseItemSchema,
  EventMessageSchema,
  CompactedSchema,
  LegacyMessagePayload,
  LegacyReasoningPayload,
  LegacyFunctionCallPayload,
  LegacyFunctionCallOutputPayload
)

const SessionSchema = Schema.Array(SessionEntrySchema)

/**
 * Validates the header stanza that Codex writes before streaming turn data.
 * This entry records the session id and the full instruction block that guided
 * the run; decoding it first lets tools decide whether the log matches their
 * expectations before iterating further.
 *
 * @since 0.0.0
 * @category schema
 */
export const SessionHeader = SessionHeaderSchema

/**
 * Captures the first runtime payload produced by the CLI. It mirrors the
 * `session_meta` JSON record that advertises the working directory, CLI
 * version, and optional git metadata for the run.
 *
 * @since 0.0.0
 * @category schema
 */
export const SessionMeta = SessionMetaSchema

/**
 * Describes the environment snapshot recorded for each turn. A turn context
 * conveys sandbox settings (filesystem and network policy), the approval mode,
 * and the model/effort knobs the operator selected.
 *
 * @since 0.0.0
 * @category schema
 */
export const TurnContext = TurnContextSchema

/**
 * Represents the smallest atom of user or assistant prose. Codex stores rich
 * messages as an ordered set of fragments so we preserve Markdown and other
 * render hints verbatim when replaying logs.
 *
 * @since 0.0.0
 * @category schema
 */
export const MessageFragment = MessageFragmentSchema

/**
 * Tagged summary snippet emitted by the reasoning trace. Consumers can render
 * these lines to provide quick intent previews without exposing encrypted
 * details.
 *
 * @since 0.0.0
 * @category schema
 */
export const SummaryFragment = SummaryFragmentSchema

/**
 * Union of every `response_item` payload the CLI can emit: structured chat
 * messages, tool invocations, tool results, and encrypted reasoning blocks.
 * Use this schema when you only need the payload body, not the envelope.
 *
 * @since 0.0.0
 * @category schema
 */
export const ResponsePayload = ResponsePayloadSchema

/**
 * Envelope describing a single assistant response. The schema preserves the
 * outer timestamp/type metadata and reuses {@link ResponsePayload} for the
 * payload body.
 *
 * @since 0.0.0
 * @category schema
 */
export const ResponseItem = ResponseItemSchema

/**
 * Union for the lower-level telemetry events that accompany a turn (token
 * counts, agent diagnostics, review prompts, etc.).
 *
 * @since 0.0.0
 * @category schema
 */
export const EventPayload = EventPayloadSchema

/**
 * Envelope for `event_msg` entries that carry operational telemetry and agent
 * status updates alongside the core conversation stream.
 *
 * @since 0.0.0
 * @category schema
 */
export const EventMessage = EventMessageSchema

/**
 * Compacted session summaries emitted when Codex squashes a long log into a
 * single message. These appear when the CLI rolls over old content but still
 * wants to provide a human-readable synopsis.
 *
 * @since 0.0.0
 * @category schema
 */
export const Compacted = CompactedSchema

/**
 * Master schema covering every JSON object Codex has written historically,
 * including legacy top-level message/response forms. Decode with this union to
 * safely traverse logs regardless of CLI version.
 *
 * @since 0.0.0
 * @category schema
 */
export const SessionEntry = SessionEntrySchema

/**
 * Validates a complete session file. Each element is a
 * {@link SessionEntry}, enabling bulk decode of JSONL exports directly into
 * strongly typed structures.
 *
 * @since 0.0.0
 * @category schema
 */
export const Session = SessionSchema

/**
 * Type produced when decoding {@link Session}.
 *
 * @since 0.0.0
 * @category types
 */
export type Session = typeof SessionSchema.Type

/**
 * A single decoded entry within a session log.
 *
 * @since 0.0.0
 * @category types
 */
export type SessionEntry = typeof SessionEntrySchema.Type

/**
 * The decoded `session_meta` header.
 *
 * @since 0.0.0
 * @category types
 */
export type SessionMeta = typeof SessionMetaSchema.Type

/**
 * Describes the decoded turn-context record.
 *
 * @since 0.0.0
 * @category types
 */
export type TurnContext = typeof TurnContextSchema.Type

/**
 * The smallest message fragment stored in the log.
 *
 * @since 0.0.0
 * @category types
 */
export type MessageFragment = typeof MessageFragmentSchema.Type

/**
 * The reasoning summary fragment.
 *
 * @since 0.0.0
 * @category types
 */
export type SummaryFragment = typeof SummaryFragmentSchema.Type

/**
 * The response item envelope.
 *
 * @since 0.0.0
 * @category types
 */
export type ResponseItem = typeof ResponseItemSchema.Type

/**
 * The union of assistant payload shapes.
 *
 * @since 0.0.0
 * @category types
 */
export type ResponsePayload = typeof ResponsePayloadSchema.Type

/**
 * The union of telemetry payloads.
 *
 * @since 0.0.0
 * @category types
 */
export type EventPayload = typeof EventPayloadSchema.Type

/**
 * event envelope entries.
 *
 * @since 0.0.0
 * @category types
 */
export type EventMessage = typeof EventMessageSchema.Type

/**
 * compacted summary entries.
 *
 * @since 0.0.0
 * @category types
 */
export type Compacted = typeof CompactedSchema.Type

/**
 * The initial instruction header stanza.
 *
 * @since 0.0.0
 * @category types
 */
export type SessionHeader = typeof SessionHeaderSchema.Type
