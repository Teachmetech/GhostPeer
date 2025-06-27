import React from 'react';
import { Shield, Zap, Lock } from 'lucide-react';

interface HeaderProps {
  connectionCount: number;
  isConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({ connectionCount, isConnected }) => {
  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <img
              src="/logo.svg"
              alt="GhostPeer"
              className="w-10 h-10"
              onError={(e) => {
                // Fallback to Shield icon if logo fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden p-2 bg-indigo-600 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">GhostPeer</h1>
              <p className="text-sm text-gray-600">Secure P2P File Sharing</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-600">
                AES-256 Encrypted
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-gray-400'}`} />
              <span className="text-sm text-gray-600">
                {connectionCount} {connectionCount === 1 ? 'Connection' : 'Connections'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};