---
"effect": patch
---

fix(Logger): Support Cloudflare Workers by treating workerd as TTY environment

Fixes missing log messages in Cloudflare Workers where console.group methods are no-ops.

The pretty logger now:
- Detects workerd runtime using `navigator.userAgent === 'Cloudflare-Workers'`
- Routes workerd to TTY logger mode instead of browser mode
- Disables console.group calls in workerd (similar to existing Bun handling)

This ensures all log messages display correctly in Cloudflare Workers local development.