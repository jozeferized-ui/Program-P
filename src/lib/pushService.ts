/**
 * @file pushService.ts
 * @description Obsługa powiadomień push w przeglądarce
 * 
 * Funkcjonalności:
 * - Sprawdzanie wsparcia dla push
 * - Subskrypcja/wysubskrybowanie z powiadomień
 * - Wysyłanie powiadomień push
 * 
 * Wymaga konfiguracji NEXT_PUBLIC_VAPID_PUBLIC_KEY w .env
 * 
 * @module lib/pushService
 */
'use client';

/** Klucz publiczny VAPID dla Web Push */
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/**
 * Sprawdza czy przeglądarka wspiera powiadomienia push
 * @returns true jeśli Service Worker i PushManager są dostępne
 */
export function isPushSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Subskrybuje użytkownika do powiadomień push
 * Rejestruje Service Worker i wysyła subskrypcję do serwera
 * 
 * @returns true jeśli subskrypcja powiodła się
 */
export async function subscribeToPush(): Promise<boolean> {
    if (!isPushSupported()) {
        console.log('Push notifications not supported');
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        // Sprawdź czy już zasubskrybowany
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            // Utwórz nową subskrypcję
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY || ''),
            });
        }

        // Wyślij subskrypcję do serwera
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

/**
 * Wysubskrybowuje użytkownika z powiadomień push
 * @returns true jeśli wysubskrybowanie powiodło się
 */
export async function unsubscribeFromPush(): Promise<boolean> {
    if (!isPushSupported()) return false;

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await subscription.unsubscribe();

            // Powiadom serwer o wysubskrybowaniu
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

/**
 * Wysyła powiadomienie push do wszystkich subskrybentów
 * 
 * @param title - Tytuł powiadomienia
 * @param body - Treść powiadomienia
 * @param data - Dodatkowe dane (opcjonalne)
 * @returns true jeśli wysłanie powiodło się
 */
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

/**
 * Konwertuje klucz VAPID z Base64 URL na Uint8Array
 * @param base64String - Klucz w formacie Base64 URL
 * @returns ArrayBuffer dla applicationServerKey
 */
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
