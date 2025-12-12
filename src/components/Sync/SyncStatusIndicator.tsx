/**
 * SyncStatusIndicator - Zeigt den aktuellen Sync-Status an
 */

import React from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  WifiOff,
  Settings,
} from 'lucide-react';
import { useSyncStore } from '../../store/syncStore';
import type { SyncStatus } from '../../types/sync';

interface SyncStatusIndicatorProps {
  onClick?: () => void;
  showLabel?: boolean;
}

const statusConfig: Record<
  SyncStatus,
  {
    icon: React.ReactNode;
    label: string;
    color: string;
    animate?: boolean;
  }
> = {
  disconnected: {
    icon: <CloudOff size={18} />,
    label: 'Nicht verbunden',
    color: 'text-gray-400',
  },
  connecting: {
    icon: <RefreshCw size={18} />,
    label: 'Verbinde...',
    color: 'text-blue-500',
    animate: true,
  },
  syncing: {
    icon: <RefreshCw size={18} />,
    label: 'Synchronisiere...',
    color: 'text-blue-500',
    animate: true,
  },
  synced: {
    icon: <CheckCircle size={18} />,
    label: 'Synchronisiert',
    color: 'text-green-500',
  },
  paused: {
    icon: <WifiOff size={18} />,
    label: 'Offline',
    color: 'text-yellow-500',
  },
  error: {
    icon: <AlertCircle size={18} />,
    label: 'Fehler',
    color: 'text-red-500',
  },
};

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  onClick,
  showLabel = false,
}) => {
  const { syncState, settings } = useSyncStore();
  const { status, isOnline, lastSyncedAt, error } = syncState;

  const config = statusConfig[status];

  // Formatiere letzten Sync-Zeitpunkt
  const formatLastSync = (timestamp: string | null): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `Vor ${diffMins} Min.`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Vor ${diffHours} Std.`;

    return date.toLocaleDateString('de-DE');
  };

  // Tooltip-Text
  const tooltipText = [
    config.label,
    lastSyncedAt ? `Zuletzt: ${formatLastSync(lastSyncedAt)}` : null,
    error ? `Fehler: ${error}` : null,
    !isOnline ? 'Keine Internetverbindung' : null,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-2 py-1 rounded-md
        transition-colors duration-200
        hover:bg-gray-100 dark:hover:bg-gray-700
        ${config.color}
      `}
      title={tooltipText}
      aria-label={config.label}
    >
      <span className={config.animate ? 'animate-spin' : ''}>
        {settings.enabled ? config.icon : <CloudOff size={18} />}
      </span>

      {showLabel && (
        <span className="text-sm whitespace-nowrap">
          {settings.enabled ? config.label : 'Sync aus'}
        </span>
      )}

      {/* Einstellungen-Icon wenn nicht verbunden */}
      {!settings.enabled && (
        <Settings size={14} className="text-gray-400" />
      )}
    </button>
  );
};

export default SyncStatusIndicator;
