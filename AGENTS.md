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

- Admin access is checked inside the admin page (AdminGate), and every admin database function re-checks the role; the first admin is claimed once via claim_first_admin (confirmed email, only while no admin exists). Why: a failed check in beforeLoad left the page blank.
- Recommendations come from recommendChallenges in src/lib/engine.ts (assessment + mission accuracy + recent mistakes). Why: one deterministic, tested place for ranking.
