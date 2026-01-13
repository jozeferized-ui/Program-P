import { NextRequest, NextResponse } from 'next/server';

// Simple email notification API using Resend (or similar)
// Note: In production, you'd use Resend, SendGrid, or similar service

export async function POST(request: NextRequest) {
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
