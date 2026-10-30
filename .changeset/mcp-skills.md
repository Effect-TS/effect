---
"effect": patch
---

Add MCP Skills extension (SEP-2640) support. Servers publish skills with `McpServer.skill` or `McpServer.registerSkill`. Clients opt in with `extensions: { skills: true }` and use `listSkills`, `getSkill`, `readResourceDirectory` and `readSkillResource`, which verifies files against the listed digests and frontmatter.
