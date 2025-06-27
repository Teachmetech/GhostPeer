import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';

// Global singleton instance
let globalPeerInstance: Peer | null = null;
let isGlobalPeerInitializing = false;

// Force reset the global peer (for testing/debugging)
const resetGlobalPeer = () => {
    console.log('PeerService: Resetting global peer instance...');
    if (globalPeerInstance) {
        globalPeerInstance.destroy();
    }
    globalPeerInstance = null;
    isGlobalPeerInitializing = false;
};

export class PeerService {
    private peer: Peer | null = null;
    private connections = new Map<string, DataConnection>();
    private onConnectionCallback?: (peerId: string, connection: DataConnection) => void;
    private onDataCallback?: (peerId: string, data: any) => void;
    private onDisconnectedCallback?: (peerId: string) => void;
    private onReadyCallback?: (peerId: string) => void;
    private onErrorCallback?: (error: Error) => void;

    constructor() {
        this.initializePeer();
    }

    private async initializePeer() {
        // Use global singleton to prevent React double initialization
        if (globalPeerInstance) {
            console.log('PeerService: Using existing global peer instance');
            this.peer = globalPeerInstance;
            this.setupPeerEventHandlers();

            // If peer is already open, trigger ready callback
            if (this.peer.open && this.peer.id) {
                console.log('PeerService: Global peer already open with ID:', this.peer.id);
                this.onReadyCallback?.(this.peer.id);
            }
            return;
        }

        if (isGlobalPeerInitializing) {
            console.log('PeerService: Peer is already being initialized, waiting...');
            // Wait for the global peer to be ready
            const checkGlobalPeer = () => {
                if (globalPeerInstance) {
                    this.peer = globalPeerInstance;
                    this.setupPeerEventHandlers();
                    if (this.peer.open && this.peer.id) {
                        this.onReadyCallback?.(this.peer.id);
                    }
                } else {
                    setTimeout(checkGlobalPeer, 100);
                }
            };
            checkGlobalPeer();
            return;
        }

        console.log('PeerService: Creating new global peer instance...');
        isGlobalPeerInitializing = true;

        // Create new global instance with working TURN servers
        globalPeerInstance = new Peer({
            config: {
                iceServers: [
                    // Google STUN servers
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    // Working free TURN servers
                    {
                        urls: [
                            'turn:numb.viagenie.ca',
                            'turn:numb.viagenie.ca?transport=tcp'
                        ],
                        username: 'webrtc@live.com',
                        credential: 'muazkh'
                    },
                    {
                        urls: [
                            'turn:192.158.29.39:3478?transport=udp',
                            'turn:192.158.29.39:3478?transport=tcp'
                        ],
                        username: '28224511:1379330808',
                        credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA='
                    }
                ],
                iceTransportPolicy: 'all',
                bundlePolicy: 'max-bundle'
            },
            debug: 2 // Increase debug for more verbose logs
        });

        this.peer = globalPeerInstance;
        this.setupPeerEventHandlers();

        isGlobalPeerInitializing = false;
    }

    private setupPeerEventHandlers() {
        if (!this.peer) return;

        // Remove any existing listeners to prevent duplicates
        this.peer.off('open');
        this.peer.off('connection');
        this.peer.off('error');

        this.peer.on('open', (id) => {
            console.log('PeerService: Peer opened with ID:', id);
            this.onReadyCallback?.(id);
        });

        this.peer.on('connection', (connection) => {
            this.setupConnection(connection);
        });

        this.peer.on('error', (error) => {
            console.error('PeerService: Peer error:', error);
            console.log('PeerService: Error details:', {
                type: error.type,
                message: error.message,
                stack: error.stack
            });

            // Handle specific error types
            if (error.type === 'peer-unavailable') {
                console.log('PeerService: Target peer is not available or does not exist');
            } else if (error.type === 'network') {
                console.log('PeerService: Network error - check internet connection and firewall settings');
            } else if (error.type === 'disconnected') {
                console.log('PeerService: Peer disconnected from signaling server');
            }

            this.onErrorCallback?.(error);
        });
    }

    private setupConnection(connection: DataConnection) {
        const peerId = connection.peer;
        console.log(`PeerService: Setting up connection for peer ${peerId}`);
        this.connections.set(peerId, connection);

        // Monitor connection state changes
        const logConnectionState = () => {
            console.log(`PeerService: Connection state for ${peerId}:`, {
                open: connection.open,
                reliable: connection.reliable,
                type: connection.type,
                metadata: connection.metadata
            });
        };

        // Log initial state
        logConnectionState();

        connection.on('open', () => {
            console.log(`PeerService: Connection open event for peer: ${peerId}`);
            logConnectionState();
            this.onConnectionCallback?.(peerId, connection);
        });

        connection.on('data', (data) => {
            console.log(`PeerService: Received data from ${peerId}:`, data);
            this.onDataCallback?.(peerId, data);
        });

        connection.on('close', () => {
            console.log(`PeerService: Connection closed with peer: ${peerId}`);
            logConnectionState();
            this.connections.delete(peerId);
            this.onDisconnectedCallback?.(peerId);
        });

        connection.on('error', (error) => {
            console.error(`PeerService: Connection error with peer ${peerId}:`, error);
            console.log(`PeerService: Error type: ${error.type}, message: ${error.message}`);
            logConnectionState();
            this.connections.delete(peerId);
            this.onDisconnectedCallback?.(peerId);
        });
    }

    // Get your peer ID to share with others
    getMyPeerId(): string | undefined {
        return this.peer?.id;
    }

    // Check if peer is ready
    isReady(): boolean {
        return this.peer?.open || false;
    }

    // Validate peer ID format
    private validatePeerId(peerId: string): boolean {
        // PeerJS peer IDs are typically UUIDs (36 chars) or shorter alphanumeric strings
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const shortIdRegex = /^[a-zA-Z0-9-_]{1,50}$/;

        return uuidRegex.test(peerId) || shortIdRegex.test(peerId);
    }

    // Connect with minimal configuration (fallback method)
    private connectWithFallback(peerId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(`PeerService: Trying fallback connection to ${peerId} with minimal config`);

            if (!this.peer) {
                reject(new Error('Peer not initialized'));
                return;
            }

            // Create connection with minimal, reliable configuration
            const connection = this.peer.connect(peerId, {
                reliable: true
                // No additional config - let PeerJS use defaults
            });

            this.setupConnection(connection);

            const timeout = setTimeout(() => {
                console.error(`PeerService: Fallback connection timeout to ${peerId}`);
                connection.close();
                reject(new Error('Fallback connection timeout'));
            }, 20000); // Longer timeout for fallback

            connection.on('open', () => {
                console.log(`PeerService: Fallback connection opened to ${peerId}`);
                clearTimeout(timeout);
                resolve();
            });

            connection.on('error', (error) => {
                console.error(`PeerService: Fallback connection error to ${peerId}:`, error);
                clearTimeout(timeout);
                reject(error);
            });
        });
    }

    // Connect to another peer using their ID
    connectToPeer(peerId: string, retries: number = 3): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(`PeerService: Attempting to connect to peer ${peerId} (${4 - retries}/3 attempts)`);

            // Validate peer ID format
            if (!this.validatePeerId(peerId)) {
                console.error('PeerService: Invalid peer ID format:', peerId);
                reject(new Error('Invalid peer ID format. Expected UUID or alphanumeric string.'));
                return;
            }

            if (!this.peer) {
                console.error('PeerService: Peer not initialized');
                reject(new Error('Peer not initialized'));
                return;
            }

            if (!this.peer.open) {
                console.error('PeerService: Peer not open yet');
                reject(new Error('Peer not ready'));
                return;
            }

            if (this.connections.has(peerId)) {
                console.log(`PeerService: Already connected to ${peerId}`);
                resolve(); // Already connected
                return;
            }

            // Check if trying to connect to self
            if (peerId === this.peer.id) {
                console.error('PeerService: Cannot connect to self');
                reject(new Error('Cannot connect to your own peer ID'));
                return;
            }

            console.log(`PeerService: Creating connection to ${peerId}`);
            const connection = this.peer.connect(peerId, {
                reliable: true,
                serialization: 'json'
            });

            // Add detailed connection state logging
            console.log(`PeerService: Connection created with config:`, {
                peer: connection.peer,
                reliable: connection.reliable,
                open: connection.open,
                type: connection.type
            });

            // Set up connection immediately (before it opens)
            this.setupConnection(connection);

            // Set a timeout for connection (longer for first attempt)
            const timeoutDuration = retries === 3 ? 15000 : 10000;
            const timeout = setTimeout(() => {
                console.error(`PeerService: Connection timeout to ${peerId} after ${timeoutDuration / 1000} seconds`);
                console.log(`PeerService: Connection state:`, {
                    open: connection.open,
                    peer: connection.peer,
                    reliable: connection.reliable
                });
                connection.close();

                // Retry if attempts remaining
                if (retries > 1) {
                    console.log(`PeerService: Retrying connection to ${peerId}...`);
                    setTimeout(() => {
                        this.connectToPeer(peerId, retries - 1)
                            .then(resolve)
                            .catch(reject);
                    }, 2000); // Wait 2 seconds before retry
                } else {
                    reject(new Error('Connection timeout - peer may be offline, behind a firewall, or using a different network'));
                }
            }, timeoutDuration);

            connection.on('open', () => {
                console.log(`PeerService: Connection opened to ${peerId}`);
                clearTimeout(timeout);
                resolve();
            });

            connection.on('error', (error) => {
                console.error(`PeerService: Connection error to ${peerId}:`, error);
                clearTimeout(timeout);

                // Check if it's a negotiation failure and retry
                if (error.message.includes('Negotiation') && retries > 1) {
                    console.log(`PeerService: Retrying connection due to negotiation failure...`);
                    setTimeout(() => {
                        this.connectToPeer(peerId, retries - 1)
                            .then(resolve)
                            .catch(reject);
                    }, 3000); // Wait 3 seconds before retry for negotiation failures
                } else if (retries === 1 && error.message.includes('Negotiation')) {
                    // Last retry and still negotiation failure - try fallback
                    console.log(`PeerService: All retries failed, trying fallback method...`);
                    setTimeout(() => {
                        this.connectWithFallback(peerId)
                            .then(resolve)
                            .catch(reject);
                    }, 2000);
                } else {
                    reject(error);
                }
            });

            connection.on('close', () => {
                console.log(`PeerService: Connection closed during connection attempt to ${peerId}`);
                clearTimeout(timeout);

                if (retries > 1) {
                    console.log(`PeerService: Retrying connection after close...`);
                    setTimeout(() => {
                        this.connectToPeer(peerId, retries - 1)
                            .then(resolve)
                            .catch(reject);
                    }, 1000);
                } else {
                    reject(new Error('Connection closed before opening - peer may be offline'));
                }
            });

            console.log(`PeerService: Connection object created, waiting for open event`);
        });
    }

    // Send data to a specific peer
    sendData(peerId: string, data: any): boolean {
        const connection = this.connections.get(peerId);
        if (connection && connection.open) {
            connection.send(data);
            return true;
        }
        return false;
    }

    // Send data to all connected peers
    broadcast(data: any): void {
        this.connections.forEach((connection, peerId) => {
            if (connection.open) {
                connection.send(data);
            }
        });
    }

    // Get list of connected peer IDs
    getConnectedPeers(): string[] {
        return Array.from(this.connections.keys()).filter(peerId => {
            const connection = this.connections.get(peerId);
            return connection?.open;
        });
    }

    // Set callback for when a new peer connects
    onConnection(callback: (peerId: string, connection: DataConnection) => void) {
        this.onConnectionCallback = callback;
    }

    // Set callback for when data is received
    onData(callback: (peerId: string, data: any) => void) {
        this.onDataCallback = callback;
    }

    // Set callback for when a peer disconnects
    onDisconnected(callback: (peerId: string) => void) {
        this.onDisconnectedCallback = callback;
    }

    // Set callback for when peer is ready
    onReady(callback: (peerId: string) => void) {
        console.log('PeerService: Setting onReady callback');
        this.onReadyCallback = callback;

        // If peer is already ready, call the callback immediately
        if (this.peer?.open && this.peer.id) {
            console.log('PeerService: Peer already open, calling callback immediately');
            callback(this.peer.id);
        }
    }

    // Set callback for when there's an error
    onError(callback: (error: Error) => void) {
        this.onErrorCallback = callback;
    }

    // Disconnect from a specific peer
    disconnect(peerId: string): void {
        const connection = this.connections.get(peerId);
        if (connection) {
            connection.close();
            this.connections.delete(peerId);
        }
    }

    // Disconnect from all peers and destroy the peer
    destroy(): void {
        console.log('PeerService: Destroying peer service');
        this.connections.forEach(connection => connection.close());
        this.connections.clear();

        // Only destroy global instance if we're the last service using it
        // In a real app, you might want a reference counter here
        if (globalPeerInstance) {
            globalPeerInstance.destroy();
            globalPeerInstance = null;
            isGlobalPeerInitializing = false;
        }

        this.peer = null;
    }

    // Check if connected to a specific peer
    isConnectedTo(peerId: string): boolean {
        const connection = this.connections.get(peerId);
        return connection?.open || false;
    }

    // Get connection status
    getConnectionStatus(): 'disconnected' | 'connecting' | 'connected' {
        if (!this.peer) return 'disconnected';
        if (this.peer.disconnected) return 'disconnected';
        if (this.connections.size === 0) return 'disconnected';
        return 'connected';
    }

    // Check if a peer ID is currently online (this is a rough estimate)
    async checkPeerAvailability(peerId: string): Promise<boolean> {
        return new Promise((resolve) => {
            if (!this.peer || !this.peer.open) {
                resolve(false);
                return;
            }

            console.log(`PeerService: Checking if peer ${peerId} is available...`);

            // Create a temporary connection to test availability
            const testConnection = this.peer.connect(peerId, {
                reliable: true,
                serialization: 'json'
            });

            const timeout = setTimeout(() => {
                console.log(`PeerService: Peer ${peerId} availability check timed out`);
                testConnection.close();
                resolve(false);
            }, 5000);

            testConnection.on('open', () => {
                console.log(`PeerService: Peer ${peerId} is available!`);
                clearTimeout(timeout);
                testConnection.close();
                resolve(true);
            });

            testConnection.on('error', (error) => {
                console.log(`PeerService: Peer ${peerId} availability check failed:`, error.type);
                clearTimeout(timeout);
                resolve(false);
            });
        });
    }

    // Force recreate peer with new configuration
    forceRecreatePeer(): void {
        console.log('PeerService: Force recreating peer...');
        resetGlobalPeer();
        this.initializePeer();
    }

    // Test direct WebRTC connection (bypassing PeerJS completely)
    async testDirectWebRTC(): Promise<any> {
        return new Promise((resolve, reject) => {
            console.log('PeerService: Testing direct WebRTC connection...');

            const pc1 = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    {
                        urls: 'turn:numb.viagenie.ca',
                        username: 'webrtc@live.com',
                        credential: 'muazkh'
                    }
                ]
            });

            const pc2 = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    {
                        urls: 'turn:numb.viagenie.ca',
                        username: 'webrtc@live.com',
                        credential: 'muazkh'
                    }
                ]
            });

            const results = {
                pc1State: 'new',
                pc2State: 'new',
                pc1Candidates: 0,
                pc2Candidates: 0,
                connected: false,
                error: null as string | null
            };

            // Set up data channels
            const dc1 = pc1.createDataChannel('test');
            let dc2: RTCDataChannel;

            pc2.ondatachannel = (event) => {
                dc2 = event.channel;
                dc2.onopen = () => {
                    console.log('Direct WebRTC: Data channel opened!');
                    results.connected = true;
                    pc1.close();
                    pc2.close();
                    resolve(results);
                };
            };

            // Monitor connection states
            pc1.oniceconnectionstatechange = () => {
                results.pc1State = pc1.iceConnectionState;
                console.log('PC1 ICE state:', pc1.iceConnectionState);
            };

            pc2.oniceconnectionstatechange = () => {
                results.pc2State = pc2.iceConnectionState;
                console.log('PC2 ICE state:', pc2.iceConnectionState);
            };

            // Count ICE candidates
            pc1.onicecandidate = (event) => {
                if (event.candidate) {
                    results.pc1Candidates++;
                    console.log('PC1 candidate:', event.candidate.type);
                }
            };

            pc2.onicecandidate = (event) => {
                if (event.candidate) {
                    results.pc2Candidates++;
                    console.log('PC2 candidate:', event.candidate.type);
                }
            };

            // Set up the connection
            pc1.createOffer()
                .then(offer => pc1.setLocalDescription(offer))
                .then(() => pc2.setRemoteDescription(pc1.localDescription!))
                .then(() => pc2.createAnswer())
                .then(answer => pc2.setLocalDescription(answer))
                .then(() => pc1.setRemoteDescription(pc2.localDescription!))
                .catch(error => {
                    results.error = error.message;
                    pc1.close();
                    pc2.close();
                    reject(results);
                });

            // Timeout after 15 seconds
            setTimeout(() => {
                if (!results.connected) {
                    console.log('Direct WebRTC: Connection timeout');
                    results.error = 'Connection timeout';
                    pc1.close();
                    pc2.close();
                    resolve(results);
                }
            }, 15000);
        });
    }

    // Test ICE candidate gathering (network connectivity test)
    async testICEConnectivity(): Promise<any> {
        return new Promise((resolve) => {
            console.log('PeerService: Testing ICE connectivity...');

            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' }
                ]
            });

            const candidates: any[] = [];

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    candidates.push({
                        type: event.candidate.type,
                        protocol: event.candidate.protocol,
                        address: event.candidate.address,
                        port: event.candidate.port,
                        foundation: event.candidate.foundation
                    });
                    console.log('ICE Candidate:', event.candidate.type, event.candidate.address);
                } else {
                    // ICE gathering complete
                    pc.close();
                    resolve({
                        candidatesFound: candidates.length,
                        candidates: candidates,
                        hasHost: candidates.some(c => c.type === 'host'),
                        hasSrflx: candidates.some(c => c.type === 'srflx'),
                        hasRelay: candidates.some(c => c.type === 'relay')
                    });
                }
            };

            pc.onicegatheringstatechange = () => {
                console.log('ICE gathering state:', pc.iceGatheringState);
            };

            // Create a dummy data channel to trigger ICE gathering
            pc.createDataChannel('test');
            pc.createOffer().then(offer => pc.setLocalDescription(offer));

            // Timeout after 10 seconds
            setTimeout(() => {
                pc.close();
                resolve({
                    candidatesFound: candidates.length,
                    candidates: candidates,
                    hasHost: candidates.some(c => c.type === 'host'),
                    hasSrflx: candidates.some(c => c.type === 'srflx'),
                    hasRelay: candidates.some(c => c.type === 'relay'),
                    timeout: true
                });
            }, 10000);
        });
    }

    // Diagnostic method to help debug connection issues
    getDiagnosticInfo(): any {
        return {
            peerReady: this.isReady(),
            peerId: this.getMyPeerId(),
            connectionsCount: this.connections.size,
            connectedPeers: this.getConnectedPeers(),
            browser: {
                userAgent: navigator.userAgent,
                webrtcSupported: !!(navigator as any).mediaDevices,
                stun: typeof RTCPeerConnection !== 'undefined'
            },
            network: {
                onLine: navigator.onLine,
                connection: (navigator as any).connection?.effectiveType || 'unknown'
            }
        };
    }
} 