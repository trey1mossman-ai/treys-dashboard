# 🤝 TEAM SYNC PROTOCOL - Claude Code + Codex

## Team Roles & Responsibilities

### Claude Code (Team Lead)
- Architecture decisions
- Code review & quality
- Integration testing
- Production deployments

### Codex (Implementation)
- Feature development
- Bug fixes
- Performance optimization
- Documentation

### Claude (Support)
- User assistance
- Testing & validation
- Documentation updates
- Issue tracking

## Git Workflow

### Branches
- `main` → Production (auto-deploys to Vercel)
- `develop` → Staging 
- `feature/*` → New features
- `fix/*` → Bug fixes
- `team/*` → AI team coordination

### Commit Convention
```
type(scope): description

[TEAM: Claude/Codex/Code]
[STATUS: Complete/InProgress/NeedsReview]

Body with details...
```

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Testing
- chore: Maintenance

## Daily Sync Protocol

### Morning Sync (Start of Session)
1. Pull latest from GitHub
2. Check TEAM_STATUS.md
3. Review open issues
4. Update task assignments

### During Work
1. Commit frequently with clear messages
2. Update status files
3. Leave breadcrumbs for next session

### End of Session
1. Push all changes
2. Update TEAM_STATUS.md
3. Document blockers
4. Set next actions

## File Structure for Team Coordination

```
.claude/
├── team-sync.md          # This file - team protocol
├── tasks.md             # Current task list
├── blockers.md          # Issues needing resolution
└── decisions.md         # Architecture decisions

TEAM_STATUS.md           # Daily status updates
HANDOFF.md              # Session handoff notes
```

## Communication Protocol

### Status Updates
Always update these files:
- TEAM_STATUS.md - Overall project status
- HANDOFF.md - What you did, what's next
- .claude/tasks.md - Task assignments

### Code Comments
```javascript
// [TEAM: Claude Code] - Architecture decision
// TODO: [Codex] - Implement feature X
// FIXME: [Any] - Critical bug here
// NOTE: [All] - Important context
```

## Integration Points

### GitHub
- Source of truth for code
- Issue tracking
- Pull requests for review

### Vercel
- Auto-deploys from main branch
- Preview deploys from PRs
- Environment variables

### Supabase
- Database schema in `/migrations`
- Environment vars in Vercel
- Local dev uses `.env.local`

## Priority System

1. 🔴 **CRITICAL** - Production breaking
2. 🟠 **HIGH** - Major feature/blocking issue  
3. 🟡 **MEDIUM** - Important but not urgent
4. 🟢 **LOW** - Nice to have

## Handoff Template

```markdown
## Session Summary - [Date] [Time]

### Completed
- ✅ Task 1
- ✅ Task 2

### In Progress
- 🔄 Task 3 (50% done)

### Blocked
- ❌ Issue 1 (need X)

### Next Actions
1. Priority task
2. Secondary task

### Notes for Next Session
- Important context
- Decisions made
- Things to remember
```

## Environment Variables Protocol

### Never Commit
- API keys
- Passwords
- Private URLs

### Safe to Commit
- Public URLs
- Feature flags
- Non-sensitive config

### Sharing Secrets
1. Use Vercel Dashboard for production
2. Use encrypted .env.local for dev
3. Document in SECRETS.md (without values)

## Success Metrics

- ✅ Clean builds on every commit
- ✅ No TypeScript errors
- ✅ Bundle under 130KB
- ✅ All tests passing
- ✅ Webhooks connected
- ✅ Daily progress visible

## Emergency Protocol

If something breaks in production:
1. Rollback on Vercel immediately
2. Create EMERGENCY.md with details
3. Fix on `fix/emergency-*` branch
4. Test thoroughly
5. Deploy with detailed notes

---

**Team Ready for Synchronization!** 🚀
