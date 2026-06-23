# Git Push Cheatsheet (ytmusic-plus)

Quick reference for every push situation. Default branch: **main**.

---

## ⭐ The normal flow (99% of the time)

`git push` only sends **commits**. Edits sitting in your working tree are invisible
to push until you commit them — that's why you sometimes see *"Everything up-to-date"*
even though you changed files.

```bash
git add -A          # stage everything (new + modified + deleted)
git commit -m "your message"
git push origin main
```

> Use `git add -A` (not `git add .`) so brand-new files/folders get staged too.

---

## 🔎 Before pushing — see what *will* go up

```bash
git status                       # what's changed / staged
git log origin/main..HEAD --oneline   # commits you have that the remote doesn't
git diff --stat                  # summary of unstaged changes
git diff --cached --stat         # summary of staged changes
```

If `git log origin/main..HEAD` prints **nothing**, there is nothing to push
→ you still need to commit first.

---

## 📤 The different push commands & when to use each

| Situation | Command |
|---|---|
| Normal push to main | `git push origin main` |
| First push of a new branch (sets upstream) | `git push -u origin <branch>` |
| After setting upstream once, you can just | `git push` |
| Push a different local branch to main | `git push origin <branch>:main` |
| Push **all** local branches | `git push --all origin` |
| Push tags too | `git push origin --tags` |
| Push a single tag | `git push origin <tagname>` |

---

## ⚠️ Rewrote history? (rebase / amend / squash)

A normal push is **rejected** after you rewrite commits. Use a *lease* (safe force —
refuses if someone else pushed in the meantime):

```bash
git push --force-with-lease origin main
```

Avoid plain `git push -f` / `--force` — it can clobber remote work.

---

## 🔄 "Updates were rejected" (remote has commits you don't)

```bash
git pull --rebase origin main    # replay your commits on top of remote
# resolve any conflicts, then:
git push origin main
```

---

## 🔐 Auth / remote (devde ↔ agraw profile split)

Pushes here authenticate with a GitHub Personal Access Token embedded in the
remote URL. To (re)set it after rotating the token:

```bash
git remote set-url origin https://<github-username>:<NEW_TOKEN>@github.com/agrawaldevansh2994-web/ytmusic-plus.git
git push origin main
```

Check the current remote (note: this prints the embedded token):

```bash
git remote -v
```

> Keep tokens **out of committed files**. `.env.local` is gitignored, so it never
> gets pushed — but anything pasted there still lives on your disk. Rotate a token
> at github.com → Settings → Developer settings → Personal access tokens.

---

## 🧯 Undo / fixups (no push yet)

```bash
git reset --soft HEAD~1     # undo last commit, KEEP changes staged
git commit --amend          # edit the last commit (message or add staged files)
git restore --staged <file> # unstage a file (keep the edits)
```

If you already pushed, prefer a new commit over rewriting history.
