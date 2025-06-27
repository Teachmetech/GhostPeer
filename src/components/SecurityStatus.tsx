import React from 'react';
import { Shield, Lock, Eye, CheckCircle, AlertTriangle } from 'lucide-react';

interface SecurityStatusProps {
  isEncrypted: boolean;
  connectionSecure: boolean;
  filesTransferred: number;
}

export const SecurityStatus: React.FC<SecurityStatusProps> = ({
  isEncrypted,
  connectionSecure,
  filesTransferred
}) => {
  const securityFeatures = [
    {
      icon: Shield,
      title: 'AES-256 Encryption',
      description: 'Military-grade encryption for all transfers',
      status: isEncrypted,
    },
    {
      icon: Lock,
      title: 'WebRTC Direct Connection',
      description: 'Peer-to-peer, no server intermediary',
      status: connectionSecure,
    },
    {
      icon: Eye,
      title: 'Zero Server Storage',
      description: 'Files never touch our servers',
      status: true,
    },
  ];

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200/50 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-emerald-600 rounded-lg">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Security Status</h2>
          <p className="text-sm text-emerald-700">Your privacy is protected</p>
        </div>
      </div>

      <div className="space-y-4">
        {securityFeatures.map((feature, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg ${feature.status ? 'bg-emerald-100' : 'bg-gray-100'}`}>
              <feature.icon className={`h-4 w-4 ${feature.status ? 'text-emerald-600' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-gray-900">{feature.title}</h3>
                {feature.status ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
              </div>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      {filesTransferred > 0 && (
        <div className="mt-6 pt-4 border-t border-emerald-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">{filesTransferred}</div>
            <div className="text-sm text-gray-600">Files transferred securely</div>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-white/50 rounded-lg border border-emerald-200/50">
        <div className="flex items-start space-x-2">
          <Shield className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <strong>Privacy Guarantee:</strong> Your files are encrypted end-to-end and never stored on our servers. 
            Only you and your intended recipient can access the transferred files.
          </div>
        </div>
      </div>
    </div>
  );
};