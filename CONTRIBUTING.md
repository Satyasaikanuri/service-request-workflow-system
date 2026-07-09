# Contributing to Service Portal Workflow Automation System

We welcome contributions to this open-source training project! To maintain code quality and professional standards, please follow these guidelines.

## Development Setup
1. Fork and clone the repository.
2. Ensure you have Java 21, Maven, and MySQL installed locally.
3. Copy `.env.example` to `.env` and fill in your local MySQL and SMTP settings.
4. Run `mvn clean install` to ensure the project builds correctly.

## Branch Naming & Git Workflow
We follow semantic branch names and conventional commits.

- **Branch Naming**:
  - `feat/feature-name` for new features.
  - `fix/bug-name` for bug fixes.
  - `docs/doc-update` for documentation changes.
  - `refactor/code-improvement` for code changes that do not alter behavior.

- **Commit Messages**: Commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) spec:
  - `feat: add email verification flow`
  - `fix: correct XSS innerHTML vulnerability`
  - `docs: update deployment instruction`

## Pull Request Guidelines
1. Ensure all code changes are linted and pass existing tests.
2. Add new JUnit test cases to cover the code path you modified/added.
3. Open a Pull Request from your feature branch to `main`.
4. Fill in the Pull Request template completely, detailing what was changed, why, and how you verified it.
