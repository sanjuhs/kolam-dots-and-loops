import express from "express";
import { randomBytes } from "node:crypto";
import { createApp } from "./app.mjs";
const { app } = await createApp({
  baseURL: "http://127.0.0.1:8772",
  secret: randomBytes(32).toString("hex"),
  databasePath: ":memory:",
});
app.use((req, res, next) => {
  res.removeHeader("Content-Security-Policy");
  next();
});
app.use(express.static(new URL("../", import.meta.url).pathname));
app.listen(8772, "127.0.0.1", () =>
  console.log("Kolam local web and API on 8772"),
);
