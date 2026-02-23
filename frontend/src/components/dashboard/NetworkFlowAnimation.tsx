import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

interface NetworkNode {
  id: string;
  x: number;
  y: number;
  label: string;
  type: 'server' | 'client' | 'router' | 'external' | 'firewall';
  color: string;
  glowColor: string;
  connections: number;
}

interface Connection {
  id: string;
  from: string;
  to: string;
  active: boolean;
  protocol: string;
  color: string;
  bandwidth: number;
  latency: number;
}

interface Packet {
  id: string;
  connectionId: string;
  progress: number;
  color: string;
  size: number;
  timestamp: number;
}

const NetworkFlowAnimation: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [stats, setStats] = useState({
    totalPackets: 0,
    activeConnections: 0,
    bandwidth: 0,
  });

  // Professional network topology
  const initializeTopology = () => {
    const newNodes: NetworkNode[] = [
      { id: 'firewall', x: 15, y: 50, label: 'Firewall', type: 'firewall', color: '#f44336', glowColor: '#ff5252', connections: 0 },
      { id: 'router', x: 35, y: 50, label: 'Core Router', type: 'router', color: '#ff9800', glowColor: '#ffb74d', connections: 0 },
      { id: 'server1', x: 55, y: 25, label: 'Web Server', type: 'server', color: '#00bcd4', glowColor: '#4dd0e1', connections: 0 },
      { id: 'server2', x: 55, y: 50, label: 'DB Server', type: 'server', color: '#8b5cf6', glowColor: '#b388ff', connections: 0 },
      { id: 'server3', x: 55, y: 75, label: 'App Server', type: 'server', color: '#4caf50', glowColor: '#81c784', connections: 0 },
      { id: 'client1', x: 75, y: 20, label: '192.168.1.10', type: 'client', color: '#2196f3', glowColor: '#64b5f6', connections: 0 },
      { id: 'client2', x: 75, y: 40, label: '192.168.1.20', type: 'client', color: '#2196f3', glowColor: '#64b5f6', connections: 0 },
      { id: 'client3', x: 75, y: 60, label: '192.168.1.30', type: 'client', color: '#2196f3', glowColor: '#64b5f6', connections: 0 },
      { id: 'client4', x: 75, y: 80, label: '192.168.1.40', type: 'client', color: '#2196f3', glowColor: '#64b5f6', connections: 0 },
      { id: 'external', x: 5, y: 50, label: 'Internet', type: 'external', color: '#9c27b0', glowColor: '#ba68c8', connections: 0 },
    ];

    const newConnections: Connection[] = [
      { id: 'conn1', from: 'external', to: 'firewall', active: true, protocol: 'HTTPS', color: '#4caf50', bandwidth: 1000, latency: 20 },
      { id: 'conn2', from: 'firewall', to: 'router', active: true, protocol: 'TCP', color: '#00bcd4', bandwidth: 500, latency: 5 },
      { id: 'conn3', from: 'router', to: 'server1', active: true, protocol: 'HTTP', color: '#00bcd4', bandwidth: 200, latency: 2 },
      { id: 'conn4', from: 'router', to: 'server2', active: true, protocol: 'MySQL', color: '#8b5cf6', bandwidth: 150, latency: 1 },
      { id: 'conn5', from: 'router', to: 'server3', active: true, protocol: 'HTTPS', color: '#4caf50', bandwidth: 300, latency: 3 },
      { id: 'conn6', from: 'client1', to: 'router', active: true, protocol: 'HTTP', color: '#2196f3', bandwidth: 50, latency: 1 },
      { id: 'conn7', from: 'client2', to: 'router', active: true, protocol: 'HTTPS', color: '#4caf50', bandwidth: 75, latency: 1 },
      { id: 'conn8', from: 'client3', to: 'router', active: true, protocol: 'SSH', color: '#ff9800', bandwidth: 25, latency: 1 },
      { id: 'conn9', from: 'client4', to: 'router', active: true, protocol: 'FTP', color: '#f44336', bandwidth: 100, latency: 2 },
      { id: 'conn10', from: 'server1', to: 'server2', active: true, protocol: 'TCP', color: '#8b5cf6', bandwidth: 500, latency: 1 },
    ];

    setNodes(newNodes);
    setConnections(newConnections);
  };

  useEffect(() => {
    initializeTopology();
  }, []);

  // Generate packets continuously with varying rates
  useEffect(() => {
    if (connections.length === 0) return;

    const intervals: NodeJS.Timeout[] = [];

    connections.forEach(conn => {
      if (conn.active) {
        const interval = setInterval(() => {
          const packetSize = Math.random() * 1500 + 64; // 64-1564 bytes
          const newPacket: Packet = {
            id: `packet-${Date.now()}-${Math.random()}`,
            connectionId: conn.id,
            progress: 0,
            color: conn.color,
            size: packetSize,
            timestamp: Date.now(),
          };
          setPackets(prev => [...prev, newPacket]);
          setStats(prev => ({
            ...prev,
            totalPackets: prev.totalPackets + 1,
            bandwidth: prev.bandwidth + packetSize,
          }));
        }, 300 + Math.random() * 700); // Varying intervals

        intervals.push(interval);
      }
    });

    return () => intervals.forEach(clearInterval);
  }, [connections]);

  // Animate packets
  useEffect(() => {
    const animationInterval = setInterval(() => {
      setPackets(prev => {
        return prev
          .map(packet => ({
            ...packet,
            progress: packet.progress + 0.04, // Smooth movement
          }))
          .filter(packet => packet.progress < 1.1);
      });
    }, 16); // 60fps

    return () => clearInterval(animationInterval);
  }, []);

  // Update stats
  useEffect(() => {
    const activeConn = connections.filter(c => c.active).length;
    setStats(prev => ({
      ...prev,
      activeConnections: activeConn,
    }));
  }, [connections]);

  const getNodePosition = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  };

  const getPacketPosition = (packet: Packet) => {
    const conn = connections.find(c => c.id === packet.connectionId);
    if (!conn) return { x: 0, y: 0 };
    
    const from = getNodePosition(conn.from);
    const to = getNodePosition(conn.to);
    
    // Bezier curve for smooth path
    const t = packet.progress;
    const controlX = (from.x + to.x) / 2;
    const controlY = (from.y + to.y) / 2 - 5 * Math.sin(t * Math.PI);
    
    const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * controlX + t * t * to.x;
    const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * controlY + t * t * to.y;
    
    return { x, y };
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes.toFixed(0) + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '500px',
        background: 'radial-gradient(ellipse at center, rgba(15, 20, 40, 0.95) 0%, rgba(5, 10, 25, 1) 100%)',
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid rgba(0, 188, 212, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 0 100px rgba(0, 188, 212, 0.1)',
      }}
    >
      {/* Animated background grid */}
      <Box
        sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          backgroundImage: `
            linear-gradient(rgba(0, 188, 212, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 188, 212, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'gridMove 20s linear infinite',
          '@keyframes gridMove': {
            '0%': { transform: 'translate(0, 0)' },
            '100%': { transform: 'translate(50px, 50px)' },
          },
        }}
      />

      <svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none' }}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Glow filters */}
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="packetGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="connectionGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Gradients */}
          {nodes.map(node => (
            <linearGradient key={`grad-${node.id}`} id={`grad-${node.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={node.color} stopOpacity="1" />
              <stop offset="100%" stopColor={node.glowColor} stopOpacity="0.8" />
            </linearGradient>
          ))}
        </defs>

        {/* Connection lines with animated flow */}
        {connections.map(conn => {
          const from = getNodePosition(conn.from);
          const to = getNodePosition(conn.to);
          
          return (
            <g key={conn.id}>
              {/* Base line */}
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="0.2"
              />
              {/* Animated flow line */}
              <motion.line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={conn.color}
                strokeWidth="0.15"
                opacity={conn.active ? 0.6 : 0.2}
                filter="url(#connectionGlow)"
                strokeDasharray="1,0.5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: [0, 1, 0],
                  opacity: conn.active ? [0.3, 0.8, 0.3] : 0.1,
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </g>
          );
        })}

        {/* Animated packets */}
        {packets.map(packet => {
          const pos = getPacketPosition(packet);
          const size = Math.max(0.4, Math.min(1.2, packet.size / 1000));
          
          return (
            <motion.circle
              key={packet.id}
              cx={pos.x}
              cy={pos.y}
              r={size}
              fill={packet.color}
              filter="url(#packetGlow)"
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 1, 0.7, 0],
                scale: [0, size * 1.5, size, size * 0.8, 0],
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 },
              }}
            />
          );
        })}

        {/* Network nodes with professional styling */}
        {nodes.map(node => (
          <g key={node.id}>
            {/* Outer glow ring */}
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="3.5"
              fill="none"
              stroke={node.glowColor}
              strokeWidth="0.2"
              opacity="0.4"
              filter="url(#nodeGlow)"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.4, 0.6, 0.4],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            {/* Main node */}
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="2.5"
              fill={`url(#grad-${node.id})`}
              filter="url(#nodeGlow)"
              initial={{ scale: 0 }}
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                scale: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
            />
            {/* Inner highlight */}
            <circle
              cx={node.x - 0.5}
              cy={node.y - 0.5}
              r="0.8"
              fill="rgba(255, 255, 255, 0.6)"
              opacity="0.5"
            />
            {/* Node label with background */}
            <rect
              x={node.x - 6}
              y={node.y - 6.5}
              width="12"
              height="3"
              fill="rgba(0, 0, 0, 0.7)"
              rx="0.5"
              opacity="0.8"
            />
            <text
              x={node.x}
              y={node.y - 5}
              fontSize="2"
              fill="#ffffff"
              textAnchor="middle"
              fontWeight="500"
              style={{ pointerEvents: 'none', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Professional stats overlay */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.7) 50%, transparent 100%)',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        <Box sx={{ display: 'flex', gap: 4 }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem' }}>
              Active Connections
            </Typography>
            <Typography variant="h6" sx={{ color: '#00bcd4', fontWeight: 600, fontSize: '1.1rem' }}>
              {stats.activeConnections}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem' }}>
              Packets Transmitted
            </Typography>
            <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 600, fontSize: '1.1rem' }}>
              {stats.totalPackets.toLocaleString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem' }}>
              Total Bandwidth
            </Typography>
            <Typography variant="h6" sx={{ color: '#ff9800', fontWeight: 600, fontSize: '1.1rem' }}>
              {formatBytes(stats.bandwidth)}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#4caf50',
                boxShadow: '0 0 10px rgba(76, 175, 80, 0.8)',
              }}
            />
          </motion.div>
          <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 500 }}>
            LIVE
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default NetworkFlowAnimation;
