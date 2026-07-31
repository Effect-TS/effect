# Example Suggestions: `@effect/ai-anthropic/AnthropicTool`

- **Package:** `@effect/ai-anthropic`
- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts`
- **Uncovered API records:** 108
- **Priorities:** 0 required, 25 recommended, 83 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                            | Line | Kind               | Priority        |
| ------------------------------------------------------------------------------ | ---: | ------------------ | --------------- |
| `@effect/ai-anthropic/AnthropicTool.Bash_20241022`                             |   71 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.Bash_20250124`                             |  101 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.CodeExecutionProgrammaticToolCall (value)` |  134 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.CodeExecutionBashCommand (value)`          |  167 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.CodeExecutionTextEditorView (value)`       |  218 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.CodeExecutionTextEditorCreate (value)`     |  274 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.CodeExecutionTextEditorStrReplace (value)` |  313 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.CodeExecution_20250825_Parameters (value)` |  362 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.CodeExecution_20250522`                    |  411 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.CodeExecution_20250825`                    |  439 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.Coordinate (value)`                        |  486 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.Region (value)`                            |  515 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.ScrollDirection (value)`                   |  532 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.ModifierKey (value)`                       |  551 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseKeyAction (value)`              |  611 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseLeftClickAction (value)`        |  668 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseMouseMoveAction (value)`        |  707 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseScreenshotAction (value)`       |  740 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.TypeAction (value)`                        |  769 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseDoubleClickAction (value)`      |  826 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseLeftClickDragAction (value)`    |  922 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseMiddleClickAction (value)`      | 1020 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseRightClickAction (value)`       | 1057 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseScrollAction (value)`           | 1096 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseTripleClickAction (value)`      | 1145 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicTool.CodeExecutionProgrammaticToolCall (type)`  |  147 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.CodeExecutionBashCommand (type)`           |  197 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.CodeExecutionTextEditorView (type)`        |  251 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.CodeExecutionTextEditorCreate (type)`      |  292 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.CodeExecutionTextEditorStrReplace (type)`  |  335 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.CodeExecution_20250825_Parameters (type)`  |  386 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.Coordinate (type)`                         |  493 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.Region (type)`                             |  522 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ScrollDirection (type)`                    |  539 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ModifierKey (type)`                        |  562 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseKeyAction (type)`               |  640 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseLeftClickAction (type)`         |  682 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseMouseMoveAction (type)`         |  720 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseScreenshotAction (type)`        |  749 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.TypeAction (type)`                         |  787 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseDoubleClickAction (type)`       |  840 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseHoldKeyAction (value)`          |  867 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseHoldKeyAction (type)`           |  895 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseLeftClickDragAction (type)`     |  939 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseLeftMouseDownAction (value)`    |  952 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseLeftMouseDownAction (type)`     |  966 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseLeftMouseUpAction (value)`      |  979 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseLeftMouseUpAction (type)`       |  993 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseMiddleClickAction (type)`       | 1034 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseRightClickAction (type)`        | 1071 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseScrollAction (type)`            | 1118 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseTripleClickAction (type)`       | 1159 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseWaitAction (value)`             | 1185 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseWaitAction (type)`              | 1198 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseZoomAction (value)`             | 1241 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUseZoomAction (type)`              | 1261 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUse_20241022`                      | 1283 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUse_20250124`                      | 1314 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ComputerUse_20251124`                      | 1348 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ViewRange (value)`                         | 1386 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ViewRange (type)`                          | 1397 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.MemoryCreateCommand (value)`               | 1414 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.MemoryCreateCommand (type)`                | 1431 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.MemoryDeleteCommand (value)`               | 1439 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.MemoryDeleteCommand (type)`                | 1452 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.MemoryInsertCommand (value)`               | 1472 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.MemoryInsertCommand (type)`                | 1493 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.MemoryRenameCommand (value)`               | 1506 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.MemoryRenameCommand (type)`                | 1523 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.MemoryStrReplaceCommand (value)`           | 1543 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.MemoryStrReplaceCommand (type)`            | 1564 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.MemoryViewCommand (value)`                 | 1577 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.MemoryViewCommand (type)`                  | 1594 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.Memory_20250818`                           | 1620 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.TextEditorViewCommand (value)`             | 1657 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.TextEditorViewCommand (type)`              | 1680 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.TextEditorCreateCommand (value)`           | 1702 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.TextEditorCreateCommand (type)`            | 1728 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.TextEditorStrReplaceCommand (value)`       | 1754 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.TextEditorStrReplaceCommand (type)`        | 1785 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.TextEditorInsertCommand (value)`           | 1798 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.TextEditorInsertCommand (type)`            | 1819 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.TextEditorUndoEditCommand (value)`         | 1838 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.TextEditorUndoEditCommand (type)`          | 1856 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.TextEditor_20241022`                       | 1908 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.TextEditor_20250124`                       | 1936 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.TextEditor_20250429`                       | 1967 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.TextEditor_20250728`                       | 1992 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.WebSearchUserLocation`                     | 2029 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.WebSearch_20250305_Args (value)`           | 2079 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.WebSearch_20250305_Args (type)`            | 2111 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.WebSearchParameters (value)`               | 2130 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.WebSearchParameters (type)`                | 2148 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.WebSearch_20250305`                        | 2172 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.WebFetchCitationsConfig (value)`           | 2207 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.WebFetchCitationsConfig (type)`            | 2231 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.WebFetch_20250910_Args (value)`            | 2262 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.WebFetch_20250910_Args (type)`             | 2305 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.WebFetchParameters (value)`                | 2333 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.WebFetchParameters (type)`                 | 2360 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.WebFetch_20250910`                         | 2385 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ToolSearchRegexParameters (value)`         | 2414 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ToolSearchRegexParameters (type)`          | 2431 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ToolSearchBM25Parameters (value)`          | 2451 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ToolSearchBM25Parameters (type)`           | 2463 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ToolSearchRegex_20251119`                  | 2482 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.ToolSearchBM25_20251119`                   | 2511 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicTool.AnthropicTool`                             |   31 | `root-declaration` | **optional**    |

## Recommended

### `@effect/ai-anthropic/AnthropicTool.Bash_20241022`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:71`
- **Kind / category:** `root-declaration` / `Bash`
- **Priority:** **recommended**
- **Current description:** Defines the Anthropic Bash tool (2024-10-22 version).
- **Signature hint:** `declare function Bash_20241022<Mode extends Tool.FailureMode | undefined = undefined>(args: { readonly failureMode?: Mode | undefined; }): Tool.ProviderDefined<'anthropic.bash_20241022', 'AnthropicBash', { readonly args: Schema.Void; readonly parameters: Schema.Struct<{ readonly command: Schema.String; readonly restart: Schema.optionalKey<Schema.Boolean>; }>; readonly success: Schema.String; readonly failure: Schema.Never; readonly failureMode: Mode extends undefined ? 'error' : Mode; }, true>`
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.Bash_20241022`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Defines the Anthropic Bash tool (2024-10-22 version). Call `AnthropicTool.Bash_20241022` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.Bash_20250124`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:101`
- **Kind / category:** `root-declaration` / `Bash`
- **Priority:** **recommended**
- **Current description:** Defines the Anthropic Bash tool (2025-01-24 version).
- **Signature hint:** `declare function Bash_20250124<Mode extends Tool.FailureMode | undefined = undefined>(args: { readonly failureMode?: Mode | undefined; }): Tool.ProviderDefined<'anthropic.bash_20250124', 'AnthropicBash', { readonly args: Schema.Void; readonly parameters: Schema.Struct<{ readonly command: Schema.String; readonly restart: Schema.optionalKey<Schema.Boolean>; }>; readonly success: Schema.String; readonly failure: Schema.Never; readonly failureMode: Mode extends undefined ? 'error' : Mode; }, true>`
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.Bash_20250124`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Defines the Anthropic Bash tool (2025-01-24 version). Call `AnthropicTool.Bash_20250124` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.CodeExecutionProgrammaticToolCall (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:134`
- **Kind / category:** `root-declaration` / `Code Execution`
- **Priority:** **recommended**
- **Current description:** Schema for a code execution request that asks Anthropic to run source code as a programmatic tool call.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.CodeExecutionProgrammaticToolCall`.
- **Suggested snippet:** Use `AnthropicTool.CodeExecutionProgrammaticToolCall` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.CodeExecutionBashCommand (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:167`
- **Kind / category:** `root-declaration` / `Code Execution`
- **Priority:** **recommended**
- **Current description:** Schema for the `bash_code_execution` input variant of Anthropic Code Execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.CodeExecutionBashCommand`.
- **Suggested snippet:** Use `AnthropicTool.CodeExecutionBashCommand` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.CodeExecutionTextEditorView (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:218`
- **Kind / category:** `root-declaration` / `Code Execution`
- **Priority:** **recommended**
- **Current description:** Schema for a code execution text editor request that views a file by path.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.CodeExecutionTextEditorView`.
- **Suggested snippet:** Use `AnthropicTool.CodeExecutionTextEditorView` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.CodeExecutionTextEditorCreate (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:274`
- **Kind / category:** `root-declaration` / `Code Execution`
- **Priority:** **recommended**
- **Current description:** Schema for a text editor code execution request that creates a file at a path.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.CodeExecutionTextEditorCreate`.
- **Suggested snippet:** Use `AnthropicTool.CodeExecutionTextEditorCreate` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.CodeExecutionTextEditorStrReplace (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:313`
- **Kind / category:** `root-declaration` / `Code Execution`
- **Priority:** **recommended**
- **Current description:** Schema for a code execution text editor request that replaces one exact string in a file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.CodeExecutionTextEditorStrReplace`.
- **Suggested snippet:** Use `AnthropicTool.CodeExecutionTextEditorStrReplace` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.CodeExecution_20250825_Parameters (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:362`
- **Kind / category:** `root-declaration` / `Code Execution`
- **Priority:** **recommended**
- **Current description:** Schema for the 2025-08-25 code execution tool input, containing the code to execute.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.CodeExecution_20250825_Parameters`.
- **Suggested snippet:** Use `AnthropicTool.CodeExecution_20250825_Parameters` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.CodeExecution_20250522`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:411`
- **Kind / category:** `root-declaration` / `Code Execution`
- **Priority:** **recommended**
- **Current description:** Defines the Anthropic Code Execution tool (2025-05-22 version).
- **Signature hint:** `declare function CodeExecution_20250522<Mode extends Tool.FailureMode | undefined = undefined>(args: void): Tool.ProviderDefined<'anthropic.code_execution_20250522', 'AnthropicCodeExecution', { readonly args: Schema.Void; readonly parameters: Schema.Union<readonly [Schema.Struct<{ readonly type: Schema.Literal<'programmatic-tool-call'>; readonly code: Schema.String; }>, Schema.Struct<{ readonly type: Schema.Literal<'bash_code_execution'>; readonly command: Schema.String; }>, Schema.Struct<{ readonly type: Schema.Literal<'text_editor_code_execution'>; readonly command: Schema.Literal<'view'>; readonly path: Schema.String; }>, Schema.Struct<{ readonly type: Schema.Literal<'text_editor_code_execution'>; readonly command: Schema.Literal<'create'>; readonly path: Schema.String; readonly file_text: Schema.optional<Schema.NullOr<Schema.String>>; }>, Schema.Struct<{ readonly type: Schema.Literal<'text_editor_code_execution'>; readonly command: Schema.Literal<'str_replace'>; readonly path: Schema.String; readonly old_str: Schema.String; readonly new_str: Schema.String; }>]>; readonly success: Schema.Struct<{ readonly content: Schema.$Array<Schema.Struct<{ readonly file_id: Schema.String; readonly type: Schema.Literal<'code_execution_output'>; }>>; readonly return_code: Schema.Number; readonly stderr: Schema.String; readonly stdout: Schema.String; readonly type: Schema.Literal<'code_execution_result'>; }>; readonly failure: Schema.Struct<{ readonly error_code: Schema.Literals<readonly ['invalid_tool_input', 'unavailable', 'too_many_requests', 'execution_time_exceeded']>; readonly type: Schema.Literal<'code_execution_tool_result_error'>; }>; readonly failureMode: Mode extends undefined ? 'error' : Mode; }, false>`
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.CodeExecution_20250522`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Defines the Anthropic Code Execution tool (2025-05-22 version). Call `AnthropicTool.CodeExecution_20250522` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.CodeExecution_20250825`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:439`
- **Kind / category:** `root-declaration` / `Code Execution`
- **Priority:** **recommended**
- **Current description:** Defines the Anthropic Code Execution tool (2025-08-25 version).
- **Signature hint:** `declare function CodeExecution_20250825<Mode extends Tool.FailureMode | undefined = undefined>(args: void): Tool.ProviderDefined<'anthropic.code_execution_20250825', 'AnthropicCodeExecution', { readonly args: Schema.Void; readonly parameters: Schema.Struct<{ readonly code: Schema.String; }>; readonly success: Schema.Union<readonly [Schema.Struct<{ readonly content: Schema.$Array<Schema.Struct<{ readonly file_id: Schema.String; readonly type: Schema.Literal<'code_execution_output'>; }>>; readonly return_code: Schema.Number; readonly stderr: Schema.String; readonly stdout: Schema.String; readonly type: Schema.Literal<'code_execution_result'>; }>, Schema.Struct<{ readonly content: Schema.$Array<Schema.Struct<{ readonly file_id: Schema.String; readonly type: Schema.Literal<'bash_code_execution_output'>; }>>; readonly return_code: Schema.Number; readonly stderr: Schema.String; readonly stdout: Schema.String; readonly type: Schema.Literal<'bash_code_execution_result'>; }>, Schema.Struct<{ readonly content: Schema.String; readonly file_type: Schema.Literals<readonly ['text', 'image', 'pdf']>; readonly num_lines: Schema.Union<readonly [Schema.Number, Schema.Null]>; readonly start_line: Schema.Union<readonly [Schema.Number, Schema.Null]>; readonly total_lines: Schema.Union<readonly [Schema.Number, Schema.Null]>; readonly type: Schema.Literal<'text_editor_code_execution_view_result'>; }>, Schema.Struct<{ readonly is_file_update: Schema.Boolean; readonly type: Schema.Literal<'text_editor_code_execution_create_result'>; }>, Schema.Struct<{ readonly lines: Schema.Union<readonly [Schema.$Array<Schema.String>, Schema.Null]>; readonly new_lines: Schema.Union<readonly [Schema.Number, Schema.Null]>; readonly new_start: Schema.Union<readonly [Schema.Number, Schema.Null]>; readonly old_lines: Schema.Union<readonly [Schema.Number, Schema.Null]>; readonly old_start: Schema.Union<readonly [Schema.Number, Schema.Null]>; readonly type: Schema.Literal<'text_editor_code_execution_str_replace_result'>; }>]>; readonly failure: Schema.Union<readonly [Schema.Struct<{ readonly error_code: Schema.Literals<readonly ['invalid_tool_input', 'unavailable', 'too_many_requests', 'execution_time_exceeded']>; readonly type: Schema.Literal<'code_execution_tool_result_error'>; }>, Schema.Struct<{ readonly error_code: Schema.Literals<readonly ['invalid_tool_input', 'unavailable', 'too_many_requests', 'execution_time_exceeded', 'output_file_too_large']>; readonly type: Schema.Literal<'bash_code_execution_tool_result_error'>; }>, Schema.Struct<{ readonly error_code: Schema.Literals<readonly ['invalid_tool_input', 'unavailable', 'too_many_requests', 'execution_time_exceeded', 'file_not_found']>; readonly error_message: Schema.Union<readonly [Schema.String, Schema.Null]>; readonly type: Schema.Literal<'text_editor_code_execution_tool_result_error'>; }>]>; readonly failureMode: Mode extends undefined ? 'error' : Mode; }, false>`
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.CodeExecution_20250825`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Defines the Anthropic Code Execution tool (2025-08-25 version). Call `AnthropicTool.CodeExecution_20250825` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.Coordinate (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:486`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **recommended**
- **Current description:** Schema for an `[x, y]` screen coordinate in pixels.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.Coordinate`.
- **Suggested snippet:** Use `AnthropicTool.Coordinate` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.Region (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:515`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **recommended**
- **Current description:** Schema for an `[x1, y1, x2, y2]` screen region in pixels.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.Region`.
- **Suggested snippet:** Use `AnthropicTool.Region` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.ScrollDirection (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:532`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **recommended**
- **Current description:** Schema for scroll direction literals: `"up"`, `"down"`, `"left"`, or `"right"`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ScrollDirection`.
- **Suggested snippet:** Use `AnthropicTool.ScrollDirection` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.ModifierKey (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:551`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **recommended**
- **Current description:** Schema for modifier key literals.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ModifierKey`.
- **Suggested snippet:** Use `AnthropicTool.ModifierKey` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseKeyAction (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:611`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **recommended**
- **Current description:** Schema for a computer-use action that presses a key or key combination, such as `"Return"`, `"ctrl+c"`, or `"ctrl+s"`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ComputerUseKeyAction`.
- **Suggested snippet:** Use `AnthropicTool.ComputerUseKeyAction` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseLeftClickAction (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:668`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **recommended**
- **Current description:** Schema for a computer-use action that performs a left click.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ComputerUseLeftClickAction`.
- **Suggested snippet:** Use `AnthropicTool.ComputerUseLeftClickAction` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseMouseMoveAction (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:707`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **recommended**
- **Current description:** Schema for a computer-use action that moves the mouse cursor to a required `[x, y]` screen coordinate.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ComputerUseMouseMoveAction`.
- **Suggested snippet:** Use `AnthropicTool.ComputerUseMouseMoveAction` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseScreenshotAction (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:740`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **recommended**
- **Current description:** Schema for a computer-use action that requests a screenshot of the current display.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ComputerUseScreenshotAction`.
- **Suggested snippet:** Use `AnthropicTool.ComputerUseScreenshotAction` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.TypeAction (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:769`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **recommended**
- **Current description:** Schema for a computer-use action that enters text.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.TypeAction`.
- **Suggested snippet:** Use `AnthropicTool.TypeAction` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseDoubleClickAction (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:826`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **recommended**
- **Current description:** Schema for a computer-use action that performs a double click.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ComputerUseDoubleClickAction`.
- **Suggested snippet:** Use `AnthropicTool.ComputerUseDoubleClickAction` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseLeftClickDragAction (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:922`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **recommended**
- **Current description:** Schema for a computer-use action that drags with the left mouse button.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ComputerUseLeftClickDragAction`.
- **Suggested snippet:** Use `AnthropicTool.ComputerUseLeftClickDragAction` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseMiddleClickAction (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1020`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **recommended**
- **Current description:** Schema for a computer-use action that performs a middle click.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ComputerUseMiddleClickAction`.
- **Suggested snippet:** Use `AnthropicTool.ComputerUseMiddleClickAction` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseRightClickAction (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1057`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **recommended**
- **Current description:** Schema for a computer-use action that performs a right click, optionally at a specific screen coordinate.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ComputerUseRightClickAction`.
- **Suggested snippet:** Use `AnthropicTool.ComputerUseRightClickAction` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseScrollAction (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1096`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **recommended**
- **Current description:** Schema for a computer-use scroll action.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ComputerUseScrollAction`.
- **Suggested snippet:** Use `AnthropicTool.ComputerUseScrollAction` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseTripleClickAction (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1145`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **recommended**
- **Current description:** Schema for a computer-use triple-click action.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ComputerUseTripleClickAction`.
- **Suggested snippet:** Use `AnthropicTool.ComputerUseTripleClickAction` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/ai-anthropic/AnthropicTool.CodeExecutionProgrammaticToolCall (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:147`
- **Kind / category:** `root-declaration` / `Code Execution`
- **Priority:** **optional**
- **Current description:** Input payload for a programmatic code execution tool call, including the source code to execute.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.CodeExecutionProgrammaticToolCall`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.CodeExecutionBashCommand (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:197`
- **Kind / category:** `root-declaration` / `Code Execution`
- **Priority:** **optional**
- **Current description:** Input payload for a bash command routed through the Anthropic code execution tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.CodeExecutionBashCommand`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.CodeExecutionTextEditorView (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:251`
- **Kind / category:** `root-declaration` / `Code Execution`
- **Priority:** **optional**
- **Current description:** Input payload for the `view` command of Anthropic's text editor code execution tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.CodeExecutionTextEditorView`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.CodeExecutionTextEditorCreate (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:292`
- **Kind / category:** `root-declaration` / `Code Execution`
- **Priority:** **optional**
- **Current description:** Input payload for creating a file through the text editor code execution tool, optionally including initial file text.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.CodeExecutionTextEditorCreate`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.CodeExecutionTextEditorStrReplace (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:335`
- **Kind / category:** `root-declaration` / `Code Execution`
- **Priority:** **optional**
- **Current description:** Input payload for replacing text in a file through the text editor code execution tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.CodeExecutionTextEditorStrReplace`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.CodeExecution_20250825_Parameters (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:386`
- **Kind / category:** `root-declaration` / `Code Execution`
- **Priority:** **optional**
- **Current description:** Input payload for the 2025-08-25 Anthropic code execution tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.CodeExecution_20250825_Parameters`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.Coordinate (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:493`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** An `[x, y]` screen coordinate in pixels.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.Coordinate`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.Region (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:522`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** An `[x1, y1, x2, y2]` screen region in pixels, from top-left to bottom-right.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.Region`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ScrollDirection (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:539`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Direction used by computer-use scroll actions: `"up"`, `"down"`, `"left"`, or `"right"`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.ScrollDirection`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ModifierKey (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:562`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Modifier key literals.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.ModifierKey`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseKeyAction (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:640`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Computer-use action payload for pressing a key or key combination.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.ComputerUseKeyAction`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseLeftClickAction (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:682`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Computer-use action payload for performing a left click, optionally at a specific coordinate.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.ComputerUseLeftClickAction`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseMouseMoveAction (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:720`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Computer-use action payload for moving the mouse cursor to a specific coordinate.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.ComputerUseMouseMoveAction`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseScreenshotAction (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:749`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Computer-use action payload for capturing the current display.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.ComputerUseScreenshotAction`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.TypeAction (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:787`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Computer-use action payload for typing a text string.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.TypeAction`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseDoubleClickAction (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:840`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Computer-use action payload for performing a double click, optionally at a specific coordinate.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.ComputerUseDoubleClickAction`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseHoldKeyAction (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:867`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Keeps a key pressed for a specified duration during computer-use execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ComputerUseHoldKeyAction`.
- **Suggested snippet:** Use `AnthropicTool.ComputerUseHoldKeyAction` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseHoldKeyAction (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:895`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Computer-use action payload for holding a key for a specified duration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.ComputerUseHoldKeyAction`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseLeftClickDragAction (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:939`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Computer-use action payload for dragging from a start coordinate to an end coordinate.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.ComputerUseLeftClickDragAction`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseLeftMouseDownAction (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:952`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Starts a left mouse button press without releasing it.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ComputerUseLeftMouseDownAction`.
- **Suggested snippet:** Use `AnthropicTool.ComputerUseLeftMouseDownAction` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseLeftMouseDownAction (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:966`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Computer-use action payload for pressing and holding the left mouse button, optionally at a specific coordinate.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.ComputerUseLeftMouseDownAction`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseLeftMouseUpAction (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:979`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Releases the left mouse button.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ComputerUseLeftMouseUpAction`.
- **Suggested snippet:** Use `AnthropicTool.ComputerUseLeftMouseUpAction` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseLeftMouseUpAction (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:993`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Computer-use action payload for releasing the left mouse button, optionally at a specific coordinate.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.ComputerUseLeftMouseUpAction`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseMiddleClickAction (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1034`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Computer-use action payload for performing a middle click, optionally at a specific coordinate.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.ComputerUseMiddleClickAction`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseRightClickAction (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1071`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Computer-use action payload for performing a right click, optionally at a specific coordinate.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.ComputerUseRightClickAction`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseScrollAction (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1118`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Computer-use action payload for scrolling by a specified amount in a specified direction, optionally from a coordinate.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.ComputerUseScrollAction`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseTripleClickAction (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1159`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Computer-use action payload for performing a triple click, optionally at a specific coordinate.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.ComputerUseTripleClickAction`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseWaitAction (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1185`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Schema for a computer-use wait action.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ComputerUseWaitAction`.
- **Suggested snippet:** Use `AnthropicTool.ComputerUseWaitAction` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseWaitAction (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1198`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Computer-use action payload for pausing for a specified duration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.ComputerUseWaitAction`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseZoomAction (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1241`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Zooms into a specific region of the screen at full resolution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ComputerUseZoomAction`.
- **Suggested snippet:** Use `AnthropicTool.ComputerUseZoomAction` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUseZoomAction (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1261`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Computer-use action payload for zooming into a specific screen region.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.ComputerUseZoomAction`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUse_20241022`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1283`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Defines the deprecated computer-use tool for Claude 3.5 Sonnet v2.
- **Signature hint:** `declare function ComputerUse_20241022<Mode extends Tool.FailureMode | undefined = undefined>(args: { readonly displayWidthPx: number; readonly displayHeightPx: number; readonly displayNumber?: number | undefined; readonly failureMode?: Mode | undefined; }): Tool.ProviderDefined<'anthropic.computer_use_20241022', 'AnthropicComputerUse', { readonly args: Schema.Struct<{ readonly displayWidthPx: Schema.Int; readonly displayHeightPx: Schema.Int; readonly displayNumber: Schema.optional<Schema.Int>; }>; readonly parameters: Schema.Union<readonly [Schema.Struct<{ readonly action: Schema.Literal<'key'>; readonly text: Schema.String; }>, Schema.Struct<{ readonly action: Schema.Literal<'left_click'>; readonly coordinate: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; }>, Schema.Struct<{ readonly action: Schema.Literal<'mouse_move'>; readonly coordinate: Schema.Tuple<readonly [Schema.Int, Schema.Int]>; }>, Schema.Struct<{ readonly action: Schema.Literal<'screenshot'>; }>, Schema.Struct<{ readonly action: Schema.Literal<'type'>; readonly text: Schema.String; }>]>; readonly success: Schema.String; readonly failure: Schema.Never; readonly failureMode: Mode extends undefined ? 'error' : Mode; }, true>`
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ComputerUse_20241022`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Defines the deprecated computer-use tool for Claude 3.5 Sonnet v2. Call `AnthropicTool.ComputerUse_20241022` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUse_20250124`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1314`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Defines the computer-use tool for Claude 4 models and Claude Sonnet 3.7.
- **Signature hint:** `declare function ComputerUse_20250124<Mode extends Tool.FailureMode | undefined = undefined>(args: { readonly displayWidthPx: number; readonly displayHeightPx: number; readonly displayNumber?: number | undefined; readonly failureMode?: Mode | undefined; }): Tool.ProviderDefined<'anthropic.computer_20250124', 'AnthropicComputerUse', { readonly args: Schema.Struct<{ readonly displayWidthPx: Schema.Int; readonly displayHeightPx: Schema.Int; readonly displayNumber: Schema.optional<Schema.Int>; }>; readonly parameters: Schema.Union<readonly [Schema.Struct<{ readonly action: Schema.Literal<'key'>; readonly text: Schema.String; }>, Schema.Struct<{ readonly action: Schema.Literal<'left_click'>; readonly coordinate: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; }>, Schema.Struct<{ readonly action: Schema.Literal<'mouse_move'>; readonly coordinate: Schema.Tuple<readonly [Schema.Int, Schema.Int]>; }>, Schema.Struct<{ readonly action: Schema.Literal<'screenshot'>; }>, Schema.Struct<{ readonly action: Schema.Literal<'type'>; readonly text: Schema.String; }>, Schema.Struct<{ readonly action: Schema.Literal<'double_click'>; readonly coordinate: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; }>, Schema.Struct<{ readonly action: Schema.Literal<'hold_key'>; readonly text: Schema.String; readonly duration: Schema.Finite; }>, Schema.Struct<{ readonly action: Schema.Literal<'left_click_drag'>; readonly start_coordinate: Schema.Tuple<readonly [Schema.Int, Schema.Int]>; readonly coordinate: Schema.Tuple<readonly [Schema.Int, Schema.Int]>; }>, Schema.Struct<{ readonly action: Schema.Literal<'left_mouse_down'>; readonly coordinate: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; }>, Schema.Struct<{ readonly action: Schema.Literal<'left_mouse_up'>; readonly coordinate: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; }>, Schema.Struct<{ readonly action: Schema.Literal<'middle_click'>; readonly coordinate: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; }>, Schema.Struct<{ readonly action: Schema.Literal<'right_click'>; readonly coordinate: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; }>, Schema.Struct<{ readonly action: Schema.Literal<'scroll'>; readonly coordinate: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; readonly scroll_direction: Schema.Literals<readonly ['up', 'down', 'left', 'right']>; readonly scroll_amount: Schema.Int; }>, Schema.Struct<{ readonly action: Schema.Literal<'triple_click'>; readonly coordinate: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; }>, Schema.Struct<{ readonly action: Schema.Literal<'wait'>; readonly duration: Schema.Finite; }>]>; readonly success: Schema.String; readonly failure: Schema.Never; readonly failureMode: Mode extends undefined ? 'error' : Mode; }, true>`
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ComputerUse_20250124`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Defines the computer-use tool for Claude 4 models and Claude Sonnet 3.7. Call `AnthropicTool.ComputerUse_20250124` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ComputerUse_20251124`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1348`
- **Kind / category:** `root-declaration` / `computer use`
- **Priority:** **optional**
- **Current description:** Defines the computer-use tool for Claude Opus 4.5 only.
- **Signature hint:** `declare function ComputerUse_20251124<Mode extends Tool.FailureMode | undefined = undefined>(args: { readonly displayWidthPx: number; readonly displayHeightPx: number; readonly displayNumber?: number | undefined; readonly enableZoom?: boolean | undefined; readonly failureMode?: Mode | undefined; }): Tool.ProviderDefined<'anthropic.computer_20251124', 'AnthropicComputerUse', { readonly args: Schema.Struct<{ readonly enableZoom: Schema.optional<Schema.Boolean>; readonly displayWidthPx: Schema.Int; readonly displayHeightPx: Schema.Int; readonly displayNumber: Schema.optional<Schema.Int>; }>; readonly parameters: Schema.Union<readonly [Schema.Struct<{ readonly action: Schema.Literal<'key'>; readonly text: Schema.String; }>, Schema.Struct<{ readonly action: Schema.Literal<'left_click'>; readonly coordinate: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; }>, Schema.Struct<{ readonly action: Schema.Literal<'mouse_move'>; readonly coordinate: Schema.Tuple<readonly [Schema.Int, Schema.Int]>; }>, Schema.Struct<{ readonly action: Schema.Literal<'screenshot'>; }>, Schema.Struct<{ readonly action: Schema.Literal<'type'>; readonly text: Schema.String; }>, Schema.Struct<{ readonly action: Schema.Literal<'double_click'>; readonly coordinate: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; }>, Schema.Struct<{ readonly action: Schema.Literal<'hold_key'>; readonly text: Schema.String; readonly duration: Schema.Finite; }>, Schema.Struct<{ readonly action: Schema.Literal<'left_click_drag'>; readonly start_coordinate: Schema.Tuple<readonly [Schema.Int, Schema.Int]>; readonly coordinate: Schema.Tuple<readonly [Schema.Int, Schema.Int]>; }>, Schema.Struct<{ readonly action: Schema.Literal<'left_mouse_down'>; readonly coordinate: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; }>, Schema.Struct<{ readonly action: Schema.Literal<'left_mouse_up'>; readonly coordinate: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; }>, Schema.Struct<{ readonly action: Schema.Literal<'middle_click'>; readonly coordinate: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; }>, Schema.Struct<{ readonly action: Schema.Literal<'right_click'>; readonly coordinate: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; }>, Schema.Struct<{ readonly action: Schema.Literal<'scroll'>; readonly coordinate: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; readonly scroll_direction: Schema.Literals<readonly ['up', 'down', 'left', 'right']>; readonly scroll_amount: Schema.Int; }>, Schema.Struct<{ readonly action: Schema.Literal<'triple_click'>; readonly coordinate: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; }>, Schema.Struct<{ readonly action: Schema.Literal<'wait'>; readonly duration: Schema.Finite; }>, Schema.Struct<{ readonly action: Schema.Literal<'zoom'>; readonly region: Schema.Tuple<readonly [Schema.Int, Schema.Int, Schema.Int, Schema.Int]>; }>]>; readonly success: Schema.String; readonly failure: Schema.Never; readonly failureMode: Mode extends undefined ? 'error' : Mode; }, true>`
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ComputerUse_20251124`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Defines the computer-use tool for Claude Opus 4.5 only. Call `AnthropicTool.ComputerUse_20251124` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ViewRange (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1386`
- **Kind / category:** `root-declaration` / `memory`
- **Priority:** **optional**
- **Current description:** Defines a `[start, end]` line range for viewing file contents.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ViewRange`.
- **Suggested snippet:** Use `AnthropicTool.ViewRange` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ViewRange (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1397`
- **Kind / category:** `root-declaration` / `memory`
- **Priority:** **optional**
- **Current description:** A `[start, end]` 1-indexed line range for viewing file contents, using `-1` as the end value to read through the end of the file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.ViewRange`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.MemoryCreateCommand (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1414`
- **Kind / category:** `root-declaration` / `memory`
- **Priority:** **optional**
- **Current description:** Schema for the memory tool command that creates a new file at a path.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.MemoryCreateCommand`.
- **Suggested snippet:** Use `AnthropicTool.MemoryCreateCommand` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.MemoryCreateCommand (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1431`
- **Kind / category:** `root-declaration` / `memory`
- **Priority:** **optional**
- **Current description:** Memory tool command payload for creating a new file at a path.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.MemoryCreateCommand`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.MemoryDeleteCommand (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1439`
- **Kind / category:** `root-declaration` / `memory`
- **Priority:** **optional**
- **Current description:** Schema for a memory command that deletes a file or directory.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.MemoryDeleteCommand`.
- **Suggested snippet:** Use `AnthropicTool.MemoryDeleteCommand` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.MemoryDeleteCommand (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1452`
- **Kind / category:** `root-declaration` / `memory`
- **Priority:** **optional**
- **Current description:** Memory tool command payload for deleting a file or directory at a path.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.MemoryDeleteCommand`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.MemoryInsertCommand (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1472`
- **Kind / category:** `root-declaration` / `memory`
- **Priority:** **optional**
- **Current description:** Schema for the memory `insert` command.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.MemoryInsertCommand`.
- **Suggested snippet:** Use `AnthropicTool.MemoryInsertCommand` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.MemoryInsertCommand (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1493`
- **Kind / category:** `root-declaration` / `memory`
- **Priority:** **optional**
- **Current description:** Memory tool command payload for inserting text at a specific line in a file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.MemoryInsertCommand`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.MemoryRenameCommand (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1506`
- **Kind / category:** `root-declaration` / `memory`
- **Priority:** **optional**
- **Current description:** Schema for the memory command that renames or moves a file or directory.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.MemoryRenameCommand`.
- **Suggested snippet:** Use `AnthropicTool.MemoryRenameCommand` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.MemoryRenameCommand (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1523`
- **Kind / category:** `root-declaration` / `memory`
- **Priority:** **optional**
- **Current description:** Memory tool command payload for renaming or moving a file or directory.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.MemoryRenameCommand`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.MemoryStrReplaceCommand (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1543`
- **Kind / category:** `root-declaration` / `memory`
- **Priority:** **optional**
- **Current description:** Schema for the memory `str_replace` command.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.MemoryStrReplaceCommand`.
- **Suggested snippet:** Use `AnthropicTool.MemoryStrReplaceCommand` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.MemoryStrReplaceCommand (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1564`
- **Kind / category:** `root-declaration` / `memory`
- **Priority:** **optional**
- **Current description:** Memory tool command payload for replacing text in a file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.MemoryStrReplaceCommand`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.MemoryViewCommand (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1577`
- **Kind / category:** `root-declaration` / `memory`
- **Priority:** **optional**
- **Current description:** Shows directory contents or file contents with optional line ranges.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.MemoryViewCommand`.
- **Suggested snippet:** Use `AnthropicTool.MemoryViewCommand` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.MemoryViewCommand (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1594`
- **Kind / category:** `root-declaration` / `memory`
- **Priority:** **optional**
- **Current description:** Memory tool command payload for viewing a file or directory, optionally with a file line range.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.MemoryViewCommand`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.Memory_20250818`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1620`
- **Kind / category:** `root-declaration` / `memory`
- **Priority:** **optional**
- **Current description:** Defines the memory tool for persistent file operations across conversations.
- **Signature hint:** `declare function Memory_20250818<Mode extends Tool.FailureMode | undefined = undefined>(args: { readonly failureMode?: Mode | undefined; }): Tool.ProviderDefined<'anthropic.memory_20250818', 'AnthropicMemory', { readonly args: Schema.Void; readonly parameters: Schema.Union<readonly [Schema.Struct<{ readonly command: Schema.Literal<'create'>; readonly path: Schema.String; readonly file_text: Schema.String; }>, Schema.Struct<{ readonly command: Schema.Literal<'delete'>; readonly path: Schema.String; }>, Schema.Struct<{ readonly command: Schema.Literal<'insert'>; readonly path: Schema.String; readonly insert_line: Schema.Int; readonly insert_text: Schema.String; }>, Schema.Struct<{ readonly command: Schema.Literal<'rename'>; readonly old_path: Schema.String; readonly new_path: Schema.String; }>, Schema.Struct<{ readonly command: Schema.Literal<'str_replace'>; readonly path: Schema.String; readonly old_str: Schema.String; readonly new_str: Schema.String; }>, Schema.Struct<{ readonly command: Schema.Literal<'view'>; readonly path: Schema.String; readonly view_range: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; }>]>; readonly success: Schema.String; readonly failure: Schema.Never; readonly failureMode: Mode extends undefined ? 'error' : Mode; }, true>`
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.Memory_20250818`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Defines the memory tool for persistent file operations across conversations. Call `AnthropicTool.Memory_20250818` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.TextEditorViewCommand (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1657`
- **Kind / category:** `root-declaration` / `text editor`
- **Priority:** **optional**
- **Current description:** Reads the contents of a file or lists directory contents.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.TextEditorViewCommand`.
- **Suggested snippet:** Use `AnthropicTool.TextEditorViewCommand` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.TextEditorViewCommand (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1680`
- **Kind / category:** `root-declaration` / `text editor`
- **Priority:** **optional**
- **Current description:** Text editor command payload for viewing file contents or listing directory contents.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.TextEditorViewCommand`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.TextEditorCreateCommand (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1702`
- **Kind / category:** `root-declaration` / `text editor`
- **Priority:** **optional**
- **Current description:** Create a new file with specified content.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.TextEditorCreateCommand`.
- **Suggested snippet:** Use `AnthropicTool.TextEditorCreateCommand` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.TextEditorCreateCommand (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1728`
- **Kind / category:** `root-declaration` / `text editor`
- **Priority:** **optional**
- **Current description:** Text editor command payload for creating a new file with the specified content.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.TextEditorCreateCommand`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.TextEditorStrReplaceCommand (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1754`
- **Kind / category:** `root-declaration` / `text editor`
- **Priority:** **optional**
- **Current description:** Replaces a specific string in a file with a new string.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.TextEditorStrReplaceCommand`.
- **Suggested snippet:** Use `AnthropicTool.TextEditorStrReplaceCommand` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.TextEditorStrReplaceCommand (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1785`
- **Kind / category:** `root-declaration` / `text editor`
- **Priority:** **optional**
- **Current description:** Text editor command payload for replacing one exact, unique string in a file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.TextEditorStrReplaceCommand`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.TextEditorInsertCommand (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1798`
- **Kind / category:** `root-declaration` / `text editor`
- **Priority:** **optional**
- **Current description:** Inserts text at a specific line number in a file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.TextEditorInsertCommand`.
- **Suggested snippet:** Use `AnthropicTool.TextEditorInsertCommand` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.TextEditorInsertCommand (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1819`
- **Kind / category:** `root-declaration` / `text editor`
- **Priority:** **optional**
- **Current description:** Text editor command payload for inserting text after a specific line number in a file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.TextEditorInsertCommand`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.TextEditorUndoEditCommand (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1838`
- **Kind / category:** `root-declaration` / `text editor`
- **Priority:** **optional**
- **Current description:** Undoes the last edit made to a file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.TextEditorUndoEditCommand`.
- **Suggested snippet:** Use `AnthropicTool.TextEditorUndoEditCommand` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.TextEditorUndoEditCommand (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1856`
- **Kind / category:** `root-declaration` / `text editor`
- **Priority:** **optional**
- **Current description:** Text editor command payload for undoing the most recent edit to a file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.TextEditorUndoEditCommand`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.TextEditor_20241022`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1908`
- **Kind / category:** `root-declaration` / `text editor`
- **Priority:** **optional**
- **Current description:** Defines the deprecated text editor tool for Claude 3.5 Sonnet.
- **Signature hint:** `declare function TextEditor_20241022<Mode extends Tool.FailureMode | undefined = undefined>(args: { readonly failureMode?: Mode | undefined; }): Tool.ProviderDefined<'anthropic.text_editor_20241022', 'AnthropicTextEditor', { readonly args: Schema.Void; readonly parameters: Schema.Union<readonly [Schema.Struct<{ readonly command: Schema.Literal<'view'>; readonly path: Schema.String; readonly view_range: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; }>, Schema.Struct<{ readonly command: Schema.Literal<'create'>; readonly path: Schema.String; readonly file_text: Schema.String; }>, Schema.Struct<{ readonly command: Schema.Literal<'str_replace'>; readonly path: Schema.String; readonly old_str: Schema.String; readonly new_str: Schema.String; }>, Schema.Struct<{ readonly command: Schema.Literal<'insert'>; readonly path: Schema.String; readonly insert_line: Schema.Int; readonly new_str: Schema.String; }>, Schema.Struct<{ readonly command: Schema.Literal<'undo_edit'>; readonly path: Schema.String; }>]>; readonly success: Schema.String; readonly failure: Schema.Never; readonly failureMode: Mode extends undefined ? 'error' : Mode; }, true>`
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.TextEditor_20241022`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Defines the deprecated text editor tool for Claude 3.5 Sonnet. Call `AnthropicTool.TextEditor_20241022` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.TextEditor_20250124`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1936`
- **Kind / category:** `root-declaration` / `text editor`
- **Priority:** **optional**
- **Current description:** Defines the text editor tool for deprecated Claude Sonnet 3.7.
- **Signature hint:** `declare function TextEditor_20250124<Mode extends Tool.FailureMode | undefined = undefined>(args: { readonly failureMode?: Mode | undefined; }): Tool.ProviderDefined<'anthropic.text_editor_20250124', 'AnthropicTextEditor', { readonly args: Schema.Void; readonly parameters: Schema.Union<readonly [Schema.Struct<{ readonly command: Schema.Literal<'view'>; readonly path: Schema.String; readonly view_range: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; }>, Schema.Struct<{ readonly command: Schema.Literal<'create'>; readonly path: Schema.String; readonly file_text: Schema.String; }>, Schema.Struct<{ readonly command: Schema.Literal<'str_replace'>; readonly path: Schema.String; readonly old_str: Schema.String; readonly new_str: Schema.String; }>, Schema.Struct<{ readonly command: Schema.Literal<'insert'>; readonly path: Schema.String; readonly insert_line: Schema.Int; readonly new_str: Schema.String; }>, Schema.Struct<{ readonly command: Schema.Literal<'undo_edit'>; readonly path: Schema.String; }>]>; readonly success: Schema.String; readonly failure: Schema.Never; readonly failureMode: Mode extends undefined ? 'error' : Mode; }, true>`
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.TextEditor_20250124`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Defines the text editor tool for deprecated Claude Sonnet 3.7. Call `AnthropicTool.TextEditor_20250124` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.TextEditor_20250429`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1967`
- **Kind / category:** `root-declaration` / `text editor`
- **Priority:** **optional**
- **Current description:** Defines the text editor tool for Claude 4 models using Anthropic's `str_replace_based_edit_tool`.
- **Signature hint:** `declare function TextEditor_20250429<Mode extends Tool.FailureMode | undefined = undefined>(args: { readonly max_characters?: number | undefined; readonly failureMode?: Mode | undefined; }): Tool.ProviderDefined<'anthropic.text_editor_20250429', 'AnthropicTextEditor', { readonly args: Schema.Struct<{ readonly max_characters: Schema.optional<Schema.Int>; }>; readonly parameters: Schema.Union<readonly [Schema.Struct<{ readonly command: Schema.Literal<'view'>; readonly path: Schema.String; readonly view_range: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; }>, Schema.Struct<{ readonly command: Schema.Literal<'create'>; readonly path: Schema.String; readonly file_text: Schema.String; }>, Schema.Struct<{ readonly command: Schema.Literal<'str_replace'>; readonly path: Schema.String; readonly old_str: Schema.String; readonly new_str: Schema.String; }>, Schema.Struct<{ readonly command: Schema.Literal<'insert'>; readonly path: Schema.String; readonly insert_line: Schema.Int; readonly new_str: Schema.String; }>]>; readonly success: Schema.String; readonly failure: Schema.Never; readonly failureMode: Mode extends undefined ? 'error' : Mode; }, true>`
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.TextEditor_20250429`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Defines the text editor tool for Claude 4 models using Anthropic's `str_replace_based_edit_tool`. Call `AnthropicTool.TextEditor_20250429` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.TextEditor_20250728`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:1992`
- **Kind / category:** `root-declaration` / `text editor`
- **Priority:** **optional**
- **Current description:** Defines the text editor tool for Claude 4 models.
- **Signature hint:** `declare function TextEditor_20250728<Mode extends Tool.FailureMode | undefined = undefined>(args: { readonly max_characters?: number | undefined; readonly failureMode?: Mode | undefined; }): Tool.ProviderDefined<'anthropic.text_editor_20250728', 'AnthropicTextEditor', { readonly args: Schema.Struct<{ readonly max_characters: Schema.optional<Schema.Int>; }>; readonly parameters: Schema.Union<readonly [Schema.Struct<{ readonly command: Schema.Literal<'view'>; readonly path: Schema.String; readonly view_range: Schema.optionalKey<Schema.Tuple<readonly [Schema.Int, Schema.Int]>>; }>, Schema.Struct<{ readonly command: Schema.Literal<'create'>; readonly path: Schema.String; readonly file_text: Schema.String; }>, Schema.Struct<{ readonly command: Schema.Literal<'str_replace'>; readonly path: Schema.String; readonly old_str: Schema.String; readonly new_str: Schema.String; }>, Schema.Struct<{ readonly command: Schema.Literal<'insert'>; readonly path: Schema.String; readonly insert_line: Schema.Int; readonly new_str: Schema.String; }>]>; readonly success: Schema.String; readonly failure: Schema.Never; readonly failureMode: Mode extends undefined ? 'error' : Mode; }, true>`
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.TextEditor_20250728`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Defines the text editor tool for Claude 4 models. Call `AnthropicTool.TextEditor_20250728` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.WebSearchUserLocation`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:2029`
- **Kind / category:** `root-declaration` / `Web Search`
- **Priority:** **optional**
- **Current description:** Describes user location for localizing search results.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.WebSearchUserLocation`.
- **Suggested snippet:** Use `AnthropicTool.WebSearchUserLocation` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.WebSearch_20250305_Args (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:2079`
- **Kind / category:** `root-declaration` / `Web Search`
- **Priority:** **optional**
- **Current description:** Defines configuration arguments for the web search tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.WebSearch_20250305_Args`.
- **Suggested snippet:** Use `AnthropicTool.WebSearch_20250305_Args` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.WebSearch_20250305_Args (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:2111`
- **Kind / category:** `root-declaration` / `Web Search`
- **Priority:** **optional**
- **Current description:** Configuration arguments for the Anthropic web search tool, including usage limits, domain filters, and optional user location.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.WebSearch_20250305_Args`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.WebSearchParameters (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:2130`
- **Kind / category:** `root-declaration` / `Web Search`
- **Priority:** **optional**
- **Current description:** Schema for Claude-supplied web search tool parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.WebSearchParameters`.
- **Suggested snippet:** Use `AnthropicTool.WebSearchParameters` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.WebSearchParameters (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:2148`
- **Kind / category:** `root-declaration` / `Web Search`
- **Priority:** **optional**
- **Current description:** Type of the parameters Claude supplies when invoking the Anthropic web search tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.WebSearchParameters`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.WebSearch_20250305`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:2172`
- **Kind / category:** `root-declaration` / `Web Search`
- **Priority:** **optional**
- **Current description:** Defines the web search tool for Claude models.
- **Signature hint:** `declare function WebSearch_20250305<Mode extends Tool.FailureMode | undefined = undefined>(args: { readonly maxUses?: number | undefined; readonly allowedDomains?: readonly string[] | undefined; readonly blockedDomains?: readonly string[] | undefined; readonly userLocation?: { readonly type: 'approximate'; readonly city?: string | undefined; readonly country?: string | undefined; readonly region?: string | undefined; readonly timezone?: string | undefined; } | undefined; }): Tool.ProviderDefined<'anthropic.web_search_20250305', 'AnthropicWebSearch', { readonly args: Schema.Struct<{ readonly maxUses: Schema.optional<Schema.Int>; readonly allowedDomains: Schema.optional<Schema.$Array<Schema.String>>; readonly blockedDomains: Schema.optional<Schema.$Array<Schema.String>>; readonly userLocation: Schema.optional<Schema.Struct<{ readonly type: Schema.Literal<'approximate'>; readonly city: Schema.optional<Schema.String>; readonly region: Schema.optional<Schema.String>; readonly country: Schema.optional<Schema.String>; readonly timezone: Schema.optional<Schema.String>; }>>; }>; readonly parameters: Schema.Struct<{ readonly query: Schema.String; }>; readonly success: Schema.$Array<Schema.Struct<{ readonly encrypted_content: Schema.String; readonly page_age: Schema.Union<readonly [Schema.String, Schema.Null]>; readonly title: Schema.String; readonly type: Schema.Literal<'web_search_result'>; readonly url: Schema.String; }>>; readonly failure: Schema.Struct<{ readonly error_code: Schema.Literals<readonly ['invalid_tool_input', 'unavailable', 'max_uses_exceeded', 'too_many_requests', 'query_too_long', 'request_too_large']>; readonly type: Schema.Literal<'web_search_tool_result_error'>; }>; readonly failureMode: Mode extends undefined ? 'error' : Mode; }, false>`
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.WebSearch_20250305`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Defines the web search tool for Claude models. Call `AnthropicTool.WebSearch_20250305` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.WebFetchCitationsConfig (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:2207`
- **Kind / category:** `root-declaration` / `Web Fetch`
- **Priority:** **optional**
- **Current description:** Defines citation configuration for web fetch.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.WebFetchCitationsConfig`.
- **Suggested snippet:** Use `AnthropicTool.WebFetchCitationsConfig` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.WebFetchCitationsConfig (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:2231`
- **Kind / category:** `root-declaration` / `Web Fetch`
- **Priority:** **optional**
- **Current description:** Configuration payload for enabling or disabling citations on web fetch results.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.WebFetchCitationsConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.WebFetch_20250910_Args (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:2262`
- **Kind / category:** `root-declaration` / `Web Fetch`
- **Priority:** **optional**
- **Current description:** Defines configuration arguments for the web fetch tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.WebFetch_20250910_Args`.
- **Suggested snippet:** Use `AnthropicTool.WebFetch_20250910_Args` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.WebFetch_20250910_Args (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:2305`
- **Kind / category:** `root-declaration` / `Web Fetch`
- **Priority:** **optional**
- **Current description:** Configuration arguments for the Anthropic web fetch tool, including usage limits, domain filters, citation settings, and token limits.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.WebFetch_20250910_Args`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.WebFetchParameters (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:2333`
- **Kind / category:** `root-declaration` / `Web Fetch`
- **Priority:** **optional**
- **Current description:** Schema for Claude-supplied web fetch parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.WebFetchParameters`.
- **Suggested snippet:** Use `AnthropicTool.WebFetchParameters` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.WebFetchParameters (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:2360`
- **Kind / category:** `root-declaration` / `Web Fetch`
- **Priority:** **optional**
- **Current description:** Type of the parameters Claude supplies when invoking the Anthropic web fetch tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.WebFetchParameters`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.WebFetch_20250910`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:2385`
- **Kind / category:** `root-declaration` / `Web Fetch`
- **Priority:** **optional**
- **Current description:** Defines the web fetch tool for Claude models.
- **Signature hint:** `declare function WebFetch_20250910<Mode extends Tool.FailureMode | undefined = undefined>(args: { readonly citations?: { readonly enabled: boolean; } | undefined; readonly maxUses?: number | undefined; readonly allowedDomains?: readonly string[] | undefined; readonly blockedDomains?: readonly string[] | undefined; readonly maxContentTokens?: number | undefined; }): Tool.ProviderDefined<'anthropic.web_fetch_20250910', 'AnthropicWebFetch', { readonly args: Schema.Struct<{ readonly maxUses: Schema.optional<Schema.Int>; readonly allowedDomains: Schema.optional<Schema.$Array<Schema.String>>; readonly blockedDomains: Schema.optional<Schema.$Array<Schema.String>>; readonly citations: Schema.optional<Schema.Struct<{ readonly enabled: Schema.Boolean; }>>; readonly maxContentTokens: Schema.optional<Schema.Int>; }>; readonly parameters: Schema.Struct<{ readonly url: Schema.String; }>; readonly success: Schema.Struct<{ readonly content: Schema.Struct<{ readonly citations: Schema.Union<readonly [Schema.Struct<{ readonly enabled: Schema.Boolean; }>, Schema.Null]>; readonly source: Schema.Union<readonly [Schema.Struct<{ readonly data: Schema.String; readonly media_type: Schema.Literal<'application/pdf'>; readonly type: Schema.Literal<'base64'>; }>, Schema.Struct<{ readonly data: Schema.String; readonly media_type: Schema.Literal<'text/plain'>; readonly type: Schema.Literal<'text'>; }>]>; readonly title: Schema.Union<readonly [Schema.String, Schema.Null]>; readonly type: Schema.Literal<'document'>; }>; readonly retrieved_at: Schema.Union<readonly [Schema.String, Schema.Null]>; readonly type: Schema.Literal<'web_fetch_result'>; readonly url: Schema.String; }>; readonly failure: Schema.Struct<{ readonly error_code: Schema.Literals<readonly ['invalid_tool_input', 'url_too_long', 'url_not_allowed', 'url_not_accessible', 'unsupported_content_type', 'too_many_requests', 'max_uses_exceeded', 'unavailable']>; readonly type: Schema.Literal<'web_fetch_tool_result_error'>; }>; readonly failureMode: Mode extends undefined ? 'error' : Mode; }, false>`
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.WebFetch_20250910`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Defines the web fetch tool for Claude models. Call `AnthropicTool.WebFetch_20250910` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ToolSearchRegexParameters (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:2414`
- **Kind / category:** `root-declaration` / `tool search`
- **Priority:** **optional**
- **Current description:** Schema for regex-based tool search input parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ToolSearchRegexParameters`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `AnthropicTool.ToolSearchRegexParameters`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ToolSearchRegexParameters (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:2431`
- **Kind / category:** `root-declaration` / `tool search`
- **Priority:** **optional**
- **Current description:** Type of the parameters Claude supplies when invoking regex-based Anthropic tool search.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.ToolSearchRegexParameters`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ToolSearchBM25Parameters (value)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:2451`
- **Kind / category:** `root-declaration` / `tool search`
- **Priority:** **optional**
- **Current description:** Defines input parameters for BM25/natural language tool search.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ToolSearchBM25Parameters`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `AnthropicTool.ToolSearchBM25Parameters`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ToolSearchBM25Parameters (type)`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:2463`
- **Kind / category:** `root-declaration` / `tool search`
- **Priority:** **optional**
- **Current description:** Type of the parameters Claude supplies when invoking BM25 natural-language Anthropic tool search.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.ToolSearchBM25Parameters`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ToolSearchRegex_20251119`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:2482`
- **Kind / category:** `root-declaration` / `tool search`
- **Priority:** **optional**
- **Current description:** Defines regex-based tool search for Claude models.
- **Signature hint:** `declare function ToolSearchRegex_20251119<Mode extends Tool.FailureMode | undefined = undefined>(args: void): Tool.ProviderDefined<'anthropic.tool_search_tool_regex_20251119', 'AnthropicToolSearchRegex', { readonly args: Schema.Void; readonly parameters: Schema.Struct<{ readonly query: Schema.String; }>; readonly success: Schema.$Array<Schema.Struct<{ readonly cache_control: Schema.optionalKey<Schema.Union<readonly [Schema.Union<readonly [Schema.Struct<{ readonly ttl: Schema.optionalKey<Schema.Literals<readonly ['5m', '1h']>>; readonly type: Schema.Literal<'ephemeral'>; }>]>, Schema.Null]>>; readonly tool_name: Schema.String; readonly type: Schema.Literal<'tool_reference'>; }>>; readonly failure: Schema.Struct<{ readonly error_code: Schema.Literals<readonly ['invalid_tool_input', 'unavailable', 'too_many_requests', 'execution_time_exceeded']>; readonly error_message: Schema.Union<readonly [Schema.String, Schema.Null]>; readonly type: Schema.Literal<'tool_search_tool_result_error'>; }>; readonly failureMode: Mode extends undefined ? 'error' : Mode; }, false>`
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ToolSearchRegex_20251119`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `AnthropicTool.ToolSearchRegex_20251119`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.ToolSearchBM25_20251119`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:2511`
- **Kind / category:** `root-declaration` / `tool search`
- **Priority:** **optional**
- **Current description:** Defines BM25/natural language tool search for Claude models.
- **Signature hint:** `declare function ToolSearchBM25_20251119<Mode extends Tool.FailureMode | undefined = undefined>(args: void): Tool.ProviderDefined<'anthropic.tool_search_tool_bm25_20251119', 'AnthropicToolSearchBM25', { readonly args: Schema.Void; readonly parameters: Schema.Struct<{ readonly query: Schema.String; }>; readonly success: Schema.$Array<Schema.Struct<{ readonly cache_control: Schema.optionalKey<Schema.Union<readonly [Schema.Union<readonly [Schema.Struct<{ readonly ttl: Schema.optionalKey<Schema.Literals<readonly ['5m', '1h']>>; readonly type: Schema.Literal<'ephemeral'>; }>]>, Schema.Null]>>; readonly tool_name: Schema.String; readonly type: Schema.Literal<'tool_reference'>; }>>; readonly failure: Schema.Struct<{ readonly error_code: Schema.Literals<readonly ['invalid_tool_input', 'unavailable', 'too_many_requests', 'execution_time_exceeded']>; readonly error_message: Schema.Union<readonly [Schema.String, Schema.Null]>; readonly type: Schema.Literal<'tool_search_tool_result_error'>; }>; readonly failureMode: Mode extends undefined ? 'error' : Mode; }, false>`
- **Import guidance:** Start from `import { AnthropicTool } from "@effect/ai-anthropic"` and use `AnthropicTool.ToolSearchBM25_20251119`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `AnthropicTool.ToolSearchBM25_20251119`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTool.AnthropicTool`

- **Source:** `packages/ai/anthropic/src/AnthropicTool.ts:31`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Union of all Anthropic provider-defined tool definitions exported by this module.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTool.AnthropicTool`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
