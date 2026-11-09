/**
 * Submissions the host prevented only because it owns the form, with no
 * submit handler in the app. The browser Router still routes these.
 *
 * @internal
 */

/** @internal */
export const ownedUnhandled = new WeakSet<Event>()
