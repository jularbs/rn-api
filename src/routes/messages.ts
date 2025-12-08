import { Router } from "express";
import {
  getMessages,
  markMessageAsRead,
  deleteMessage,
  createMessage,
  getMessageById,
  markMessageAsUnread,
  getUnreadMessageCount,
} from "@/controllers/messagesController";
import { authenticate } from "@/middleware/auth";
import { createRateLimiter } from "@/middleware";

const router = Router();

// Rate limiting for messages endpoints
const messagesRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 3,
  message: "You can only upto 3 messages every 15 minutes. Please try again later.",
  skipFailedRequests: true, // Only count successful requests
}); // 1 successful attempt every 15 minutes

router.post("/v1/messages", messagesRateLimit, createMessage);

// Protected routes for message operations
router.get("/v1/messages", authenticate, getMessages);
router.get("/v1/messages/unread/count", authenticate, getUnreadMessageCount);
router.get("/v1/messages/:id", authenticate, getMessageById);

router.put("/v1/messages/:id/read", authenticate, markMessageAsRead);
router.put("/v1/messages/:id/unread", authenticate, markMessageAsUnread);

// Admin/manager only route for deleting messages
router.delete("/v1/messages/:id", authenticate, deleteMessage);


export default router;
