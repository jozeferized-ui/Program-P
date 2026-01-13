'use client';

// Push notification service for browser

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function isPushSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function subscribeToPush(): Promise<boolean> {
    if (!isPushSupported()) {
        console.log('Push notifications not supported');
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            // Subscribe
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY || ''),
            });
        }

        // Send subscription to server
        await fetch('/api/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'subscribe',
                subscription: subscription.toJSON(),
            }),
        });

        console.log('Push subscription successful');
        return true;
    } catch (error) {
        console.error('Push subscription failed:', error);
        return false;
    }
}

export async function unsubscribeFromPush(): Promise<boolean> {
    if (!isPushSupported()) return false;

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await subscription.unsubscribe();

            await fetch('/api/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'unsubscribe',
                    subscription: subscription.toJSON(),
                }),
            });
        }

        return true;
    } catch (error) {
        console.error('Push unsubscription failed:', error);
        return false;
    }
}

export async function sendPushNotification(
    title: string,
    body: string,
    data?: any
): Promise<boolean> {
    try {
        const response = await fetch('/api/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'send',
                notification: { title, body, data },
            }),
        });
        return response.ok;
    } catch (error) {
        console.error('Send push failed:', error);
        return false;
    }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer as ArrayBuffer;
}
