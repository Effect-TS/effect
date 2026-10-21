---
"effect": patch
---

Add a `padding` option to `Base64Url.encode` and `SchemaGetter.encodeBase64Url`, for consumers that expect padded URL-safe Base64, such as Go's `base64.URLEncoding`. Output stays unpadded by default.
