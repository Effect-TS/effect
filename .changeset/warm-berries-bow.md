---
"effect": minor
---

add DateTime.Disambiguation for handling DST edge cases

Added four disambiguation strategies to `DateTime.Zoned` constructors for handling DST edge cases:

- `'compatible'` - Maintains backward compatibility
- `'earlier'` - Choose earlier time during ambiguous periods (default)
- `'later'` - Choose later time during ambiguous periods
- `'reject'` - Throw error for ambiguous times
