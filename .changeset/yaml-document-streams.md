---
"effect": minor
---

Add `Yaml.parseAll` for YAML document streams, with anchors scoped to each document and support for the `%YAML 1.2` directive.

`Yaml.parse` now fails on input it used to misread instead of skipping or dropping it: `%YAML` versions other than 1.2, `%TAG` and other directives, a directive without a following `---`, and plain scalars starting with `%`. Input with more than one document still fails, with a message pointing to `Yaml.parseAll`.
