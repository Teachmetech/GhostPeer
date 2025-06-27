import { PeerConnection, SignalingMessage } from '../types';

export class WebRTCService {
  private peerConnections = new Map<string, PeerConnection>();
  private localPeerId: string;
  private onDataChannelMessage?: (peerId: string, data: any) => void;
  private onConnectionStateChange?: (peerId: string, state: string) => void;

  constructor() {
    this.localPeerId = this.generatePeerId();
  }

  private generatePeerId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  getLocalPeerId(): string {
    return this.localPeerId;
  }

  setDataChannelMessageHandler(handler: (peerId: string, data: any) => void): void {
    this.onDataChannelMessage = handler;
  }

  setConnectionStateChangeHandler(handler: (peerId: string, state: string) => void): void {
    this.onConnectionStateChange = handler;
  }

  async createOffer(targetPeerId: string): Promise<string> {
    const peerConnection = this.createPeerConnection(targetPeerId);

    // Create data channel
    const dataChannel = peerConnection.connection.createDataChannel('fileTransfer', {
      ordered: true,
      maxRetransmits: 3
    });

    peerConnection.dataChannel = dataChannel;
    this.setupDataChannel(dataChannel, targetPeerId);

    const offer = await peerConnection.connection.createOffer();
    await peerConnection.connection.setLocalDescription(offer);

    return JSON.stringify({
      type: 'offer',
      sdp: offer.sdp,
      peerId: this.localPeerId,
      targetPeerId
    });
  }

  async handleOffer(offerData: string): Promise<string> {
    try {
      // Trim whitespace and validate input
      const trimmedData = offerData.trim();
      if (!trimmedData) {
        throw new Error('Empty connection code provided');
      }

      // Attempt to parse JSON with better error handling
      let offer;
      try {
        offer = JSON.parse(trimmedData);
      } catch (parseError) {
        // If direct parsing fails, try to extract JSON from the string
        // Sometimes the data might have extra characters or formatting
        const jsonMatch = trimmedData.match(/\{.*\}/);
        if (jsonMatch) {
          offer = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Invalid connection code format. Please ensure you copied the complete connection code.');
        }
      }

      // Validate the parsed offer structure
      if (!offer || typeof offer !== 'object') {
        throw new Error('Invalid connection code structure');
      }

      if (!offer.type || offer.type !== 'offer') {
        throw new Error('Connection code is not a valid offer');
      }

      if (!offer.sdp || typeof offer.sdp !== 'string') {
        throw new Error('Connection code missing valid SDP data');
      }

      if (!offer.peerId || typeof offer.peerId !== 'string') {
        throw new Error('Connection code missing peer ID');
      }

      const peerConnection = this.createPeerConnection(offer.peerId);

      await peerConnection.connection.setRemoteDescription({
        type: 'offer',
        sdp: offer.sdp
      });

      const answer = await peerConnection.connection.createAnswer();
      await peerConnection.connection.setLocalDescription(answer);

      return JSON.stringify({
        type: 'answer',
        sdp: answer.sdp,
        peerId: this.localPeerId,
        targetPeerId: offer.peerId
      });
    } catch (error) {
      console.error('Error handling offer:', error);
      throw new Error(`Failed to process connection code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async handleAnswer(answerData: string): Promise<void> {
    try {
      const trimmedData = answerData.trim();
      if (!trimmedData) {
        throw new Error('Empty answer data provided');
      }

      let answer;
      try {
        answer = JSON.parse(trimmedData);
      } catch (parseError) {
        const jsonMatch = trimmedData.match(/\{.*\}/);
        if (jsonMatch) {
          answer = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Invalid answer format');
        }
      }

      if (!answer || !answer.peerId || !answer.sdp) {
        throw new Error('Invalid answer structure');
      }

      const peerConnection = this.peerConnections.get(answer.peerId);

      if (peerConnection) {
        await peerConnection.connection.setRemoteDescription({
          type: 'answer',
          sdp: answer.sdp
        });
      } else {
        throw new Error('No peer connection found for answer');
      }
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  private createPeerConnection(peerId: string): PeerConnection {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const connection = new RTCPeerConnection(configuration);
    const peerConnectionObj: PeerConnection = {
      id: peerId,
      connection,
      dataChannel: null,
      status: 'connecting'
    };

    // Handle connection state changes
    connection.onconnectionstatechange = () => {
      const state = connection.connectionState;
      peerConnectionObj.status = state as any;
      this.onConnectionStateChange?.(peerId, state);
    };

    // Handle data channel from remote peer
    connection.ondatachannel = (event) => {
      const dataChannel = event.channel;
      peerConnectionObj.dataChannel = dataChannel;
      this.setupDataChannel(dataChannel, peerId);
    };

    this.peerConnections.set(peerId, peerConnectionObj);
    return peerConnectionObj;
  }

  private setupDataChannel(dataChannel: RTCDataChannel, peerId: string): void {
    dataChannel.onopen = () => {
      console.log(`Data channel opened with peer ${peerId}`);
    };

    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onDataChannelMessage?.(peerId, data);
      } catch (error) {
        console.error('Failed to parse data channel message:', error);
      }
    };

    dataChannel.onerror = (error) => {
      console.error(`Data channel error with peer ${peerId}:`, error);
    };
  }

  sendData(peerId: string, data: any): boolean {
    const peerConnection = this.peerConnections.get(peerId);
    if (peerConnection?.dataChannel && peerConnection.dataChannel.readyState === 'open') {
      try {
        peerConnection.dataChannel.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Failed to send data:', error);
        return false;
      }
    }
    return false;
  }

  getPeerConnection(peerId: string): PeerConnection | undefined {
    return this.peerConnections.get(peerId);
  }

  getAllPeerConnections(): PeerConnection[] {
    return Array.from(this.peerConnections.values());
  }

  closePeerConnection(peerId: string): void {
    const peerConnection = this.peerConnections.get(peerId);
    if (peerConnection) {
      peerConnection.dataChannel?.close();
      peerConnection.connection.close();
      this.peerConnections.delete(peerId);
    }
  }

  closeAllConnections(): void {
    this.peerConnections.forEach((_, peerId) => {
      this.closePeerConnection(peerId);
    });
  }
}