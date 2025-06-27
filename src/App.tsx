import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { ConnectionPanel } from './components/ConnectionPanel';
import { FileDropZone } from './components/FileDropZone';
import { TransferProgress } from './components/TransferProgress';
import { SecurityStatus } from './components/SecurityStatus';
import { PeerService } from './utils/peerService';
import { FileTransferService } from './utils/fileTransfer';
import { FileTransfer } from './types';

function App() {
  const [peerService] = useState(() => new PeerService());
  const [fileTransferService] = useState(() => new FileTransferService());
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected');
  const [transfers, setTransfers] = useState<FileTransfer[]>([]);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [connectionError, setConnectionError] = useState<string>('');
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [isPeerReady, setIsPeerReady] = useState<boolean>(false);
  const isInitialized = useRef(false);

  // Initialize PeerJS handlers
  useEffect(() => {
    if (isInitialized.current) {
      console.log('App: Already initialized, skipping');
      return;
    }

    console.log('App: Setting up PeerJS handlers');
    isInitialized.current = true;

    // Expose diagnostic methods globally for testing
    (window as any).ghostPeerDiagnostics = {
      getDiagnosticInfo: () => peerService.getDiagnosticInfo(),
      checkPeerAvailability: (peerId: string) => peerService.checkPeerAvailability(peerId),
      getMyPeerId: () => peerService.getMyPeerId(),
      getConnectedPeers: () => peerService.getConnectedPeers(),
      forceRecreatePeer: () => peerService.forceRecreatePeer(),
      testICEConnectivity: () => peerService.testICEConnectivity(),
      testDirectWebRTC: () => peerService.testDirectWebRTC()
    };

    // Set up connection handlers
    peerService.onConnection((peerId, connection) => {
      console.log(`Connected to peer: ${peerId}`);
      setConnectionStatus('connected');
      setConnectedPeers(prev => [...prev.filter(id => id !== peerId), peerId]);
      setConnectionError('');
    });

    peerService.onData((peerId, data) => {
      console.log(`Received data from peer ${peerId}:`, data);

      if (!data || typeof data !== 'object' || !data.type) {
        console.warn('Received invalid or malformed data:', data);
        return;
      }

      if (data.type === 'transfer-start') {
        console.log('Incoming file transfer:', data);
      } else if (data.type === 'file-chunk') {
        fileTransferService.handleIncomingChunk(data);
      }
    });

    peerService.onDisconnected((peerId) => {
      console.log(`Peer disconnected: ${peerId}`);
      setConnectedPeers(prev => {
        const updated = prev.filter(id => id !== peerId);
        if (updated.length === 0) {
          setConnectionStatus('disconnected');
        }
        return updated;
      });
    });

    // Set up ready callback
    peerService.onReady((peerId) => {
      console.log('App: Peer ready callback triggered with ID:', peerId);
      setMyPeerId(peerId);
      setIsPeerReady(true);
    });

    // Set up error callback
    peerService.onError((error) => {
      console.error('Peer error:', error);
      setConnectionError(`Connection error: ${error.message}`);
      setIsPeerReady(true); // Stop loading even on error
    });

    // Check if peer is already ready
    const existingId = peerService.getMyPeerId();
    const isAlreadyReady = peerService.isReady();
    console.log('App: Checking existing state - ID:', existingId, 'isReady:', isAlreadyReady);

    if (existingId && isAlreadyReady) {
      console.log('App: Peer already ready with ID:', existingId);
      setMyPeerId(existingId);
      setIsPeerReady(true);
    }

    // Fallback: Poll for peer readiness
    const pollInterval = setInterval(() => {
      const currentId = peerService.getMyPeerId();
      const currentReady = peerService.isReady();

      if (currentId && currentReady && !isPeerReady) {
        console.log('App: Polling detected ready peer:', currentId);
        setMyPeerId(currentId);
        setIsPeerReady(true);
        clearInterval(pollInterval);
      }
    }, 100);

    // Clear polling after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
    }, 10000);

    return () => {
      console.log('App: Cleanup function called');
      clearInterval(pollInterval);
      clearTimeout(timeout);
      // Don't destroy peer in development due to React Strict Mode
      // peerService.destroy();
    };
  }, [peerService, fileTransferService]);

  const handleConnectToPeer = useCallback(async (peerId: string): Promise<void> => {
    console.log(`App: Attempting to connect to peer: ${peerId}`);
    try {
      setConnectionStatus('connecting');
      setConnectionError('');
      console.log('App: Calling peerService.connectToPeer');
      await peerService.connectToPeer(peerId);
      console.log('App: connectToPeer promise resolved');
      // Connection success will be handled by the onConnection callback
    } catch (error) {
      console.error('App: Failed to connect to peer:', error);
      setConnectionStatus('failed');
      setConnectionError(`Failed to connect to peer: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }, [peerService]);

  const handleRetryConnection = useCallback(() => {
    setConnectionStatus('disconnected');
    setConnectionError('');
    setConnectedPeers([]);
    // Disconnect from all peers
    connectedPeers.forEach(peerId => {
      peerService.disconnect(peerId);
    });
  }, [peerService, connectedPeers]);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (connectedPeers.length === 0) {
      alert('Please establish a connection with a peer first.');
      return;
    }

    for (const file of files) {
      const peerId = connectedPeers[0]; // Use first connected peer

      try {
        const transferId = await fileTransferService.startFileTransfer(
          file,
          peerId,
          (transfer: FileTransfer) => {
            setTransfers(prev => prev.map(t => t.id === transfer.id ? transfer : t));
          },
          (transfer: FileTransfer) => {
            setTransfers(prev => prev.map(t => t.id === transfer.id ? transfer : t));
          },
          (transfer: FileTransfer, error: string) => {
            console.error(`Transfer ${transfer.id} failed:`, error);
            setTransfers(prev => prev.map(t => t.id === transfer.id ? transfer : t));
          }
        );

        const transfer = fileTransferService.getTransfer(transferId);
        if (transfer) {
          setTransfers(prev => [...prev, transfer]);

          fileTransferService.sendFileChunks(transferId, (data: any) => {
            return peerService.sendData(peerId, data);
          });
        }
      } catch (error) {
        console.error('Failed to start file transfer:', error);
      }
    }
  }, [connectedPeers, fileTransferService, peerService]);

  const handlePauseTransfer = useCallback((transferId: string) => {
    fileTransferService.pauseTransfer(transferId);
    setTransfers(prev => prev.map(t => t.id === transferId ? { ...t, status: 'paused' } : t));
  }, [fileTransferService]);

  const handleResumeTransfer = useCallback((transferId: string) => {
    fileTransferService.resumeTransfer(transferId);
    setTransfers(prev => prev.map(t => t.id === transferId ? { ...t, status: 'transferring' } : t));
  }, [fileTransferService]);

  const handleCancelTransfer = useCallback((transferId: string) => {
    fileTransferService.cancelTransfer(transferId);
    setTransfers(prev => prev.filter(t => t.id !== transferId));
  }, [fileTransferService]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50">
      <Header
        connectionCount={connectedPeers.length}
        isConnected={connectionStatus === 'connected'}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <ConnectionPanel
              localPeerId={myPeerId}
              onConnectToPeer={handleConnectToPeer}
              onRetryConnection={handleRetryConnection}
              connectionStatus={connectionStatus}
              connectionError={connectionError}
              isPeerReady={isPeerReady}
            />

            <FileDropZone
              onFilesSelected={handleFilesSelected}
              disabled={connectionStatus !== 'connected'}
            />

            <TransferProgress
              transfers={transfers}
              onPauseTransfer={handlePauseTransfer}
              onResumeTransfer={handleResumeTransfer}
              onCancelTransfer={handleCancelTransfer}
            />
          </div>

          <div className="space-y-8">
            <SecurityStatus
              isEncrypted={connectionStatus === 'connected'}
              connectionSecure={connectionStatus === 'connected'}
              filesTransferred={transfers.filter(t => t.status === 'completed').length}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;