import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { toolId, latitude, longitude, accuracy } = body;

        if (!toolId) {
            return NextResponse.json({ error: 'toolId is required' }, { status: 400 });
        }

        // Get IP address
        const forwardedFor = request.headers.get('x-forwarded-for');
        const realIp = request.headers.get('x-real-ip');
        const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown';

        // Get user agent
        const userAgent = request.headers.get('user-agent') || 'unknown';

        // Try to get location from IP (simple approach - could use external service)
        let country: string | null = null;
        let city: string | null = null;

        // Create scan record
        const scan = await prisma.toolScan.create({
            data: {
                toolId: parseInt(toolId),
                latitude: latitude || null,
                longitude: longitude || null,
                accuracy: accuracy || null,
                ipAddress,
                userAgent,
                country,
                city,
            },
        });

        return NextResponse.json({ success: true, scan });
    } catch (error) {
        console.error('Error recording scan:', error);
        return NextResponse.json({ error: 'Failed to record scan' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const toolId = searchParams.get('toolId');

        if (!toolId) {
            return NextResponse.json({ error: 'toolId is required' }, { status: 400 });
        }

        const scans = await prisma.toolScan.findMany({
            where: { toolId: parseInt(toolId) },
            orderBy: { scannedAt: 'desc' },
            take: 50, // Last 50 scans
        });

        return NextResponse.json({ scans });
    } catch (error) {
        console.error('Error fetching scans:', error);
        return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 });
    }
}
