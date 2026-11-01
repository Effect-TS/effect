---
"effect": patch
---

Stop OTLP log and trace exporters from keeping a timer pending while idle. A Node program kept alive only by an idle exporter now exits.
