import { Request } from 'express';
import { randomUUID } from 'crypto';

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: 'LOGIN_SUCCESS' | 'ENTRY_CREATED' | 'ENTRY_READ' | 'REFLECTION_GENERATED' | 'ACCESS_DENIED' | 'ADMIN_ACCESS';
  userId: string;
  ip?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'DENIED' | 'ERROR';
  details: string;
}

// In-memory structured audit buffer for demo / aggregation
const auditLogBuffer: AuditEvent[] = [];
const MAX_AUDIT_LOGS = 100;

export function logAuditEvent(
  eventType: AuditEvent['eventType'],
  userId: string,
  status: AuditEvent['status'],
  details: string,
  req?: Request
): AuditEvent {
  const event: AuditEvent = {
    id: `audit-${randomUUID()}`,
    timestamp: new Date().toISOString(),
    eventType,
    userId: userId || 'anonymous',
    ip: req?.ip || req?.headers['x-forwarded-for']?.toString() || 'unknown',
    userAgent: req?.headers['user-agent'] || 'unknown',
    status,
    details
  };

  auditLogBuffer.unshift(event);
  if (auditLogBuffer.length > MAX_AUDIT_LOGS) {
    auditLogBuffer.pop();
  }

  // Cloud Logging Structured JSON output (RFC 5424 / GCP standard)
  const severity = status === 'DENIED' ? 'WARNING' : status === 'ERROR' ? 'ERROR' : 'INFO';
  console.log(JSON.stringify({
    severity,
    message: `[AUDIT] ${eventType} - ${status} for user ${event.userId}: ${details}`,
    auditEvent: {
      id: event.id,
      eventType: event.eventType,
      userId: event.userId,
      status: event.status,
      timestamp: event.timestamp,
      details: event.details
    }
  }));

  return event;
}

export function getAuditLogs(): {
  summary: {
    totalEvents: number;
    loginCount: number;
    entryCreatedCount: number;
    entryReadCount: number;
    accessDeniedCount: number;
  };
  events: AuditEvent[];
} {
  const summary = {
    totalEvents: auditLogBuffer.length,
    loginCount: auditLogBuffer.filter(e => e.eventType === 'LOGIN_SUCCESS').length,
    entryCreatedCount: auditLogBuffer.filter(e => e.eventType === 'ENTRY_CREATED').length,
    entryReadCount: auditLogBuffer.filter(e => e.eventType === 'ENTRY_READ').length,
    accessDeniedCount: auditLogBuffer.filter(e => e.status === 'DENIED' || e.eventType === 'ACCESS_DENIED').length,
  };

  return {
    summary,
    events: auditLogBuffer.slice(0, 50)
  };
}
