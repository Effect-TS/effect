---
"effect": patch
---

Fix `Response.ToolResultPart` to select the success or failure schema using `isFailure`, preserving failure result encoding through `Response.AllParts` round trips.
