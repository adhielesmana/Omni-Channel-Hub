---
name: Media serving hardening
description: Non-negotiable protections for storing/serving customer-supplied media (WhatsApp inbound), and why they exist.
---

Inbound WhatsApp media is downloaded server-side and served same-origin from `/api/media/<uuid.ext>`. Because the files come from external/untrusted senders and are served from the app's own origin, the pipeline MUST keep these protections (a code review flagged stored-XSS + DoS without them):

1. **Strict MIME→extension allowlist** in `whatsapp-media.ts`. Unknown/dangerous types (e.g. `text/html`, `image/svg+xml`, `application/xml`) must fall back to `.bin`, never a derived extension. Deriving the ext from the MIME subtype turns `text/html` into a `.html` file.
2. **`X-Content-Type-Options: nosniff`** on every `/api/media` response (`express.static` `setHeaders`).
3. **`Content-Disposition: attachment`** for any extension NOT in the inline-render allowlist (`INLINE_EXTENSIONS` = images/video/audio only). Documents/`.bin` download instead of executing in-origin. The inbox renders only image/video/audio inline anyway, so this doesn't hurt UX.
4. **Bounded download**: stream to disk with a hard byte cap (`MAX_BYTES`) + `AbortSignal.timeout`. Never buffer the whole body unbounded — large/concurrent media can exhaust memory.

**Why:** same-origin served HTML/SVG = stored XSS; unbounded buffered downloads = memory/disk DoS during webhook fan-out. Don't relax these (e.g. don't add svg to the inline set, don't drop nosniff, don't switch back to `arrayBuffer()` without a cap).
