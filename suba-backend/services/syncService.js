import { google } from 'googleapis';
import geminiService from './geminiAIService.js';
import { dbPromise } from '../models/db.js';

/**
 * SyncService handles the automated fetching of subscriptions from external sources.
 * Currently supports: Gmail (via Google OAuth)
 */
class SyncService {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
    }

    /**
     * Generates an Auth URL for the user to connect their Google account.
     */
    getAuthUrl() {
        const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent',
        });
    }

    /**
     * Sets the credentials from the auth code.
     */
    async setCredentials(code) {
        const { tokens } = await this.oauth2Client.getToken(code);
        this.oauth2Client.setCredentials(tokens);
        return tokens;
    }

    /**
     * Scans the user's Gmail for subscription-related emails and extracts data.
     */
    async syncGmailSubscriptions(userId, tokens) {
        this.oauth2Client.setCredentials(tokens);
        const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

        // Search for common subscription keywords in the last 3 months
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const query = `newer_than:90d (subscription OR "renewed" OR "payment received" OR "invoice" OR "receipt")`;

        const res = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: 20, // Limit for performance/testing
        });

        if (!res.data.messages) return [];

        const foundSubscriptions = [];
        const processedSenders = new Set();

        for (const msg of res.data.messages) {
            const message = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id,
                format: 'full',
            });

            const payload = message.data.payload;
            const headers = payload.headers;
            const from = headers.find(h => h.name === 'From')?.value;
            const subject = headers.find(h => h.name === 'Subject')?.value;

            // Extract body snippet
            let snippet = message.data.snippet;
            if (payload.parts) {
                // Try to find text/plain part for better extraction
                const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
                if (textPart && textPart.body && textPart.body.data) {
                    snippet = Buffer.from(textPart.body.data, 'base64').toString();
                }
            }

            // Skip if we've already parsed a similar sub in this run (basic deduplication)
            const senderKey = from?.match(/<(.+?)>/)?.[1] || from;
            if (processedSenders.has(senderKey)) continue;

            console.log(`🔍 Processing email from ${from}: "${subject}"`);

            // Use Gemini to extract subscription data from the email text
            const extracted = await geminiService.extractSubscriptionsFromText(snippet + `\nSubject: ${subject}\nFrom: ${from}`);

            if (extracted && extracted.length > 0) {
                for (const sub of extracted) {
                    sub.user_id = userId;
                    foundSubscriptions.push(sub);
                    processedSenders.add(senderKey);
                }
            }
        }

        return foundSubscriptions;
    }

    /**
     * Saves the found subscriptions to the database.
     */
    async saveSubscriptions(userId, subscriptions) {
        const connection = await dbPromise.getConnection();
        try {
            await connection.beginTransaction();

            for (const sub of subscriptions) {
                // Skip if a sub with the same name already exists for this user (very basic check)
                const [existing] = await connection.execute(
                    'SELECT id FROM subscriptions WHERE user_id = ? AND name = ? AND status = "active"',
                    [userId, sub.name]
                );

                if (existing.length > 0) continue;

                await connection.execute(
                    `INSERT INTO subscriptions 
           (user_id, name, amount, currency, billing_cycle, next_billing_date, status, category)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        userId,
                        sub.name,
                        sub.amount || 0,
                        sub.currency || 'NGN',
                        sub.billing_cycle || 'monthly',
                        sub.next_billing_date || new Date().toISOString().split('T')[0],
                        sub.status || 'active',
                        sub.category || 'General'
                    ]
                );
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

export default new SyncService();
