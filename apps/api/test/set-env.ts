// Runs in every test worker before modules load.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://g.gagua@localhost:5432/game_room_test?schema=public';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';
process.env.ADMIN_EMAIL = 'admin@test.local';
process.env.ADMIN_PASSWORD = 'AdminPass1';
process.env.PC_AGENT_KEY = 'test-pc-key';
process.env.PC_COUNT = '10';
process.env.LOW_BALANCE_THRESHOLD_SECONDS = '300';
process.env.SESSION_TIMEOUT_SECONDS = '180';
process.env.HEARTBEAT_INTERVAL_SECONDS = '60';
process.env.APP_TIMEZONE = 'Asia/Tbilisi';
process.env.SMTP_HOST = '';
