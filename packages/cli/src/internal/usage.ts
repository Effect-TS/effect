import { dual, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as CliConfig from "../CliConfig.js"
import type * as HelpDoc from "../HelpDoc.js"
import type * as Span from "../HelpDoc/Span.js"
import type * as Usage from "../Usage.js"
import * as InternalCliConfig from "./cliConfig.js"
import * as InternalHelpDoc from "./helpDoc.js"
import * as InternalSpan from "./helpDoc/span.js"

// =============================================================================
// Constructors
// =============================================================================

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
  names: ReadonlyArray<string>,
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

// =============================================================================
// Combinators
// =============================================================================

/** @internal */
export const getHelp = (self: Usage.Usage): HelpDoc.HelpDoc => {
  const spans = enumerate(self, InternalCliConfig.defaultConfig)
  if (ReadonlyArray.isNonEmptyReadonlyArray(spans)) {
    const head = ReadonlyArray.headNonEmpty(spans)
    const tail = ReadonlyArray.tailNonEmpty(spans)
    if (ReadonlyArray.isNonEmptyReadonlyArray(tail)) {
      return pipe(
        ReadonlyArray.map(spans, (span) => InternalHelpDoc.p(span)),
        ReadonlyArray.reduceRight(
          InternalHelpDoc.empty,
          (left, right) => InternalHelpDoc.sequence(left, right)
        )
      )
    }
    return InternalHelpDoc.p(head)
  }
  return InternalHelpDoc.empty
}

/** @internal */
export const enumerate = dual<
  (config: CliConfig.CliConfig) => (self: Usage.Usage) => ReadonlyArray<Span.Span>,
  (self: Usage.Usage, config: CliConfig.CliConfig) => ReadonlyArray<Span.Span>
>(2, (self, config) => render(simplify(self, config), config))

// =============================================================================
// Internals
// =============================================================================

const simplify = (self: Usage.Usage, config: CliConfig.CliConfig): Usage.Usage => {
  switch (self._tag) {
    case "Empty": {
      return empty
    }
    case "Mixed": {
      return mixed
    }
    case "Named": {
      if (Option.isNone(ReadonlyArray.head(render(self, config)))) {
        return empty
      }
      return self
    }
    case "Optional": {
      if (self.usage._tag === "Empty") {
        return empty
      }
      const usage = simplify(self.usage, config)
      // No need to do anything for empty usage
      return usage._tag === "Empty"
        ? empty
        // Avoid re-wrapping the usage in an optional instruction
        : usage._tag === "Optional"
        ? usage
        : optional(usage)
    }
    case "Repeated": {
      const usage = simplify(self.usage, config)
      return usage._tag === "Empty" ? empty : repeated(usage)
    }
    case "Alternation": {
      const leftUsage = simplify(self.left, config)
      const rightUsage = simplify(self.right, config)
      return leftUsage._tag === "Empty"
        ? rightUsage
        : rightUsage._tag === "Empty"
        ? leftUsage
        : alternation(leftUsage, rightUsage)
    }
    case "Concat": {
      const leftUsage = simplify(self.left, config)
      const rightUsage = simplify(self.right, config)
      return leftUsage._tag === "Empty"
        ? rightUsage
        : rightUsage._tag === "Empty"
        ? leftUsage
        : concat(leftUsage, rightUsage)
    }
  }
}

const render = (self: Usage.Usage, config: CliConfig.CliConfig): ReadonlyArray<Span.Span> => {
  switch (self._tag) {
    case "Empty": {
      return ReadonlyArray.of(InternalSpan.text(""))
    }
    case "Mixed": {
      return ReadonlyArray.of(InternalSpan.text("<command>"))
    }
    case "Named": {
      const typeInfo = config.showTypes
        ? Option.match(self.acceptedValues, {
          onNone: () => InternalSpan.empty,
          onSome: (s) => InternalSpan.concat(InternalSpan.space, InternalSpan.text(s))
        })
        : InternalSpan.empty
      const namesToShow = config.showAllNames
        ? self.names
        : self.names.length > 1
        ? pipe(
          ReadonlyArray.filter(self.names, (name) => name.startsWith("--")),
          ReadonlyArray.head,
          Option.map(ReadonlyArray.of),
          Option.getOrElse(() => self.names)
        )
        : self.names
      const nameInfo = InternalSpan.text(ReadonlyArray.join(namesToShow, ", "))
      return config.showAllNames && self.names.length > 1
        ? ReadonlyArray.of(InternalSpan.spans([
          InternalSpan.text("("),
          nameInfo,
          typeInfo,
          InternalSpan.text(")")
        ]))
        : ReadonlyArray.of(InternalSpan.concat(nameInfo, typeInfo))
    }
    case "Optional": {
      return ReadonlyArray.map(render(self.usage, config), (span) =>
        InternalSpan.spans([
          InternalSpan.text("["),
          span,
          InternalSpan.text("]")
        ]))
    }
    case "Repeated": {
      return ReadonlyArray.map(
        render(self.usage, config),
        (span) => InternalSpan.concat(span, InternalSpan.text("..."))
      )
    }
    case "Alternation": {
      if (
        self.left._tag === "Repeated" ||
        self.right._tag === "Repeated" ||
        self.left._tag === "Concat" ||
        self.right._tag === "Concat"
      ) {
        return ReadonlyArray.appendAll(
          render(self.left, config),
          render(self.right, config)
        )
      }
      return ReadonlyArray.flatMap(
        render(self.left, config),
        (left) =>
          ReadonlyArray.map(
            render(self.right, config),
            (right) => InternalSpan.spans([left, InternalSpan.text("|"), right])
          )
      )
    }
    case "Concat": {
      const leftSpan = render(self.left, config)
      const rightSpan = render(self.right, config)
      const separator = ReadonlyArray.isNonEmptyReadonlyArray(leftSpan) &&
          ReadonlyArray.isNonEmptyReadonlyArray(rightSpan)
        ? InternalSpan.space
        : InternalSpan.empty
      return ReadonlyArray.flatMap(
        leftSpan,
        (left) => ReadonlyArray.map(rightSpan, (right) => InternalSpan.spans([left, separator, right]))
      )
    }
  }
}
