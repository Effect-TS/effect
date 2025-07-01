---
"@effect/ai-anthropic": patch
---

Fix several issues in the generated OpenAPI models for the Anthropic AI provider 
package.

The OpenAPI specification that Anthropic maintains for its API is apparently 
[incorrect](https://github.com/anthropics/anthropic-sdk-typescript/issues/605). 
Some properties which are marked as nullable but required are sometimes not 
returned by the API. This fixes the schemas associated with some of those 
properties, though others may exist / be found that require manual adjustment.
