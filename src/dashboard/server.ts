ts
import express, {
  Request,
  Response,
  NextFunction,
  Application
} from 'express';
import session from 'express-session';
import path from 'path';
import { Client } from 'discord.js';
import db from '../database';
import {
  UserRow,
  StatsRow,
  GuildRow,
  LogRow,
  DashboardViewModel,
  LoginViewModel,
  BotInfo
} from '../types';

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session.user) return next();
  res.redirect('/login');
}

export function startDashboard(client: Client): void {
  const app: Application = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? 'zucks-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 1000 * 60 * 60 * 24 }
    })
  );

  // ---------- Auth ----------
  app.get('/login', (_req: Request, res: Response) => {
    const vm: LoginViewModel = { error: null };
    res.render('login', vm);
  });

  app.post('/login', async (req: Request, res: Response) => {
    const { username, password } = req.body as {
      username?: string;
      password?: string;
    };

    try {
      if (!username || !password) {
        return res.render('login', {
          error: '❌ املأ كل الحقول'
        } satisfies LoginViewModel);
      }

      const [rows] = await db.execute<UserRow[]>(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      const user = rows[0];
      if (!user || user.password !== password) {
        return res.render('login', {
          error: '❌ بيانات الدخول غلط'
        } satisfies LoginViewModel);
      }

      req.session.user = { id: user.id, username: user.username };
      res.redirect('/');
    } catch {
      res.render('login', {
        error: 'خطأ في السيرفر'
      } satisfies LoginViewModel);
    }
  });

  app.get('/logout', (req: Request, res: Response) => {
    req.session.destroy(() => res.redirect('/login'));
  });

  // ---------- Dashboard ----------
  app.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
      const [statsRows] = await db.execute<StatsRow[]>(
        'SELECT * FROM stats WHERE id = 1'
      );
      const [guildRows] = await db.execute<GuildRow[]>(
        'SELECT * FROM guilds ORDER BY member_count DESC'
      );
      const [logRows] = await db.execute<LogRow[]>(
        'SELECT * FROM logs ORDER BY id DESC LIMIT 15'
      );

      const botInfo: BotInfo = {
        tag: client.user?.tag ?? 'Unknown',
        avatar:
          client.user?.displayAvatarURL({ size: 128 }) ??
          'https://cdn.discordapp.com/embed/avatars/0.png',
        ping: Math.round(client.ws.ping),
        uptime: process.uptime()
      };

      const vm: DashboardViewModel = {
        user: req.session.user!,
        bot: botInfo,
        stats:
          statsRows[0] ?? {
            guilds: 0,
            users: 0,
            updated_at: new Date()
          } as StatsRow,
        guilds: guildRows,
        logs: logRows
      };

      res.render('dashboard', vm);
    } catch (err) {
      console.error('[ZUCKS] dashboard error:', err);
      res.status(500).send('Server Error');
    }
  });

  // ---------- API ----------
  app.get('/api/stats', requireAuth, async (_req: Request, res: Response) => {
    const [rows] = await db.execute<StatsRow[]>(
      'SELECT * FROM stats WHERE id = 1'
    );
    res.json({
      ...(rows[0] ?? {}),
      ping: Math.round(client.ws.ping),
      uptime: process.uptime()
    });
  });

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.log(`[ZUCKS] 🌐 Dashboard: http://localhost:${port}`);
  });
}