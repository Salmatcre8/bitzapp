import express, { Router } from "express";
import { unifiedWhatsAppWebhook } from "./../controllers/unified-whatsapp.controller";

const router = Router();

router.post(
  "/whatsapp/webhook", 
  express.urlencoded({ extended: true }), 
  unifiedWhatsAppWebhook
);

export default router;