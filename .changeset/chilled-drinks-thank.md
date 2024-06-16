---
"@effect/schema": patch
---

Improve error handling (type-level) for improper usage of `optional`, closes #2995

This commit addresses concerns raised by users about the confusing behavior when 'optional' is misused in a schema definition. Previously, users experienced unexpected results, such as a schema returning 'Schema.All' when 'optional' was used incorrectly, without clear guidance on the correct usage or error messages.

Changes:

- Enhanced the 'optional' method to return a descriptive type-level error when used incorrectly, helping users identify and correct their schema definitions.
- Updated the `Schema.optional()` implementation to check its context within a pipeline and ensure it is being used correctly.
- Added unit tests to verify that the new error handling works as expected and to ensure that correct usage does not affect existing functionality.
