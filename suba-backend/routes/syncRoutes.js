import express from 'express';
import syncService from '../services/syncService.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/sync/google/auth-url
 * Returns the URL for the user to authenticate with Google.
 */
router.get('/google/auth-url', authMiddleware, (req, res) => {
    try {
        const url = syncService.getAuthUrl();
        res.json({ url });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate auth URL' });
    }
});

/**
 * POST /api/sync/google/callback
 * Handles the OAuth callback and triggers the first sync.
 */
router.post('/google/callback', authMiddleware, async (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'Auth code is required' });
    }

    try {
        const tokens = await syncService.setCredentials(code);

        // Trigger initial sync in background
        syncService.syncGmailSubscriptions(req.user.id, tokens)
            .then(subs => {
                console.log(`✅ Auto-fetched ${subs.length} subscriptions for user ${req.user.id}`);
                return syncService.saveSubscriptions(req.user.id, subs);
            })
            .catch(err => console.error('❌ Sync background error:', err));

        res.json({ message: 'Sync initiated successfully', tokens });
    } catch (error) {
        console.error('OAuth Callback Error:', error);
        res.status(500).json({ error: 'Failed to complete OAuth and sync' });
    }
});

/**
 * POST /api/sync/refresh
 * Manually triggers a re-sync for a connected account.
 */
router.post('/refresh', authMiddleware, async (req, res) => {
    const { provider, tokens } = req.body;

    if (provider !== 'google' || !tokens) {
        return res.status(400).json({ error: 'Valid provider and tokens are required' });
    }

    try {
        const subs = await syncService.syncGmailSubscriptions(req.user.id, tokens);
        await syncService.saveSubscriptions(req.user.id, subs);
        res.json({ message: `Sync complete. Found ${subs.length} new/updated subscriptions.`, count: subs.length });
    } catch (error) {
        console.error('Manual Refresh Error:', error);
        res.status(500).json({ error: 'Failed to refresh sync' });
    }
});

/**
 * POST /api/sync/external
 * Endpoint for other apps to push subscription data directly.
 */
router.post('/external', authMiddleware, async (req, res) => {
    const { subscriptions } = req.body; // Expecting an array of sub objects

    if (!Array.isArray(subscriptions)) {
        return res.status(400).json({ error: 'Subscriptions array is required' });
    }

    try {
        await syncService.saveSubscriptions(req.user.id, subscriptions);
        res.json({ message: `Successfully logged ${subscriptions.length} subscriptions from external source.` });
    } catch (error) {
        console.error('External Push Error:', error);
        res.status(500).json({ error: 'Failed to process external data' });
    }
});

export default router;
