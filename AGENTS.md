# Local storage

The user requires local work, generated files, downloads, caches, and temporary files to live on D:, because C: has limited space.

- The actual project directory is `D:\Projetos\site-kau`. Use this explicit working directory for commands. The former Desktop path on C: is only a compatibility junction.
- Use `D:\CodexCache\npm` for npm's cache and `D:\CodexCache\ms-playwright` for Playwright browsers.
- Before commands that create temporary files, set the process environment variables `TEMP` and `TMP` to `D:\CodexCache\temp`. Set `NPM_CONFIG_CACHE` and `PLAYWRIGHT_BROWSERS_PATH` to the D: cache paths when running those tools.
- Keep dependencies, builds, screenshots, test reports, and other project output under this D: project. Do not create new working copies or bulk storage on C:.
- Do not move unrelated application data or modify global Windows temporary-directory settings without a task-specific reason.

# Design skill

For visual redesign work, the user requested Awesome Design Tools. The upstream repository is a resource catalog without a native SKILL.md. A local adaptation is installed at `D:\CodexSkills\awesome-design-tools\SKILL.md`; read that skill when applying it. The original source and license are recorded alongside it. Do not describe the adaptation as an official upstream skill.
