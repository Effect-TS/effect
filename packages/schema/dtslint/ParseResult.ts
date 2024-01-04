import type * as ParseResult from "@effect/schema/ParseResult"

// ---------------------------------------------
// a ParseIssue should always have an `actual` field
// ---------------------------------------------

declare const issue: ParseResult.ParseIssue

// $ExpectType unknown
issue.actual
