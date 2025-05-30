import { 
  users, profiles, matches, swipes, messages, blindDates, arStories, payments, violations,
  type User, type InsertUser, type Profile, type InsertProfile, 
  type Match, type InsertMatch, type Swipe, type InsertSwipe,
  type Message, type InsertMessage, type BlindDate, type InsertBlindDate,
  type ArStory, type InsertArStory, type Payment, type InsertPayment,
  type Violation, type InsertViolation
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  getUsersNearby(lat: number, lng: number, radius: number, excludeIds: number[]): Promise<User[]>;
  
  // Profiles
  getProfilesByUserId(userId: number): Promise<Profile[]>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  deleteProfile(id: number): Promise<boolean>;
  
  // Swipes & Matches
  getSwipe(swiperId: number, swipedId: number): Promise<Swipe | undefined>;
  createSwipe(swipe: InsertSwipe): Promise<Swipe>;
  getMatches(userId: number): Promise<Match[]>;
  createMatch(match: InsertMatch): Promise<Match>;
  
  // Messages
  getMessagesByMatch(matchId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<boolean>;
  
  // Blind Dates
  getBlindDate(id: number): Promise<BlindDate | undefined>;
  getActiveBlindDates(userId: number): Promise<BlindDate[]>;
  createBlindDate(blindDate: InsertBlindDate): Promise<BlindDate>;
  updateBlindDate(id: number, updates: Partial<BlindDate>): Promise<BlindDate | undefined>;
  matchBlindDate(blindDateId: number, user2Id: number): Promise<BlindDate | undefined>;
  
  // AR Stories
  getArStoriesNearby(lat: number, lng: number, radius: number): Promise<ArStory[]>;
  createArStory(story: InsertArStory): Promise<ArStory>;
  incrementStoryViews(id: number): Promise<boolean>;
  
  // Payments
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, updates: Partial<Payment>): Promise<Payment | undefined>;
  getUserPayments(userId: number): Promise<Payment[]>;
  
  // Violations
  createViolation(violation: InsertViolation): Promise<Violation>;
  getUserViolations(userId: number): Promise<Violation[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private profiles: Map<number, Profile> = new Map();
  private matches: Map<number, Match> = new Map();
  private swipes: Map<number, Swipe> = new Map();
  private messages: Map<number, Message> = new Map();
  private blindDates: Map<number, BlindDate> = new Map();
  private arStories: Map<number, ArStory> = new Map();
  private payments: Map<number, Payment> = new Map();
  private violations: Map<number, Violation> = new Map();
  
  private currentUserId = 1;
  private currentProfileId = 1;
  private currentMatchId = 1;
  private currentSwipeId = 1;
  private currentMessageId = 1;
  private currentBlindDateId = 1;
  private currentArStoryId = 1;
  private currentPaymentId = 1;
  private currentViolationId = 1;

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: this.currentUserId++,
      isVerified: false,
      isPremium: false,
      isActive: true,
      lastActive: new Date(),
      walletBalance: "0.00",
      suspendedUntil: null,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getUsersNearby(lat: number, lng: number, radius: number, excludeIds: number[]): Promise<User[]> {
    const users = Array.from(this.users.values()).filter(user => {
      if (excludeIds.includes(user.id) || !user.latitude || !user.longitude) return false;
      
      // Simple distance calculation (not precise but works for demo)
      const userLat = parseFloat(user.latitude);
      const userLng = parseFloat(user.longitude);
      const distance = Math.sqrt(Math.pow(lat - userLat, 2) + Math.pow(lng - userLng, 2)) * 111; // rough km conversion
      
      return distance <= radius;
    });
    
    return users;
  }

  // Profiles
  async getProfilesByUserId(userId: number): Promise<Profile[]> {
    return Array.from(this.profiles.values()).filter(profile => profile.userId === userId);
  }

  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const profile: Profile = {
      ...insertProfile,
      id: this.currentProfileId++,
      isApproved: false,
    };
    this.profiles.set(profile.id, profile);
    return profile;
  }

  async deleteProfile(id: number): Promise<boolean> {
    return this.profiles.delete(id);
  }

  // Swipes & Matches
  async getSwipe(swiperId: number, swipedId: number): Promise<Swipe | undefined> {
    return Array.from(this.swipes.values()).find(
      swipe => swipe.swiperId === swiperId && swipe.swipedId === swipedId
    );
  }

  async createSwipe(insertSwipe: InsertSwipe): Promise<Swipe> {
    const swipe: Swipe = {
      ...insertSwipe,
      id: this.currentSwipeId++,
      createdAt: new Date(),
    };
    this.swipes.set(swipe.id, swipe);
    return swipe;
  }

  async getMatches(userId: number): Promise<Match[]> {
    return Array.from(this.matches.values()).filter(
      match => (match.user1Id === userId || match.user2Id === userId) && match.isActive
    );
  }

  async createMatch(insertMatch: InsertMatch): Promise<Match> {
    const match: Match = {
      ...insertMatch,
      id: this.currentMatchId++,
      isActive: true,
      matchedAt: new Date(),
    };
    this.matches.set(match.id, match);
    return match;
  }

  // Messages
  async getMessagesByMatch(matchId: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(message => message.matchId === matchId);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const message: Message = {
      ...insertMessage,
      id: this.currentMessageId++,
      isRead: false,
      sentAt: new Date(),
    };
    this.messages.set(message.id, message);
    return message;
  }

  async markMessageAsRead(id: number): Promise<boolean> {
    const message = this.messages.get(id);
    if (!message) return false;
    
    message.isRead = true;
    this.messages.set(id, message);
    return true;
  }

  // Blind Dates
  async getBlindDate(id: number): Promise<BlindDate | undefined> {
    return this.blindDates.get(id);
  }

  async getActiveBlindDates(userId: number): Promise<BlindDate[]> {
    return Array.from(this.blindDates.values()).filter(
      blindDate => blindDate.user1Id === userId && blindDate.status === "pending"
    );
  }

  async createBlindDate(insertBlindDate: InsertBlindDate): Promise<BlindDate> {
    const blindDate: BlindDate = {
      ...insertBlindDate,
      id: this.currentBlindDateId++,
      user2Id: null,
      status: "pending",
      scheduledFor: null,
      createdAt: new Date(),
    };
    this.blindDates.set(blindDate.id, blindDate);
    return blindDate;
  }

  async updateBlindDate(id: number, updates: Partial<BlindDate>): Promise<BlindDate | undefined> {
    const blindDate = this.blindDates.get(id);
    if (!blindDate) return undefined;
    
    const updatedBlindDate = { ...blindDate, ...updates };
    this.blindDates.set(id, updatedBlindDate);
    return updatedBlindDate;
  }

  async matchBlindDate(blindDateId: number, user2Id: number): Promise<BlindDate | undefined> {
    return this.updateBlindDate(blindDateId, {
      user2Id,
      status: "matched",
      scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    });
  }

  // AR Stories
  async getArStoriesNearby(lat: number, lng: number, radius: number): Promise<ArStory[]> {
    const now = new Date();
    return Array.from(this.arStories.values()).filter(story => {
      if (story.expiresAt < now) return false;
      
      const storyLat = parseFloat(story.latitude);
      const storyLng = parseFloat(story.longitude);
      const distance = Math.sqrt(Math.pow(lat - storyLat, 2) + Math.pow(lng - storyLng, 2)) * 111000; // meters
      
      return distance <= radius;
    });
  }

  async createArStory(insertArStory: InsertArStory): Promise<ArStory> {
    const story: ArStory = {
      ...insertArStory,
      id: this.currentArStoryId++,
      views: 0,
      createdAt: new Date(),
    };
    this.arStories.set(story.id, story);
    return story;
  }

  async incrementStoryViews(id: number): Promise<boolean> {
    const story = this.arStories.get(id);
    if (!story) return false;
    
    story.views++;
    this.arStories.set(id, story);
    return true;
  }

  // Payments
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const payment: Payment = {
      ...insertPayment,
      id: this.currentPaymentId++,
      status: "pending",
      transactionId: null,
      createdAt: new Date(),
    };
    this.payments.set(payment.id, payment);
    return payment;
  }

  async updatePayment(id: number, updates: Partial<Payment>): Promise<Payment | undefined> {
    const payment = this.payments.get(id);
    if (!payment) return undefined;
    
    const updatedPayment = { ...payment, ...updates };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }

  async getUserPayments(userId: number): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(payment => payment.userId === userId);
  }

  // Violations
  async createViolation(insertViolation: InsertViolation): Promise<Violation> {
    const violation: Violation = {
      ...insertViolation,
      id: this.currentViolationId++,
      status: "pending",
      createdAt: new Date(),
    };
    this.violations.set(violation.id, violation);
    return violation;
  }

  async getUserViolations(userId: number): Promise<Violation[]> {
    return Array.from(this.violations.values()).filter(violation => violation.userId === userId);
  }
}

export const storage = new MemStorage();
