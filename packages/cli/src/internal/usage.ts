import * as Chunk from "effect/Chunk"
import { dual } from "effect/Function"
import * as Option from "effect/Option"
import type * as HelpDoc from "../HelpDoc"
import type * as Span from "../HelpDoc/Span"
import type * as Usage from "../Usage"
import * as _helpDoc from "./helpDoc"
import * as span from "./helpDoc/span"

/** @internal */
export const empty: Usage.Usage = {
  _tag: "Empty"
}

/** @internal */
export const mixed: Usage.Usage = {
  _tag: "Empty"
}

/** @internal */
export const named = (
  names: Chunk.Chunk<string>,
  acceptedValues: Option.Option<string>
): Usage.Usage => ({
  _tag: "Named",
  names,
  acceptedValues
})

/** @internal */
export const optional = (self: Usage.Usage): Usage.Usage => ({
  _tag: "Optional",
  usage: self
})

/** @internal */
export const repeated = (self: Usage.Usage): Usage.Usage => ({
  _tag: "Repeated",
  usage: self
})

export const alternation = dual<
  (that: Usage.Usage) => (self: Usage.Usage) => Usage.Usage,
  (self: Usage.Usage, that: Usage.Usage) => Usage.Usage
>(2, (self, that) => ({
  _tag: "Alternation",
  left: self,
  right: that
}))

/** @internal */
export const concat = dual<
  (that: Usage.Usage) => (self: Usage.Usage) => Usage.Usage,
  (self: Usage.Usage, that: Usage.Usage) => Usage.Usage
>(2, (self, that) => ({
  _tag: "Concat",
  left: self,
  right: that
}))

const spanMap: {
  [K in Usage.Usage["_tag"]]: (self: Extract<Usage.Usage, { _tag: K }>) => Span.Span
} = {
  Empty: () => span.text(""),
  Mixed: () => span.text("<command>"),
  Named: (self) => {
    const acceptedValues = Option.match(self.acceptedValues, {
      onNone: () => span.empty,
      onSome: (c) => span.concat(span.space, span.text(c))
    })
    const mainSpan = span.concat(span.text(Chunk.join(self.names, ", ")), acceptedValues)
    return self.names.length > 1
      ? span.concat(span.text("("), span.concat(mainSpan, span.text(")")))
      : mainSpan
  },
  Optional: (self) => {
    const usage = spanMap[self.usage._tag](self.usage as any)
    return span.concat(span.text("["), span.concat(usage, span.text("]")))
  },
  Repeated: (self) => {
    const usage = spanMap[self.usage._tag](self.usage as any)
    return span.concat(usage, span.text("..."))
  },
  Alternation: (self) => {
    const left = spanMap[self.left._tag](self.left as any)
    const right = spanMap[self.right._tag](self.right as any)
    return span.concat(left, span.concat(span.text("|"), right))
  },
  Concat: (self) => {
    const left = spanMap[self.left._tag](self.left as any)
    const right = spanMap[self.right._tag](self.right as any)
    const separator = span.isEmpty(left) && span.isEmpty(right)
      ? span.empty
      : span.space
    return span.concat(left, span.concat(separator, right))
  }
}

/** @internal */
export const helpDoc = (self: Usage.Usage): HelpDoc.HelpDoc => _helpDoc.p(spanMap[self._tag](self as any))
