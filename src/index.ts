// index.ts
import express from "express";
import routes from "./routes";
import { ENV } from "./config/env";

const app = express();

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", routes);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ 
    error: "Internal server error",
    message: err.message 
  });
});

app.listen(ENV.PORT, () => {
  console.log(`🚀 Server running on port ${ENV.PORT}`);
  console.log(`📱 WhatsApp webhook: http://localhost:${ENV.PORT}/api/whatsapp/webhook`);
  console.log(`🔔 Mavapay webhook: http://localhost:${ENV.PORT}/api/mavapay/webhook`);
});