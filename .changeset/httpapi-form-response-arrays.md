---
"effect": patch
---

`HttpApiClient` recovers directly reported singleton array fields in form-urlencoded responses: at most one field per response by default, or several with `errors: "all"`.
