/**
 * Google Drive REST API Integrator for Database Backup & Restore.
 * Utilizes direct HTTP client requests with authorization headers.
 */

import { getAccessToken } from './firebase';

export interface IBackupData {
  sg_db_customers?: any[];
  sg_db_interactions?: any[];
  sg_db_orders?: any[];
  sg_db_invoices?: any[];
  sg_db_payments?: any[];
  sg_db_pin_locked?: string;
  sg_db_raw_materials?: any[];
  sg_db_suppliers?: any[];
  sg_db_supplier_ledgers?: any[];
  sg_db_inv_transactions?: any[];
  sg_db_boms?: any[];
  sg_db_wip_jobs?: any[];
  sg_db_finished_goods?: any[];
}

export interface IBackupPayload {
  app: string;
  timestamp: string;
  version: string;
  checksum: number; // calculated basic checksum of total characters
  recordCounts: { [key: string]: number };
  data: IBackupData;
}

export interface IDriveBackupFile {
  id: string;
  name: string;
  size?: string;
  createdTime: string;
}

const KEYS_TO_BACKUP = [
  'sg_db_customers',
  'sg_db_interactions',
  'sg_db_orders',
  'sg_db_invoices',
  'sg_db_payments',
  'sg_db_pin_locked',
  'sg_db_raw_materials',
  'sg_db_suppliers',
  'sg_db_supplier_ledgers',
  'sg_db_inv_transactions',
  'sg_db_boms',
  'sg_db_wip_jobs',
  'sg_db_finished_goods'
];

/**
 * Perform deep structural verification and check constraint validity
 * before creating or restoring backups.
 */
export function verifyDatabaseIntegrity(data: IBackupData): {
  valid: boolean;
  errors: string[];
  counts: { [key: string]: number };
} {
  const errors: string[] = [];
  const counts: { [key: string]: number } = {};

  if (!data || typeof data !== 'object') {
    errors.push('Database payload is not a valid object.');
    return { valid: false, errors, counts };
  }

  // Check each table key
  KEYS_TO_BACKUP.forEach((key) => {
    const rawVal = data[key as keyof IBackupData];
    if (key === 'sg_db_pin_locked') {
      // Pin code is a simple string, should be 4 digits
      if (rawVal !== undefined && (typeof rawVal !== 'string' || rawVal.length < 4)) {
        errors.push(`Integrity Warning: Password/PIN protection is invalid (must be string).`);
      }
      counts[key] = rawVal ? 1 : 0;
    } else {
      // Must be arrays
      if (rawVal !== undefined) {
        if (!Array.isArray(rawVal)) {
          errors.push(`Table "${key}" is corrupted: Expected an array format, got ${typeof rawVal}.`);
        } else {
          counts[key] = rawVal.length;
          // Sub-item item validations
          rawVal.forEach((item, index) => {
            if (!item || typeof item !== 'object') {
              errors.push(`Row ${index} in "${key}" table is corrupted.`);
            } else if (!item.id && key !== 'sg_db_pin_locked') {
              errors.push(`Row ${index} in "${key}" is missing its primary key "id".`);
            }
          });
        }
      } else {
        counts[key] = 0;
      }
    }
  });

  // Critical tables must exist
  if (!data.sg_db_customers && !data.sg_db_suppliers) {
    errors.push('CRITICAL FAIL: The backup payload does not contain any Partners CRM or Supplier Stores keys.');
  }

  return {
    valid: errors.length === 0,
    errors,
    counts
  };
}

/**
 * Fetch list of sg_works_backups from user's Google Drive.
 */
export async function listDriveBackups(accessToken: string): Promise<IDriveBackupFile[]> {
  const query = encodeURIComponent("name contains 'sg_works_backup_' and mimeType = 'application/json' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,size,createdTime)&orderBy=createdTime+desc`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to list backups from Google Drive.');
  }

  const result = await res.json();
  return result.files || [];
}

/**
 * Deletes backup files from Google Drive keeping only the last N
 */
export async function pruneOldBackups(accessToken: string, keepCount: number = 7): Promise<number> {
  const files = await listDriveBackups(accessToken);
  if (files.length <= keepCount) {
    return 0;
  }

  // The files are already sorted createdTime desc from the API parameter `orderBy=createdTime desc`
  const backupsToDelete = files.slice(keepCount);
  let deletedCount = 0;

  for (const backup of backupsToDelete) {
    try {
      const deleteUrl = `https://www.googleapis.com/drive/v3/files/${backup.id}`;
      const delRes = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        }
      });
      if (delRes.ok) {
        deletedCount++;
      } else {
        console.warn(`Failed to prune backup file with ID: ${backup.id}`);
      }
    } catch (e) {
      console.error(`Error pruning file ${backup.id}:`, e);
    }
  }

  return deletedCount;
}

/**
 * Performs manual backup: extracts local storage, executes local integrity check,
 * serializes JSON, uploads to Drive, and prunes older entries down to maximum 7 backups.
 */
export async function createGoogleDriveBackup(accessToken: string): Promise<{
  filename: string;
  recordCounts: { [key: string]: number };
  prunedCount: number;
}> {
  // Assemble backup payload from actual localStorage values
  const backupData: IBackupData = {};
  KEYS_TO_BACKUP.forEach((key) => {
    const rawVal = localStorage.getItem(key);
    if (rawVal !== null) {
      try {
        backupData[key as keyof IBackupData] = JSON.parse(rawVal);
      } catch (err) {
        // If it's the PIN key or raw string, write it direct
        backupData[key as keyof IBackupData] = rawVal as any;
      }
    }
  });

  // Verify database state before sending it
  const integrityResult = verifyDatabaseIntegrity(backupData);
  if (!integrityResult.valid) {
    throw new Error(
      `Database integrity check failed before backing up: ${integrityResult.errors.join(' | ')}`
    );
  }

  const payloadString = JSON.stringify(backupData);
  const totalCharacters = payloadString.length;

  const payload: IBackupPayload = {
    app: 'SG Engineering Works Manager',
    timestamp: new Date().toISOString(),
    version: '1.5',
    checksum: totalCharacters,
    recordCounts: integrityResult.counts,
    data: backupData
  };

  // Create multipart file upload body
  const filename = `sg_works_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const metadata = {
    name: filename,
    mimeType: 'application/json',
    description: `SG Works ERP Automated Backup - ${new Date().toLocaleString()}`
  };

  const boundary = 'sg_works_multipart_boundary';
  const multipartBody = 
    `\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}` +
    `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(payload)}` +
    `\r\n--${boundary}--`;

  const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartBody
  });

  if (!uploadRes.ok) {
    const errObj = await uploadRes.json().catch(() => ({}));
    throw new Error(errObj.error?.message || 'Multipart file upload to Google Drive failed.');
  }

  // Maintain rolling history of exactly Last 7 Backups by pruning
  const prunedCount = await pruneOldBackups(accessToken, 7);

  return {
    filename,
    recordCounts: integrityResult.counts,
    prunedCount
  };
}

/**
 * Downloads a database backup from Google Drive, performs integrity verification,
 * and sets the values to client localStorage.
 */
export async function downloadAndRestoreBackup(
  accessToken: string,
  fileId: string
): Promise<{
  payload: IBackupPayload;
  integrity: { valid: boolean; errors: string[] };
}> {
  // Download media contents
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    const errObj = await res.json().catch(() => ({}));
    throw new Error(errObj.error?.message || 'Failed to download backup file contents.');
  }

  const payload: IBackupPayload = await res.json();
  if (!payload || !payload.data) {
    throw new Error('Downloaded file has an invalid backup structure.');
  }

  // Perform integrity checks
  const integrity = verifyDatabaseIntegrity(payload.data);

  if (!integrity.valid) {
    // If fully missing or corrupted, return but let component handle warning or blocks
    console.error('Integrity Check Errors:', integrity.errors);
  }

  return {
    payload,
    integrity: {
      valid: integrity.valid,
      errors: integrity.errors
    }
  };
}

/**
 * Commit restored data directly to localStorage.
 */
export function writeRestoredToLocalStorage(data: IBackupData) {
  // Clear any existing ERP keys first
  KEYS_TO_BACKUP.forEach((key) => {
    localStorage.removeItem(key);
  });

  // Write restored keys
  KEYS_TO_BACKUP.forEach((key) => {
    const rawVal = data[key as keyof IBackupData];
    if (rawVal !== undefined) {
      if (typeof rawVal === 'string') {
        localStorage.setItem(key, rawVal);
      } else {
        localStorage.setItem(key, JSON.stringify(rawVal));
      }
    }
  });
}

/**
 * Orchestrates background quiet automated backups depending on trigger setups.
 */
export async function triggerAutomaticBackup(triggerSource: 'modification' | 'daily'): Promise<void> {
  const isEnabled = localStorage.getItem('sg_settings_auto_backup') === 'true';
  if (!isEnabled) return;

  const configuredTrigger = localStorage.getItem('sg_settings_auto_backup_trigger') || 'modification';
  if (configuredTrigger !== triggerSource) return;

  // If daily mode, assert that 24 hours elapsed
  if (triggerSource === 'daily') {
    const lastBackupStr = localStorage.getItem('sg_settings_last_backup_time');
    if (lastBackupStr) {
      const lastBackup = new Date(lastBackupStr).getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (Date.now() - lastBackup < oneDayMs) {
        return; // Skip: already backed up in last 24 hours
      }
    }
  }

  // Retrieve token in-memory
  const token = await getAccessToken();
  if (!token) {
    return; // Skip silently if Google profile is not linked or has expired
  }

  try {
    const res = await createGoogleDriveBackup(token);
    localStorage.setItem('sg_settings_last_backup_time', new Date().toISOString());
    console.log(`[Auto-Backup SUCCESS] Generated: ${res.filename}`);
  } catch (err) {
    console.error('[Auto-Backup ERROR]', err);
  }
}
