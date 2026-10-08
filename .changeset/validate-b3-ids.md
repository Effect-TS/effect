---
"effect": patch
---

Ignore B3 trace headers whose trace-id or span-id is not hex of the length the B3 spec allows, as the W3C `traceparent` decoder already does. Before, any text in `b3` or `X-B3-TraceId` became the parent span's trace id, and so reached log annotations and the headers of outgoing requests.
