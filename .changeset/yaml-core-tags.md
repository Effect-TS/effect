---
"effect": minor
---

`Yaml.parse` and `Yaml.parseAll` now resolve the shorthand tags of the YAML 1.2 core schema: `!!str`, `!!int`, `!!float`, `!!bool`, `!!null`, `!!seq` and `!!map`. A tag applies to the scalar as written, so `!!str 0x10` gives the string `"0x10"`, `!!int "42"` gives the number `42`, and `!!float 1` gives `1`. These tags used to be kept as part of the string, so `a: !!int 42` gave `"!!int 42"`.

A tagged node whose content does not match its tag fails, for example `!!int x` or `!!seq {a: 1}`. All other tags fail: local tags such as `!custom`, the non-specific tag `!`, verbatim tags such as `!<tag:yaml.org,2002:str>` (even for core tags), and YAML 1.1 tags such as `!!binary` and `!!timestamp`.
