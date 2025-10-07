import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema - for future authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Recipe Types - using TypeScript interfaces for now (will use database later)

// Represents a single ingredient in a recipe
export interface Ingredient {
  name: string;
  amount: string;
  unit?: string;
}

// Represents nutritional information for a recipe
export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
}

// Main recipe interface
export interface Recipe {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  cookTime: number; // in minutes
  servings: number;
  difficulty: "Easy" | "Medium" | "Hard";
  cuisine?: string;
  dietary?: string[]; // e.g., ["vegetarian", "gluten-free"]
  ingredients: Ingredient[];
  steps: string[];
  nutrition: Nutrition;
  authorId?: string; // if user-created
  isPersonal: boolean; // true if it's a user's personal recipe
  sharedWith?: string[]; // user IDs this recipe is shared with
  createdAt?: string;
}

// Schema for creating a new recipe
export const insertRecipeSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  cookTime: z.number().min(1, "Cook time must be at least 1 minute"),
  servings: z.number().min(1, "Must serve at least 1 person"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  cuisine: z.string().optional(),
  dietary: z.array(z.string()).optional(),
  ingredients: z.array(z.object({
    name: z.string().min(1, "Ingredient name required"),
    amount: z.string().min(1, "Amount required"),
    unit: z.string().optional(),
  })).min(1, "At least one ingredient required"),
  steps: z.array(z.string().min(1, "Step cannot be empty")).min(1, "At least one step required"),
  nutrition: z.object({
    calories: z.number().min(0),
    protein: z.number().min(0),
    carbs: z.number().min(0),
    fat: z.number().min(0),
    fiber: z.number().min(0).optional(),
    sugar: z.number().min(0).optional(),
  }),
});

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
