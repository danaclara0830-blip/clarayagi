---
name: shotsheet-finisher
description: Finish YAGI Shot Sheet prompts locally using Claude Code (subscription) instead of the paid in-app Anthropic API. Use when the user points to a *_claude_export folder or *_claude_export.zip produced by the Shot Sheet app's "⬇ Claude Code Export" button (it contains frames/ + shotsheet.json), and wants per-frame scene descriptions, subject/character swaps, or prompt customization applied in bulk and written out as ready-to-paste prompt files. Triggers: "장면묘사 채워줘", "인물 교체", "프롬프트 커스터마이징", "shotsheet export 처리".
---

# Shot Sheet Prompt Finisher

Finish the prompts from a YAGI Shot Sheet export **on the Claude Code side** — the same
Vision scene-analysis and prompt-customization the web app does via the paid API, but run
here (covered by the user's Claude Code plan, no per-call API metering).

## Input

A folder (unzip the `*_claude_export.zip` first if needed) containing:

- `frames/` — one image per shot (`SC01_720x1280.png`, …)
- `shotsheet.json` — manifest: for each frame `{ sc, tc, image, resolution, shotType,
  cameraMove, colors[], analysis{temp,tempK,exposure,contrast,saturation,avgLuma},
  hasVisionDesc, visionDesc, prompts{nanoMatch,nanoAdapt,gptMatch,gptAdapt,style} }`
- `README.md`

If given a `.zip`, unzip it (e.g. `unzip -o file.zip -d ./`) and locate `shotsheet.json`.

## Step 1 — Determine the task (ask if unclear)

Ask the user which operation, unless they already said:

1. **Scene description fill** — for frames where `hasVisionDesc` is false, look at the image
   and write scene/subject/composition/lighting/mood, then fold it into the chosen base
   prompt(s).
2. **Subject / character swap** — replace the person in the prompt with a reference person.
   Requires a **reference image path** + which base prompt (default `gptAdapt`).
3. **Custom change** — any free-form instruction (e.g. "change background to garden",
   "make lighting warmer").

Also confirm **which base prompt** to finish: `nanoMatch | nanoAdapt | gptMatch | gptAdapt`
(default `gptAdapt` for adaptation tasks, `gptMatch` / `nanoMatch` for faithful recreation).

## Step 2 — Process each frame

For every frame in `shotsheet.json` (process them all unless the user names a subset):

1. **Read the frame image** at `frames/<...>` with the Read tool — actually look at it.
2. If the task needs a reference person, **Read that reference image** too.
3. Produce the finished prompt following the rules below.

### Prompt-engineering rules (match the app exactly)

- **Preserve** every `[대괄호]` placeholder, `<<<UUID>>>`, and `[soul_id]` tag **verbatim** —
  they are user fill-ins / Higgsfield reference anchors, never remove or resolve them.
- **Keep the structural format** of the base prompt (Nano: `[SCENE BLUEPRINT] [SUBJECT]
  [LIGHTING] [CAMERA/LENS] [STYLE] [CONSTRAINTS]`; GPT: `[Subject] [Action] [Scene]
  [Composition] [Lighting] [Style] [Constraints]`). Fill blocks, don't restructure.
- Ground descriptions in what you **see in the frame** and in the frame's `analysis` data
  (color temp, exposure, contrast, palette hex) + `cameraMove`. Stay photographically precise.
- **Fashion editorial** register. `photorealistic` for GPT. Practical light sources only;
  no invented ring lights/strobes unless visible.
- For **subject swap**: describe the reference person's hair, face structure, skin tone,
  build, and styling in words, and rewrite only the subject/action portions to match; keep
  scene, lighting, camera, grade from the base. Add a note that true face-lock needs a
  Higgsfield Element `<<<UUID>>>` (text description alone approximates, not locks, the face).
- **Output only the finished prompt text** per frame — no preamble, no explanation.

## Step 3 — Write outputs

Create an `output/` folder next to `shotsheet.json` and write:

- `output/<sc>_final.md` per frame — the finished prompt (plus a 1-line header `# SC01 · TC 00:04`).
- `output/all_prompts.md` — all frames concatenated, each under its `## SCxx` heading, so the
  user can copy the whole set at once.

Then report a short summary: how many frames processed, which base prompt + operation was
applied, and remind about the Higgsfield Element requirement if a subject swap was done.

## Notes

- This runs under the user's Claude Code plan, **not** the app's metered API — that's the point.
- Don't call the Anthropic API or the app's `/api/analyze`; do the vision + rewriting yourself.
- If `frames/` images are missing but `shotsheet.json` has `visionDesc`, you can still finish
  text prompts from the stored description — just note the images weren't available.
