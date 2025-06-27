import React from 'react';
import { FileTransfer } from '../types';
import { File, Pause, Play, X, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface TransferProgressProps {
  transfers: FileTransfer[];
  onPauseTransfer: (transferId: string) => void;
  onResumeTransfer: (transferId: string) => void;
  onCancelTransfer: (transferId: string) => void;
}

export const TransferProgress: React.FC<TransferProgressProps> = ({
  transfers,
  onPauseTransfer,
  onResumeTransfer,
  onCancelTransfer
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatFileSize(bytesPerSecond)}/s`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = (status: FileTransfer['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'paused':
        return <Pause className="h-5 w-5 text-amber-500" />;
      case 'transferring':
        return <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: FileTransfer['status']) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-600';
      case 'failed':
        return 'text-red-600';
      case 'paused':
        return 'text-amber-600';
      case 'transferring':
        return 'text-indigo-600';
      default:
        return 'text-gray-600';
    }
  };

  const getProgressBarColor = (status: FileTransfer['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500';
      case 'failed':
        return 'bg-red-500';
      case 'paused':
        return 'bg-amber-500';
      case 'transferring':
        return 'bg-indigo-500';
      default:
        return 'bg-gray-400';
    }
  };

  if (transfers.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <File className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">File Transfers</h2>
          <p className="text-sm text-gray-600">
            {transfers.filter(t => t.status === 'transferring').length} active, {transfers.filter(t => t.status === 'completed').length} completed
          </p>
        </div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {transfers.map((transfer) => (
          <div key={transfer.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <File className="h-5 w-5 text-gray-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-gray-900 truncate">{transfer.file.name}</h3>
                  <p className="text-sm text-gray-500">{formatFileSize(transfer.file.size)}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(transfer.status)}
                  <span className={`text-sm font-medium ${getStatusColor(transfer.status)}`}>
                    {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
                  </span>
                </div>
                
                {transfer.status === 'transferring' && (
                  <button
                    onClick={() => onPauseTransfer(transfer.id)}
                    className="p-1 text-gray-400 hover:text-amber-600 transition-colors"
                    title="Pause transfer"
                  >
                    <Pause className="h-4 w-4" />
                  </button>
                )}
                
                {transfer.status === 'paused' && (
                  <button
                    onClick={() => onResumeTransfer(transfer.id)}
                    className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                    title="Resume transfer"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                )}
                
                {transfer.status !== 'completed' && (
                  <button
                    onClick={() => onCancelTransfer(transfer.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Cancel transfer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>{Math.round(transfer.progress)}%</span>
                {transfer.speed > 0 && (
                  <span>{formatSpeed(transfer.speed)}</span>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(transfer.status)}`}
                  style={{ width: `${transfer.progress}%` }}
                />
              </div>
            </div>
            
            {/* Transfer Details */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {transfer.status === 'transferring' 
                  ? `ETA: ${formatTime(Math.round((transfer.file.size - (transfer.file.size * transfer.progress / 100)) / (transfer.speed || 1)))}`
                  : `Peer: ${transfer.peerId.substring(0, 8)}...`
                }
              </span>
              <span>
                Elapsed: {formatTime(Math.round((Date.now() - transfer.startTime) / 1000))}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};