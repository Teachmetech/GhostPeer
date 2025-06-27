import { FileTransfer, TransferChunk } from '../types';
import { EncryptionService } from './encryption';

export class FileTransferService {
  private static readonly CHUNK_SIZE = 64 * 1024; // 64KB chunks
  private activeTransfers = new Map<string, FileTransfer>();
  private transferCallbacks = new Map<string, {
    onProgress: (transfer: FileTransfer) => void;
    onComplete: (transfer: FileTransfer) => void;
    onError: (transfer: FileTransfer, error: string) => void;
  }>();

  async startFileTransfer(
    file: File,
    peerId: string,
    onProgress: (transfer: FileTransfer) => void,
    onComplete: (transfer: FileTransfer) => void,
    onError: (transfer: FileTransfer, error: string) => void
  ): Promise<string> {
    const transferId = this.generateTransferId();
    const encryptionKey = await EncryptionService.generateKey();
    const checksum = await this.calculateFileChecksum(file);

    const transfer: FileTransfer = {
      id: transferId,
      file,
      status: 'pending',
      progress: 0,
      speed: 0,
      startTime: Date.now(),
      encryptionKey,
      checksum,
      peerId
    };

    this.activeTransfers.set(transferId, transfer);
    this.transferCallbacks.set(transferId, { onProgress, onComplete, onError });

    return transferId;
  }

  async sendFileChunks(
    transferId: string,
    sendDataFunction: (data: any) => boolean
  ): Promise<void> {
    const transfer = this.activeTransfers.get(transferId);
    if (!transfer) {
      throw new Error('Transfer not found');
    }

    transfer.status = 'transferring';
    const { file, encryptionKey } = transfer;
    const totalChunks = Math.ceil(file.size / FileTransferService.CHUNK_SIZE);
    let sentChunks = 0;

    // Send transfer metadata first
    const keyData = await EncryptionService.exportKey(encryptionKey);
    const metadata = {
      type: 'transfer-start',
      transferId,
      fileName: file.name,
      fileSize: file.size,
      totalChunks,
      encryptionKey: keyData,
      checksum: transfer.checksum
    };

    if (!sendDataFunction(metadata)) {
      this.handleTransferError(transferId, 'Failed to send transfer metadata');
      return;
    }

    // Send file chunks
    for (let i = 0; i < totalChunks; i++) {
      if (transfer.status === 'paused') {
        break;
      }

      const start = i * FileTransferService.CHUNK_SIZE;
      const end = Math.min(start + FileTransferService.CHUNK_SIZE, file.size);
      const chunkData = await this.readFileChunk(file, start, end);
      
      // Encrypt chunk
      const { encrypted, iv } = await EncryptionService.encrypt(chunkData, encryptionKey);
      const chunkChecksum = await EncryptionService.generateChecksum(chunkData);

      const chunk: TransferChunk = {
        id: transferId,
        index: i,
        data: encrypted,
        checksum: chunkChecksum,
        isLastChunk: i === totalChunks - 1
      };

      const chunkMessage = {
        type: 'file-chunk',
        transferId,
        chunkIndex: i,
        encryptedData: Array.from(new Uint8Array(encrypted)),
        iv: Array.from(iv),
        checksum: chunkChecksum,
        isLastChunk: chunk.isLastChunk
      };

      if (!sendDataFunction(chunkMessage)) {
        this.handleTransferError(transferId, `Failed to send chunk ${i}`);
        return;
      }

      sentChunks++;
      transfer.progress = (sentChunks / totalChunks) * 100;
      transfer.speed = this.calculateTransferSpeed(transfer, sentChunks * FileTransferService.CHUNK_SIZE);
      
      this.transferCallbacks.get(transferId)?.onProgress(transfer);
    }

    if (transfer.status === 'transferring') {
      transfer.status = 'completed';
      this.transferCallbacks.get(transferId)?.onComplete(transfer);
    }
  }

  async handleIncomingChunk(message: any): Promise<void> {
    const { transferId, chunkIndex, encryptedData, iv, checksum, isLastChunk } = message;
    const transfer = this.activeTransfers.get(transferId);
    
    if (!transfer) {
      console.error('Received chunk for unknown transfer:', transferId);
      return;
    }

    try {
      // Decrypt chunk
      const encryptedBuffer = new Uint8Array(encryptedData).buffer;
      const ivArray = new Uint8Array(iv);
      const decryptedData = await EncryptionService.decrypt(encryptedBuffer, transfer.encryptionKey, ivArray);

      // Verify checksum
      const isValid = await EncryptionService.verifyChecksum(decryptedData, checksum);
      if (!isValid) {
        this.handleTransferError(transferId, `Checksum verification failed for chunk ${chunkIndex}`);
        return;
      }

      // Store chunk (in a real implementation, you'd accumulate chunks and reconstruct the file)
      // For this demo, we'll simulate progress
      const totalChunks = Math.ceil(transfer.file.size / FileTransferService.CHUNK_SIZE);
      transfer.progress = ((chunkIndex + 1) / totalChunks) * 100;
      transfer.speed = this.calculateTransferSpeed(transfer, (chunkIndex + 1) * FileTransferService.CHUNK_SIZE);

      this.transferCallbacks.get(transferId)?.onProgress(transfer);

      if (isLastChunk) {
        transfer.status = 'completed';
        this.transferCallbacks.get(transferId)?.onComplete(transfer);
      }
    } catch (error) {
      this.handleTransferError(transferId, `Failed to process chunk ${chunkIndex}: ${error}`);
    }
  }

  pauseTransfer(transferId: string): void {
    const transfer = this.activeTransfers.get(transferId);
    if (transfer && transfer.status === 'transferring') {
      transfer.status = 'paused';
    }
  }

  resumeTransfer(transferId: string): void {
    const transfer = this.activeTransfers.get(transferId);
    if (transfer && transfer.status === 'paused') {
      transfer.status = 'transferring';
    }
  }

  cancelTransfer(transferId: string): void {
    const transfer = this.activeTransfers.get(transferId);
    if (transfer) {
      transfer.status = 'failed';
      this.activeTransfers.delete(transferId);
      this.transferCallbacks.delete(transferId);
    }
  }

  getTransfer(transferId: string): FileTransfer | undefined {
    return this.activeTransfers.get(transferId);
  }

  getAllTransfers(): FileTransfer[] {
    return Array.from(this.activeTransfers.values());
  }

  private generateTransferId(): string {
    return `transfer_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private async readFileChunk(file: File, start: number, end: number): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file.slice(start, end));
    });
  }

  private async calculateFileChecksum(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const checksum = await EncryptionService.generateChecksum(reader.result as ArrayBuffer);
          resolve(checksum);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  private calculateTransferSpeed(transfer: FileTransfer, bytesTransferred: number): number {
    const elapsedTime = (Date.now() - transfer.startTime) / 1000; // seconds
    return elapsedTime > 0 ? bytesTransferred / elapsedTime : 0; // bytes per second
  }

  private handleTransferError(transferId: string, error: string): void {
    const transfer = this.activeTransfers.get(transferId);
    if (transfer) {
      transfer.status = 'failed';
      this.transferCallbacks.get(transferId)?.onError(transfer, error);
    }
  }
}