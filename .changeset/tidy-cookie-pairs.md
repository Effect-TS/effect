---
"effect": patch
---

Fix `Cookies.fromSetCookie` dropping cookies with spaces or tabs before `=`, such as `session = abc`, and keeping that whitespace at the start of the value in `session= abc`. Spaces and tabs around the name and value are now removed, as RFC 6265 requires, while percent-encoded spaces in the value are still decoded.
