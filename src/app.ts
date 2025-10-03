import express from "express";
import bodyParser from "body-parser";
import whatsappRoutes from "./routes/whatsapp.routes";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use("/whatsapp", whatsappRoutes);

export default app;
