---
"effect": minor
---

Support YAML 1.1 merge keys (`<<`) in `Yaml.parse`. An unquoted `<<` key merges a mapping, or a sequence of mappings, into the enclosing mapping. Explicit keys take precedence over merged keys, and earlier merge sources over later ones. Quote the key (`"<<"`) to keep it as an ordinary key.
