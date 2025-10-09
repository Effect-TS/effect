import * as CodexSession from "@effect-native/patterns/CodexSession"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

const sampleSession = [
  {
    timestamp: "2025-09-26T16:48:47.559Z",
    type: "session_meta",
    payload: {
      id: "test-session-id",
      timestamp: "2025-09-26T16:48:47.502Z",
      cwd: "/workspace/effect-native/en-puppet-all",
      originator: "codex_cli_rs",
      cli_version: "0.41.0",
      instructions: "line-a\nline-b"
    }
  },
  {
    timestamp: "2025-09-26T16:48:48.000Z",
    type: "turn_context",
    payload: {
      cwd: "/workspace/effect-native/en-puppet-all",
      approval_policy: "on-request",
      sandbox_policy: {
        mode: "workspace-write",
        network_access: false,
        exclude_tmpdir_env_var: false,
        exclude_slash_tmp: false
      },
      model: "gpt-5-codex",
      effort: "high",
      summary: "auto"
    }
  },
  {
    timestamp: "2025-09-26T16:48:48.100Z",
    type: "response_item",
    payload: {
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text: "<user_instructions>"
        }
      ]
    }
  },
  {
    timestamp: "2025-09-26T16:48:48.200Z",
    type: "response_item",
    payload: {
      type: "function_call",
      name: "shell",
      arguments: "{\"command\":[\"bash\",\"-lc\",\"ls\"],\"workdir\":\"/sandbox\"}",
      call_id: "call-id"
    }
  },
  {
    timestamp: "2025-09-26T16:48:48.300Z",
    type: "response_item",
    payload: {
      type: "function_call_output",
      call_id: "call-id",
      output: "{\"output\":\".gitignore\\n\"}"
    }
  },
  {
    timestamp: "2025-09-26T16:48:48.400Z",
    type: "response_item",
    payload: {
      type: "reasoning",
      summary: [
        {
          type: "summary_text",
          text: "**Example summary**"
        }
      ],
      content: null,
      encrypted_content: "encrypted-payload"
    }
  },
  {
    timestamp: "2025-09-26T16:48:48.500Z",
    type: "event_msg",
    payload: {
      type: "user_message",
      message: "hello",
      kind: "plain"
    }
  },
  {
    timestamp: "2025-09-26T16:48:48.600Z",
    type: "event_msg",
    payload: {
      type: "token_count",
      info: {
        total_token_usage: {
          input_tokens: 1000,
          cached_input_tokens: 900,
          output_tokens: 100,
          reasoning_output_tokens: 25,
          total_tokens: 1125
        },
        last_token_usage: {
          input_tokens: 1000,
          cached_input_tokens: 900,
          output_tokens: 100,
          reasoning_output_tokens: 25,
          total_tokens: 1125
        },
        model_context_window: 272000
      },
      rate_limits: {
        primary: {
          used_percent: 4,
          window_minutes: 299,
          resets_in_seconds: 10000
        },
        secondary: {
          used_percent: 1,
          window_minutes: 10079,
          resets_in_seconds: 450000
        }
      }
    }
  },
  {
    timestamp: "2025-09-26T16:48:48.700Z",
    type: "event_msg",
    payload: {
      type: "agent_reasoning",
      text: "thinking"
    }
  },
  {
    timestamp: "2025-09-26T16:48:48.800Z",
    type: "event_msg",
    payload: {
      type: "agent_message",
      message: "done"
    }
  },
  {
    timestamp: "2025-09-26T16:48:48.900Z",
    type: "event_msg",
    payload: {
      type: "turn_aborted",
      reason: "interrupted"
    }
  }
] as const

describe("CodexSession", () => {
  it.effect("decodes Codex CLI session JSONL entries", () =>
    Effect.gen(function*() {
      const decoded = yield* Schema.decodeUnknown(CodexSession.Session)(sampleSession)
      assert.strictEqual(decoded.length, sampleSession.length)

      const first = decoded[0]
      assert.ok(first && "type" in first)
      assert.strictEqual(first.type, "session_meta")

      const encoded = yield* Schema.encode(CodexSession.Session)(decoded)
      assert.deepStrictEqual(encoded, sampleSession)
    }))
})
