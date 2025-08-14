# Document Organization Protocol

## Primary Rule: Single Source of Truth

**ALL project tracking goes through `planning/project-milestones.md`** - this is the master document that must always be consulted and updated.

## Implementation Detail Linking

When working on each task/milestone:

1. **Track progress in project-milestones.md** 
   - Mark tasks as in-progress, completed, etc.
   - Update dates and status

2. **Create linked implementation documents**
   - For each major task/milestone, create a separate detailed implementation document
   - Link to it FROM the milestone document
   - Use format: `See [implementation details](path/to/implementation-doc.md)`

3. **Document naming convention**
   - Implementation docs should be descriptive
   - Place in appropriate directory (planning/, docs/, etc.)
   - Examples: `planning/github-adapter-implementation.md`, `docs/database-adapter-guide.md`

## Benefits of This Approach

- Single source of truth (project-milestones.md)
- Detailed implementation docs don't clutter the main planning doc
- Easy to navigate - always start with milestones, drill down as needed
- Clear project overview while maintaining implementation detail access

## Going Forward

- Always update project-milestones.md first
- Create implementation detail docs as needed
- Link from milestones to implementation docs
- No parallel tracking systems