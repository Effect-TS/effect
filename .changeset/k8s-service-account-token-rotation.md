---
"effect": patch
---

Read the Kubernetes service-account token on each HTTP request, including retries, so token rotation does not leave K8sHttpClient using stale credentials.
