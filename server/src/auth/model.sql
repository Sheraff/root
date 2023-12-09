CREATE TABLE
	IF NOT EXISTS users (id TEXT NOT NULL PRIMARY KEY, email TEXT NOT NULL);

CREATE TABLE
	IF NOT EXISTS sessions (
		id TEXT PRIMARY KEY,
		session JSON NOT NULL,
		expires_at DATETIME NOT NULL,
		provider TEXT,
		provider_user_id TEXT,
		provider_email TEXT,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

CREATE TABLE
	IF NOT EXISTS accounts (
		id TEXT NOT NULL PRIMARY KEY,
		user_id TEXT NOT NULL REFERENCES users (id),
		provider TEXT NOT NULL,
		provider_user_id TEXT NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		UNIQUE (user_id, provider, provider_user_id)
	);

CREATE TABLE
	IF NOT EXISTS invites (
		code TEXT NOT NULL PRIMARY KEY,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		expires_at DATETIME NOT NULL
	);

CREATE INDEX IF NOT EXISTS accounts_session_lookup ON accounts (provider, provider_user_id);

CREATE INDEX IF NOT EXISTS accounts_user_id ON accounts (user_id);