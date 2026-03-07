export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_updates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string
          id: string
          likes_count: number | null
          title: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by: string
          id?: string
          likes_count?: number | null
          title: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          likes_count?: number | null
          title?: string
        }
        Relationships: []
      }
      cardio_sessions: {
        Row: {
          activity_type: string
          calories_burned: number | null
          completed_at: string
          distance_km: number | null
          duration_minutes: number
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          activity_type?: string
          calories_burned?: number | null
          completed_at?: string
          distance_km?: number | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          calories_burned?: number | null
          completed_at?: string
          distance_km?: number | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      community_foods: {
        Row: {
          calories_kcal: number
          carbs_g: number
          category: string
          created_at: string
          fat_g: number
          fiber_g: number
          id: string
          is_public: boolean
          name: string
          protein_g: number
          serving_size: string
          user_id: string
        }
        Insert: {
          calories_kcal?: number
          carbs_g?: number
          category?: string
          created_at?: string
          fat_g?: number
          fiber_g?: number
          id?: string
          is_public?: boolean
          name: string
          protein_g?: number
          serving_size?: string
          user_id: string
        }
        Update: {
          calories_kcal?: number
          carbs_g?: number
          category?: string
          created_at?: string
          fat_g?: number
          fiber_g?: number
          id?: string
          is_public?: boolean
          name?: string
          protein_g?: number
          serving_size?: string
          user_id?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean
          receiver_id: string
          sender_id: string
          read_at: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id: string
          sender_id: string
          read_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
          read_at?: string | null
        }
        Relationships: []
      }
      exercise_logs: {
        Row: {
          created_at: string
          exercise_name: string
          history_id: string
          id: string
          reps: number
          set_number: number
          weight_kg: number
        }
        Insert: {
          created_at?: string
          exercise_name: string
          history_id: string
          id?: string
          reps?: number
          set_number?: number
          weight_kg?: number
        }
        Update: {
          created_at?: string
          exercise_name?: string
          history_id?: string
          id?: string
          reps?: number
          set_number?: number
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercise_logs_history_id_fkey"
            columns: ["history_id"]
            isOneToOne: false
            referencedRelation: "workout_history"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
          status?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      group_invites: {
        Row: {
          created_at: string
          group_id: string
          id: string
          invited_by: string
          invited_user_id: string
          status: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          invited_by: string
          invited_user_id: string
          status?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_rankings: {
        Row: {
          calculated_at: string
          days_diet_logged: number
          days_trained: number
          group_id: string
          id: string
          period_end: string
          period_start: string
          period_type: string
          rank_position: number | null
          streak_best: number
          total_score: number
          user_id: string
          water_goal_days: number
        }
        Insert: {
          calculated_at?: string
          days_diet_logged?: number
          days_trained?: number
          group_id: string
          id?: string
          period_end: string
          period_start: string
          period_type: string
          rank_position?: number | null
          streak_best?: number
          total_score?: number
          user_id: string
          water_goal_days?: number
        }
        Update: {
          calculated_at?: string
          days_diet_logged?: number
          days_trained?: number
          group_id?: string
          id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          rank_position?: number | null
          streak_best?: number
          total_score?: number
          user_id?: string
          water_goal_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_rankings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          invite_code: string | null
          is_public: boolean
          max_members: number | null
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          invite_code?: string | null
          is_public?: boolean
          max_members?: number | null
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          invite_code?: string | null
          is_public?: boolean
          max_members?: number | null
          name?: string
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          created_at: string
          date: string
          id: string
          is_shared: boolean
          total_calories: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          is_shared?: boolean
          total_calories?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_shared?: boolean
          total_calories?: number | null
          user_id?: string
        }
        Relationships: []
      }
      meals: {
        Row: {
          calories: number | null
          carbs: number | null
          created_at: string
          fat: number | null
          id: string
          meal_plan_id: string
          meal_time: string | null
          name: string
          protein: number | null
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fat?: number | null
          id?: string
          meal_plan_id: string
          meal_time?: string | null
          name: string
          protein?: number | null
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fat?: number | null
          id?: string
          meal_plan_id?: string
          meal_time?: string | null
          name?: string
          protein?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meals_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string
          content: string | null
          created_at: string
          id: string
          post_id: string | null
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          content?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          content?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      post_bookmarks: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          location: string | null
          tags: string[] | null
          user_id: string
          women_only: boolean
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          location?: string | null
          tags?: string[] | null
          user_id: string
          women_only?: boolean
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          location?: string | null
          tags?: string[] | null
          user_id?: string
          women_only?: boolean
        }
        Relationships: []
      }
      profile_highlights: {
        Row: {
          created_at: string
          icon: string
          id: string
          label: string
          sort_order: number
          story_ids: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          icon: string
          id?: string
          label: string
          sort_order?: number
          story_ids?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          label?: string
          sort_order?: number
          story_ids?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          allergies: string[] | null
          avatar_url: string | null
          bio: string | null
          bmr: number | null
          calorie_target: number | null
          created_at: string
          date_of_birth: string | null
          dietary_restrictions: string[] | null
          gender: string | null
          goal: string | null
          height_cm: number | null
          id: string
          injuries: string[] | null
          is_private: boolean
          is_verified: boolean
          name: string | null
          onboarding_completed: boolean
          theme_color: string | null
          updated_at: string
          user_id: string
          username: string | null
          username_changed_at: string[] | null
          weight_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          allergies?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          bmr?: number | null
          calorie_target?: number | null
          created_at?: string
          date_of_birth?: string | null
          dietary_restrictions?: string[] | null
          gender?: string | null
          goal?: string | null
          height_cm?: number | null
          id?: string
          injuries?: string[] | null
          is_private?: boolean
          is_verified?: boolean
          name?: string | null
          onboarding_completed?: boolean
          theme_color?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          username_changed_at?: string[] | null
          weight_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          allergies?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          bmr?: number | null
          calorie_target?: number | null
          created_at?: string
          date_of_birth?: string | null
          dietary_restrictions?: string[] | null
          gender?: string | null
          goal?: string | null
          height_cm?: number | null
          id?: string
          injuries?: string[] | null
          is_private?: boolean
          is_verified?: boolean
          name?: string | null
          onboarding_completed?: boolean
          theme_color?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          username_changed_at?: string[] | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      recipe_bookmarks: {
        Row: {
          created_at: string
          id: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_bookmarks_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_comments_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ratings_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          calories: number | null
          carbs: number | null
          category: string | null
          cost_level: number | null
          created_at: string
          created_by: string
          description: string | null
          fat: number | null
          id: string
          image_url: string | null
          ingredients: string[]
          instructions: string | null
          is_shared: boolean
          protein: number | null
          servings: number | null
          title: string
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          category?: string | null
          cost_level?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          fat?: number | null
          id?: string
          image_url?: string | null
          ingredients?: string[]
          instructions?: string | null
          is_shared?: boolean
          protein?: number | null
          servings?: number | null
          title: string
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          category?: string | null
          cost_level?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          fat?: number | null
          id?: string
          image_url?: string | null
          ingredients?: string[]
          instructions?: string | null
          is_shared?: boolean
          protein?: number | null
          servings?: number | null
          title?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          image_url: string
          user_id: string
          women_only: boolean
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          image_url: string
          user_id: string
          women_only?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string
          user_id?: string
          women_only?: boolean
        }
        Relationships: []
      }
      story_views: {
        Row: {
          created_at: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_reactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      taco_foods: {
        Row: {
          calcium_mg: number
          calories_kcal: number
          carbs_g: number
          category: string
          fat_g: number
          fiber_g: number
          id: number
          iron_mg: number
          name: string
          potassium_mg: number
          protein_g: number
          serving_size: string
          vitamin_c_mg: number
        }
        Insert: {
          calcium_mg?: number
          calories_kcal?: number
          carbs_g?: number
          category: string
          fat_g?: number
          fiber_g?: number
          id?: number
          iron_mg?: number
          name: string
          potassium_mg?: number
          protein_g?: number
          serving_size?: string
          vitamin_c_mg?: number
        }
        Update: {
          calcium_mg?: number
          calories_kcal?: number
          carbs_g?: number
          category?: string
          fat_g?: number
          fiber_g?: number
          id?: number
          iron_mg?: number
          name?: string
          potassium_mg?: number
          protein_g?: number
          serving_size?: string
          vitamin_c_mg?: number
        }
        Relationships: []
      }
      trainer_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_id: string
          student_id: string
          trainer_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_id: string
          student_id: string
          trainer_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
          student_id?: string
          trainer_id?: string
        }
        Relationships: []
      }
      trainer_students: {
        Row: {
          created_at: string
          id: string
          status: string
          student_id: string
          trainer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          student_id: string
          trainer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          student_id?: string
          trainer_id?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          created_at: string
          date: string
          id: string
          user_id: string
          water_intake_ml: number | null
          workout_completed: boolean | null
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          user_id: string
          water_intake_ml?: number | null
          workout_completed?: boolean | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          user_id?: string
          water_intake_ml?: number | null
          workout_completed?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          current_streak: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_xp: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          source: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          source: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_bookmarks: {
        Row: {
          created_at: string
          id: string
          user_id: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          workout_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_bookmarks_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          exercise_name: string
          id: string
          reps: number
          rest_seconds: number | null
          sets: number
          sort_order: number | null
          workout_id: string
        }
        Insert: {
          exercise_name: string
          id?: string
          reps?: number
          rest_seconds?: number | null
          sets?: number
          sort_order?: number | null
          workout_id: string
        }
        Update: {
          exercise_name?: string
          id?: string
          reps?: number
          rest_seconds?: number | null
          sets?: number
          sort_order?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_history: {
        Row: {
          completed_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          user_id: string
          workout_id: string | null
          workout_name: string
        }
        Insert: {
          completed_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          user_id: string
          workout_id?: string | null
          workout_name: string
        }
        Update: {
          completed_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          user_id?: string
          workout_id?: string | null
          workout_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_history_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string
          day_of_week: number | null
          description: string | null
          difficulty: string | null
          duration_minutes: number | null
          id: string
          is_shared: boolean
          muscle_groups: string[] | null
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          id?: string
          is_shared?: boolean
          muscle_groups?: string[] | null
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          id?: string
          is_shared?: boolean
          muscle_groups?: string[] | null
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          goal: string | null
          is_private: boolean | null
          is_verified: boolean | null
          name: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          goal?: string | null
          is_private?: boolean | null
          is_verified?: boolean | null
          name?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          goal?: string | null
          is_private?: boolean | null
          is_verified?: boolean | null
          name?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      are_mutual_followers: {
        Args: { user_a: string; user_b: string }
        Returns: boolean
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_approved_follower: {
        Args: { profile_owner_id: string; viewer_id: string }
        Returns: boolean
      }
      is_female: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "athlete" | "professional" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["athlete", "professional", "admin"],
    },
  },
} as const
