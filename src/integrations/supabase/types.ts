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
      announcement_comments: {
        Row: {
          announcement_id: string
          comment: string
          created_at: string
          display_name: string
          id: string
          user_id: string | null
        }
        Insert: {
          announcement_id: string
          comment: string
          created_at?: string
          display_name: string
          id?: string
          user_id?: string | null
        }
        Update: {
          announcement_id?: string
          comment?: string
          created_at?: string
          display_name?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_comments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          password_hash: string
          password_salt: string | null
          username: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          password_hash: string
          password_salt?: string | null
          username: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          password_hash?: string
          password_salt?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      bugs: {
        Row: {
          category: string
          created_at: string
          id: string
          status: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          status: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          reply_to_id: string | null
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          reply_to_id?: string | null
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          reply_to_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      community_whiteboard_meta: {
        Row: {
          id: string
          last_reset_at: string
        }
        Insert: {
          id?: string
          last_reset_at?: string
        }
        Update: {
          id?: string
          last_reset_at?: string
        }
        Relationships: []
      }
      community_whiteboard_strokes: {
        Row: {
          color: string
          created_at: string
          id: string
          points: Json
          size: number
          tool: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          points: Json
          size?: number
          tool?: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          points?: Json
          size?: number
          tool?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      desktop_customizations: {
        Row: {
          custom_icons: Json
          custom_names: Json
          hidden_apps: Json
          icon_positions: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          custom_icons?: Json
          custom_names?: Json
          hidden_apps?: Json
          icon_positions?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          custom_icons?: Json
          custom_names?: Json
          hidden_apps?: Json
          icon_positions?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      desktop_file_systems: {
        Row: {
          file_system: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          file_system?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          file_system?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      desktop_pinned_apps: {
        Row: {
          id: string
          pinned_apps: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          pinned_apps?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          pinned_apps?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          receiver_id: string
          receiver_username: string
          reply_to_id: string | null
          sender_id: string
          sender_username: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          receiver_id: string
          receiver_username: string
          reply_to_id?: string | null
          sender_id: string
          sender_username: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          receiver_id?: string
          receiver_username?: string
          reply_to_id?: string | null
          sender_id?: string
          sender_username?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_songs: {
        Row: {
          created_at: string
          id: string
          music_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          music_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          music_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_songs_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "uploaded_music"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_nicknames: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          nickname: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          nickname: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          nickname?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string
          from_user_id: string
          from_username: string
          id: string
          status: string
          to_user_id: string
          to_username: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          from_username: string
          id?: string
          status?: string
          to_user_id: string
          to_username: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          from_username?: string
          id?: string
          status?: string
          to_user_id?: string
          to_username?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      game_progress: {
        Row: {
          created_at: string
          custom_settings: Json | null
          game_id: string | null
          game_title: string
          game_url: string
          id: string
          last_played: string
          play_time: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_settings?: Json | null
          game_id?: string | null
          game_title: string
          game_url: string
          id?: string
          last_played?: string
          play_time?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_settings?: Json | null
          game_id?: string | null
          game_title?: string
          game_url?: string
          id?: string
          last_played?: string
          play_time?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_progress_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string
          display_order: number
          embed: boolean
          id: string
          is_tab: string | null
          preview: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description: string
          display_order?: number
          embed?: boolean
          id?: string
          is_tab?: string | null
          preview?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          url?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          display_order?: number
          embed?: boolean
          id?: string
          is_tab?: string | null
          preview?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          message_type: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          message_type?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          message_type?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          id: string
          mute_until: string | null
          muted_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mute_until?: string | null
          muted_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mute_until?: string | null
          muted_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      pinned_messages: {
        Row: {
          channel_id: string
          id: string
          message_id: string
          message_text: string
          message_type: string
          message_username: string
          pinned_at: string
          pinned_by: string
        }
        Insert: {
          channel_id?: string
          id?: string
          message_id: string
          message_text: string
          message_type?: string
          message_username: string
          pinned_at?: string
          pinned_by: string
        }
        Update: {
          channel_id?: string
          id?: string
          message_id?: string
          message_text?: string
          message_type?: string
          message_username?: string
          pinned_at?: string
          pinned_by?: string
        }
        Relationships: []
      }
      playlist_songs: {
        Row: {
          added_at: string
          id: string
          music_id: string
          playlist_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          music_id: string
          playlist_id: string
        }
        Update: {
          added_at?: string
          id?: string
          music_id?: string
          playlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_songs_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "uploaded_music"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_songs_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "user_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      uno_games: {
        Row: {
          allow_stacking: boolean
          created_at: string
          creator_id: string
          creator_username: string
          current_color: string | null
          current_turn_player_id: string | null
          direction: number
          discard_pile: Json | null
          draw_pile: Json | null
          finished_at: string | null
          id: string
          max_players: number
          started_at: string | null
          status: string
          turn_time_limit: number | null
          winner_id: string | null
        }
        Insert: {
          allow_stacking?: boolean
          created_at?: string
          creator_id: string
          creator_username: string
          current_color?: string | null
          current_turn_player_id?: string | null
          direction?: number
          discard_pile?: Json | null
          draw_pile?: Json | null
          finished_at?: string | null
          id?: string
          max_players?: number
          started_at?: string | null
          status?: string
          turn_time_limit?: number | null
          winner_id?: string | null
        }
        Update: {
          allow_stacking?: boolean
          created_at?: string
          creator_id?: string
          creator_username?: string
          current_color?: string | null
          current_turn_player_id?: string | null
          direction?: number
          discard_pile?: Json | null
          draw_pile?: Json | null
          finished_at?: string | null
          id?: string
          max_players?: number
          started_at?: string | null
          status?: string
          turn_time_limit?: number | null
          winner_id?: string | null
        }
        Relationships: []
      }
      uno_invites: {
        Row: {
          created_at: string
          from_user_id: string
          from_username: string
          game_id: string
          id: string
          status: string
          to_user_id: string
          to_username: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          from_username: string
          game_id: string
          id?: string
          status?: string
          to_user_id: string
          to_username: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          from_username?: string
          game_id?: string
          id?: string
          status?: string
          to_user_id?: string
          to_username?: string
        }
        Relationships: [
          {
            foreignKeyName: "uno_invites_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "uno_games"
            referencedColumns: ["id"]
          },
        ]
      }
      uno_players: {
        Row: {
          game_id: string
          hand: Json | null
          id: string
          is_ready: boolean
          joined_at: string
          turn_order: number
          user_id: string
          username: string
        }
        Insert: {
          game_id: string
          hand?: Json | null
          id?: string
          is_ready?: boolean
          joined_at?: string
          turn_order: number
          user_id: string
          username: string
        }
        Update: {
          game_id?: string
          hand?: Json | null
          id?: string
          is_ready?: boolean
          joined_at?: string
          turn_order?: number
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "uno_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "uno_games"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_music: {
        Row: {
          artist: string
          cover_url: string | null
          created_at: string
          file_path: string
          genre: string | null
          id: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          artist?: string
          cover_url?: string | null
          created_at?: string
          file_path: string
          genre?: string | null
          id?: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          artist?: string
          cover_url?: string | null
          created_at?: string
          file_path?: string
          genre?: string | null
          id?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_music_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_music_favorites: {
        Row: {
          created_at: string
          id: string
          music_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          music_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          music_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_music_favorites_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "user_uploaded_music"
            referencedColumns: ["id"]
          },
        ]
      }
      user_music_playlist_songs: {
        Row: {
          added_at: string
          id: string
          music_id: string
          playlist_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          music_id: string
          playlist_id: string
        }
        Update: {
          added_at?: string
          id?: string
          music_id?: string
          playlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_music_playlist_songs_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "user_uploaded_music"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_music_playlist_songs_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "youtube_music_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      user_playlists: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          custom_bg_type: string | null
          custom_bg_url: string | null
          display_name: string | null
          glass_enabled: boolean | null
          id: string
          layout_mode: string | null
          popups_disabled: boolean | null
          theme_preset: string | null
          transitions_disabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          custom_bg_type?: string | null
          custom_bg_url?: string | null
          display_name?: string | null
          glass_enabled?: boolean | null
          id?: string
          layout_mode?: string | null
          popups_disabled?: boolean | null
          theme_preset?: string | null
          transitions_disabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          custom_bg_type?: string | null
          custom_bg_url?: string | null
          display_name?: string | null
          glass_enabled?: boolean | null
          id?: string
          layout_mode?: string | null
          popups_disabled?: boolean | null
          theme_preset?: string | null
          transitions_disabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          session_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          session_token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          session_token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_status: {
        Row: {
          created_at: string
          id: string
          is_online: boolean
          last_seen: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_online?: boolean
          last_seen?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_online?: boolean
          last_seen?: string
          user_id?: string
        }
        Relationships: []
      }
      user_uploaded_music: {
        Row: {
          artist: string
          created_at: string
          duration: number | null
          file_path: string
          file_size: number | null
          id: string
          thumbnail_url: string | null
          title: string
          user_id: string
        }
        Insert: {
          artist?: string
          created_at?: string
          duration?: number | null
          file_path: string
          file_size?: number | null
          id?: string
          thumbnail_url?: string | null
          title: string
          user_id: string
        }
        Update: {
          artist?: string
          created_at?: string
          duration?: number | null
          file_path?: string
          file_size?: number | null
          id?: string
          thumbnail_url?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      youtube_music_history: {
        Row: {
          artist: string
          id: string
          listened_at: string
          thumbnail: string | null
          title: string
          user_id: string
          video_id: string
        }
        Insert: {
          artist: string
          id?: string
          listened_at?: string
          thumbnail?: string | null
          title: string
          user_id: string
          video_id: string
        }
        Update: {
          artist?: string
          id?: string
          listened_at?: string
          thumbnail?: string | null
          title?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      youtube_music_playlists: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      youtube_playlist_songs: {
        Row: {
          added_at: string
          artist: string
          id: string
          playlist_id: string
          thumbnail: string | null
          title: string
          video_id: string
        }
        Insert: {
          added_at?: string
          artist: string
          id?: string
          playlist_id: string
          thumbnail?: string | null
          title: string
          video_id: string
        }
        Update: {
          added_at?: string
          artist?: string
          id?: string
          playlist_id?: string
          thumbnail?: string | null
          title?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_playlist_songs_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "youtube_music_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_watch_history: {
        Row: {
          channel_title: string
          id: string
          thumbnail: string | null
          title: string
          user_id: string
          video_id: string
          watched_at: string
        }
        Insert: {
          channel_title: string
          id?: string
          thumbnail?: string | null
          title: string
          user_id: string
          video_id: string
          watched_at?: string
        }
        Update: {
          channel_title?: string
          id?: string
          thumbnail?: string | null
          title?: string
          user_id?: string
          video_id?: string
          watched_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_friend_request: {
        Args: { p_request_id: string; p_session_token: string }
        Returns: boolean
      }
      add_friendship: {
        Args: { p_friend_id: string; p_session_token: string }
        Returns: boolean
      }
      add_uploaded_music: {
        Args: {
          p_artist: string
          p_file_path: string
          p_session_token: string
          p_title: string
        }
        Returns: string
      }
      admin_exists: { Args: never; Returns: boolean }
      block_user: {
        Args: { p_blocked_id: string; p_session_token: string }
        Returns: boolean
      }
      clear_chat_messages: {
        Args: { p_session_token: string }
        Returns: boolean
      }
      clear_community_whiteboard: {
        Args: { p_session_token: string }
        Returns: boolean
      }
      clear_my_game_progress: {
        Args: { p_session_token: string }
        Returns: boolean
      }
      create_announcement: {
        Args: { p_content: string; p_session_token: string; p_title: string }
        Returns: string
      }
      create_app_user: {
        Args: {
          p_password_hash: string
          p_role?: Database["public"]["Enums"]["app_role"]
          p_session_token: string
          p_username: string
        }
        Returns: string
      }
      create_bug: {
        Args: {
          p_category: string
          p_session_token: string
          p_status: string
          p_title: string
        }
        Returns: string
      }
      create_game: {
        Args: {
          p_category: string
          p_description: string
          p_display_order: number
          p_embed: boolean
          p_is_tab: string
          p_preview: string
          p_session_token: string
          p_thumbnail_url: string
          p_title: string
          p_url: string
        }
        Returns: string
      }
      delete_announcement: {
        Args: { p_announcement_id: string; p_session_token: string }
        Returns: boolean
      }
      delete_app_user: {
        Args: { p_session_token: string; p_user_id: string }
        Returns: boolean
      }
      delete_bug: {
        Args: { p_bug_id: string; p_session_token: string }
        Returns: boolean
      }
      delete_game: {
        Args: { p_game_id: string; p_session_token: string }
        Returns: boolean
      }
      delete_my_friend_nickname: {
        Args: { p_friend_id: string; p_session_token: string }
        Returns: boolean
      }
      delete_my_notification_setting: {
        Args: { p_muted_user_id: string; p_session_token: string }
        Returns: boolean
      }
      delete_my_reaction: {
        Args: { p_reaction_id: string; p_session_token: string }
        Returns: boolean
      }
      delete_uploaded_music: {
        Args: { p_music_id: string; p_session_token: string }
        Returns: boolean
      }
      get_all_app_users: {
        Args: never
        Returns: {
          created_at: string
          id: string
          username: string
        }[]
      }
      get_all_users: {
        Args: { p_session_token: string }
        Returns: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          username: string
        }[]
      }
      get_my_direct_messages: {
        Args: { p_other_user_id: string; p_session_token: string }
        Returns: {
          created_at: string
          id: string
          message: string
          read: boolean
          receiver_id: string
          receiver_username: string
          reply_to_id: string | null
          sender_id: string
          sender_username: string
        }[]
        SetofOptions: {
          from: "*"
          to: "direct_messages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_unread_dms: {
        Args: { p_session_token: string }
        Returns: {
          created_at: string
          id: string
          message: string
          read: boolean
          receiver_id: string
          receiver_username: string
          reply_to_id: string | null
          sender_id: string
          sender_username: string
        }[]
        SetofOptions: {
          from: "*"
          to: "direct_messages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_dms_read: {
        Args: { p_sender_id: string; p_session_token: string }
        Returns: boolean
      }
      reject_friend_request: {
        Args: { p_request_id: string; p_session_token: string }
        Returns: boolean
      }
      remove_friendship: {
        Args: { p_friend_id: string; p_session_token: string }
        Returns: boolean
      }
      save_game_settings: {
        Args: {
          p_custom_settings: Json
          p_game_url: string
          p_session_token: string
        }
        Returns: boolean
      }
      seed_admin_user: {
        Args: { p_password_hash: string; p_username: string }
        Returns: string
      }
      send_friend_request: {
        Args: {
          p_session_token: string
          p_to_user_id: string
          p_to_username: string
        }
        Returns: string
      }
      start_game_session: {
        Args: {
          p_game_id?: string
          p_game_title: string
          p_game_url: string
          p_session_token: string
        }
        Returns: {
          created_at: string
          custom_settings: Json | null
          game_id: string | null
          game_title: string
          game_url: string
          id: string
          last_played: string
          play_time: number
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "game_progress"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      toggle_reaction: {
        Args: {
          p_emoji: string
          p_message_id: string
          p_message_type?: string
          p_session_token: string
        }
        Returns: boolean
      }
      unblock_user: {
        Args: { p_blocked_id: string; p_session_token: string }
        Returns: boolean
      }
      update_announcement: {
        Args: {
          p_announcement_id: string
          p_content: string
          p_session_token: string
          p_title: string
        }
        Returns: boolean
      }
      update_game: {
        Args: {
          p_category: string
          p_description: string
          p_display_order: number
          p_embed: boolean
          p_game_id: string
          p_is_tab: string
          p_preview: string
          p_session_token: string
          p_thumbnail_url: string
          p_title: string
          p_url: string
        }
        Returns: boolean
      }
      update_game_play_time: {
        Args: {
          p_additional_seconds: number
          p_game_url: string
          p_session_token: string
        }
        Returns: boolean
      }
      update_my_profile: {
        Args: {
          p_avatar_url?: string
          p_custom_bg_type?: string
          p_custom_bg_url?: string
          p_display_name?: string
          p_glass_enabled?: boolean
          p_layout_mode?: string
          p_popups_disabled?: boolean
          p_session_token: string
          p_theme_preset?: string
          p_transitions_disabled?: boolean
        }
        Returns: boolean
      }
      update_user_password: {
        Args: {
          p_new_password_hash: string
          p_session_token: string
          p_user_id: string
        }
        Returns: boolean
      }
      upsert_my_desktop_customizations: {
        Args: {
          p_custom_icons?: Json
          p_custom_names?: Json
          p_hidden_apps?: Json
          p_icon_positions?: Json
          p_session_token: string
        }
        Returns: boolean
      }
      upsert_my_file_system: {
        Args: { p_file_system: Json; p_session_token: string }
        Returns: boolean
      }
      upsert_my_friend_nickname: {
        Args: {
          p_friend_id: string
          p_nickname: string
          p_session_token: string
        }
        Returns: boolean
      }
      upsert_my_game_progress: {
        Args: {
          p_custom_settings?: Json
          p_game_id?: string
          p_game_title: string
          p_game_url: string
          p_play_time?: number
          p_session_token: string
        }
        Returns: boolean
      }
      upsert_my_notification_setting: {
        Args: {
          p_mute_until?: string
          p_muted_user_id: string
          p_session_token: string
        }
        Returns: boolean
      }
      upsert_my_pinned_apps: {
        Args: { p_pinned_apps: Json; p_session_token: string }
        Returns: boolean
      }
      upsert_my_profile: {
        Args: {
          p_avatar_url?: string
          p_custom_bg_type?: string
          p_custom_bg_url?: string
          p_display_name?: string
          p_glass_enabled?: boolean
          p_layout_mode?: string
          p_popups_disabled?: boolean
          p_session_token: string
          p_theme_preset?: string
          p_transitions_disabled?: boolean
        }
        Returns: boolean
      }
      upsert_my_status: {
        Args: { p_is_online: boolean; p_session_token: string }
        Returns: boolean
      }
      verify_login: {
        Args: { p_password_hash: string; p_username: string }
        Returns: {
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          username: string
        }[]
      }
      verify_session: { Args: { p_session_token: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
