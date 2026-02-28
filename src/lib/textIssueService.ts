import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  runTransaction,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Lang } from '../data/types';

// ============================================================================
// Types
// ============================================================================

export type IssueType = 'doubt' | 'variant' | 'error';
export type IssueStatus = 'open' | 'acknowledged' | 'resolved' | 'wontfix';

export interface TextIssueReport {
  stotraKey: string;
  lineId: string;
  lineText: string;
  script: Lang;
  issueType: IssueType;
  description: string;
  suggestedText?: string;
  reference?: string;
  userId: string;
  displayName: string;
  appVersion: string;
  createdAt: Timestamp;
  status: IssueStatus;
  resolution?: string;
  resolvedAt?: Timestamp;
}

export interface PublicIssueView {
  id: string;
  stotraKey: string;
  lineId?: string;
  issueType: IssueType;
  description: string;
  suggestedText?: string;
  reference?: string;
  status: IssueStatus;
  resolutionNote?: string;
  reportCount: number;
  ageLabel: string; // "3 weeks ago"
}

export interface StotraQualitySummary {
  stotraKey: string;
  counts: {
    doubt:   { open: number; resolved: number; wontfix: number };
    variant: { open: number; resolved: number; wontfix: number };
    error:   { open: number; resolved: number; wontfix: number };
  };
  byLine: Record<string, { open: number; types: IssueType[] }>;
  lastUpdated: Timestamp;
}

// ============================================================================
// Helpers
// ============================================================================

export function ageLabel(ts: Timestamp, now = Date.now()): string {
  const ms = now - ts.toMillis();
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months >= 1) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (weeks >= 1) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  if (days >= 1) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours >= 1) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes >= 1) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}

export function emptyCounts() {
  return {
    doubt:   { open: 0, resolved: 0, wontfix: 0 },
    variant: { open: 0, resolved: 0, wontfix: 0 },
    error:   { open: 0, resolved: 0, wontfix: 0 },
  };
}

// ============================================================================
// Submit a new text issue report
// ============================================================================

export async function submitTextIssue(params: {
  userId: string;
  displayName: string;
  stotraKey: string;
  lineId: string;
  lineText: string;
  script: Lang;
  issueType: IssueType;
  description: string;
  suggestedText?: string;
  reference?: string;
  appVersion: string;
}): Promise<void> {
  if (!db) throw new Error('Firestore not configured');

  const report: Omit<TextIssueReport, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
    stotraKey: params.stotraKey,
    lineId: params.lineId,
    lineText: params.lineText,
    script: params.script,
    issueType: params.issueType,
    description: params.description,
    appVersion: params.appVersion,
    userId: params.userId,
    displayName: params.displayName,
    status: 'open',
    createdAt: serverTimestamp(),
  };
  if (params.suggestedText) report.suggestedText = params.suggestedText;
  if (params.reference) report.reference = params.reference;

  await addDoc(collection(db, 'textIssues'), report);

  // Update quality summary counts
  await updateQualitySummary(params.stotraKey, params.lineId, params.issueType, 'open', +1);

  // Send email notification (fire-and-forget)
  notifyVerifiers(params).catch(console.error);
}

async function notifyVerifiers(params: {
  stotraKey: string;
  lineId: string;
  issueType: IssueType;
  description: string;
  suggestedText?: string;
  reference?: string;
  lineText: string;
}): Promise<void> {
  try {
    await fetch('/api/text-issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch {
    // Non-critical — don't surface to user
  }
}

// ============================================================================
// Fetch public issues (privacy-safe) for a stotra or line
// ============================================================================

export async function getPublicIssues(
  stotraKey: string,
  lineId?: string,
): Promise<PublicIssueView[]> {
  if (!db) return [];

  let q = query(
    collection(db, 'publicIssues'),
    where('stotraKey', '==', stotraKey),
  );
  if (lineId) {
    q = query(
      collection(db, 'publicIssues'),
      where('stotraKey', '==', stotraKey),
      where('lineId', '==', lineId),
    );
  }

  const snap = await getDocs(q);
  const items: PublicIssueView[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      stotraKey: data.stotraKey,
      lineId: data.lineId,
      issueType: data.issueType as IssueType,
      description: data.description,
      suggestedText: data.suggestedText,
      reference: data.reference,
      status: data.status as IssueStatus,
      resolutionNote: data.resolutionNote,
      reportCount: data.reportCount ?? 1,
      ageLabel: data.createdAt ? ageLabel(data.createdAt as Timestamp) : 'unknown',
    };
  });

  // Sort: open first, then by reportCount desc, then resolved
  return items.sort((a, b) => {
    const statusOrder: Record<IssueStatus, number> = { open: 0, acknowledged: 1, resolved: 2, wontfix: 3 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return b.reportCount - a.reportCount;
  });
}

// ============================================================================
// Fetch quality summary for a stotra
// ============================================================================

export async function getQualitySummary(
  stotraKey: string,
): Promise<StotraQualitySummary | null> {
  if (!db) return null;

  const ref = doc(db, 'textQualitySummary', stotraKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  return snap.data() as StotraQualitySummary;
}

// ============================================================================
// Update quality summary counts (internal use)
// ============================================================================

export async function updateQualitySummary(
  stotraKey: string,
  lineId: string,
  issueType: IssueType,
  status: IssueStatus,
  delta: number,
): Promise<void> {
  if (!db) return;

  const ref = doc(db, 'textQualitySummary', stotraKey);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    let data: StotraQualitySummary;

    if (!snap.exists()) {
      data = {
        stotraKey,
        counts: emptyCounts(),
        byLine: {},
        lastUpdated: Timestamp.now(),
      };
    } else {
      data = snap.data() as StotraQualitySummary;
      if (!data.counts) data.counts = emptyCounts();
      if (!data.byLine) data.byLine = {};
    }

    // Update type/status counter
    const statusKey = status === 'acknowledged' ? 'open' : status === 'wontfix' ? 'wontfix' : status;
    const validStatusKey = statusKey === 'open' || statusKey === 'resolved' || statusKey === 'wontfix' ? statusKey : 'open';
    data.counts[issueType][validStatusKey] = Math.max(
      0,
      (data.counts[issueType][validStatusKey] || 0) + delta,
    );

    // Update byLine
    if (!data.byLine[lineId]) {
      data.byLine[lineId] = { open: 0, types: [] };
    }
    if (status === 'open' || status === 'acknowledged') {
      data.byLine[lineId].open = Math.max(0, (data.byLine[lineId].open || 0) + delta);
      if (delta > 0 && !data.byLine[lineId].types.includes(issueType)) {
        data.byLine[lineId].types.push(issueType);
      }
    }

    data.lastUpdated = Timestamp.now();
    tx.set(ref, data);
  });
}

// ============================================================================
// Resolve an issue (verifier/admin only)
// ============================================================================

export async function resolveIssue(params: {
  issueId: string;
  status: 'acknowledged' | 'resolved' | 'wontfix';
  resolutionNote: string;
  stotraKey: string;
  lineId: string;
  issueType: IssueType;
  previousStatus: IssueStatus;
}): Promise<void> {
  if (!db) return;

  const issueRef = doc(db, 'textIssues', params.issueId);
  const publicRef = doc(db, 'publicIssues', params.issueId);

  const snap = await getDoc(issueRef);
  if (!snap.exists()) throw new Error('Issue not found');

  const issueData = snap.data() as TextIssueReport;

  // Update private issue
  await updateDoc(issueRef, {
    status: params.status,
    resolution: params.resolutionNote,
    resolvedAt: serverTimestamp(),
  });

  // Update/create public issue projection (privacy-safe)
  const publicData: Partial<PublicIssueView> & { stotraKey: string; lineId: string; createdAt?: Timestamp } = {
    stotraKey: params.stotraKey,
    lineId: params.lineId,
    issueType: params.issueType,
    description: issueData.description,
    suggestedText: issueData.suggestedText,
    reference: issueData.reference,
    status: params.status,
    resolutionNote: params.resolutionNote || undefined,
    reportCount: 1,
    createdAt: issueData.createdAt,
  };

  await updateDoc(publicRef, publicData).catch(async () => {
    // Create if not exists
    const { setDoc } = await import('firebase/firestore');
    await setDoc(publicRef, publicData);
  });

  // Update summary: decrement old status, increment new
  const prevStatusKey: IssueStatus = params.previousStatus;
  await updateQualitySummary(params.stotraKey, params.lineId, params.issueType, prevStatusKey, -1);
  await updateQualitySummary(params.stotraKey, params.lineId, params.issueType, params.status, +1);
}

// ============================================================================
// Fetch open issues for verifier dashboard
// ============================================================================

export async function getOpenIssues(filters?: {
  stotraKey?: string;
  issueType?: IssueType;
  status?: IssueStatus;
}): Promise<TextIssueReport[]> {
  if (!db) return [];

  const constraints = [];

  if (filters?.stotraKey) {
    constraints.push(where('stotraKey', '==', filters.stotraKey));
  }
  if (filters?.issueType) {
    constraints.push(where('issueType', '==', filters.issueType));
  }
  if (filters?.status) {
    constraints.push(where('status', '==', filters.status));
  } else {
    // Default: open + acknowledged
    constraints.push(where('status', 'in', ['open', 'acknowledged']));
  }

  constraints.push(orderBy('createdAt', 'desc'));

  const q = query(collection(db, 'textIssues'), ...constraints);
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as TextIssueReport & { id: string }));
}

// ============================================================================
// Admin: Update user role
// ============================================================================

export async function setUserRole(
  userId: string,
  role: 'user' | 'verifier' | 'admin',
): Promise<void> {
  if (!db) return;
  const { updateDoc: _updateDoc, doc: _doc } = await import('firebase/firestore');
  await _updateDoc(_doc(db, 'users', userId), { role });
}

export async function getVerifierUsers(): Promise<Array<{ uid: string; displayName: string; email: string; role: string }>> {
  if (!db) return [];
  const q = query(
    collection(db, 'users'),
    where('role', 'in', ['verifier', 'admin']),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      displayName: data.profile?.displayName || '',
      email: data.profile?.email || '',
      role: data.role || 'user',
    };
  });
}
