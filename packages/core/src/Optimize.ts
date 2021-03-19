import type { XReader } from '@effect-ts/core/XPure/XReader'
import * as R from '@effect-ts/core/XPure/XReader'

import type { Doc } from './Doc'
import * as D from './Doc'

// -------------------------------------------------------------------------------------
// definition
// -------------------------------------------------------------------------------------

/**
 * Represents optimization of a given document tree through fusion of redundant
 * document nodes.
 */
export type Optimize<A> = XReader<FusionDepth, Doc<A>>

/**
 * Represents an instruction that determines how deeply the document fusion optimizer
 * should traverse the document tree.
 */
export type FusionDepth = Shallow | Deep

/**
 * Instructs the document fusion optimizer to avoid diving deeply into nested
 * documents, fusing mostly concatenations of text nodes together.
 */
export type Shallow = 'Shallow'

/**
 * Instructs the document fusion optimizer to recurse into all leaves of the document
 * tree, including different layout alternatives and all location-sensitive values
 * (i.e. those created by `nesting`), which cannot be fused before, but only during,
 * the layout process. As a result, the performance cost of using deep document fusion
 * optimization is often hard to predict and depends on the interplay between page
 * layout and the document that is to be pretty printed.
 *
 * This value should only be utilized if profiling demonstrates that it is
 * **significantly** faster than using `Shallow`.
 */
export type Deep = 'Deep'

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const Shallow: FusionDepth = 'Shallow'

export const Deep: FusionDepth = 'Deep'

// -------------------------------------------------------------------------------------
// operations
// -------------------------------------------------------------------------------------

/**
 * The `optimizer` will combine text nodes so that they can be rendered more
 * efficiently. An optimized document is always laid out in an identical manner to its
 * un-optimized counterpart.
 *
 * When laying a `Doc` out to a `SimpleDocStream`, every component of the input
 * document is translated directly to the simpler output format. This sometimes
 * yields undesirable chunking when many pieces have been concatenated together.
 *
 * For example:
 *
 * ```typescript
 * const foldDocs = M.fold(D.getMonoid<never>())
 * foldDocs([D.Char('a'), D.Char('b'), D.Char('c'), D.Char('d')])
 * // => abcd
 * ```
 *
 * results in a chain of four entries in the output `DocStream`, although
 * this is fully equivalent to the tightly packed
 *
 * ```typescript
 * D.Text('abcd')
 * // => abcd
 * ```
 *
 * which is only a single entry in the output `DocStream`, and can be processed
 * much more efficiently.
 *
 * It is therefore a good idea to run `fuse` on concatenations of lots of small
 * strings that are used many times.
 */
export const optimize = <A>(doc: Doc<A>): Optimize<A> => {
  const go = (x: Doc<A>): Optimize<A> =>
    R.gen(function* (_) {
      switch (x._tag) {
        case 'FlatAlt':
          return D.flatAlt(yield* _(go(x.left)), yield* _(go(x.right)))
        case 'Cat': {
          // Empty documents
          if (D.isEmpty(x.left)) {
            return yield* _(go(x.right))
          }
          if (D.isEmpty(x.right)) {
            return yield* _(go(x.left))
          }

          // String documents
          if (D.isChar(x.left) && D.isChar(x.right)) {
            return D.text(x.left.char + x.right.char)
          }
          if (D.isText(x.left) && D.isChar(x.right)) {
            return D.text(x.left.text + x.right.char)
          }
          if (D.isChar(x.left) && D.isText(x.right)) {
            return D.text(x.left.char + x.right.text)
          }
          if (D.isText(x.left) && D.isText(x.right)) {
            return D.text(x.left.text + x.right.text)
          }
          // Nested strings
          if (D.isChar(x.left) && D.isCat(x.right) && D.isChar(x.right.left)) {
            const inner = yield* _(go(D.cat(x.left, x.right.left)))
            return yield* _(go(D.cat(inner, x.right.right)))
          }
          if (D.isText(x.left) && D.isCat(x.right) && D.isChar(x.right.left)) {
            const inner = yield* _(go(D.cat(x.left, x.right.left)))
            return yield* _(go(D.cat(inner, x.right.right)))
          }
          if (D.isChar(x.left) && D.isCat(x.right) && D.isText(x.right.left)) {
            const inner = yield* _(go(D.cat(x.left, x.right.left)))
            return yield* _(go(D.cat(inner, x.right.right)))
          }
          if (D.isText(x.left) && D.isCat(x.right) && D.isText(x.right.left)) {
            const inner = yield* _(go(D.cat(x.left, x.right.left)))
            return yield* _(go(D.cat(inner, x.right.right)))
          }
          if (D.isCat(x.left) && D.isChar(x.right)) {
            const inner = yield* _(go(D.cat(x.left.right, x.right)))
            return yield* _(go(D.cat(x.left.left, inner)))
          }
          if (D.isCat(x.left) && D.isText(x.left.right)) {
            const inner = yield* _(go(D.cat(x.left.right, x.right)))
            return yield* _(go(D.cat(x.left.left, inner)))
          }
          return D.cat(yield* _(go(x.left)), yield* _(go(x.right)))
        }
        case 'Nest': {
          if (D.isEmpty(x.doc)) return x.doc
          if (D.isChar(x.doc)) return x.doc
          if (D.isText(x.doc)) return x.doc
          if (D.isNest(x.doc)) {
            return yield* _(go(D.nest(x.indent + x.doc.indent)(x.doc)))
          }
          if (x.indent === 0) return yield* _(go(x.doc))
          return D.nest(x.indent)(yield* _(go(x.doc)))
        }
        case 'Union':
          return D.union(yield* _(go(x.left)), yield* _(go(x.right)))
        case 'Column': {
          const depth = yield* _(R.access((_: FusionDepth) => _))
          /* eslint-disable @typescript-eslint/ban-ts-comment */
          return depth === Shallow
            ? D.column(x.react)
            : // @ts-ignore
              D.column((position) => yield* _(go(x.react(position))))
        }
        case 'WithPageWidth': {
          const depth = yield* _(R.access((_: FusionDepth) => _))
          return depth === Shallow
            ? D.withPageWidth(x.react)
            : // @ts-ignore
              D.withPageWidth((pageWidth) => yield* _(go(x.react(pageWidth))))
        }
        case 'Nesting': {
          const depth = yield* _(R.access((_: FusionDepth) => _))
          return depth === Shallow
            ? D.nesting(x.react)
            : // @ts-ignore
              D.nesting((level) => yield* _(go(x.react(level))))
        }
        /* eslint-enable @typescript-eslint/ban-ts-comment */
        case 'Annotated': {
          const doc = yield* _(go(x.doc))
          return D.annotate(x.annotation, doc)
        }
        default:
          return x
      }
    })
  return go(doc)
}
