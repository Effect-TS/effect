---
"effect": patch
---

Prevent stale concurrent workflow resumes from clearing a newer completed reply. Custom message storage implementations must honor the optional expected reply ID on `clearReplies` to provide this safety guarantee.
