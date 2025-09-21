import React from 'react';
import { useOffline } from '@/hooks/useOffline';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function OfflineIndicator() {
  const { isOnline, queueSize, forceSync, getQueueDetails } = useOffline();
  const [showDetails, setShowDetails] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);

  const handleSync = async () => {
    setSyncing(true);
    await forceSync();
    setSyncing(false);
  };

  if (isOnline && queueSize === 0) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="offline-indicator"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="offline-status">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-yellow-500" />
              <span>Offline Mode</span>
            </>
          )}
        </div>

        {queueSize > 0 && (
          <div className="sync-status">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span>{queueSize} pending</span>
            {isOnline && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSync();
                }}
                disabled={syncing}
                className="sync-button"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showDetails && queueSize > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="offline-details"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Pending Sync Items</h3>
            <div className="queue-list">
              {getQueueDetails().map(item => (
                <div key={item.id} className="queue-item">
                  <span className="queue-type">{item.type}</span>
                  <span className="queue-time">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                  {item.attempts > 0 && (
                    <span className="queue-attempts">
                      ({item.attempts} retries)
                    </span>
                  )}
                </div>
              ))}
            </div>
            {isOnline && (
              <button onClick={handleSync} className="sync-all-button">
                Sync All Now
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
