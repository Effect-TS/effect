---
"effect": patch
---

Calculate `HttpBody.file`, `HttpBody.fileFromInfo`, and `HttpClientRequest.bodyFile` content lengths with exact bigint arithmetic and EOF clamping. Fail with typed `PlatformError` / `BadArgument` when the final length exceeds `Number.MAX_SAFE_INTEGER`, while allowing larger sizes and range inputs when the resulting length is representable. Invalid range inputs now fail through the typed error channel during effect evaluation instead of causing defects.
