import { OidcUserProfile } from "../shared/profile.ts"

/** Google ID-token claims, including optional Workspace hosted domain. The preset
 * passes `hd` as a consent hint; applications enforce workspace policy against
 * this verified claim. */
export const GoogleUserProfile = OidcUserProfile
export type GoogleUserProfile = OidcUserProfile
