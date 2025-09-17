/**
 * @since 1.0.0
 */
import * as AnthropicTool from "@effect/ai-anthropic/AnthropicTool"
import type * as Generated from "@effect/ai-anthropic/Generated"
import type * as Tool from "@effect/ai/Tool"
import type * as Schema from "effect/Schema"

/**
 * @since 1.0.0
 * @catgory Tools
 */
export const AnthropicBash_20241022: (
  args: {}
) => Tool.ProviderDefined<
  "AnthropicBash",
  {
    readonly args: Schema.Struct<{}>
    readonly parameters: Schema.Struct<
      { command: typeof Schema.NonEmptyString; restart: Schema.optional<typeof Schema.Boolean> }
    >
    readonly success: typeof Schema.String
    readonly failure: typeof Schema.Never
  },
  true
> = AnthropicTool.Bash_20241022

/**
 * @since 1.0.0
 * @catgory Tools
 */
export const AnthropicBash_20250124: (
  args: {}
) => Tool.ProviderDefined<
  "AnthropicBash",
  {
    readonly args: Schema.Struct<{}>
    readonly parameters: Schema.Struct<
      { command: typeof Schema.NonEmptyString; restart: Schema.optional<typeof Schema.Boolean> }
    >
    readonly success: typeof Schema.String
    readonly failure: typeof Schema.Never
  },
  true
> = AnthropicTool.Bash_20250124

/**
 * @since 1.0.0
 * @catgory Tools
 */
export const AnthropicComputerUse_20241022: (
  args: {
    readonly display_height_px: number
    readonly display_width_px: number
    readonly cache_control?:
      | { readonly type: "ephemeral"; readonly ttl?: "5m" | "1h" | null | undefined }
      | null
      | undefined
    readonly display_number?: number | null | undefined
  }
) => Tool.ProviderDefined<
  "AnthropicComputerUse",
  {
    readonly args: Schema.Struct<
      {
        readonly cache_control: Schema.optionalWith<typeof Generated.BetaCacheControlEphemeral, { nullable: true }>
        readonly display_height_px: Schema.filter<typeof Schema.Int>
        readonly display_number: Schema.optionalWith<Schema.filter<typeof Schema.Int>, { nullable: true }>
        readonly display_width_px: Schema.filter<typeof Schema.Int>
      }
    >
    readonly parameters: Schema.Struct<
      {
        action: Schema.Literal<["screenshot", "left_click", "type", "key", "mouse_move"]>
        coordinate: Schema.optional<Schema.Tuple2<typeof Schema.Number, typeof Schema.Number>>
        text: Schema.optional<typeof Schema.String>
      }
    >
    readonly success: typeof Schema.String
    readonly failure: typeof Schema.Never
  },
  true
> = AnthropicTool.ComputerUse_20241022

/**
 * @since 1.0.0
 * @catgory Tools
 */
export const AnthropicComputerUse_20250124: (
  args: {
    readonly display_height_px: number
    readonly display_width_px: number
    readonly cache_control?:
      | { readonly type: "ephemeral"; readonly ttl?: "5m" | "1h" | null | undefined }
      | null
      | undefined
    readonly display_number?: number | null | undefined
  }
) => Tool.ProviderDefined<
  "AnthropicComputerUse",
  {
    readonly args: Schema.Struct<
      {
        readonly cache_control: Schema.optionalWith<typeof Generated.BetaCacheControlEphemeral, { nullable: true }>
        readonly display_height_px: Schema.filter<typeof Schema.Int>
        readonly display_number: Schema.optionalWith<Schema.filter<typeof Schema.Int>, { nullable: true }>
        readonly display_width_px: Schema.filter<typeof Schema.Int>
      }
    >
    readonly parameters: Schema.Struct<
      {
        action: Schema.Literal<
          [
            "screenshot",
            "left_click",
            "type",
            "key",
            "mouse_move",
            "scroll",
            "left_click_drag",
            "middle_click",
            "right_click",
            "double_click",
            "triple_click",
            "left_mouse_down",
            "left_mouse_up",
            "hold_key",
            "wait"
          ]
        >
        coordinate: Schema.optional<Schema.Tuple2<typeof Schema.Number, typeof Schema.Number>>
        start_coordinate: Schema.optional<Schema.Tuple2<typeof Schema.Number, typeof Schema.Number>>
        text: Schema.optional<typeof Schema.String>
        scroll_direction: Schema.optional<Schema.Literal<["up", "down", "left", "right"]>>
        scroll_amount: Schema.optional<typeof Schema.Number>
        duration: Schema.optional<typeof Schema.Number>
      }
    >
    readonly success: typeof Schema.String
    readonly failure: typeof Schema.Never
  },
  true
> = AnthropicTool.ComputerUse_20250124

/**
 * @since 1.0.0
 * @catgory Tools
 */
export const AnthropicTextEditor_20241022: (
  args: {}
) => Tool.ProviderDefined<
  "AnthropicTextEditor",
  {
    readonly args: Schema.Struct<{}>
    readonly parameters: Schema.Struct<
      {
        command: Schema.Literal<["view", "create", "str_replace", "insert", "undo_edit"]>
        path: typeof Schema.String
        file_text: Schema.optional<typeof Schema.String>
        insert_line: Schema.optional<typeof Schema.Number>
        new_str: Schema.optional<typeof Schema.String>
        old_str: Schema.optional<typeof Schema.String>
        view_range: Schema.optional<Schema.Array$<typeof Schema.Number>>
      }
    >
    readonly success: typeof Schema.Void
    readonly failure: typeof Schema.Never
  },
  true
> = AnthropicTool.TextEditor_20241022

/**
 * @since 1.0.0
 * @catgory Tools
 */
export const AnthropicTextEditor_20250124: (
  args: {}
) => Tool.ProviderDefined<
  "AnthropicTextEditor",
  {
    readonly args: Schema.Struct<{}>
    readonly parameters: Schema.Struct<
      {
        command: Schema.Literal<["view", "create", "str_replace", "insert", "undo_edit"]>
        path: typeof Schema.String
        file_text: Schema.optional<typeof Schema.String>
        insert_line: Schema.optional<typeof Schema.Number>
        new_str: Schema.optional<typeof Schema.String>
        old_str: Schema.optional<typeof Schema.String>
        view_range: Schema.optional<Schema.Array$<typeof Schema.Number>>
      }
    >
    readonly success: typeof Schema.Void
    readonly failure: typeof Schema.Never
  },
  true
> = AnthropicTool.TextEditor_20250124

/**
 * @since 1.0.0
 * @catgory Tools
 */
export const AnthropicTextEditor_20250429: (
  args: {}
) => Tool.ProviderDefined<
  "AnthropicTextEditor",
  {
    readonly args: Schema.Struct<{}>
    readonly parameters: Schema.Struct<
      {
        command: Schema.Literal<["view", "create", "str_replace", "insert"]>
        path: typeof Schema.String
        file_text: Schema.optional<typeof Schema.String>
        insert_line: Schema.optional<typeof Schema.Number>
        new_str: Schema.optional<typeof Schema.String>
        old_str: Schema.optional<typeof Schema.String>
        view_range: Schema.optional<Schema.Array$<typeof Schema.Number>>
      }
    >
    readonly success: typeof Schema.Void
    readonly failure: typeof Schema.Never
  },
  true
> = AnthropicTool.TextEditor_20250429

/**
 * @since 1.0.0
 * @catgory Tools
 */
export const AnthropicTextEditor_20250728: (
  args: {}
) => Tool.ProviderDefined<
  "AnthropicTextEditor",
  {
    readonly args: Schema.Struct<{}>
    readonly parameters: Schema.Struct<
      {
        command: Schema.Literal<["view", "create", "str_replace", "insert"]>
        path: typeof Schema.String
        file_text: Schema.optional<typeof Schema.String>
        insert_line: Schema.optional<typeof Schema.Number>
        new_str: Schema.optional<typeof Schema.String>
        old_str: Schema.optional<typeof Schema.String>
        view_range: Schema.optional<Schema.Array$<typeof Schema.Number>>
      }
    >
    readonly success: typeof Schema.Void
    readonly failure: typeof Schema.Never
  },
  true
> = AnthropicTool.TextEditor_20250728
