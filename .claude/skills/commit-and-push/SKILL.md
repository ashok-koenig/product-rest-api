---
name: commit-and-push
description: Stage all changes, generate a Conventional Commits message, commit, and push the current branch.
disable-model-invocation: true
allowed-tools: Bash(git *)
---

## Current working tree status
!`git status --short`

## Staged and unstaged diff
!`git diff HEAD`

## Instructions

1. Review the diff above to understand what changed.
2. Stage all changes with: git add .
3. Choose the correct Conventional Commits prefix:
   - feat:     new feature or endpoint
   - fix:      bug fix
   - test:     adding or updating tests
   - docs:     documentation only
   - refactor: code restructuring without behaviour change
   - chore:    build scripts, config, tooling
4. Write a commit message: <prefix>: <short imperative summary>
   Example: feat: add price range filter to GET /products
5. Run: git commit -m "<your message>"
6. Push the current branch: git push origin HEAD
7. Report the commit hash and push result.

Do not create a merge commit. Do not push to main directly.
