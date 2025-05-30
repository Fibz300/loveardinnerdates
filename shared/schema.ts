import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  gender: text("gender").notNull(), // male, female, non-binary
  lookingFor: text("looking_for").notNull(), // male, female, both
  bio: text("bio"),
  occupation: text("occupation"),
  education: text("education"),
  height: integer("height"), // in cm
  isVerified: boolean("is_verified").default(false),
  isPremium: boolean("is_premium").default(false),
  isActive: boolean("is_active").default(true),
  lastActive: timestamp("last_active").defaultNow(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  maxDistance: integer("max_distance").default(50), // in km
  ageMin: integer("age_min").default(18),
  ageMax: integer("age_max").default(100),
  arTags: text("ar_tags").array(), // AR display tags
  isBlindDateActive: boolean("is_blind_date_active").default(false),
  walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).default("0.00"),
  suspendedUntil: timestamp("suspended_until"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  mediaType: text("media_type").notNull(), // photo, video
  mediaUrl: text("media_url").notNull(),
  order: integer("order").notNull(),
  isApproved: boolean("is_approved").default(false),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").references(() => users.id).notNull(),
  user2Id: integer("user2_id").references(() => users.id).notNull(),
  isActive: boolean("is_active").default(true),
  matchedAt: timestamp("matched_at").defaultNow(),
});

export const swipes = pgTable("swipes", {
  id: serial("id").primaryKey(),
  swiperId: integer("swiper_id").references(() => users.id).notNull(),
  swipedId: integer("swiped_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // like, pass, super_like
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").references(() => matches.id).notNull(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").default("text"), // text, image, video, voice
  isRead: boolean("is_read").default(false),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const dinnerDates = pgTable("dinner_dates", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").references(() => users.id).notNull(),
  user2Id: integer("user2_id").references(() => users.id),
  radius: integer("radius").notNull(), // in km
  centerLat: decimal("center_lat", { precision: 10, scale: 8 }).notNull(),
  centerLng: decimal("center_lng", { precision: 11, scale: 8 }).notNull(),
  experienceType: text("experience_type").notNull(), // dinner, drinks, coffee
  venueId: text("venue_id"), // OpenTable venue ID
  venueName: text("venue_name"),
  venueAddress: text("venue_address"),
  status: text("status").default("pending"), // pending, matched, completed, cancelled
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  scheduledFor: timestamp("scheduled_for"),
  reservationId: text("reservation_id"), // OpenTable reservation ID
  createdAt: timestamp("created_at").defaultNow(),
});

export const venues = pgTable("venues", {
  id: serial("id").primaryKey(),
  openTableId: text("opentable_id").unique(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  venueType: text("venue_type").notNull(), // restaurant, bar, cafe
  cuisineType: text("cuisine_type"),
  priceRange: text("price_range"), // $, $$, $$$, $$$$
  rating: decimal("rating", { precision: 3, scale: 2 }),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const arStories = pgTable("ar_stories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  videoUrl: text("video_url").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  radius: integer("radius").default(100), // in meters
  expiresAt: timestamp("expires_at").notNull(),
  views: integer("views").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(), // premium, blind_date, fine
  status: text("status").default("pending"), // pending, completed, failed
  paymentMethod: text("payment_method"),
  transactionId: text("transaction_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const violations = pgTable("violations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  reporterId: integer("reporter_id").references(() => users.id),
  type: text("type").notNull(), // phone_number, inappropriate_content, harassment
  content: text("content"),
  status: text("status").default("pending"), // pending, reviewed, resolved
  fineAmount: decimal("fine_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastActive: true,
  isVerified: true,
  isPremium: true,
  walletBalance: true,
  suspendedUntil: true,
});

export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  isApproved: true,
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  matchedAt: true,
});

export const insertSwipeSchema = createInsertSchema(swipes).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  sentAt: true,
  isRead: true,
});

export const insertDinnerDateSchema = createInsertSchema(dinnerDates).omit({
  id: true,
  user2Id: true,
  status: true,
  scheduledFor: true,
  reservationId: true,
  createdAt: true,
});

export const insertVenueSchema = createInsertSchema(venues).omit({
  id: true,
  createdAt: true,
});

export const insertArStorySchema = createInsertSchema(arStories).omit({
  id: true,
  views: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  status: true,
  transactionId: true,
  createdAt: true,
});

export const insertViolationSchema = createInsertSchema(violations).omit({
  id: true,
  status: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Swipe = typeof swipes.$inferSelect;
export type InsertSwipe = z.infer<typeof insertSwipeSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type DinnerDate = typeof dinnerDates.$inferSelect;
export type InsertDinnerDate = z.infer<typeof insertDinnerDateSchema>;
export type Venue = typeof venues.$inferSelect;
export type InsertVenue = z.infer<typeof insertVenueSchema>;
export type ArStory = typeof arStories.$inferSelect;
export type InsertArStory = z.infer<typeof insertArStorySchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Violation = typeof violations.$inferSelect;
export type InsertViolation = z.infer<typeof insertViolationSchema>;
