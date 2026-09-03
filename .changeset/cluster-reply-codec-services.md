---
"effect": patch
---

Correct the service requirements of `Reply.Reply` codecs: decoding requires client-side services, while encoding requires server-side services. Existing conservative payload requirements are unchanged.

Callers that previously compiled without the required decoder or encoder services must now provide them. Unnecessary services required in the opposite direction can be removed, subject to the existing payload requirements. Symmetric-service and service-free codecs are unaffected. This is a type-only correction; runtime behavior and wire formats are unchanged.
