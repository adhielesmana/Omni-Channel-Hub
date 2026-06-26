# Memory Index

- [OmniChat prod deploy](omnichat-prod-deploy.md) — self-hosted Docker Compose VM, not Replit Deploy; always restart nginx after recreating containers, run builds detached (SSH resets).
- [Dev DB schema drift](dev-db-schema-drift.md) — `Failed query: select ... from <table>` 500s on only one table = dev Postgres missing a column; fix with ALTER or db push.
- [Media serving hardening](media-serving-hardening.md) — user-supplied media must keep MIME allowlist + nosniff + attachment + size cap; removing them reopens stored-XSS/DoS.
