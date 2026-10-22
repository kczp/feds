<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- The shared profile is one row (`site_profile`, id=1) read publicly; all writes and uploads go through server functions that call `requireAdmin()` first — the dashboard UI gate is UX only.
- Admin auth is a shared password (`ADMIN_PASSWORD`) checked server-side with an encrypted HTTP-only session cookie (`SESSION_SECRET`); no user accounts exist.
- Media lives in the private `media` bucket (workspace blocks public buckets) and is served through `/api/public/media/*` with range support for audio/video seeking.
- localStorage/IndexedDB are only read once for migrating the legacy profile, then cleared.
