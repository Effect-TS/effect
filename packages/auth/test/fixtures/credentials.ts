export default {
  provenance:
    "Generated before migration by Node crypto and the adapters at ec3ab388e912222012005be6de14d939e697ec59 (Noble hashes 2.3.0, ciphers 2.1.1). Inputs and envelope authority are retained below.",
  password: {
    password: "é\ud800!",
    pbkdf2: "pbkdf2-sha256$17$bGVnYWN5LXNhbHQtMTIzNA$G6DIqCrTwV_TumfknthZodZjO3d2YD2LILNzWM3Qe8E",
    phc: "$argon2id$v=19$m=32,t=2,p=1$bGVnYWN5LXNhbHQtMTIzNA$IoAj2o4dyDdM7d97dCo1roxF/iIOsyXJWjYO3uxkHwo"
  },
  totp: {
    key: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc",
    secret: "MTIzNDU2Nzg5MDEyMzQ1Njc4OTA",
    binding: {
      moduleId: "totp",
      subjectId: "subject",
      credentialId: "credential",
      revision: "rev1"
    },
    envelope: {
      keyId: "key1",
      revision: "rev1",
      nonce: "AwMDAwMDAwMDAwMD",
      ciphertext: "FMyQN28eaXpDcHJu2GPKOtoE2d8AdUKKUueXVvwh9CDEPWtn"
    },
    recovery: "rc1-00112233-44556677-8899AABB-CCDDEEFF",
    digest: "YDZEBf4XTEdCk6fNZkWduCE6N9HQTvGXGB7Trn-QEEs"
  },
  oauth: {
    key: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc",
    signIn: {
      context: {
        namespace: "effect-auth/oauth-sign-in-context/v1",
        moduleId: "oauth",
        generation: 1,
        flowId: "flow",
        provider: "provider",
        protocol: "oidc",
        configurationGeneration: 1,
        issuer: "https://issuer.example",
        responseIssuerMode: "required",
        callbackId: "callback",
        redirectUri: "https://app.example/callback",
        returnTarget: "/",
        stateDigest: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc",
        requestBindingVerifier: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc",
        requestBindingExpiresAtMillis: 50000,
        issuedAtMillis: 1000,
        expiresAtMillis: 40000,
        exchangeTimeoutMillis: 10000
      },
      plain: {
        namespace: "effect-auth/oauth-transaction-secrets/v1",
        state: "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE",
        pkceVerifier: "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI",
        oidcNonce: "AwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM"
      },
      sealed: {
        format: "oauth-xchacha20poly1305-v1",
        keyId: "key1",
        nonce: "0zYbC6m33Uy0wpRZVPxCB5HBOjVBoeF-",
        ciphertext:
          "HYQ2sdnnDd4rmS83kz4c5a-8J4VThuncLRbWz9aW35B0uDF7yrLnBTyUB_-JDB4ZghX-Q0Z9Ra47P83rAJcjvyjqZIha8DIsn0C5U-MyHAGqo6snqB9oGzF1GfJoCxIYcEHvmLT8HUbRcxikcspNTrSS3yjCH0DRaB_aibYC4ree-4mA5jnUESzoN6jp4i_8yKfgcmecAJicFRk8nI9xzMyt8Ur-Yy_4JZMcqYEb0cxcXWn5hCOk-2GDX-Y6jISGURfe7qegB2gYsgFZARUROBtSUc2qE78Yua5RI-jw4uiNoA2ZHt2ndUUFEZ4TTzZqQyDx0sw"
      }
    },
    link: {
      context: {
        namespace: "effect-auth/oauth-link-context/v1",
        moduleId: "oauth",
        generation: 1,
        flowId: "flow",
        provider: "provider",
        protocol: "oidc",
        configurationGeneration: 1,
        issuer: "https://issuer.example",
        responseIssuerMode: "required",
        callbackId: "callback",
        redirectUri: "https://app.example/callback",
        returnTarget: "/",
        stateDigest: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc",
        requestBindingVerifier: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc",
        requestBindingExpiresAtMillis: 50000,
        issuedAtMillis: 1000,
        expiresAtMillis: 40000,
        revision: {
          subjectId: "subject",
          securityRevision: "rev1",
          credentials: [
            {
              credentialId: "credential",
              revision: "rev1"
            }
          ]
        },
        maximumEvidenceAgeMillis: 60000,
        exchangeTimeoutMillis: 10000,
        authorization: {
          challenge: {
            moduleId: "oauth",
            action: "link-begin",
            flowId: "flow",
            revision: {
              subjectId: "subject",
              securityRevision: "rev1",
              credentials: [
                {
                  credentialId: "credential",
                  revision: "rev1"
                }
              ]
            },
            intentDigest: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc",
            bindingDigest: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc"
          },
          source: {
            _tag: "Proof"
          },
          validUntilMillis: 61000,
          evidence: {
            revision: {
              subjectId: "subject",
              securityRevision: "rev1",
              credentials: [
                {
                  credentialId: "credential",
                  revision: "rev1"
                }
              ]
            },
            flowId: "flow",
            bindingDigest: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc",
            proofs: [
              {
                method: "passkey",
                credentialId: "credential",
                factors: ["possession"],
                userVerified: true,
                phishingResistant: true,
                verifiedAt: 1000
              }
            ]
          },
          requirement: {
            alternatives: [
              {
                factors: ["possession"],
                userVerified: true,
                phishingResistant: true,
                minimumCredentials: 1
              }
            ],
            maximumAgeMillis: 60000
          }
        }
      },
      plain: {
        namespace: "effect-auth/oauth-transaction-secrets/v1",
        state: "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE",
        pkceVerifier: "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI",
        oidcNonce: "AwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM"
      },
      sealed: {
        format: "oauth-xchacha20poly1305-v1",
        keyId: "key1",
        nonce: "Pv8o71-6q2ipyeCULlwRWMUaSVZS4CG3",
        ciphertext:
          "ehlBOb2xeoB_FFMhCUolbSDkG6QfJOjxsRvjIDQcUcKqCXzrHp_og65lHAvSFuBywjzEn0C-iaxZTwPhQWFBTjwHipzw03AtB3RA_bvEOxzuQPpLwvomBxMRxGoEwp6i-gvQpRID9uiDUyNBu9fUpiNDjCJHqXh9NLswGl9_cDTqd2L51WVLwst-OX-Qq6SKdtkjRiVMknYU7QMltFOAfVQdoynSyobGvtC62xIGxPWgwM8JdN6-Ke62fpzQeWMgnf0hUyC-FYg-8-VMRmJ5qKUMCTNXekzlIxyGfcXXeFByl1GYmfcQk4W2iboQL_BI7fzLuCo"
      }
    },
    connected: {
      context: {
        namespace: "effect-auth/oauth-connected-context/v1",
        moduleId: "oauth",
        generation: 1,
        flowId: "flow",
        provider: "provider",
        protocol: "oidc",
        configurationGeneration: 1,
        issuer: "https://issuer.example",
        responseIssuerMode: "required",
        callbackId: "callback",
        redirectUri: "https://app.example/callback",
        returnTarget: "/",
        stateDigest: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc",
        requestBindingVerifier: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc",
        requestBindingExpiresAtMillis: 50000,
        issuedAtMillis: 1000,
        expiresAtMillis: 40000,
        revision: {
          subjectId: "subject",
          securityRevision: "rev1",
          credentials: [
            {
              credentialId: "credential",
              revision: "rev1"
            }
          ]
        },
        profile: {
          key: "read",
          generation: 1,
          issuance: "active",
          provider: "provider",
          clientRegistrationId: "client",
          scopes: ["openid"],
          resources: [],
          retention: "access-and-refresh",
          maximumAccessLifetimeMillis: 3600000,
          maximumRefreshLifetimeMillis: 86400000,
          refreshAheadMillis: 30000,
          refresh: "confidential",
          revocation: "unsupported"
        },
        grantId: "grant",
        maximumEvidenceAgeMillis: 60000,
        exchangeTimeoutMillis: 10000,
        authorization: {
          challenge: {
            moduleId: "oauth",
            action: "connected-begin",
            flowId: "flow",
            revision: {
              subjectId: "subject",
              securityRevision: "rev1",
              credentials: [
                {
                  credentialId: "credential",
                  revision: "rev1"
                }
              ]
            },
            intentDigest: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc",
            bindingDigest: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc"
          },
          source: {
            _tag: "Proof"
          },
          validUntilMillis: 61000,
          evidence: {
            revision: {
              subjectId: "subject",
              securityRevision: "rev1",
              credentials: [
                {
                  credentialId: "credential",
                  revision: "rev1"
                }
              ]
            },
            flowId: "flow",
            bindingDigest: "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc",
            proofs: [
              {
                method: "passkey",
                credentialId: "credential",
                factors: ["possession"],
                userVerified: true,
                phishingResistant: true,
                verifiedAt: 1000
              }
            ]
          },
          requirement: {
            alternatives: [
              {
                factors: ["possession"],
                userVerified: true,
                phishingResistant: true,
                minimumCredentials: 1
              }
            ],
            maximumAgeMillis: 60000
          }
        }
      },
      plain: {
        namespace: "effect-auth/oauth-transaction-secrets/v1",
        state: "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE",
        pkceVerifier: "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI",
        oidcNonce: "AwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM"
      },
      sealed: {
        format: "oauth-xchacha20poly1305-v1",
        keyId: "key1",
        nonce: "TK-QXoDkMEp1q70rkJZXdS26Y-UaD266",
        ciphertext:
          "0TPUZcTTj2Qu7bY4JcrjofVYvFQ4IGgkw2zUNW-9VZHKZieYBWo_3Yaps-IfHfW2qBRrwIV9hqM2hcewc_40wDR2sn5OHKMYVXiMYsG2GXwmz7JHcTP_UWzbEuhl2iWkcPExmhwfQ9qNnBVJKve0BpPG7CqmxUUxK4B30n9tXZAFImDhqGbpjXCylx5RgBMxQv-t2G4sW-BWKcK4j4qj1ina2fR5MUpiHlzT13Bw573vuEYwjN0MuDyBmsoLs3uiwd9LVS1mKtMI8xAbFoUU2_wjQyamYXeBfLdDCPOYnrxWaIpJfAaB1IV8_i7cMvgwtmMQy-c"
      }
    },
    token: {
      context: {
        namespace: "effect-auth/oauth-connected-token-context/v1",
        moduleId: "oauth",
        subjectId: "subject",
        identity: {
          provider: "provider",
          issuer: "https://issuer.example",
          subject: "external"
        },
        configuration: {
          provider: "provider",
          protocol: "oidc",
          configurationGeneration: 1,
          issuer: "https://issuer.example",
          responseIssuerMode: "required",
          callbackId: "callback",
          redirectUri: "https://app.example/callback",
          profile: {
            key: "read",
            generation: 1,
            issuance: "active",
            provider: "provider",
            clientRegistrationId: "client",
            scopes: ["openid"],
            resources: [],
            retention: "access-and-refresh",
            maximumAccessLifetimeMillis: 3600000,
            maximumRefreshLifetimeMillis: 86400000,
            refreshAheadMillis: 30000,
            refresh: "confidential",
            revocation: "unsupported"
          }
        },
        grantId: "grant",
        grantVersion: "1",
        tokenVersion: "1",
        metadata: {
          scopes: ["openid"],
          resources: [],
          accessExpiresAtMillis: 40000,
          useUntilMillis: 30000,
          obtainedAtMillis: 1000
        }
      },
      plain: {
        namespace: "effect-auth/oauth-connected-token-material/v1",
        accessToken: "access",
        refreshToken: "refresh",
        continuation: {
          _tag: "Oidc",
          clientId: "client",
          nonce: "AwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwM",
          authTime: 1
        }
      },
      sealed: {
        format: "oauth-connected-xchacha20poly1305-v1",
        keyId: "key1",
        nonce: "kSM2YBVrX7dk5QWZg8c-L8p14R2amCFT",
        ciphertext:
          "jV9wwYgu2SjsZ2XIHAJT16nIhWGFIMu09zarSROWY4Zd7Ryu9yqN1rZhnjxdSB5FXlxdYLtuaN9QVptP-vOzlRxijYDbovcqxPV3Fai6dmhRNDa27RMx7j_nobDmQwfigDyFSnCqIT3pWOLqJKOGUA4-NqDNxUWdE4RzNVp2P3E5w3JPzPmNJaMNt0ZF3dFHMI2hQKc0An-QImEq60Vfw030rKXK2lrdmv4-LoVVWRdWsyHtBm9Z1WozA-1DVZie92ofF-JlYUR41lZ8ulVJwY8eFhZ2RYKPfdHi-Z8eoHOpi9VxkLGkWMpIw7XDX3C5CHDo"
      }
    },
    provenance:
      "Regenerated after the pre-production OAuth state reset: single-use flow contexts retain accepted action authorization; connected token context has no cohort or exchange order."
  }
} as const
