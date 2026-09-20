---
"effect": patch
---

Add branded NetAddress classifications and validating schemas. Existing singleton
address constants now expose their classifications, so containers that retain an
address infer its brand. Operations that derive new address bits return only the
IPv4 or IPv6 family until callers revalidate the classification.
