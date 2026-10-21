import { OidcStandardUserProfile } from "../shared/profile.ts"

export const VercelUserProfile = OidcStandardUserProfile
export type VercelUserProfile = typeof VercelUserProfile.Type
