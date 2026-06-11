import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getSupabase } from "./supabase";

const router = Router();

interface LocalUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: number;
}

const localUsers = new Map<string, LocalUser>();
const localSessions = new Map<string, { userId: string; expiresAt: number }>();

router.post("/register", async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email requerido" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: "Email inválido" });
      return;
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }
    if (password !== confirmPassword) {
      res.status(400).json({ error: "Las contraseñas no coinciden" });
      return;
    }

    const emailLower = email.toLowerCase();

    const supabase = getSupabase();
    if (supabase) {
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("email", emailLower)
        .single();
      if (existing) {
        res.status(409).json({ error: "Este email ya está registrado" });
        return;
      }
    } else {
      if (localUsers.has(emailLower)) {
        res.status(409).json({ error: "Este email ya está registrado" });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `user_${crypto.randomBytes(8).toString("hex")}`;
    const now = Date.now();

    if (supabase) {
      const { data: newUser, error: insertErr } = await supabase
        .from("users")
        .insert({
          id: userId,
          email: emailLower,
          name: emailLower.split("@")[0],
          password_hash: passwordHash,
          confirmed_at: new Date(now).toISOString(),
          last_login: new Date(now).toISOString(),
          is_active: true,
        })
        .select()
        .single();
      if (insertErr) {
        req.log.error({ err: insertErr }, "Error registrando usuario en Supabase");
        res.status(500).json({ error: "Error al registrar usuario" });
        return;
      }
      if (newUser) {
        const sessionToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = now + 30 * 24 * 60 * 60 * 1000;
        await supabase.from("sessions").insert({
          user_id: newUser.id,
          token: sessionToken,
          expires_at: new Date(expiresAt).toISOString(),
          last_used: new Date(now).toISOString(),
        });
        const session = {
          user: { id: newUser.id, email: emailLower, name: emailLower.split("@")[0], createdAt: now },
          token: sessionToken,
          expiresAt,
        };
        req.log.info({ email: emailLower }, "Usuario registrado");
        res.json({ session });
        return;
      }
    }

    const user: LocalUser = {
      id: userId,
      email: emailLower,
      name: emailLower.split("@")[0],
      passwordHash,
      createdAt: now,
    };
    localUsers.set(emailLower, user);

    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000;
    localSessions.set(sessionToken, { userId, expiresAt });

    const session = {
      user: { id: userId, email: emailLower, name: emailLower.split("@")[0], createdAt: now },
      token: sessionToken,
      expiresAt,
    };

    req.log.info({ email: emailLower }, "Usuario registrado (local)");
    res.json({ session });
  } catch (error) {
    req.log.error({ err: error }, "Error en /api/auth/register");
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email requerido" });
      return;
    }
    if (!password || typeof password !== "string") {
      res.status(400).json({ error: "Contraseña requerida" });
      return;
    }

    const emailLower = email.toLowerCase();
    const now = Date.now();

    const supabase = getSupabase();
    if (supabase) {
      const { data: user, error: selectErr } = await supabase
        .from("users")
        .select("id, email, name, password_hash")
        .eq("email", emailLower)
        .single();

      if (selectErr || !user) {
        res.status(401).json({ error: "Email o contraseña incorrectos" });
        return;
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        res.status(401).json({ error: "Email o contraseña incorrectos" });
        return;
      }

      await supabase
        .from("users")
        .update({ last_login: new Date(now).toISOString() })
        .eq("id", user.id);

      const sessionToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = now + 30 * 24 * 60 * 60 * 1000;
      await supabase.from("sessions").insert({
        user_id: user.id,
        token: sessionToken,
        expires_at: new Date(expiresAt).toISOString(),
        last_used: new Date(now).toISOString(),
      });

      const session = {
        user: { id: user.id, email: user.email, name: user.name, createdAt: now },
        token: sessionToken,
        expiresAt,
      };
      req.log.info({ email: emailLower }, "Login exitoso");
      res.json({ session });
      return;
    }

    const user = localUsers.get(emailLower);
    if (!user) {
      res.status(401).json({ error: "Email o contraseña incorrectos" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Email o contraseña incorrectos" });
      return;
    }

    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000;
    localSessions.set(sessionToken, { userId: user.id, expiresAt });

    const session = {
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
      token: sessionToken,
      expiresAt,
    };

    req.log.info({ email: emailLower }, "Login exitoso (local)");
    res.json({ session });
  } catch (error) {
    req.log.error({ err: error }, "Error en /api/auth/login");
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

router.post("/verify-session", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ error: "Token requerido" });
      return;
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: session, error: sessionErr } = await supabase
          .from("sessions")
          .select("*, users(*)")
          .eq("token", token)
          .single();

        if (!sessionErr && session && new Date(session.expires_at) >= new Date()) {
          await supabase
            .from("sessions")
            .update({ last_used: new Date().toISOString() })
            .eq("token", token);

          res.json({
            valid: true,
            user: {
              id: session.users?.id,
              email: session.users?.email,
              name: session.users?.name,
            },
          });
          return;
        }
      } catch (supaErr) {
        req.log.warn({ err: supaErr }, "Supabase verify error (non-fatal)");
      }
    }

    const localSession = localSessions.get(token);
    if (localSession && localSession.expiresAt > Date.now()) {
      res.json({ valid: true });
      return;
    }

    res.status(401).json({ error: "Sesión inválida o expirada" });
  } catch (error) {
    req.log.error({ err: error }, "Error en /api/auth/verify-session");
    res.status(500).json({ error: "Error verificando sesión" });
  }
});

export default router;
