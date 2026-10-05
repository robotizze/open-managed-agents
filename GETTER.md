# GETTER AI deployment

This fork customizes the console with official GETTER assets, a green palette, login copy, favicon and sharing metadata. API contracts and package names stay compatible with upstream.

- Repository: https://github.com/robotizze/open-managed-agents
- Coolify: GETTER AI Hub / production
- Service: `1d4yf08bu06ywkwuox1yil2r`
- Console: https://openma.20.228.132.208.sslip.io
- Build: `apps/main-node/Dockerfile` includes the console.
- Volume: `1d4yf08bu06ywkwuox1yil2r_oma-data` at `/app/data`.
- Sandbox: LiteBox with `/dev/kvm` and supplementary group `993` on the current server.
- Authentication enabled; configure model keys in the console.

Keep BETTER_AUTH_SECRET and PLATFORM_ROOT_SECRET in Coolify. Back up the data volume and encryption key together. Retain the volume and secrets when updating the commit-tagged image.

The upstream remote points to OpenMA. Original Apache 2.0 license and notices are retained. GETTER assets identify this customized deployment.
