---
"@effect/platform-node": patch
---

Defer `100 Continue` responses until the application starts reading the request body, so early rejections of `Expect: 100-continue` requests do not prompt clients to upload.
