// Email notification service
// Configure RESEND_API_KEY in .env to enable real email sending

export interface EmailOptions {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
    try {
        const response = await fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options),
        });
        return response.ok;
    } catch (error) {
        console.error('Send email error:', error);
        return false;
    }
}

// Pre-built email templates
export const emailTemplates = {
    taskReminder: (taskName: string, projectName: string, dueDate: string) => ({
        subject: `Przypomnienie: Zadanie "${taskName}" zbliża się do terminu`,
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">⏰ Przypomnienie o zadaniu</h2>
        <p>Zadanie <strong>${taskName}</strong> w projekcie <strong>${projectName}</strong> ma termin wykonania:</p>
        <p style="font-size: 24px; color: #f59e0b; font-weight: bold;">${dueDate}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #6b7280; font-size: 14px;">To jest automatyczne przypomnienie z systemu Project Manager.</p>
      </div>
    `,
        text: `Przypomnienie: Zadanie "${taskName}" w projekcie "${projectName}" ma termin ${dueDate}`,
    }),

    inspectionExpired: (toolName: string, serialNumber: string, expiryDate: string) => ({
        subject: `⚠️ Przegląd wygasł: ${toolName}`,
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">⚠️ Uwaga! Przegląd narzędzia wygasł</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Narzędzie:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${toolName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Nr seryjny:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${serialNumber}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Wygasł:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #ef4444; font-weight: bold;">${expiryDate}</td></tr>
        </table>
        <p>Proszę jak najszybciej wykonać przegląd narzędzia.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #6b7280; font-size: 14px;">To jest automatyczne powiadomienie z systemu Project Manager.</p>
      </div>
    `,
        text: `Uwaga! Przegląd narzędzia "${toolName}" (${serialNumber}) wygasł ${expiryDate}. Proszę wykonać przegląd.`,
    }),

    newComment: (projectName: string, author: string, comment: string) => ({
        subject: `💬 Nowy komentarz w projekcie: ${projectName}`,
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">💬 Nowy komentarz</h2>
        <p><strong>${author}</strong> dodał komentarz w projekcie <strong>${projectName}</strong>:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;">${comment}</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #6b7280; font-size: 14px;">To jest automatyczne powiadomienie z systemu Project Manager.</p>
      </div>
    `,
        text: `${author} dodał komentarz w projekcie "${projectName}": ${comment}`,
    }),
};
