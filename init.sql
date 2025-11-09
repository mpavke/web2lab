DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  salary NUMERIC(10,2) NOT NULL
);
INSERT INTO users (username, password, salary) VALUES
  ('alice', 'alicepass', 4000.00),
  ('bob', 'bobpass', 2349.49)
ON CONFLICT (username) DO NOTHING;