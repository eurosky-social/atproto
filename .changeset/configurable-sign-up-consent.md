---
"@atproto/oauth-provider": patch
"@atproto/oauth-provider-api": patch
"@atproto/oauth-provider-ui": patch
"@atproto/pds": patch
---

Make the sign-up and consent screens configurable: an optional "accept the terms" first sign-up step, per-language copy for titles, intro text and button labels (`branding.texts`, `PDS_BRANDING_TEXTS_FILE`), and a locale query parameter on branding links (`PDS_LINKS_LOCALE_PARAM`)
