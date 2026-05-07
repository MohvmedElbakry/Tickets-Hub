// api/server.ts - Server Entry Point (Local & Production Server)

import app from './app.js';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './lib/prisma.js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

console.log('[Server] Starting entry point...');
console.log('[Server] NODE_ENV:', process.env.NODE_ENV);
console.log('[Server] VERCEL:', process.env.VERCEL);

const seedAdmin = async () => {
    try {
        const adminEmail = 'admin@tkt.com';
        const user = await prisma.user.findUnique({ where: { email: adminEmail } });
        if (!user) {
            const passwordHash = await bcrypt.hash('123123', 10);
            await prisma.user.create({
                data: {
                    name: 'mohamed elbakry',
                    email: adminEmail,
                    password_hash: passwordHash,
                    phone: '123456789',
                    role: 'admin',
                    birthdate: '1990-01-01',
                    age: 34
                }
            });
            console.log('[Auth] Test admin user seeded.');
        }
    } catch (error) {
        console.error('[Auth] Failed to seed admin user:', error);
    }
};

const startDB = async () => {
    try {
        console.log('[DB] Connecting via Prisma...');
        const dbUrl = process.env.DATABASE_URL || '';
        const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
        console.log('[DB] Connection URL:', maskedUrl);

        await prisma.$connect();
        console.log('[DB] Connected successfully.');
        await seedAdmin();
    } catch (error: any) {
        console.error('[DB] Connection failure:', error.message);
    }
};

async function bootstrap() {
    // 1. Static/Vite Setup
    if (process.env.NODE_ENV !== 'production') {
        console.log('[Vite] Initializing developer mode...');
        try {
            const { createServer } = await import('vite');
            const vite = await createServer({
                server: { middlewareMode: true },
                appType: 'spa',
            });
            app.use(vite.middlewares);
            console.log('[Vite] Middleware attached.');
        } catch (err) {
            console.error('[Vite] Failed to start:', err);
        }
    } else if (!process.env.VERCEL) {
        // Only serve static files if NOT on Vercel
        const distPath = path.join(process.cwd(), 'dist');
        const fs = await import('fs');
        if (fs.existsSync(distPath)) {
            const express = await import('express');
            app.use(express.default.static(distPath));
            app.get('*', (req, res) => {
                res.sendFile(path.join(distPath, 'index.html'));
            });
            console.log('[Static] Serving production build from /dist');
        }
    }

    // 2. Start Server
    if (!process.env.VERCEL) {
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`[Server] Running at http://0.0.0.0:${PORT}`);
            startDB();
        });
    } else {
        // Vercel cold start path
        startDB();
    }
}

bootstrap();

export default app;
