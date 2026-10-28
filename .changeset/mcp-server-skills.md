---
"effect": minor
---

Add `McpServer.skill` and `McpServer.registerSkill` to publish Agent Skills under the MCP Skills extension (SEP-2640). Each skill's files are served as resources, and the server answers `skills/list`, `skills/get` and `resources/directory/read`, with a manifest of SHA-256 digests and sizes computed from the bytes it serves. A skill's frontmatter is checked against the new `McpSchema.SkillFrontmatter` schema of the Agent Skills specification, and can be read from a `SKILL.md` given as a file. The server declares the `io.modelcontextprotocol/skills` extension once any skill is registered, on every protocol revision. `v2026_07_28` results carry `ttlMs` and `cacheScope`, set with the new `skills` cache hint. `McpServer.visibility` hides skills too, through the new `skills/list`, `skills/get` and `resources/directory/read` middleware methods.
