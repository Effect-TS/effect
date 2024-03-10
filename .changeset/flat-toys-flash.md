---
"effect": patch
---

add structured logging apis

- Logger.json / Logger.jsonLogger
- Logger.structured / Logger.structuredLogger

`Logger.json` logs JSON serialized strings to the console.

`Logger.structured` logs structured objects, which is useful in the browser
where you can inspect objects logged to the console.
