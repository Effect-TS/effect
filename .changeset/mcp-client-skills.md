---
"effect": minor
---

Add MCP Skills extension (SEP-2640) support to `McpClient` behind the new `skills` option: `listSkills`, `getSkill`, `readResourceDirectory`, and `readSkillResource`, which checks each file against the SHA-256 digest and size its skill lists, and a `SKILL.md`'s frontmatter against the listed frontmatter. Skill entries that break the extension's rules fail with a `ValidationError`, or with `listSkills({ skipInvalidSkills: true })` are left out, and passed to `onInvalidSkill` when supplied.
