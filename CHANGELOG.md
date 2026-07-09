# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-09

### Added
- Created `README.md` based on professional project templates.
- Added MIT `LICENSE` and contribution guidelines in `CONTRIBUTING.md`.
- Implemented email verification flow using Spring Boot Mail.
- Added `/api/auth/verify` endpoint to handle secure token validations.
- Enabled server-side pagination, search queries, priority sorting, and department specifications on `/api/requests` paths.
- Added CSV streaming download for service requests.
- Created `GlobalExceptionHandler` controller advice for structured error JSON responses.
- Added automated JUnit 5 unit and integration tests.
- Configured GitHub Actions CI pipeline `.github/workflows/ci.yml`.

### Changed
- Refactored frontend dashboards to eliminate high-risk `innerHTML` XSS security vulnerabilities.
- Switched default BCrypt cost factor to 12.
- Updated `application.properties` to load JWT secrets, admin secret, and SMTP settings from environment variables.
- Removed duplicate subfolder structure and Eclipse workspace files from tracking.
