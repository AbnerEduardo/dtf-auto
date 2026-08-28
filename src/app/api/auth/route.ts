import { canUserAccess } from '@/lib/accessControl';
import { NextResponse } from 'next/server';
import db, { getCurrentUserId } from '@/lib/db';
import { validateCPF, normalizeCPF, maskCPF, hashPassword, verifyPassword, signSessionToken } from '@/lib/auth';

export async function GET(request: Request) {
  const userId = getCurrentUserId(request);
  const user = db.prepare('SELECT id, name, cpf, phone, email, company, role, status, created_at FROM users WHERE id = ?').get(userId) as any;
  
  const sub = user ? db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(user.id) : null;
  const settings = user ? db.prepare('SELECT * FROM dtf_settings WHERE user_id = ?').get(user.id) : null;

  // Mask CPF for privacy
  const safeUser = user ? { ...user, cpfMasked: maskCPF(user.cpf) } : null;

  // Only return allUsers list if user is an ADMIN (Zero cross-tenant data leak)
  let allUsers: any[] = [];
  if (user && user.role === 'admin') {
    const rawUsers = db.prepare('SELECT id, name, cpf, email, company, role, status FROM users ORDER BY created_at ASC').all() as any[];
    allUsers = rawUsers.map(u => ({ ...u, cpfMasked: maskCPF(u.cpf) }));
  }

  const accessInfo = await canUserAccess(userId);
  return NextResponse.json({ user: safeUser, subscription: sub, settings, allUsers, access: accessInfo });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, password, confirmPassword, name, cpf, phone, company, userId: targetUserId, token, newPassword } = body;

    // --- 1. LOGOUT ---
    if (action === 'logout') {
      const response = NextResponse.json({ success: true, message: 'Desconectado com sucesso' });
      response.cookies.delete('dtf_session');
      response.cookies.delete('dtf_user_id');
      return response;
    }

    // --- 2. SWITCH USER (RESTRICTED TO ADMIN ONLY) ---
    if (action === 'switch' && targetUserId) {
      const currentUserId = getCurrentUserId(request);
      const currentUser = db.prepare('SELECT role FROM users WHERE id = ?').get(currentUserId) as any;

      if (!currentUser || currentUser.role !== 'admin') {
        return NextResponse.json({ error: 'Operação não permitida. Apenas administradores podem alternar contas.' }, { status: 403 });
      }

      const user = db.prepare('SELECT id, name, email, company, role FROM users WHERE id = ?').get(targetUserId) as any;
      if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

      const sessionToken = signSessionToken({ id: user.id, email: user.email, name: user.name, role: user.role });
      const response = NextResponse.json({ success: true, user });
      response.cookies.set('dtf_session', sessionToken, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
      response.cookies.set('dtf_user_id', user.id, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
      return response;
    }

    // --- 3. REGISTER ---
    if (action === 'register') {
      if (!name || !email || !password || !cpf) {
        return NextResponse.json({ error: 'Preencha todos os campos obrigatórios (Nome, CPF, E-mail, Senha)' }, { status: 400 });
      }

      if (password.length < 6) {
        return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 });
      }

      if (confirmPassword && password !== confirmPassword) {
        return NextResponse.json({ error: 'As senhas não coincidem' }, { status: 400 });
      }

      const cleanCPF = normalizeCPF(cpf);
      if (!validateCPF(cleanCPF)) {
        return NextResponse.json({ error: 'CPF inválido. Verifique os números digitados.' }, { status: 400 });
      }

      // Check unique email
      const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
      if (existingEmail) {
        return NextResponse.json({ error: 'Este e-mail já está cadastrado no sistema.' }, { status: 400 });
      }

      // Check unique CPF
      const existingCPF = db.prepare('SELECT id FROM users WHERE cpf = ?').get(cleanCPF);
      if (existingCPF) {
        return NextResponse.json({ error: 'Este CPF já está cadastrado em outra conta.' }, { status: 400 });
      }

      const userId = 'user_' + Date.now();
      const hashedPassword = await hashPassword(password);
      const cleanPhone = (phone || '').replace(/[^0-9+()-\s]/g, '').trim();

      db.prepare(`
        INSERT INTO users (id, name, cpf, phone, email, password, company, role, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, name.trim(), cleanCPF, cleanPhone, email.toLowerCase().trim(), hashedPassword, company || '', 'user', 'trial');

      // Create 7-day trial subscription
      db.prepare(`
        INSERT INTO subscriptions (id, user_id, status, plan_name, price_monthly, trial_started_at, trial_ends_at, current_period_end)
        VALUES (?, ?, 'trialing', 'Plano Pro DTF Auto', 75.00, datetime('now'), datetime('now', '+7 days'), datetime('now', '+7 days'))
      `).run('sub_' + Date.now(), userId);

      // Create default DTF roll settings (57 cm)
      db.prepare(`
        INSERT OR REPLACE INTO dtf_settings (user_id, roll_width_cm, spacing_cm, margin_cm, allow_rotation, default_adult_height_cm, default_plussize_height_cm, default_infant_height_cm, default_moletom_height_cm)
        VALUES (?, 57.0, 1.0, 1.0, 1, 28.0, 32.0, 18.0, 30.0)
      `).run(userId);

      const createdUser = { id: userId, name: name.trim(), email: email.toLowerCase().trim(), cpfMasked: maskCPF(cleanCPF), role: 'user' };
      const sessionToken = signSessionToken(createdUser);

      const response = NextResponse.json({ success: true, user: createdUser });
      response.cookies.set('dtf_session', sessionToken, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
      response.cookies.set('dtf_user_id', userId, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
      return response;
    }

    // --- 4. LOGIN ---
    if (action === 'login') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Informe e-mail e senha' }, { status: 400 });
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any;
      if (!user) {
        return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 });
      }

      const passwordValid = await verifyPassword(password, user.password);
      if (!passwordValid) {
        return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 });
      }

      // If user had plaintext password, upgrade to bcrypt hash
      if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
        const newHash = await hashPassword(password);
        db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newHash, user.id);
      }

      const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role || 'user' };
      const sessionToken = signSessionToken(safeUser);

      const response = NextResponse.json({ success: true, user: safeUser });
      response.cookies.set('dtf_session', sessionToken, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
      response.cookies.set('dtf_user_id', user.id, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
      return response;
    }

    // --- 5. FORGOT PASSWORD ---
    if (action === 'forgot_password') {
      if (!email) return NextResponse.json({ error: 'Informe seu e-mail' }, { status: 400 });

      const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any;
      if (!user) {
        return NextResponse.json({ success: true, message: 'Se o e-mail existir, o código de recuperação foi gerado.' });
      }

      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      db.prepare(`
        UPDATE users SET reset_token = ?, reset_token_expires = datetime('now', '+1 hour') WHERE id = ?
      `).run(resetCode, user.id);

      return NextResponse.json({
        success: true,
        message: 'Código de recuperação gerado com sucesso.',
        debugCode: process.env.NODE_ENV !== 'production' ? resetCode : undefined,
      });
    }

    // --- 6. RESET PASSWORD ---
    if (action === 'reset_password') {
      if (!email || !token || !newPassword) {
        return NextResponse.json({ error: 'Informe e-mail, código e a nova senha' }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'A nova senha deve ter no mínimo 6 caracteres' }, { status: 400 });
      }

      const user = db.prepare("SELECT id FROM users WHERE email = ? AND reset_token = ? AND reset_token_expires > datetime('now')").get(email.toLowerCase().trim(), token.trim()) as any;
      if (!user) {
        return NextResponse.json({ error: 'Código inválido ou expirado' }, { status: 400 });
      }

      const newHash = await hashPassword(newPassword);
      db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?').run(newHash, user.id);

      return NextResponse.json({ success: true, message: 'Senha redefinida com sucesso! Você já pode fazer login.' });
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 });
  } catch (err: any) {
    console.error('Auth API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
