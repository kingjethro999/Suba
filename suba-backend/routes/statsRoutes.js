import express from 'express';
import { dbPromise } from '../models/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        // Check DB status
        let dbStatus = 'Connected';
        try {
            await dbPromise.query('SELECT 1');
        } catch (err) {
            dbStatus = 'Error: ' + err.message;
        }

        // Get users
        const [users] = await dbPromise.query('SELECT id, full_name, email, created_at FROM users ORDER BY created_at DESC');

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Suba - Platform Stats</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #6366f1;
            --primary-hover: #4f46e5;
            --bg: #0f172a;
            --card-bg: #1e293b;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --border: #334155;
            --success: #10b981;
            --error: #ef4444;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg);
            color: var(--text-main);
            line-height: 1.5;
            padding: 2rem 1rem;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
        }

        header {
            margin-bottom: 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }

        h1 {
            font-size: 1.875rem;
            font-weight: 700;
            background: linear-gradient(to right, #818cf8, #c084fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            padding: 0.5rem 1rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 500;
            background-color: var(--card-bg);
            border: 1px solid var(--border);
        }

        .status-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 0.5rem;
        }

        .status-online { background-color: var(--success); box-shadow: 0 0 8px var(--success); }
        .status-offline { background-color: var(--error); box-shadow: 0 0 8px var(--error); }

        .card {
            background-color: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 1rem;
            overflow: hidden;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .card-header {
            padding: 1.5rem;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .card-title {
            font-size: 1.25rem;
            font-weight: 600;
        }

        .user-count {
            font-size: 0.875rem;
            color: var(--text-muted);
            background: rgba(99, 102, 241, 0.1);
            padding: 0.25rem 0.75rem;
            border-radius: 0.5rem;
            border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .table-container {
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }

        th {
            background-color: rgba(15, 23, 42, 0.5);
            padding: 1rem 1.5rem;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            border-bottom: 1px solid var(--border);
        }

        td {
            padding: 1rem 1.5rem;
            font-size: 0.875rem;
            border-bottom: 1px solid var(--border);
        }

        tr:last-child td {
            border-bottom: none;
        }

        tr:hover td {
            background-color: rgba(255, 255, 255, 0.02);
        }

        .user-name {
            font-weight: 500;
            color: var(--text-main);
        }

        .user-email {
            color: var(--text-muted);
        }

        .empty-state {
            padding: 3rem;
            text-align: center;
            color: var(--text-muted);
        }

        @media (max-width: 640px) {
            body { padding: 1rem 0.5rem; }
            h1 { font-size: 1.5rem; }
            th, td { padding: 0.75rem 1rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Suba Platform Stats</h1>
            <div class="status-badge">
                <span class="status-indicator ${dbStatus === 'Connected' ? 'status-online' : 'status-offline'}"></span>
                Database: ${dbStatus}
            </div>
        </header>

        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Registered Users</h2>
                <span class="user-count">${users.length} Total</span>
            </div>
            <div class="table-container">
                ${users.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                        <tr>
                            <td>#${user.id}</td>
                            <td class="user-name">${user.full_name || 'N/A'}</td>
                            <td class="user-email">${user.email}</td>
                            <td>${new Date(user.created_at).toLocaleDateString()}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                ` : `
                <div class="empty-state">No users found.</div>
                `}
            </div>
        </div>
    </div>
</body>
</html>
    `;
        res.send(html);
    } catch (err) {
        console.error('Stats Error:', err);
        res.status(500).send('<h1>Server Error</h1><p>' + err.message + '</p>');
    }
});

export default router;
