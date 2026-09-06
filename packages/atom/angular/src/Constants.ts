/**
 * The status tags used by the Angular Result view. `ATOM_RESULT_STATUS` is the
 * single source of truth for the tag set: `AtomResultStatus` is derived from it
 * and `AtomResultView` is discriminated by its members, so a tag cannot be added
 * to the type without a value to compare against, nor removed from here while
 * the view still names it.
 *
 * @since 4.0.0
 */

/**
 * Status tags for the flattened `Result` view, as runtime values.
 *
 * **When to use**
 *
 * Use to compare against `status` in a component or a template, so a tag is
 * written once here instead of being spelled as a string literal at each
 * comparison site.
 *
 * **Details**
 *
 * The three members are the `AsyncResult` tags `Initial`, `Failure`, and
 * `Success`, lowercased. `as const` keeps each member its own string literal
 * type instead of widening to `string`, which is what lets `AtomResultStatus`
 * be derived from this object and what lets `AtomResultView` discriminate on
 * it.
 *
 * @category constants
 * @since 4.0.0
 */
export const ATOM_RESULT_STATUS = {
  INITIAL: "initial",
  SUCCESS: "success",
  FAILURE: "failure"
} as const
