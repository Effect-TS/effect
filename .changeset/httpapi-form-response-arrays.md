---
"effect": patch
---

Fix `HttpApiClient` failing to decode single-element arrays in form-urlencoded responses and declared errors. A bare form value now decodes against an array schema the same way `HttpApiBuilder` decodes form payloads.
