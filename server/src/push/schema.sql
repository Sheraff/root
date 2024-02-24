CREATE TABLE IF NOT EXISTS push_subscriptions (
	id TEXT NOT NULL PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users (id),
	endpoint TEXT NOT NULL,
	p256dh TEXT NOT NULL,
	auth TEXT NOT NULL,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS key_values (
	key TEXT NOT NULL PRIMARY KEY,
	value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id ON push_subscriptions (user_id);