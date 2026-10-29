/**
 * Re-exports the `ws` package.
 *
 * `ws` provides the WebSocket servers behind `NodeSocketServer` and HTTP
 * upgrades. Client sockets use Node's global `WebSocket` instead, so this
 * module is kept separate: importing only client APIs does not load `ws`.
 *
 * @stability unstable
 * @since 4.1.0
 */

/**
 * @stability unstable
 * @category re-exports
 * @since 4.1.0
 */
export * from "ws"
