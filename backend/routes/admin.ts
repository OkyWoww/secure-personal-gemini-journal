import express from 'express';
import { verifyAuth, requireAdmin, AuthenticatedRequest } from '../middleware/verifyAuth';
import { getAuditLogs, logAuditEvent } from '../lib/auditLogger';
import { adminAuth } from '../lib/firebaseAdmin';

const router = express.Router();

// GET /api/admin/audit-log — protected by verifyAuth and requireAdmin
router.get('/audit-log', verifyAuth, requireAdmin, (req: AuthenticatedRequest, res: express.Response) => {
  const auditData = getAuditLogs();
  res.json({
    status: 'ok',
    queriedBy: req.user?.email,
    queriedAt: new Date().toISOString(),
    ...auditData
  });
});

// POST /api/admin/set-role — set custom claims (role: admin) on target UID
router.post('/set-role', verifyAuth, requireAdmin, async (req: AuthenticatedRequest, res: express.Response) => {
  const { targetUid, role } = req.body;
  if (!targetUid || !role) {
    res.status(400).json({ error: 'targetUid and role are required' });
    return;
  }

  try {
    await adminAuth.setCustomUserClaims(targetUid, { role, admin: role === 'admin' });
    logAuditEvent('ADMIN_ACCESS', req.user?.uid || 'admin', 'SUCCESS', `Updated role for user ${targetUid} to ${role}`, req);
    res.json({ status: 'ok', message: `Custom claim role:${role} assigned to ${targetUid}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
