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
