# Bank Customer Feedback System

A full-stack web application for collecting and managing customer feedback for a bank.

## Features

- Customer feedback submission with categories and ratings
- Admin dashboard for viewing and responding to feedback
- Filtering by category and rating
- Analytics with average ratings per category
- User authentication (basic)

## Technologies Used

- Backend: Java Spring Boot
- Database: MySQL
- Frontend: HTML, CSS, JavaScript
- Charts: Chart.js

## Setup Instructions

1. **Database Setup:**
   - Create a MySQL database named `bank_feedback_db`
   - Run the SQL script in `schema.sql` to create tables and insert sample data

2. **Backend Setup:**
   - Update `application.properties` with your MySQL credentials
   - Run the Spring Boot application: `mvn spring-boot:run`

3. **Frontend:**
   - The frontend is served by Spring Boot from `src/main/resources/static`
   - Access the customer page at: `http://localhost:8080/`
   - Access the admin dashboard at: `http://localhost:8080/admin.html`

## API Endpoints

- `POST /api/feedback` - Submit feedback
- `GET /api/feedback` - Get all feedback
- `GET /api/feedback/filter` - Filter feedback by category/rating
- `POST /api/feedback/response` - Admin response to feedback
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

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

1. Ensure MySQL is running and the database is set up
2. Run `mvn spring-boot:run` from the project root
3. Open `http://localhost:8080/` in your browser for the customer interface
4. Open `http://localhost:8080/admin.html` for the admin dashboard