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

- Slides store their content (heading, body, background, tools) as one JSON `data` column so new slide tools need no database change.
- Slide tools live in src/components/board/widgets.tsx; timer-sequence math lives in src/lib/board.ts with tests next to it.
- Board library (folders/days/staged) lives inside each slide's data JSON; schema, suggestions and import/export logic in src/lib/library.ts with tests next to it — keeps the library without database changes.
- Resolve subject presentation in src/lib/subject-design.ts from folder/day or legacy headings; keep matching artwork and CSS themes separate from saved schedule data so existing boards gain subject designs without migration.
- Per-subject default themes (background, card placement, font, colors) are saved in the signed-in user's auth metadata and sanitized by src/lib/subject-theme.ts — cross-device without a database change, and never used for permissions.
- AI slide drafting runs in an authenticated server function (src/lib/draft.functions.ts) so the AI key stays on the server.
- Spotify Premium playback uses browser-only PKCE sign-in (teacher's own Spotify app Client ID, no secret) and one shared Web Playback SDK player in src/lib/spotify.ts — there is no Spotify connector, and a singleton avoids duplicate players in editor and present mode.
