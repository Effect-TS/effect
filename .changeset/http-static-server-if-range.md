---
"effect": patch
---

Honor `If-Range` in `HttpStaticServer`. A `Range` request whose `If-Range` entity-tag or date no longer matches the file is now answered with the full file (`200`) instead of a range of the new contents, so clients resuming a download of a changed file no longer assemble a corrupted mix of old and new bytes. Entity tags use strong comparison, as RFC 9110 requires.
