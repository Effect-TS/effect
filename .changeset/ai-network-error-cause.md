---
"effect": minor
---

Add an optional `cause` to the AI `NetworkError`, holding the original error from the HTTP client, such as the runtime's `fetch` failure. `NetworkError.fromRequestError` now keeps it, so the reason a request failed is no longer lost.
