# Bank Customer Feedback System

A full-stack web application for collecting and managing customer feedback for a bank.

## Features

- Customer feedback submission with categories and ratings
- Customer registration, sign-in, and private feedback history
- Unique complaint numbers, staff assignment, status tracking, and status history
- Staff/admin dashboard for responding to and resolving complaints
- Filtering by category and rating
- Analytics with category ratings and complaint-status charts
- Session authentication, CSRF protection, and role-based API access

## Technologies Used

- Backend: Java Spring Boot
- Database: MySQL
- Frontend: HTML, CSS, JavaScript
- Charts: Chart.js

## Setup Instructions

1. **Database Setup:**
   - Configure MySQL and take a backup before applying application changes.
   - `schema.sql` is for a new, empty development database only. Do not run it against an existing database.
   - Flyway runs versioned migrations on application startup. Review and approve the migration and test it against a database clone before deploying to production.

2. **Backend Setup:**
   - Set `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, and `SPRING_DATASOURCE_PASSWORD` as environment variables. `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` are accepted as aliases.
   - Never put database credentials in `application.properties` or commit them to Git.
   - Run the Spring Boot application: `mvn spring-boot:run`

3. **Optional Demo Data:**
   - Demo seeding is disabled unless the `demo` Spring profile is active.
   - When using that profile, configure `DEMO_ADMIN_PASSWORD` and `DEMO_CUSTOMER_PASSWORD` as environment variables. Each must be 12 to 72 characters.
   - Do not enable the demo profile on a production database.

4. **Frontend:**
   - The frontend is served by Spring Boot from `src/main/resources/static`
   - Access the customer page at: `http://localhost:8080/`
   - Access the admin dashboard at: `http://localhost:8080/admin.html`

## API Endpoints

- `POST /api/auth/register` - Register a customer
- `POST /api/auth/login` - Create an authenticated session
- `GET /api/auth/me` - Get the current user
- `POST /api/auth/logout` - End the session
- `POST /api/feedback` - Submit feedback as the authenticated customer
- `GET /api/feedback/mine` - Get the customer's history
- `GET /api/feedback/community` - Get anonymized community feedback
- `GET /api/feedback` - Staff/admin complaint queue
- `PATCH /api/feedback/{id}/assignment` - Assign a complaint (admin)
- `PATCH /api/feedback/{id}/status` - Advance complaint status (assigned staff/admin)
- `GET /api/feedback/{id}/history` - View status history (owner/staff/admin)
- `POST /api/feedback/response` - Respond to a complaint (assigned staff/admin)

## Project Structure

```
src/
├── main/
│   ├── java/com/bankfeedback/
│   │   ├── BankFeedbackApplication.java
│   │   ├── controller/
│   │   │   ├── AuthController.java
│   │   │   └── FeedbackController.java
│   │   ├── entity/
│   │   │   ├── Feedback.java
│   │   │   ├── Response.java
│   │   │   └── User.java
│   │   ├── repository/
│   │   │   ├── FeedbackRepository.java
│   │   │   ├── ResponseRepository.java
│   │   │   └── UserRepository.java
│   │   ├── service/
│   │   │   ├── FeedbackService.java
│   │   │   └── UserService.java
│   │   └── config/
│   │       └── SecurityConfig.java
│   └── resources/
│       ├── static/
│       │   ├── index.html
│       │   ├── admin.html
│       │   ├── css/
│       │   │   ├── style.css
│       │   │   └── admin.css
│       │   └── js/
│       │       ├── app.js
│       │       └── admin.js
│       └── application.properties
└── test/
```

## Running the Application

1. Ensure the MySQL database is backed up and environment variables are configured
2. Run `mvn spring-boot:run` from the project root
3. Open `http://localhost:8080/` in your browser for the customer interface
4. Open `http://localhost:8080/admin.html` for the admin dashboard

## Render Deployment

- Keep the existing Render service, linked repository, and environment settings. The application supports the standard `SPRING_DATASOURCE_*` names and the `DB_*` aliases.
- Before the first deployment containing migrations, create a Render MySQL backup/snapshot and validate the migration against a clone of the production schema and representative data.
- Flyway baselines an existing non-empty schema at version 1 and then applies later migrations. Verify that the existing tables match the original schema before allowing startup to migrate them.
- Do not include `target/` build output in commits. Disable automatic deployment until changes and the database migration have been reviewed; deploy manually only after approval.
- After deployment, inspect Render build/runtime logs, sign in as a customer and staff/admin account, verify complaint history and status changes, and confirm existing records remain present.