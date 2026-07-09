# Service Portal Workflow Automation System
> Streamlined IT service request submission, automated agent assignment, and SLA tracking for modern enterprise teams.

[![CI](https://github.com/realshreyanshsingh/service-request-workflow-system/actions/workflows/ci.yml/badge.svg)](https://github.com/realshreyanshsingh/service-request-workflow-system/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Live Demo → https://service-request-workflow-system-1.onrender.com**

## Features
- **Submit Request Workflows**: Enable employees to submit custom hardware, software, or access requests with priorities.
- **Automated Load-Balanced Assignment**: Auto-assign tickets to available agents/approvers based on department mapping.
- **SLA Breach Monitoring**: Calculate due dates dynamically per priority policy and auto-escalate breached tickets.
- **Real-Time Dashboards**: Visualize request metrics, performance statistics, and daily trend logs with Chart.js.
- **Granular Role-Based Access (RBAC)**: Enforce distinct authorization scopes for Users, Managers, Approvers, and Admins.
- **Immutable Audit Trails**: Log system actions, views, and status changes for compliance audits.

## Tech Stack
Java 21 · Spring Boot · Spring Security (JWT) · Spring Data JPA · MySQL · HTML/CSS/JavaScript · Docker · Render

## Quick Start
```bash
# Clone the repository
git clone https://github.com/your-username/service-request-workflow-system && cd service-request-workflow-system

# Create your local environment configuration
cp .env.example .env # fill in SMTP credentials and database URLs

# Run application locally using Maven
mvn spring-boot:run
```

## Environment Variables
| Variable | Description | Default / Example |
| --- | --- | --- |
| `PORT` | Server listening port | `8080` |
| `MYSQL_PUBLIC_URL` | MySQL Database Connection URL | `mysql://localhost:3306/serviceportal` |
| `JWT_SECRET` | Secret key for signing authentication JSON Web Tokens | `mySecretKeyMySecretKeyMySecretKey123456` |
| `ADMIN_SECRET` | Security key required to register as an Admin user | `AdminSecret123` |
| `SMTP_HOST` | Outgoing SMTP mail server | `sandbox.smtp.mailtrap.io` |
| `SMTP_PORT` | Outgoing SMTP port | `2525` |
| `SMTP_USERNAME` | SMTP account username | `your-smtp-username` |
| `SMTP_PASSWORD` | SMTP account password | `your-smtp-password` |

## Email Verification & Gmail SMTP Integration

This application implements a secure email verification workflow. New registrations generate a secure, single-use token (UUID) and set `emailVerified = false` in the database. Users must click the verification link in their email to activate their account before they can login.

### How to Generate a Gmail App Password
To use Gmail SMTP in production, you must use a Google App Password rather than your primary account password:
1. Go to your **Google Account Settings** -> **Security**.
2. Enable **2-Step Verification** (required for App Passwords).
3. Search for **App Passwords** or navigate to the App Passwords section.
4. Select **Other (custom name)** and enter a name (e.g., `Service Portal`).
5. Click **Generate** and copy the 16-character password shown.

### Required Production Environment Variables
Configure the following variables in your Render environment configurations:
* `SMTP_HOST`: `smtp.gmail.com`
* `SMTP_PORT`: `587`
* `SMTP_USERNAME`: `your-email@gmail.com`
* `SMTP_PASSWORD`: `your-16-character-app-password`

## Architecture
This project uses a layered architecture separating repositories, models, services, and REST controllers. Authentication is stateless, managed using JWTs passed in requests. Security is enforced method-by-method in Spring Security using RBAC permissions. Business logic like SLA timing breaches runs on background schedules.
A detailed ERD and overview can be found in [docs/architecture.md](docs/architecture.md).

## Testing
```bash
# Run unit and integration test suites
mvn test
```

## Roadmap
- [x] Spring Boot backend + REST API controllers
- [x] Vanilla JS responsive dashboards (User, Admin, Approver, Manager)
- [x] SLA background escalation engine
- [x] Email verification flow via Spring Mail
- [x] Server-side search, filtering, and pagination
- [ ] Websocket-based real-time push notifications

## Demo Credentials
Reviewers can use these credentials to quickly access the portal roles without registering:
| Role | Username | Password | Notes |
| --- | --- | --- | --- |
| **Admin** | `admin` | `Admin123!` | System statistics, user/department configurations |
| **Approver** | `approver` | `Approver123!` | Review, approve, and reject department requests |
| **User** | `user` | `User123!` | Create requests and view timeline audits |

## License
MIT — see [LICENSE](LICENSE).

---
*Built as an enterprise-grade service portal case study.*
