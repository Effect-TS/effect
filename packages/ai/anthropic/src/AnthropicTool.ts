/**
 * @since 1.0.0
 */
import * as Tool from "@effect/ai/Tool"
import * as Schema from "effect/Schema"
import * as Struct from "effect/Struct"
import * as Generated from "./Generated.js"

/**
 * @since 1.0.0
 * @category Schemas
 */
export const ProviderDefinedTools: Schema.Union<[
  typeof Generated.BetaBashTool20241022,
  typeof Generated.BetaBashTool20250124,
  typeof Generated.BetaCodeExecutionTool20250522,
  typeof Generated.BetaComputerUseTool20241022,
  typeof Generated.BetaComputerUseTool20250124,
  typeof Generated.BetaTextEditor20241022,
  typeof Generated.BetaTextEditor20250124,
  typeof Generated.BetaTextEditor20250429,
  typeof Generated.BetaTextEditor20250728,
  typeof Generated.BetaWebSearchTool20250305
]> = Schema.Union(
  Generated.BetaBashTool20241022,
  Generated.BetaBashTool20250124,
  Generated.BetaCodeExecutionTool20250522,
  Generated.BetaComputerUseTool20241022,
  Generated.BetaComputerUseTool20250124,
  Generated.BetaTextEditor20241022,
  Generated.BetaTextEditor20250124,
  Generated.BetaTextEditor20250429,
  Generated.BetaTextEditor20250728,
  Generated.BetaWebSearchTool20250305
)

/**
 * @since 1.0.0
 * @category Schemas
 */
export type ProviderDefinedTools = typeof ProviderDefinedTools.Type

/**
 * @since 1.0.0
 * @category Tools
 */
export const Bash_20241022 = Tool.providerDefined({
  id: "anthropic.bash_20241022",
  toolkitName: "AnthropicBash",
  providerName: "bash",
  args: {},
  requiresHandler: true,
  success: Schema.String,
  parameters: {
    /**
     * The Bash command to run.
     */
    command: Schema.NonEmptyString,
    /**
     * If `true`, restart the Bash session.
     */
    restart: Schema.optional(Schema.Boolean)
  }
})

/**
 * @since 1.0.0
 * @category Tools
 */
export const Bash_20250124 = Tool.providerDefined({
  id: "anthropic.bash_20250124",
  toolkitName: "AnthropicBash",
  providerName: "bash",
  args: {},
  requiresHandler: true,
  success: Schema.String,
  parameters: {
    /**
     * The Bash command to run.
     */
    command: Schema.NonEmptyString,
    /**
     * If `true`, restart the Bash session.
     */
    restart: Schema.optional(Schema.Boolean)
  }
})

/**
 * @since 1.0.0
 * @category Tools
 */
export const CodeExecution_20250522 = Tool.providerDefined({
  id: "anthropic.code_execution_20250522",
  toolkitName: "AnthropicCodeExecution",
  providerName: "code_execution",
  args: Struct.omit(Generated.BetaCodeExecutionTool20250522.fields, "name", "type"),
  success: Generated.BetaResponseCodeExecutionResultBlock,
  failure: Generated.BetaResponseCodeExecutionToolResultError
})

/**
 * @since 1.0.0
 * @category Tools
 */
export const CodeExecution_20250825 = Tool.providerDefined({
  id: "anthropic.code_execution_20250825",
  toolkitName: "AnthropicCodeExecution",
  providerName: "code_execution",
  args: Struct.omit(Generated.BetaCodeExecutionTool20250825.fields, "name", "type"),
  success: Schema.Union(
    Generated.BetaResponseBashCodeExecutionResultBlock,
    Generated.BetaResponseTextEditorCodeExecutionViewResultBlock,
    Generated.BetaResponseTextEditorCodeExecutionCreateResultBlock,
    Generated.BetaResponseTextEditorCodeExecutionStrReplaceResultBlock
  ),
  failure: Schema.Union(
    Generated.BetaResponseCodeExecutionToolResultError,
    Generated.BetaResponseTextEditorCodeExecutionToolResultError
  )
})

/**
 * @since 1.0.0
 * @category Models
 */
export const Coordinate = Schema.Tuple(Schema.Number, Schema.Number)

/**
 * Allow Claude to interact with computer environments through the computer use
 * tool, which provides screenshot capabilities and mouse/keyboard control for
 * autonomous desktop interaction.
 *
 * @since 1.0.0
 * @category Tools
 */
export const ComputerUse_20241022 = Tool.providerDefined({
  id: "anthropic.computer_use_20241022",
  toolkitName: "AnthropicComputerUse",
  providerName: "computer",
  args: Struct.omit(Generated.BetaComputerUseTool20241022.fields, "name", "type"),
  requiresHandler: true,
  success: Schema.String,
  parameters: {
    /**
     * The action to perform. The available actions are:
     * - `screenshot`: Take a screenshot of the screen.
     * - `left_click`: Click the left mouse button at the specified (x, y) pixel
     *   coordinate on the screen. You can also include a key combination to
     *   hold down while clicking using the `text` parameter.
     * - `type`: Type a string of text on the keyboard.
     * - `key`: Press a key or key-combination on the keyboard.
     *   - This supports xdotool's `key` syntax.
     *   - Examples: "a", "Return", "alt+Tab", "ctrl+s", "Up", "KP_0" (for the
     *     numpad 0 key).
     * - `mouse_move`: Move the cursor to a specified (x, y) pixel coordinate on
     *   the screen.
     */
    action: Schema.Literal(
      "screenshot",
      "left_click",
      "type",
      "key",
      "mouse_move"
    ),
    /**
     * The x (pixels from the left edge) and y (pixels from the top edge)
     * coordinates to move the mouse to. Required only by `action=mouse_move`.
     */
    coordinate: Schema.optional(Coordinate),
    /**
     * Required only by `action=type` and `action=key`.
     */
    text: Schema.optional(Schema.String)
  }
})

/**
 * Allow Claude to interact with computer environments through the computer use
 * tool, which provides screenshot capabilities and mouse/keyboard control for
 * autonomous desktop interaction.
 *
 * @since 1.0.0
 * @category Tools
 */
export const ComputerUse_20250124 = Tool.providerDefined({
  id: "anthropic.computer_use_20250124",
  toolkitName: "AnthropicComputerUse",
  providerName: "computer",
  args: Struct.omit(Generated.BetaComputerUseTool20241022.fields, "name", "type"),
  requiresHandler: true,
  success: Schema.String,
  parameters: {
    /**
     * The action to perform. The available actions are:
     * - `screenshot`: Take a screenshot of the screen.
     * - `left_click`: Click the left mouse button at the specified (x, y) pixel
     *   coordinate on the screen. You can also include a key combination to
     *   hold down while clicking using the `text` parameter.
     * - `type`: Type a string of text on the keyboard.
     * - `key`: Press a key or key-combination on the keyboard.
     *   - This supports xdotool's `key` syntax.
     *   - Examples: "a", "Return", "alt+Tab", "ctrl+s", "Up", "KP_0" (for the
     *     numpad 0 key).
     * - `mouse_move`: Move the cursor to a specified (x, y) pixel coordinate on
     * - `scroll`: Scroll the screen in a specified direction by a specified
     *   amount of clicks of the scroll wheel, at the specified (x, y) pixel
     *   coordinate. DO NOT use PageUp/PageDown to scroll.
     * - `left_click_drag`: Click and drag the cursor from `start_coordinate`
     *   to a specified (x, y) pixel coordinate on the screen.
     *   the screen.
     * - `middle_click`: Click the middle mouse button at the specified (x, y)
     *   pixel coordinate on the screen.
     * - `right_click`: Click the right mouse button at the specified (x, y)
     *   pixel coordinate on the screen.
     * - `double_click`: Double-click the left mouse button at the specified
     *   (x, y) pixel coordinate on the screen.
     * - `triple_click`: Triple-click the left mouse button at the specified
     *   (x, y) pixel coordinate on the screen.
     * - `left_mouse_down`: Press the left mouse button.
     * - `left_mouse_up`: Release the left mouse button.
     * - `hold_key`: Hold down a key or multiple keys for a specified duration
     *   (in seconds). Supports the same syntax as `key`.
     * - `wait`: Wait for a specified duration (in seconds).
     */
    action: Schema.Literal(
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
    ),
    /**
     * The x (pixels from the left edge) and y (pixels from the top edge)
     * coordinates to move the mouse to. Required only by `action=mouse_move`
     * and `action=left_click_drag`.
     */
    coordinate: Schema.optional(Coordinate),
    /**
     * The x (pixels from the left edge) and y (pixels from the top edge)
     * coordinates to start the drag from. Required only by
     * `action=left_click_drag`.
     */
    start_coordinate: Schema.optional(Coordinate),
    /**
     * Required only by `action=type`, `action=key`, and `action=hold_key`. Can
     * also be used by click or scroll actions to hold down keys while clicking
     * or scrolling.
     */
    text: Schema.optional(Schema.String),
    /**
     * The direction to scroll the screen. Required only by `action=scroll`.
     */
    scroll_direction: Schema.optional(Schema.Literal("up", "down", "left", "right")),
    /**
     * The number of "clicks" of the scroll wheel to scroll. Required only by
     * `action=scroll`.
     */
    scroll_amount: Schema.optional(Schema.Number),
    /**
     * The duration to hold the key down for. Required only by `action=hold_key`
     * and `action=wait`.
     */
    duration: Schema.optional(Schema.Number)
  }
})

/**
 * Allow Claude to directly interact with your files, providing hands-on
 * assistance rather than just suggesting changes.
 *
 * @since 1.0.0
 * @category Tools
 */
export const TextEditor_20241022 = Tool.providerDefined({
  id: "anthropic.text_editor_20241022",
  toolkitName: "AnthropicTextEditor",
  providerName: "str_replace_editor",
  args: {},
  requiresHandler: true,
  parameters: {
    /**
     * The command to run.
     */
    command: Schema.Literal(
      "view",
      "create",
      "str_replace",
      "insert",
      "undo_edit"
    ),
    /**
     * Absolute path to file or directory, e.g. `/repo/file.py` or `/repo`.
     */
    path: Schema.String,
    /**
     * Required parameter of `create` command, with the content of the file to
     * be created.
     */
    file_text: Schema.optional(Schema.String),
    /**
     * Required parameter of `insert` command. The `new_str` will be inserted
     * AFTER the line `insert_line` of `path`.
     */
    insert_line: Schema.optional(Schema.Number),
    /**
     * Optional parameter of `str_replace` command containing the new string (if
     * not given, no string will be added). Required parameter of `insert`
     * command containing the string to insert.
     */
    new_str: Schema.optional(Schema.String),
    /**
     * Required parameter of `str_replace` command containing the string in
     * `path` to replace.
     */
    old_str: Schema.optional(Schema.String),
    /**
     * Optional parameter of `view` command when `path` points to a file. If
     * none is given, the full file is shown. If provided, the file will be
     * shown in the indicated line number range, e.g. [11, 12] will show lines
     * 11 and 12. Indexing at 1 to start. Setting `[start_line, -1]` shows all
     * lines from `start_line` to the end of the file.
     */
    view_range: Schema.optional(Schema.Array(Schema.Number))
  }
})

/**
 * Allow Claude to directly interact with your files, providing hands-on
 * assistance rather than just suggesting changes.
 *
 * @since 1.0.0
 * @category Tools
 */
export const TextEditor_20250124 = Tool.providerDefined({
  id: "anthropic.text_editor_20250124",
  toolkitName: "AnthropicTextEditor",
  providerName: "str_replace_editor",
  args: {},
  requiresHandler: true,
  parameters: {
    /**
     * The command to run.
     */
    command: Schema.Literal(
      "view",
      "create",
      "str_replace",
      "insert",
      "undo_edit"
    ),
    /**
     * Absolute path to file or directory, e.g. `/repo/file.py` or `/repo`.
     */
    path: Schema.String,
    /**
     * Required parameter of `create` command, with the content of the file to
     * be created.
     */
    file_text: Schema.optional(Schema.String),
    /**
     * Required parameter of `insert` command. The `new_str` will be inserted
     * AFTER the line `insert_line` of `path`.
     */
    insert_line: Schema.optional(Schema.Number),
    /**
     * Optional parameter of `str_replace` command containing the new string (if
     * not given, no string will be added). Required parameter of `insert`
     * command containing the string to insert.
     */
    new_str: Schema.optional(Schema.String),
    /**
     * Required parameter of `str_replace` command containing the string in
     * `path` to replace.
     */
    old_str: Schema.optional(Schema.String),
    /**
     * Optional parameter of `view` command when `path` points to a file. If
     * none is given, the full file is shown. If provided, the file will be
     * shown in the indicated line number range, e.g. [11, 12] will show lines
     * 11 and 12. Indexing at 1 to start. Setting `[start_line, -1]` shows all
     * lines from `start_line` to the end of the file.
     */
    view_range: Schema.optional(Schema.Array(Schema.Number))
  }
})

/**
 * Allow Claude to directly interact with your files, providing hands-on
 * assistance rather than just suggesting changes.
 *
 * @since 1.0.0
 * @category Tools
 */
export const TextEditor_20250429 = Tool.providerDefined({
  id: "anthropic.text_editor_20250429",
  toolkitName: "AnthropicTextEditor",
  providerName: "str_replace_based_edit_tool",
  args: {},
  requiresHandler: true,
  parameters: {
    /**
     * The command to run.
     */
    command: Schema.Literal(
      "view",
      "create",
      "str_replace",
      "insert"
    ),
    /**
     * Absolute path to file or directory, e.g. `/repo/file.py` or `/repo`.
     */
    path: Schema.String,
    /**
     * Required parameter of `create` command, with the content of the file to
     * be created.
     */
    file_text: Schema.optional(Schema.String),
    /**
     * Required parameter of `insert` command. The `new_str` will be inserted
     * AFTER the line `insert_line` of `path`.
     */
    insert_line: Schema.optional(Schema.Number),
    /**
     * Optional parameter of `str_replace` command containing the new string (if
     * not given, no string will be added). Required parameter of `insert`
     * command containing the string to insert.
     */
    new_str: Schema.optional(Schema.String),
    /**
     * Required parameter of `str_replace` command containing the string in
     * `path` to replace.
     */
    old_str: Schema.optional(Schema.String),
    /**
     * Optional parameter of `view` command when `path` points to a file. If
     * none is given, the full file is shown. If provided, the file will be
     * shown in the indicated line number range, e.g. [11, 12] will show lines
     * 11 and 12. Indexing at 1 to start. Setting `[start_line, -1]` shows all
     * lines from `start_line` to the end of the file.
     */
    view_range: Schema.optional(Schema.Array(Schema.Number))
  }
})

/**
 * Allow Claude to directly interact with your files, providing hands-on
 * assistance rather than just suggesting changes.
 *
 * @since 1.0.0
 * @category Tools
 */
export const TextEditor_20250728 = Tool.providerDefined({
  id: "anthropic.text_editor_20250728",
  toolkitName: "AnthropicTextEditor",
  providerName: "str_replace_based_edit_tool",
  args: {},
  requiresHandler: true,
  parameters: {
    /**
     * The command to run.
     */
    command: Schema.Literal(
      "view",
      "create",
      "str_replace",
      "insert"
    ),
    /**
     * Absolute path to file or directory, e.g. `/repo/file.py` or `/repo`.
     */
    path: Schema.String,
    /**
     * Required parameter of `create` command, with the content of the file to
     * be created.
     */
    file_text: Schema.optional(Schema.String),
    /**
     * Required parameter of `insert` command. The `new_str` will be inserted
     * AFTER the line `insert_line` of `path`.
     */
    insert_line: Schema.optional(Schema.Number),
    /**
     * Optional parameter of `str_replace` command containing the new string (if
     * not given, no string will be added). Required parameter of `insert`
     * command containing the string to insert.
     */
    new_str: Schema.optional(Schema.String),
    /**
     * Required parameter of `str_replace` command containing the string in
     * `path` to replace.
     */
    old_str: Schema.optional(Schema.String),
    /**
     * Optional parameter of `view` command when `path` points to a file. If
     * none is given, the full file is shown. If provided, the file will be
     * shown in the indicated line number range, e.g. [11, 12] will show lines
     * 11 and 12. Indexing at 1 to start. Setting `[start_line, -1]` shows all
     * lines from `start_line` to the end of the file.
     */
    view_range: Schema.optional(Schema.Array(Schema.Number))
  }
})

/**
 * @since 1.0.0
 * @category Tools
 */
export const WebSearch_20250305 = Tool.providerDefined({
  id: "anthropic.web_search_20250305",
  toolkitName: "AnthropicWebSearch",
  providerName: "web_search",
  args: Struct.omit(Generated.WebSearchTool20250305.fields, "name", "type"),
  success: Schema.Array(Generated.RequestWebSearchResultBlock),
  failure: Generated.ResponseWebSearchToolResultError
})

const ProviderToolNamesMap: Map<ProviderDefinedTools["name"] | (string & {}), string> = new Map([
  ["bash", "AnthropicBash"],
  ["code_execution", "AnthropicCodeExecution"],
  ["computer", "AnthropicComputerUse"],
  ["str_replace_based_edit_tool", "AnthropicTextEditor"],
  ["str_replace_editor", "AnthropicTextEditor"],
  ["web_search", "AnthropicWebSearch"]
])

/**
 * A helper method which takes in the name of a tool as returned in the response
 * from a large language model provider, and returns either the provider-defined
 * name for of the tool as found in the corresponding `Toolkit`, or `undefined`
 * if the tool name is not a provider-defined tool.
 *
 * For example, if the large language model provider returns the tool name
 * `"web_search"` in a response, calling this method would return `"AnthropicWebSearch"`.
 *
 * This method is primarily exposed for use by other Effect provider
 * integrations which can utilize Anthropic tools (i.e. Amazon Bedrock).
 *
 * @since 1.0.0
 * @category Tool Calling
 */
export const getProviderDefinedToolName = (name: string): string | undefined => ProviderToolNamesMap.get(name)
