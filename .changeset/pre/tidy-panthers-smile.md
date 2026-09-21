---
"effect": patch
---

Add generic branded NetAddress classifications and named validating schemas.
Singleton address constants retain their base-family types; guards expose
classifications on demand. Operations that derive new address bits return only
the IPv4 or IPv6 family until callers revalidate the classification.
