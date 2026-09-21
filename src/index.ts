ts
import dotenv from 'dotenv';
import { Client, GatewayIntentBits, Events, Guild } from 'discord.js';
import db from './database';
import { startDashboard } from './dashboard/server';
import { GuildRow } from './types';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

async function upsertGuild(guild: Guild): Promise<void> {
  await db.execute(
    `INSERT INTO guilds (id, name, icon, member_count, owner_id)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       icon = VALUES(icon),
       member_count = VALUES(member_count),
       owner_id = VALUES(owner_id)`,
    [
      guild.id,
      guild.name,
      guild.iconURL(),
      guild.memberCount,
      guild.ownerId
    ]
  );
}

async function syncStats(): Promise<void> {
  if (!client.user) return;
  try {
    const guildsCount = client.guilds.cache.size;
    const usersCount = client.guilds.cache.reduce(
      (acc: number, g: Guild) => acc + g.memberCount,
      0
    );

    await db.execute(
      `INSERT INTO stats (id, guilds, users) VALUES (1, ?, ?)
       ON DUPLICATE KEY UPDATE
         guilds = VALUES(guilds),
         users = VALUES(users),
         updated_at = NOW()`,
      [guildsCount, usersCount]
    );

    for (const [, guild] of client.guilds.cache) {
      await upsertGuild(guild);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ZUCKS] sync error:', msg);
  }
}

client.once(Events.ClientReady, async (c: Client<true>) => {
  console.log(`[ZUCKS] 🤖 Logged in as ${c.user.tag}`);
  await syncStats();
  setInterval(() => {
    void syncStats();
  }, 60_000);
  startDashboard(client);
});

client.on(Events.GuildCreate, async (guild: Guild) => {
  try {
    await upsertGuild(guild);
    await db.execute(
      `INSERT INTO logs (event, data) VALUES ('guild_create', ?)`,
      [JSON.stringify({ id: guild.id, name: guild.name })]
    );
    console.log(`[ZUCKS] ➕ Joined: ${guild.name}`);
  } catch (err) {
    console.error(err);
  }
});

client.on(Events.GuildDelete, async (guild: Guild) => {
  try {
    await db.execute(`DELETE FROM guilds WHERE id = ?`, [guild.id]);
    await db.execute(
      `INSERT INTO logs (event, data) VALUES ('guild_remove', ?)`,
      [JSON.stringify({ id: guild.id, name: guild.name })]
    );
    console.log(`[ZUCKS] ➖ Removed: ${guild.name}`);
  } catch (err) {
    console.error(err);
  }
});

// Export unused type to satisfy TS in some setups
export type { GuildRow };

client.login(process.env.BOT_TOKEN).catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('[ZUCKS] Login failed:', msg);
});