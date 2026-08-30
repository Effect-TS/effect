---
"effect": patch
---

Add ASCII `Hostname`, unresolved `Host`, and host-plus-optional-port `Authority` values to `effect/unstable/net/NetAddress`, together with declaration and canonical string Schema codecs.

Hostnames use RFC 1123 letters, digits, and hyphen syntax in canonical lowercase form. Unicode names and IDNA A-labels are rejected until IDNA can be supported without adding a core dependency. Authorities remain distinct from resolved `InetAddress` values and never perform DNS resolution. The parsers reject arbitrary URI registered names, general DNS owner names, and legacy IPv4 syntax.
