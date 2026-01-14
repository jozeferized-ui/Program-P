import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// Helper to verify auth token
async function verifyAuth(request: NextRequest): Promise<boolean> {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return false;

    try {
        await jwtVerify(token, JWT_SECRET);
        return true;
    } catch {
        return false;
    }
}

// Simple email notification API using Resend (or similar)
export async function POST(request: NextRequest) {
    // Verify authentication
    const isAuth = await verifyAuth(request);
    if (!isAuth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { to, subject, html, text } = await request.json();

        // Check if Resend API key is configured
        const resendApiKey = process.env.RESEND_API_KEY;

        if (!resendApiKey) {
            console.log('Email notification (no API key configured):');
            console.log('To:', to);
            console.log('Subject:', subject);
            console.log('Text:', text);
            return NextResponse.json({
                success: true,
                message: 'Email logged (no API key)'
            });
        }

        // Send via Resend
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Project Manager <noreply@projectmanager.app>',
                to,
                subject,
                html,
                text,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Resend error:', error);
            return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Email error:', error);
        return NextResponse.json({ success: false, error: 'Email failed' }, { status: 500 });
    }
}
