import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { getMigrations } from "better-auth/db/migration";
import nodemailer from "nodemailer";
export async function createAuth(db, config) {
  const transport = config.smtpURL
    ? nodemailer.createTransport(config.smtpURL)
    : null;
  const auth = betterAuth({
    appName: "Kolam · Dots & Loops",
    database: db,
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: [config.baseURL],
    telemetry: { enabled: false },
    disabledPaths: ["/sign-up/email", "/delete-user", "/change-email"],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      ...(transport
        ? {
            sendResetPassword: async ({ user, url }) => {
              if (user.email.endsWith(".invalid")) return;
              await transport.sendMail({
                from: config.mailFrom,
                to: user.email,
                subject: "Reset your Kolam password",
                text: `Use this link to choose a new password:\n${url}\n\nIf you did not ask for this, ignore this email.`,
              });
            },
          }
        : {}),
    },
    plugins: [
      username({
        minUsernameLength: 3,
        maxUsernameLength: 24,
        usernameValidator: (v) => /^[a-zA-Z0-9_]{3,24}$/.test(v),
      }),
    ],
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
    advanced: {
      cookiePrefix: "kolam",
      useSecureCookies: config.baseURL.startsWith("https:"),
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
      database: { generateId: () => crypto.randomUUID() },
    },
  });
  const migration = await getMigrations(auth.options);
  await migration.runMigrations();
  return auth;
}
