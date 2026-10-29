---
"effect": patch
---

Add `McpServer.skill` and `McpServer.registerSkill` to publish Agent Skills under the MCP Skills extension (SEP-2640), answering `skills/list`, `skills/get` and `resources/directory/read` with manifests computed from the bytes served. Adds the `McpSchema.Skill`, `McpSchema.SkillResource` and `McpSchema.SkillFrontmatter` schemas and the `skills` cache hint.
