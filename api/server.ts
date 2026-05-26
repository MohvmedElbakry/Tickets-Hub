// api/server.ts - Server Entry Point (Local & Production Server)

import app from './app.js';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './lib/prisma.js';
import bcrypt from 'bcryptjs';
import { exec } from 'child_process';

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

const reconcileDatabase = async () => {
    console.log('[DB] Running database auto-reconciliation and alignment check...');
    try {
        // 1. Ensure the Setting table exists. If on PostgreSQL or raw SQL matching schema.prisma.
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "Setting" (
                id SERIAL PRIMARY KEY,
                service_fee_percent DOUBLE PRECISION NOT NULL DEFAULT 10,
                processing_fee_percent DOUBLE PRECISION NOT NULL DEFAULT 2.75,
                fixed_fee_egp DOUBLE PRECISION NOT NULL DEFAULT 3
            )
        `);
        console.log('[DB] Ensure Setting table exists - success.');

        // 2. Add individual columns if they don't exist
        await prisma.$executeRawUnsafe('ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "service_fee_percent" DOUBLE PRECISION NOT NULL DEFAULT 10');
        await prisma.$executeRawUnsafe('ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "processing_fee_percent" DOUBLE PRECISION NOT NULL DEFAULT 2.75');
        await prisma.$executeRawUnsafe('ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "fixed_fee_egp" DOUBLE PRECISION NOT NULL DEFAULT 3');
        console.log('[DB] Ensure Setting columns exist - success.');

        // 3. Ensure we have at least one Setting record in the database
        const countRaw: any[] = await prisma.$queryRawUnsafe('SELECT COUNT(*) FROM "Setting"');
        const count = Number(countRaw[0]?.count || countRaw[0]?.['count(*)'] || 0);
        if (count === 0) {
            await prisma.$executeRawUnsafe('INSERT INTO "Setting" (service_fee_percent, processing_fee_percent, fixed_fee_egp) VALUES (10, 2.75, 3)');
            console.log('[DB] Default Setting row seeded successfully.');
        } else {
            console.log('[DB] Setting row already exists.');
        }
    } catch (err: any) {
        console.warn('[DB WARNING] Auto-reconciliation check encountered a non-fatal warning:', err.message);
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
        
        // Run early auto-reconciliation diagnostics to align columns (preventing runtime P2022 errors)
        await reconcileDatabase();
        
        await seedAdmin();

        // Run migrations in the background so that any timeout/PgBouncer locking issues do not block starting the Node web server
        console.log('[DB] Triggering background migrations (non-blocking)...');
        exec('npx prisma migrate deploy', (error, stdout, stderr) => {
            if (error) {
                console.warn('[DB WARNING] Background migration command non-fatal warning:', error.message);
                console.warn(stderr);
                return;
            }
            console.log('[DB] Background migration command output:', stdout);
        });
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
