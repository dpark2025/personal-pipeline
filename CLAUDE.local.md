# Claude.local.md

This document provides project overrides for claude should consider when doing work in this repository. It should supercede and directives at the user or system level.

### Project Planning Strategies

* Planning documents should all be placed into the `planning` directory at the root of the repository.
* Agent role files should be placed into the `agents` directory at the root of the repository.
* Claude command markdown files should be placed into the `claude/commands` directory located at the root of the repository.

### Project Documentation Strategies

* All documentation for the project and related artifacts should reside in a directory called `docs` at the root of the repository. Create one if it does not exist.
* The documentation we should maintain are:
  * Design diagrams of how the service operates internally and any external dependencies. Diagrams should be drawn in the mermaid language for easy portability.
  * Developer documentation that will be used by developers who will be utilizing the API this service will present
  * Useful tips and guides for any tools that can be used to test or exercise the API.
* Documentation should be created as markdown files.
