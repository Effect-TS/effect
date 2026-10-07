---
"effect": patch
---

Cache the Kubernetes service-account token for one minute so K8sHttpClient picks up rotated credentials without reading the token file on every request.
