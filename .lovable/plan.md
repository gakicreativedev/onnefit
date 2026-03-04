

# FitSoul MVP — Fitness App with AI Foundation

## Overview
A modern fitness application with dark mode UI (deep navy/black background with vibrant blue accents), modular architecture, real-time backend via Lovable Cloud, and authentication — ready for future AI expansion.

---

## 1. Authentication & Onboarding
- **Sign Up / Sign In** page with email+password and Google OAuth
- **Onboarding flow** (3 steps after first login):
  1. Basic info: name, age, gender, height, weight
  2. Fitness goal selection (lose weight, gain muscle, maintain)
  3. Activity level selection
- Auto-calculate **BMR (Basal Metabolic Rate)** and estimated daily calorie target
- Save profile to database

## 2. Layout & Navigation
- **Fixed sidebar** on the left (collapsible on mobile) with:
  - User avatar, name, level badge
  - Nav items: Dashboard, Workouts, Diet, Profile
  - Settings & Logout at bottom
- **Main content area** with responsive grid layout
- Dark mode theme with deep navy background (#0a0e1a) and vibrant blue (#2563eb) accents

## 3. Dashboard (Home)
Based on the reference image, the dashboard will include:
- **Workout of the Day** — featured card with today's workout name and "Start Workout" button
- **Daily Calories** — progress bar showing consumed vs. target calories
- **Daily Protein** — progress bar showing protein intake vs. goal
- **Weekly Frequency** — visual display of which days the user trained
- **Daily Meals** — list of meals (breakfast, lunch, snack, dinner) with calorie counts
- **Daily Highlights** — horizontal scroll of featured workouts/recipes

## 4. Workouts Module
- Pre-defined simple workout plans (push/pull/legs or full body)
- Workout detail view showing exercises, sets, reps
- Static data initially, ready for AI-generated plans later

## 5. Diet / Nutrition Module
- Basic meal plan based on calculated calorie target
- List of daily meals with macro breakdown
- Water intake tracker
- Static data initially, ready for AI-generated nutrition plans later

## 6. Profile Module
- View and edit personal data (weight, height, goals)
- Recalculate BMR/calorie target on changes
- Display current stats summary

## 7. Database Schema (Lovable Cloud)
- **profiles** — user_id, name, age, gender, height, weight, activity_level, goal, bmr, calorie_target
- **workouts** — id, name, description, muscle_groups, difficulty
- **workout_exercises** — workout_id, exercise_name, sets, reps, rest_seconds
- **meal_plans** — id, user_id, date, total_calories
- **meals** — id, meal_plan_id, name, time, calories, protein, carbs, fat
- **user_activity** — user_id, date, workout_completed, water_intake_ml

## 8. What's NOT in MVP (Future Expansion)
- AI-powered adaptive workout/diet generation
- Social features, challenges, achievements
- Paid plans & subscriptions
- Progress photos & body measurements tracking
- AI Trainer & AI Chef chatbots

