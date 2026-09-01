import express from 'express';
import { db } from '../lib/firebaseAdmin';
import { verifyAuth, AuthenticatedRequest } from '../middleware/verifyAuth';
import { analyzeSentiment } from '../lib/gemini';
import { encrypt, decrypt } from '../lib/encryption';
import { getEncryptionKey } from '../lib/secretManager';
import { logAuditEvent } from '../lib/auditLogger';

const router = express.Router();

router.use(verifyAuth);

// POST /api/entries — Create new encrypted journal entry
router.post('/', async (req: AuthenticatedRequest, res: express.Response) => {
  const uid = req.user?.uid;
  const { piiMaskedPreview, plaintext, maskedText } = req.body;

  if (!uid) {
    res.status(401).json({ error: 'Unauthorized: No active user ID' });
    return;
  }
  
  if (!plaintext || !maskedText) {
    res.status(400).json({ error: 'Missing required field: plaintext or maskedText' });
    return;
  }

  try {
    // Gemini analyzes ONLY the client-side PII-masked text (with prompt injection guards)
    const textToAnalyze = maskedText;
    const sentimentTag = await analyzeSentiment(textToAnalyze);

    // Field-level AES-256-GCM encryption on the original journal plaintext
    const encKey = await getEncryptionKey();
    const ciphertext = encrypt(plaintext, encKey);

    const entryData = {
      userId: uid, // Explicit ownership binding to prevent BOLA / IDOR
      ciphertext,
      maskedText,
      sentimentTag,
      piiMaskedPreview: piiMaskedPreview || '',
      createdAt: new Date().toISOString()
    };
    
    const docRef = await db.collection('users').doc(uid).collection('entries').add(entryData);
    
    // Log audit event (WITHOUT recording journal plaintext or PII)
    logAuditEvent('ENTRY_CREATED', uid, 'SUCCESS', `Created entry ${docRef.id} with sentiment tag: ${sentimentTag}`, req);

    res.status(201).json({ id: docRef.id, ...entryData });
  } catch (error: any) {
    console.error('Error creating entry:', error);
    logAuditEvent('ENTRY_CREATED', uid, 'ERROR', `Failed to create entry: ${error.message}`, req);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/entries — List entries for authenticated user
router.get('/', async (req: AuthenticatedRequest, res: express.Response) => {
  const uid = req.user?.uid;
  
  if (!uid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const snapshot = await db.collection('users').doc(uid).collection('entries').orderBy('createdAt', 'desc').get();
    const entries = snapshot.docs.map(doc => ({
      id: doc.id,
      userId: doc.data().userId || uid,
      piiMaskedPreview: doc.data().piiMaskedPreview,
      sentimentTag: doc.data().sentimentTag,
      createdAt: doc.data().createdAt
    }));
    
    logAuditEvent('ENTRY_READ', uid, 'SUCCESS', `Listed ${entries.length} entries for user`, req);
    res.json(entries);
  } catch (error: any) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/entries/:id — Explicit ownership check & decrypt single entry
router.get('/:id', async (req: AuthenticatedRequest, res: express.Response) => {
  const uid = req.user?.uid;
  const { id } = req.params;
  
  if (!uid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!id || id.includes('/') || id.includes('..')) {
    logAuditEvent('ACCESS_DENIED', uid, 'DENIED', `Invalid or path-traversal entryId attempt: ${id}`, req);
    res.status(400).json({ error: 'Invalid entry ID format' });
    return;
  }

  try {
    // Query within user-isolated collection hierarchy
    const docRef = db.collection('users').doc(uid).collection('entries').doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      logAuditEvent('ACCESS_DENIED', uid, 'DENIED', `IDOR/BOLA Guard: Entry ${id} not found under user ${uid}`, req);
      res.status(404).json({ error: 'Entry not found or access denied' });
      return;
    }
    
    const data = docSnap.data()!;

    // Explicit Ownership Verification in code (since Firebase Admin SDK bypasses Security Rules)
    if (data.userId && data.userId !== uid) {
      logAuditEvent('ACCESS_DENIED', uid, 'DENIED', `BOLA VIOLATION ATTEMPT: User ${uid} tried to read entry ${id} owned by ${data.userId}`, req);
      res.status(403).json({ error: 'Forbidden: You do not own this journal entry' });
      return;
    }
    
    const encKey = await getEncryptionKey();
    
    let decryptedText = '';
    try {
      decryptedText = decrypt(data.ciphertext, encKey);
    } catch (err) {
      console.error('Decryption failed for entry', id);
      decryptedText = '[Error: Could not decrypt contents]';
    }
    
    logAuditEvent('ENTRY_READ', uid, 'SUCCESS', `Decrypted and viewed entry ${id}`, req);

    res.json({ 
      id: docSnap.id, 
      userId: uid,
      plaintext: decryptedText,
      sentimentTag: data.sentimentTag,
      createdAt: data.createdAt
    });
  } catch (error: any) {
    console.error('Error fetching entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/entries/:id — Delete entry with explicit ownership check
router.delete('/:id', async (req: AuthenticatedRequest, res: express.Response) => {
  const uid = req.user?.uid;
  const { id } = req.params;

  if (!uid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const docRef = db.collection('users').doc(uid).collection('entries').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      logAuditEvent('ACCESS_DENIED', uid, 'DENIED', `IDOR/BOLA Guard: Attempted delete on nonexistent/unowned entry ${id}`, req);
      res.status(404).json({ error: 'Entry not found or access denied' });
      return;
    }

    const data = docSnap.data()!;
    if (data.userId && data.userId !== uid) {
      logAuditEvent('ACCESS_DENIED', uid, 'DENIED', `BOLA DELETE ATTEMPT: User ${uid} attempted to delete entry ${id} owned by ${data.userId}`, req);
      res.status(403).json({ error: 'Forbidden: You do not own this entry' });
      return;
    }

    await docRef.delete();
    logAuditEvent('ENTRY_READ', uid, 'SUCCESS', `Deleted entry ${id}`, req);
    res.json({ status: 'ok', message: `Entry ${id} successfully deleted` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
