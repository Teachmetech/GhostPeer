export interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  status: 'connecting' | 'connected' | 'disconnected' | 'failed';
  remoteId?: string;
}

export interface FileTransfer {
  id: string;
  file: File;
  status: 'pending' | 'transferring' | 'paused' | 'completed' | 'failed';
  progress: number;
  speed: number;
  startTime: number;
  encryptionKey: CryptoKey;
  checksum: string;
  peerId: string;
}

export interface TransferChunk {
  id: string;
  index: number;
  data: ArrayBuffer;
  checksum: string;
  isLastChunk: boolean;
}

export interface ConnectionOffer {
  type: 'offer' | 'answer';
  sdp: string;
  peerId: string;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'connection-request';
  data: any;
  peerId: string;
  targetPeerId?: string;
}