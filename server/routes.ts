import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertSwipeSchema, insertMessageSchema, insertBlindDateSchema, insertArStorySchema, insertPaymentSchema, insertViolationSchema } from "@shared/schema";
import { z } from "zod";

// Content moderation for phone numbers
const phoneNumberRegex = /(\+?1?[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}|(\d{10})|(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})|(\(\d{3}\)\s?\d{3}[-.\s]?\d{4})/g;
const phoneWordRegex = /(zero|one|two|three|four|five|six|seven|eight|nine|oh)/gi;

function containsPhoneNumber(text: string): boolean {
  return phoneNumberRegex.test(text) || phoneWordRegex.test(text);
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  // WebSocket for real-time features
  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
      // Handle real-time messages, AR updates, etc.
      const data = JSON.parse(message.toString());
      
      // Broadcast to all connected clients (in real app, filter by relevant users)
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === client.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    });
  });

  // Auth routes
  app.post("/api/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const user = await storage.createUser(userData);
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (user.suspendedUntil && user.suspendedUntil > new Date()) {
        return res.status(403).json({ message: "Account suspended" });
      }

      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const updates = req.body;
      const user = await storage.updateUser(parseInt(req.params.id), updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Discovery routes
  app.get("/api/discover", async (req, res) => {
    try {
      const { userId, lat, lng, radius = 50 } = req.query;
      
      if (!userId || !lat || !lng) {
        return res.status(400).json({ message: "Missing required parameters" });
      }

      const currentUser = await storage.getUser(parseInt(userId as string));
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get all swipes to exclude already swiped users
      const swipes = await Promise.all(
        Array.from({ length: 100 }, (_, i) => storage.getSwipe(currentUser.id, i + 1))
      );
      const swipedIds = swipes.filter(Boolean).map(swipe => swipe!.swipedId);

      const nearbyUsers = await storage.getUsersNearby(
        parseFloat(lat as string),
        parseFloat(lng as string),
        parseInt(radius as string),
        [currentUser.id, ...swipedIds]
      );

      // Filter by preferences
      const filteredUsers = nearbyUsers.filter(user => {
        const age = new Date().getFullYear() - user.dateOfBirth.getFullYear();
        return age >= currentUser.ageMin && age <= currentUser.ageMax &&
               (currentUser.lookingFor === "both" || user.gender === currentUser.lookingFor);
      });

      res.json(filteredUsers.map(user => ({ ...user, password: undefined })));
    } catch (error) {
      res.status(500).json({ message: "Failed to get discovery users" });
    }
  });

  // Swipe routes
  app.post("/api/swipe", async (req, res) => {
    try {
      const swipeData = insertSwipeSchema.parse(req.body);
      
      // Check if already swiped
      const existingSwipe = await storage.getSwipe(swipeData.swiperId, swipeData.swipedId);
      if (existingSwipe) {
        return res.status(400).json({ message: "Already swiped" });
      }

      const swipe = await storage.createSwipe(swipeData);

      // Check for match if it's a like
      if (swipeData.action === "like") {
        const reciprocalSwipe = await storage.getSwipe(swipeData.swipedId, swipeData.swiperId);
        if (reciprocalSwipe && reciprocalSwipe.action === "like") {
          // Create match
          const match = await storage.createMatch({
            user1Id: swipeData.swiperId,
            user2Id: swipeData.swipedId,
          });
          return res.json({ swipe, match });
        }
      }

      res.json({ swipe });
    } catch (error) {
      res.status(400).json({ message: "Invalid swipe data" });
    }
  });

  // Match routes
  app.get("/api/matches/:userId", async (req, res) => {
    try {
      const matches = await storage.getMatches(parseInt(req.params.userId));
      res.json(matches);
    } catch (error) {
      res.status(500).json({ message: "Failed to get matches" });
    }
  });

  // Message routes
  app.get("/api/messages/:matchId", async (req, res) => {
    try {
      const messages = await storage.getMessagesByMatch(parseInt(req.params.matchId));
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      
      // Check for phone number violations
      if (containsPhoneNumber(messageData.content)) {
        // Create violation
        await storage.createViolation({
          userId: messageData.senderId,
          type: "phone_number",
          content: messageData.content,
          fineAmount: "100.00",
        });

        // Suspend user
        await storage.updateUser(messageData.senderId, {
          suspendedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        });

        return res.status(403).json({ 
          message: "Message contains phone number. Account suspended. $100 fine to restore account.",
          violation: true 
        });
      }

      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  // Blind date routes
  app.post("/api/blind-dates", async (req, res) => {
    try {
      const blindDateData = insertBlindDateSchema.parse(req.body);
      
      // Check user has sufficient balance
      const user = await storage.getUser(blindDateData.user1Id);
      if (!user || parseFloat(user.walletBalance) < parseFloat(blindDateData.amount)) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }

      const blindDate = await storage.createBlindDate(blindDateData);
      
      // Deduct amount from wallet
      await storage.updateUser(blindDateData.user1Id, {
        walletBalance: (parseFloat(user.walletBalance) - parseFloat(blindDateData.amount)).toString(),
      });

      res.json(blindDate);
    } catch (error) {
      res.status(400).json({ message: "Invalid blind date data" });
    }
  });

  app.get("/api/blind-dates/available", async (req, res) => {
    try {
      const { userId, lat, lng, radius } = req.query;
      
      if (!userId || !lat || !lng || !radius) {
        return res.status(400).json({ message: "Missing required parameters" });
      }

      const user = await storage.getUser(parseInt(userId as string));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Find available blind dates in radius
      const allBlindDates = Array.from({ length: 100 }, (_, i) => storage.getBlindDate(i + 1));
      const blindDates = (await Promise.all(allBlindDates)).filter(Boolean);
      
      const availableBlindDates = blindDates.filter(blindDate => {
        if (!blindDate || blindDate.status !== "pending" || blindDate.user1Id === user.id) return false;
        
        const distance = Math.sqrt(
          Math.pow(parseFloat(lat as string) - parseFloat(blindDate.centerLat), 2) +
          Math.pow(parseFloat(lng as string) - parseFloat(blindDate.centerLng), 2)
        ) * 111; // rough km conversion
        
        return distance <= parseInt(radius as string);
      });

      res.json(availableBlindDates);
    } catch (error) {
      res.status(500).json({ message: "Failed to get available blind dates" });
    }
  });

  app.post("/api/blind-dates/:id/join", async (req, res) => {
    try {
      const { userId } = req.body;
      const blindDateId = parseInt(req.params.id);
      
      const user = await storage.getUser(userId);
      const blindDate = await storage.getBlindDate(blindDateId);
      
      if (!user || !blindDate) {
        return res.status(404).json({ message: "User or blind date not found" });
      }

      if (parseFloat(user.walletBalance) < parseFloat(blindDate.amount)) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }

      const matchedBlindDate = await storage.matchBlindDate(blindDateId, userId);
      
      // Deduct amount from joining user's wallet
      await storage.updateUser(userId, {
        walletBalance: (parseFloat(user.walletBalance) - parseFloat(blindDate.amount)).toString(),
      });

      res.json(matchedBlindDate);
    } catch (error) {
      res.status(500).json({ message: "Failed to join blind date" });
    }
  });

  // AR Story routes
  app.get("/api/ar-stories", async (req, res) => {
    try {
      const { lat, lng, radius = 1000 } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ message: "Missing location parameters" });
      }

      const stories = await storage.getArStoriesNearby(
        parseFloat(lat as string),
        parseFloat(lng as string),
        parseInt(radius as string)
      );

      res.json(stories);
    } catch (error) {
      res.status(500).json({ message: "Failed to get AR stories" });
    }
  });

  app.post("/api/ar-stories", async (req, res) => {
    try {
      const storyData = insertArStorySchema.parse(req.body);
      const story = await storage.createArStory(storyData);
      res.json(story);
    } catch (error) {
      res.status(400).json({ message: "Invalid AR story data" });
    }
  });

  app.post("/api/ar-stories/:id/view", async (req, res) => {
    try {
      const success = await storage.incrementStoryViews(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Story not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to increment views" });
    }
  });

  // Payment routes
  app.post("/api/payments", async (req, res) => {
    try {
      const paymentData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(paymentData);
      
      // Simulate payment processing
      setTimeout(async () => {
        await storage.updatePayment(payment.id, {
          status: "completed",
          transactionId: `txn_${Date.now()}`,
        });

        // Update user wallet or premium status
        const user = await storage.getUser(paymentData.userId);
        if (user) {
          if (paymentData.type === "premium") {
            await storage.updateUser(paymentData.userId, { isPremium: true });
          } else if (paymentData.type === "fine") {
            await storage.updateUser(paymentData.userId, { suspendedUntil: null });
          } else {
            // Add to wallet
            const newBalance = (parseFloat(user.walletBalance) + parseFloat(paymentData.amount)).toString();
            await storage.updateUser(paymentData.userId, { walletBalance: newBalance });
          }
        }
      }, 2000);

      res.json(payment);
    } catch (error) {
      res.status(400).json({ message: "Invalid payment data" });
    }
  });

  app.get("/api/payments/:userId", async (req, res) => {
    try {
      const payments = await storage.getUserPayments(parseInt(req.params.userId));
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to get payments" });
    }
  });

  // Violation routes
  app.post("/api/violations", async (req, res) => {
    try {
      const violationData = insertViolationSchema.parse(req.body);
      const violation = await storage.createViolation(violationData);
      res.json(violation);
    } catch (error) {
      res.status(400).json({ message: "Invalid violation data" });
    }
  });

  app.get("/api/violations/:userId", async (req, res) => {
    try {
      const violations = await storage.getUserViolations(parseInt(req.params.userId));
      res.json(violations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get violations" });
    }
  });

  return httpServer;
}
