package com.bankfeedback;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DatabaseMigrationTest {

    @Test
    void upgradesExistingSchemaWithoutLosingFeedback() throws Exception {
        String url = databaseUrl("legacy");
        try (Connection connection = DriverManager.getConnection(url, "sa", "");
             Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE users (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE, password VARCHAR(255) NOT NULL, role ENUM('CUSTOMER','ADMIN') NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
            statement.execute("CREATE TABLE feedback (id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id BIGINT NOT NULL, category ENUM('ATM','LOAN','ONLINE_BANKING','CUSTOMER_SUPPORT') NOT NULL, rating INT NOT NULL, comments TEXT, status ENUM('PENDING','RESPONDED') DEFAULT 'PENDING', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))");
            statement.execute("CREATE TABLE responses (id BIGINT AUTO_INCREMENT PRIMARY KEY, feedback_id BIGINT NOT NULL, admin_id BIGINT NOT NULL, response_text TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (feedback_id) REFERENCES feedback(id), FOREIGN KEY (admin_id) REFERENCES users(id))");
            statement.execute("INSERT INTO users (id, name, email, password, role) VALUES (7, 'Existing Customer', 'existing@example.com', 'encoded', 'CUSTOMER')");
            statement.execute("INSERT INTO feedback (id, user_id, category, rating, comments, status) VALUES (42, 7, 'ATM', 2, 'Keep this record', 'RESPONDED')");
        }

        migrate(url);

        try (Connection connection = DriverManager.getConnection(url, "sa", "");
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT id, complaint_number, comments, status FROM feedback WHERE id = 42")) {
            assertTrue(result.next());
            assertEquals(42L, result.getLong("id"));
            assertEquals("BF-00000042", result.getString("complaint_number"));
            assertEquals("Keep this record", result.getString("comments"));
            assertEquals("RESPONDED", result.getString("status"));
        }
    }

    @Test
    void createsCurrentSchemaForAnEmptyDatabase() throws Exception {
        String url = databaseUrl("fresh");

        migrate(url);

        try (Connection connection = DriverManager.getConnection(url, "sa", "");
             ResultSet result = connection.getMetaData().getTables(null, null, "FEEDBACK_STATUS_HISTORY", null)) {
            assertTrue(result.next());
        }
    }

    private static void migrate(String url) {
        Flyway.configure()
                .dataSource(url, "sa", "")
                .baselineOnMigrate(true)
                .baselineVersion("1")
                .locations("classpath:db/migration")
                .load()
                .migrate();
    }

    private static String databaseUrl(String suffix) {
        return "jdbc:h2:mem:" + suffix + UUID.randomUUID().toString().replace("-", "") + ";MODE=MySQL;DB_CLOSE_DELAY=-1";
    }
}