ts
import { Client } from 'discord.js';
import { RowDataPacket } from 'mysql2';

// ---------- Database Row Types ----------
export interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  password: string;
  created_at: Date;
}

export interface StatsRow extends RowDataPacket {
  id: number;
  guilds: number;
  users: number;
  updated_at: Date;
}

export interface GuildRow extends RowDataPacket {
  id: string;
  name: string;
  icon: string | null;
  member_count: number;
  owner_id: string;
  joined_at: Date;
  updated_at: Date;
}

export interface LogRow extends RowDataPacket {
  id: number;
  event: string;
  data: string | null;
  created_at: Date;
}

// ---------- Session ----------
export interface SessionUser {
  id: number;
  username: string;
}

// ---------- View Models ----------
export interface BotInfo {
  tag: string;
  avatar: string;
  ping: number;
  uptime: number;
}

export interface DashboardViewModel {
  user: SessionUser;
  bot: BotInfo;
  stats: StatsRow | { guilds: number; users: number; updated_at: Date };
  guilds: GuildRow[];
  logs: LogRow[];
}

export interface LoginViewModel {
  error: string | null;
}

// ---------- Express Session Augmentation ----------
declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}

// ---------- Dashboard Starter Signature ----------
export type DashboardStarter = (client: Client) => void;