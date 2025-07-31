# Claude.local.md

This document provides project overrides for claude should consider when doing work in this repository. It should supercede and directives at the user or system level.

## Project Planning Strategies

* **ALL project goal-related documents** should be placed into the `planning` directory at the root of the repository.
* This includes: milestones, roadmaps, implementation plans, project strategies, and any documents related to project objectives.
* The `docs` directory is reserved for: technical documentation, API docs, user guides, architecture docs, and operational procedures.
* Agent role files should be placed into the `agents` directory at the root of the repository.
* Claude command markdown files should be placed into the `claude/commands` directory located at the root of the repository.
* When creating the Agent description markdowns we should always check:
  * https://docs.anthropic.com/en/docs/claude-code/sub-agents for the latest information
  * In the file format description where we define what tools are allowed the agent tool names should always have surrounding white spaces. Except before a comma.

## Project Documentation Strategies

* All documentation for the project and related artifacts should reside in a directory called `docs` at the root of the repository. Create one if it does not exist.
* The documentation we should maintain are:
  * Design diagrams of how the service operates internally and any external dependencies. Diagrams should be drawn in the mermaid language for easy portability.
  * Developer documentation that will be used by developers who will be utilizing the API this service will present
  * Useful tips and guides for any tools that can be used to test or exercise the API.
* Documentation should be created as markdown files.
* Agents with names should include at the top of any source file the following template:
```
Authored by: {AGENTNAME}
Date: {DATECREATED}
```
Add this to any existing comments or add a comment section at the top of the file with this information.
## Task Strategies
* Try to only do a few changes at a time. If you come up with ideas on more things you would like to do, write out a file or add a TODO section to the top of the file you are working on with the additional changes. Try to only implement a few things at once.
