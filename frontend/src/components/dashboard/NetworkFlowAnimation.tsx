import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';

const MONO = '"JetBrains Mono", monospace';

interface TopoNode {
  id: string;
  x: number;
  y: number;
  label: string;
  type: 'core' | 'server' | 'endpoint' | 'external';
}

interface TopoLink {
  from: string;
  to: string;
  protocol: string;
  active: boolean;
}

interface Packet {
  id: string;
  linkIdx: number;
  progress: number;
}

const NODES: TopoNode[] = [
  { id: 'inet', x: 8, y: 50, label: 'WAN', type: 'external' },
  { id: 'fw', x: 25, y: 50, label: 'FW-01', type: 'core' },
  { id: 'core', x: 45, y: 50, label: 'CORE-SW', type: 'core' },
  { id: 'web', x: 65, y: 22, label: 'WEB-01', type: 'server' },
  { id: 'db', x: 65, y: 50, label: 'DB-01', type: 'server' },
  { id: 'app', x: 65, y: 78, label: 'APP-01', type: 'server' },
  { id: 'c1', x: 85, y: 15, label: '10.0.1.11', type: 'endpoint' },
  { id: 'c2', x: 85, y: 40, label: '10.0.1.22', type: 'endpoint' },
  { id: 'c3', x: 85, y: 65, label: '10.0.1.33', type: 'endpoint' },
  { id: 'c4', x: 85, y: 88, label: '10.0.1.44', type: 'endpoint' },
];

const LINKS: TopoLink[] = [
  { from: 'inet', to: 'fw', protocol: 'HTTPS', active: true },
  { from: 'fw', to: 'core', protocol: 'TCP', active: true },
  { from: 'core', to: 'web', protocol: 'HTTP', active: true },
  { from: 'core', to: 'db', protocol: 'PgSQL', active: true },
  { from: 'core', to: 'app', protocol: 'gRPC', active: true },
  { from: 'web', to: 'c1', protocol: 'HTTP', active: true },
  { from: 'web', to: 'c2', protocol: 'WSS', active: true },
  { from: 'app', to: 'c3', protocol: 'TCP', active: true },
  { from: 'app', to: 'c4', protocol: 'SSH', active: true },
  { from: 'web', to: 'db', protocol: 'SQL', active: true },
];

const nodeColor = (type: TopoNode['type']) => {
  switch (type) {
    case 'external': return '#6366f1';
    case 'core': return '#3b82f6';
    case 'server': return '#22c55e';
    case 'endpoint': return '#64748b';
  }
};

const getPos = (id: string) => NODES.find((n) => n.id === id) || { x: 0, y: 0 };

const NetworkFlowAnimation: React.FC = () => {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [connCount, setConnCount] = useState(0);
  const [pktCount, setPktCount] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const intervals = LINKS.map((_, idx) => {
      return setInterval(() => {
        setPackets((prev) => [
          ...prev,
          { id: `p-${Date.now()}-${Math.random()}`, linkIdx: idx, progress: 0 },
        ]);
        setPktCount((c) => c + 1);
      }, 600 + Math.random() * 800);
    });
    setConnCount(LINKS.filter((l) => l.active).length);
    return () => intervals.forEach(clearInterval);
  }, []);

  useEffect(() => {
    const raf = () => {
      setPackets((prev) =>
        prev.map((p) => ({ ...p, progress: p.progress + 0.025 })).filter((p) => p.progress < 1.05)
      );
      frame.current = requestAnimationFrame(raf);
    };
    frame.current = requestAnimationFrame(raf);
    return () => cancelAnimationFrame(frame.current);
  }, []);

  return (
    <Box sx={{
      position: 'relative', width: '100%', height: '100%',
      background: '#020617',
      borderRadius: '6px',
      overflow: 'hidden',
      border: '0.5px solid rgba(148,163,184,0.06)',
    }}>
      {/* Scanning grid */}
      <Box sx={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(148,163,184,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(148,163,184,0.025) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
      }} />
      {/* Horizontal scan line */}
      <motion.div
        style={{
          position: 'absolute', left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.12), transparent)',
        }}
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />

      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        {/* Links */}
        {LINKS.map((link, idx) => {
          const from = getPos(link.from);
          const to = getPos(link.to);
          return (
            <line
              key={idx}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="rgba(148,163,184,0.08)"
              strokeWidth="0.3"
              strokeDasharray="1,1"
            />
          );
        })}

        {/* Packets */}
        {packets.map((pkt) => {
          const link = LINKS[pkt.linkIdx];
          if (!link) return null;
          const from = getPos(link.from);
          const to = getPos(link.to);
          const t = pkt.progress;
          const x = from.x + (to.x - from.x) * t;
          const y = from.y + (to.y - from.y) * t;
          const col = link.active ? '#3b82f6' : '#475569';
          return (
            <circle key={pkt.id} cx={x} cy={y} r="0.5" fill={col} opacity={Math.min(1, 4 * t * (1 - t))} />
          );
        })}

        {/* Nodes */}
        {NODES.map((node) => {
          const c = nodeColor(node.type);
          return (
            <g key={node.id}>
              <circle cx={node.x} cy={node.y} r="2" fill="#0f172a" stroke={c} strokeWidth="0.4" opacity={0.9} />
              <circle cx={node.x} cy={node.y} r="0.8" fill={c} opacity={0.7} />
              <text
                x={node.x} y={node.y - 3.5}
                textAnchor="middle" fontSize="1.8" fill="#64748b"
                fontFamily="'JetBrains Mono', monospace" fontWeight="500"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Stats bar */}
      <Box sx={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        px: 1.5, py: 0.75,
        background: 'linear-gradient(to top, rgba(2,6,23,0.95), transparent)',
        zIndex: 2,
      }}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          {[
            { label: 'LINKS', value: connCount, color: '#3b82f6' },
            { label: 'PKTS', value: pktCount, color: '#22c55e' },
          ].map((s) => (
            <Box key={s.label}>
              <Typography sx={{ fontFamily: MONO, fontSize: '0.5625rem', color: '#334155', letterSpacing: '0.06em' }}>{s.label}</Typography>
              <Typography sx={{ fontFamily: MONO, fontSize: '0.75rem', color: s.color, fontWeight: 600, lineHeight: 1 }}>{s.value}</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <motion.div animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
            <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#22c55e' }} />
          </motion.div>
          <Typography sx={{ fontFamily: MONO, fontSize: '0.5625rem', color: '#22c55e', fontWeight: 600 }}>LIVE</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default NetworkFlowAnimation;
