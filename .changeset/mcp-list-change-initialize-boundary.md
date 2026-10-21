---
"effect": patch
---

Stop `McpServer` from sending stateful clients list-change notifications for changes made before the server handled their `initialize` request, over stdio, HTTP sessions and custom transports.
