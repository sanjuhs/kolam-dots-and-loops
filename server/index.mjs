import { scheduleBackups } from "./backup.mjs";
import { createApp } from "./app.mjs";
const config = {
  baseURL: process.env.APP_URL || "http://localhost:8771",
  secret: process.env.BETTER_AUTH_SECRET,
  databasePath: process.env.DATABASE_PATH || "/data/kolam.sqlite",
  smtpURL: process.env.SMTP_URL,
  mailFrom: process.env.MAIL_FROM,
};
if (!config.secret || config.secret.length < 32)
  throw Error("BETTER_AUTH_SECRET must contain at least 32 characters");
const { app, db } = await createApp(config);
scheduleBackups(db, config.databasePath);
const server = app.listen(Number(process.env.PORT) || 3000, "0.0.0.0", () =>
  console.log("Kolam API listening"),
);
for (const event of ["SIGINT", "SIGTERM"])
  process.on(event, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
