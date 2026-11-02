# Changelog

## 0.2.0

- First public release.
- English and Turkish interface (`claudeThreads.language`).
- New projects save to `threads.json`, `open/`, `done/` (English) or `durum.json`, `acik/`, `biten/` (Turkish); folder names are fixed per project.
- The state file is merged before every write and reloaded when it changes on disk.
- Terminals opened by hand can be adopted through the shell PID (`kabukPid`).
- macOS shortcuts use `Cmd`.
