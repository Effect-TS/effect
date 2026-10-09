/**
 * SSH protocol message numbers and protocol constants.
 *
 * @internal
 */

/** @internal */
export const MSG_DISCONNECT = 1
/** @internal */
export const MSG_IGNORE = 2
/** @internal */
export const MSG_UNIMPLEMENTED = 3
/** @internal */
export const MSG_DEBUG = 4
/** @internal */
export const MSG_SERVICE_REQUEST = 5
/** @internal */
export const MSG_SERVICE_ACCEPT = 6
/** @internal */
export const MSG_EXT_INFO = 7
/** @internal */
export const MSG_KEXINIT = 20
/** @internal */
export const MSG_NEWKEYS = 21
/** @internal */
export const MSG_KEX_ECDH_INIT = 30
/** @internal */
export const MSG_KEX_ECDH_REPLY = 31
/** @internal */
export const MSG_USERAUTH_REQUEST = 50
/** @internal */
export const MSG_USERAUTH_FAILURE = 51
/** @internal */
export const MSG_USERAUTH_SUCCESS = 52
/** @internal */
export const MSG_USERAUTH_BANNER = 53
/** @internal */
export const MSG_USERAUTH_PK_OK = 60
/** @internal */
export const MSG_USERAUTH_PASSWD_CHANGEREQ = 60
/** @internal */
export const MSG_USERAUTH_INFO_REQUEST = 60
/** @internal */
export const MSG_USERAUTH_INFO_RESPONSE = 61
/** @internal */
export const MSG_GLOBAL_REQUEST = 80
/** @internal */
export const MSG_REQUEST_SUCCESS = 81
/** @internal */
export const MSG_REQUEST_FAILURE = 82
/** @internal */
export const MSG_CHANNEL_OPEN = 90
/** @internal */
export const MSG_CHANNEL_OPEN_CONFIRMATION = 91
/** @internal */
export const MSG_CHANNEL_OPEN_FAILURE = 92
/** @internal */
export const MSG_CHANNEL_WINDOW_ADJUST = 93
/** @internal */
export const MSG_CHANNEL_DATA = 94
/** @internal */
export const MSG_CHANNEL_EXTENDED_DATA = 95
/** @internal */
export const MSG_CHANNEL_EOF = 96
/** @internal */
export const MSG_CHANNEL_CLOSE = 97
/** @internal */
export const MSG_CHANNEL_REQUEST = 98
/** @internal */
export const MSG_CHANNEL_SUCCESS = 99
/** @internal */
export const MSG_CHANNEL_FAILURE = 100

/** @internal */
export const DISCONNECT_BY_APPLICATION = 11

/** @internal */
export const OPEN_ADMINISTRATIVELY_PROHIBITED = 1
/** @internal */
export const OPEN_UNKNOWN_CHANNEL_TYPE = 3

/** @internal */
export const EXTENDED_DATA_STDERR = 1
