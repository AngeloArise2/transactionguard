---
description: Verify the current BUILD_PROMPT.md phase's acceptance criteria before moving to the next phase
---

Look at `BUILD_PROMPT.md`. Determine which phase was most recently worked on based on the current state of the repository (check which files/folders already exist against the phase steps).

For that phase only:

1. Re-state the phase's "Acceptance criteria" section from `BUILD_PROMPT.md` verbatim.
2. Go through each criterion and actually verify it against the real code/running system — run the relevant `mvn`/`ng`/`docker`/`curl` command yourself rather than assuming.
3. Report pass/fail per criterion, the same way `reviewer` agent does.
4. If everything passes, explicitly say: "Phase N acceptance criteria met — safe to proceed to Phase N+1" and give a 2-3 sentence plain-English summary of what this phase actually accomplished, for the developer to read before moving on.
5. If anything fails, stop and list exactly what needs fixing before the next phase should start. Do not proceed to build the next phase in the same turn.