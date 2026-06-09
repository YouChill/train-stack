-- Wersjonowanie JWT: reset hasła inkrementuje token_version, co unieważnia
-- wszystkie tokeny wydane wcześniej (api/_auth.js: signToken/verifyUser).
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0;
