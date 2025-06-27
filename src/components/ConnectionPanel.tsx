import React, { useState } from 'react';
import { Users, Copy, QrCode, CheckCircle, AlertCircle, RefreshCw, Wifi, Loader2 } from 'lucide-react';

interface ConnectionPanelProps {
  localPeerId: string;
  onConnectToPeer: (peerId: string) => Promise<void>;
  onRetryConnection: () => void;
  connectionStatus: string;
  connectionError: string;
  isPeerReady: boolean;
}

export const ConnectionPanel: React.FC<ConnectionPanelProps> = ({
  localPeerId,
  onConnectToPeer,
  onRetryConnection,
  connectionStatus,
  connectionError,
  isPeerReady
}) => {
  const [targetPeerId, setTargetPeerId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleConnect = async () => {
    if (!targetPeerId.trim()) {
      alert('Please enter a peer ID to connect to');
      return;
    }

    setIsConnecting(true);
    try {
      await onConnectToPeer(targetPeerId.trim());
      setTargetPeerId('');
    } catch (error) {
      console.error('Failed to connect to peer:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRetry = () => {
    onRetryConnection();
    setTargetPeerId('');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'connecting':
        return <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Wifi className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'failed':
        return 'Connection Failed';
      default:
        return isPeerReady ? 'Ready to Connect' : 'Initializing...';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Connection</h2>
            <div className="flex items-center space-x-2 mt-1">
              {getStatusIcon()}
              <p className="text-sm text-gray-600">{getStatusText()}</p>
            </div>
          </div>
        </div>
        {connectionStatus === 'failed' && (
          <button
            onClick={handleRetry}
            className="flex items-center space-x-1 text-sm text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
        )}
      </div>

      {/* Loading State */}
      {!isPeerReady && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            <div>
              <h4 className="text-blue-800 font-medium">Connecting to PeerJS Network</h4>
              <p className="text-blue-700 text-sm mt-1">
                Initializing your peer connection... This usually takes a few seconds.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connection Error Display */}
      {connectionError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-red-800 font-medium">Connection Error</h4>
              <p className="text-red-700 text-sm mt-1">{connectionError}</p>
              <div className="mt-3">
                <button
                  onClick={handleRetry}
                  className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1 rounded transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Try Again</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Your Peer ID */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 flex items-center space-x-2">
            <QrCode className="h-4 w-4" />
            <span>Your Peer ID</span>
          </h3>

          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <p className="text-sm text-gray-600 font-medium">Share this ID with your peer:</p>
            <div className="flex items-center space-x-2">
              <code className="flex-1 p-3 bg-white border rounded-lg text-base font-mono break-all select-all">
                {isPeerReady ? (localPeerId || 'Generating...') : 'Connecting...'}
              </code>
              <button
                onClick={() => copyToClipboard(localPeerId)}
                disabled={!localPeerId || !isPeerReady}
                className="p-3 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                title="Copy Peer ID"
              >
                {copied ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              This is your unique ID on the PeerJS network. It changes each time you reload the page.
            </p>
          </div>
        </div>

        {/* Connect to Peer */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Connect to Peer</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Peer ID
              </label>
              <input
                type="text"
                value={targetPeerId}
                onChange={(e) => setTargetPeerId(e.target.value)}
                placeholder="Paste your peer's ID here..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
                disabled={!isPeerReady}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the Peer ID that your contact shared with you
              </p>
              <button
                onClick={() => setTargetPeerId(localPeerId)}
                disabled={!isPeerReady || !localPeerId}
                className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline disabled:opacity-50"
              >
                Test with my own ID (for debugging)
              </button>
            </div>

            <button
              onClick={handleConnect}
              disabled={!targetPeerId.trim() || isConnecting || connectionStatus === 'connected' || !isPeerReady}
              className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isConnecting ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              <span>
                {!isPeerReady ? 'Initializing...' :
                  isConnecting ? 'Connecting...' :
                    connectionStatus === 'connected' ? 'Connected' : 'Connect to Peer'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Connected Status */}
      {connectionStatus === 'connected' && (
        <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <div>
              <h4 className="text-emerald-800 font-medium">Connection Established!</h4>
              <p className="text-emerald-700 text-sm mt-1">
                You can now securely transfer files with your peer.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};