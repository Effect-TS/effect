---
"@effect/ai-openai": patch
---

Accept omitted `pattern` fields in OpenAI `find_in_page` web-search actions so streams do not fail validation. The public `WebSearchActionFind.pattern` property is now optional (`string | undefined` when read); explicit null and non-string values remain invalid.
