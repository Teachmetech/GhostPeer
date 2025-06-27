<div align="center">
  <img src="public/logo-white.svg" alt="GhostPeer Logo" width="256" height="256">
  
  # GhostPeer
  
  **Secure, Serverless Peer-to-Peer File Sharing**
</div>

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/ghostpeer)
[![Live Demo](https://img.shields.io/badge/demo-ghostpeer.io-blue)](https://ghostpeer.io)

GhostPeer is a modern, secure, and completely serverless file sharing application that enables direct peer-to-peer transfers between browsers. No files touch any servers - everything stays between you and your peers.

## ✨ Features

- 🔒 **End-to-End Encryption** - Files are encrypted before transmission
- 🚀 **Zero Server Storage** - Files transfer directly between peers
- 🌐 **Browser-Based** - No downloads required, works in any modern browser
- 📱 **Cross-Platform** - Works on desktop, mobile, and tablets
- 🔥 **Real-Time Transfers** - See progress and status updates live
- 🆓 **Completely Free** - Open source with no usage limits
- ⚡ **Fast Setup** - Share your peer ID and start transferring immediately

## 🚀 Quick Start

### Option 1: Use the Live Version
Visit **[GhostPeer.io](https://ghostpeer.io)** and start sharing files immediately!

### Option 2: Run Locally
```bash
# Clone the repository
git clone https://github.com/yourusername/ghostpeer.git
cd ghostpeer

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

### Option 3: Deploy Your Own
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/ghostpeer)

Or deploy to any static hosting provider - it's just a static website!

## 🔧 How It Works

1. **Open GhostPeer** in your browser
2. **Share your Peer ID** with someone you want to transfer files with
3. **Connect** by entering their Peer ID
4. **Drag & drop files** to transfer them securely
5. **Files transfer directly** between browsers using WebRTC

## 🛠️ Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **P2P Communication**: PeerJS (WebRTC)
- **File Transfer**: Custom chunked transfer protocol
- **Encryption**: Built-in WebRTC encryption
- **Hosting**: Static hosting (Vercel, Netlify, etc.)

## 🏗️ Architecture

```
Browser A ←→ PeerJS Signaling Server ←→ Browser B
    ↓                                      ↓
    └─────── Direct P2P Connection ──────┘
              (Files transfer here)
```

- **Signaling**: Only for initial connection setup
- **File Transfer**: Direct peer-to-peer (no servers involved)
- **Encryption**: Automatic WebRTC encryption

## 🔐 Security

- All file transfers use WebRTC's built-in encryption
- No files are stored on any servers
- Peer IDs are randomly generated and temporary
- Connection is destroyed when browser closes
- Open source code for full transparency

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🐛 Troubleshooting

### Connection Issues
- **Check your network**: VPNs and corporate firewalls may block WebRTC
- **Try different browser**: Some browsers have stricter WebRTC policies
- **Use mobile hotspot**: Test if your network is blocking connections

### File Transfer Issues
- **Large files**: Break large files into smaller chunks for better reliability
- **Connection stability**: Ensure stable internet connection for both peers
- **Browser compatibility**: Use modern browsers (Chrome, Firefox, Safari, Edge)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Support

- 🐛 **Bug Reports**: [Open an issue](https://github.com/yourusername/ghostpeer/issues)
- 💡 **Feature Requests**: [Open an issue](https://github.com/yourusername/ghostpeer/issues)
- 💬 **Questions**: [Discussions](https://github.com/yourusername/ghostpeer/discussions)

## 🚀 Deployment

GhostPeer is a static website that can be deployed anywhere:

- **Vercel**: One-click deploy with the button above
- **Netlify**: Drag and drop the `dist` folder
- **GitHub Pages**: Enable Pages in repository settings
- **Your own server**: Upload `dist` folder contents

---

**Made with ❤️ for secure, private file sharing**

Visit **[GhostPeer.io](https://ghostpeer.io)** to try it now! 