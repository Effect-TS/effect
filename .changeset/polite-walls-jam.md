---
"@effect-native/bun-test": patch
---

Fix critical package issues preventing imports:
- Fix invalid peerDependency "effect": "workspace:^" to use proper version "^3.17.9" 
- Fix incorrect module export paths in dist/package.json that caused import failures
- Package now imports correctly and all functionality works as expected
