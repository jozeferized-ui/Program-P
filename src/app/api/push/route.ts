import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// Helper to verify auth token and get user ID
async function verifyAuth(request: NextRequest): Promise<number | null> {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload.userId as number;
    } catch {
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, subscription, notification } = body;

        if (action === 'subscribe') {
            // Verify auth for subscribing
            const userId = await verifyAuth(request);
            if (!userId) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            // Extract keys from subscription
            const { endpoint, keys } = subscription;

            // Upsert subscription (update if exists, create if not)
            await prisma.pushSubscription.upsert({
                where: { endpoint },
                update: {
                    p256dh: keys?.p256dh || '',
                    auth: keys?.auth || '',
                    userId,
                },
                create: {
                    endpoint,
                    p256dh: keys?.p256dh || '',
                    auth: keys?.auth || '',
                    userId,
                },
            });

            console.log('Push subscription saved to database');
            return NextResponse.json({ success: true });
        }

        if (action === 'unsubscribe') {
            const { endpoint } = subscription;

            // Delete subscription from database
            await prisma.pushSubscription.deleteMany({
                where: { endpoint },
            });

            console.log('Push subscription removed from database');
            return NextResponse.json({ success: true });
        }

        if (action === 'send') {
            // Verify auth for sending
            const userId = await verifyAuth(request);
            if (!userId) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            // Get all subscriptions from database
            const subscriptions = await prisma.pushSubscription.findMany();

            console.log('Push notification:', notification);
            console.log('Would send to', subscriptions.length, 'subscribers');

            // TODO: For production, install web-push and send actual notifications
            // npm install web-push
            // Generate VAPID: npx web-push generate-vapid-keys

            return NextResponse.json({
                success: true,
                message: 'Logged (web-push not configured)',
                subscriberCount: subscriptions.length
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Push notification error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    // Verify auth
    const userId = await verifyAuth(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscriptions = await prisma.pushSubscription.count();

    return NextResponse.json({
        subscriptionCount: subscriptions,
        message: 'Configure VAPID keys for production push notifications',
    });
}
