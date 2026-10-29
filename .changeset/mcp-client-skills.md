---
"effect": patch
---

Add MCP Skills extension (SEP-2640) support to `McpClient`, enabled with `extensions: { skills: true }`: `listSkills`, `getSkill`, `readResourceDirectory` and `readSkillResource`. `readSkillResource` checks each file against the digest and size its skill lists, and `SKILL.md` against the listed frontmatter.
