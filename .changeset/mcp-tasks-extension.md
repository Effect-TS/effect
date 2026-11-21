---
"effect": patch
---

Add MCP Tasks (`io.modelcontextprotocol/tasks`, protocol 2026-07-28).

`McpTasks.toolkit` registers long-running tools whose calls return a task handle that clients poll, answer and cancel. Run them with `McpTasks.layerWorkflow` (durable, with Workflow compensation), `McpTasks.layerMemory`, or a custom `McpTasks.Execution`. Handlers request client input and publish status through `McpTasks.TaskContext`.

`McpClient` enables the extension with `extensions.tasks`. `callTool` waits for task-backed results, `startTool` exposes `awaitResult` and `cancel`, and `input` handlers answer roots, sampling and elicitation requests.
