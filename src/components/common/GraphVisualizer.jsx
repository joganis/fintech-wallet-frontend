import { useState, useRef, useEffect, useMemo, useCallback } from 'react'

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtAmt(n) {
  const v = Number(n)
  if (!v) return ''
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

function aggregateEdges(edges) {
  const map = new Map()
  for (const e of edges) {
    const key = `${e.from}__${e.to}`
    if (map.has(key)) {
      const ex = map.get(key)
      ex.weight = Number(ex.weight) + Number(e.weight || 0)
      ex.count++
    } else {
      map.set(key, { ...e, weight: Number(e.weight || 0), count: 1 })
    }
  }
  return Array.from(map.values())
}

function buildLayout(nodes, currentUserId, w, h) {
  const pos = {}
  if (!nodes.length) return pos
  const cx = w / 2, cy = h / 2
  const others = nodes.filter(n => n.id !== currentUserId)
  pos[currentUserId] = { x: cx, y: cy }
  const r = Math.min(w, h) * 0.32
  others.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(1, others.length) - Math.PI / 2
    pos[n.id] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  })
  return pos
}

function detectCycleNodes(nodes, edges) {
  const adj = Object.fromEntries(nodes.map(n => [n.id, []]))
  edges.forEach(e => adj[e.from]?.push(e.to))
  const visited = new Set(), inStack = new Set(), result = new Set()
  function dfs(v) {
    visited.add(v); inStack.add(v)
    for (const nb of adj[v] || []) {
      if (!visited.has(nb)) dfs(nb)
      else if (inStack.has(nb)) { result.add(v); result.add(nb) }
    }
    inStack.delete(v)
  }
  nodes.forEach(n => { if (!visited.has(n.id)) dfs(n.id) })
  return result
}

function bfsReachable(fromId, edges) {
  const adj = {}
  edges.forEach(e => { (adj[e.from] ||= []).push(e.to) })
  const visitedNodes = new Set([fromId]), visitedEdges = new Set(), q = [fromId]
  while (q.length) {
    const cur = q.shift()
    for (const nb of adj[cur] || []) {
      visitedEdges.add(`${cur}__${nb}`)
      if (!visitedNodes.has(nb)) { visitedNodes.add(nb); q.push(nb) }
    }
  }
  return { nodes: visitedNodes, edges: visitedEdges }
}

// ─── SVG Edge ───────────────────────────────────────────────────────────────

function Edge({ edge, pos, maxWeight, highlight, dim }) {
  const p1 = pos[edge.from], p2 = pos[edge.to]
  if (!p1 || !p2) return null
  const NR = 30
  const dx = p2.x - p1.x, dy = p2.y - p1.y
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const ux = dx / dist, uy = dy / dist
  const sx = p1.x + ux * NR, sy = p1.y + uy * NR
  const ex = p2.x - ux * (NR + 8), ey = p2.y - uy * (NR + 8)
  const mx = (sx + ex) / 2, my = (sy + ey) / 2

  const ratio = maxWeight > 0 ? Number(edge.weight) / maxWeight : 0
  const strokeW = 1.5 + ratio * 5.5

  const color = dim ? '#e2e8f0' : highlight === 'cycle' ? '#ef4444'
    : highlight === 'route' ? '#22c55e' : '#94a3b8'
  const opacity = dim ? 0.15 : 1

  const offX = -uy * 10, offY = ux * 10
  const lx = mx + offX, ly = my + offY

  return (
    <g opacity={opacity} style={{ transition: 'opacity 0.3s' }}>
      <line x1={sx} y1={sy} x2={ex} y2={ey}
        stroke={color} strokeWidth={strokeW}
        markerEnd={`url(#arrow-${highlight || 'normal'})`}
        style={{ transition: 'stroke 0.3s' }} />
      {edge.weight > 0 && (
        <text x={lx} y={ly} textAnchor="middle" fontSize={10}
          fill={dim ? '#94a3b8' : '#475569'} fontFamily="monospace"
          style={{ userSelect: 'none' }}>
          {fmtAmt(edge.weight)}{edge.count > 1 ? ` ×${edge.count}` : ''}
        </text>
      )}
    </g>
  )
}

// ─── SVG Node ───────────────────────────────────────────────────────────────

function Node({ node, pos, isCurrent, highlight, dim }) {
  const p = pos[node.id]
  if (!p) return null
  const NR = 30

  const fillBase = isCurrent ? '#3b82f6'
    : highlight === 'cycle' ? '#ef4444'
    : highlight === 'route' ? '#22c55e'
    : '#475569'
  const opacity = dim ? 0.2 : 1
  const label = (node.label || `#${node.id}`)
  const short = label.length > 9 ? label.slice(0, 8) + '…' : label

  return (
    <g opacity={opacity} style={{ transition: 'opacity 0.3s' }}>
      {(highlight === 'cycle' || highlight === 'route') && (
        <circle cx={p.x} cy={p.y} r={NR + 6} fill={fillBase} opacity={0.2}>
          <animate attributeName="r" values={`${NR + 4};${NR + 10};${NR + 4}`}
            dur="1.8s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx={p.x} cy={p.y} r={NR} fill={fillBase}
        style={{ transition: 'fill 0.3s', filter: isCurrent ? 'drop-shadow(0 0 6px #3b82f6aa)' : 'none' }} />
      <text x={p.x} y={p.y - 4} textAnchor="middle" fontSize={9}
        fill="white" fontFamily="monospace" fontWeight="600"
        style={{ userSelect: 'none' }}>
        {short}
      </text>
      <text x={p.x} y={p.y + 8} textAnchor="middle" fontSize={8}
        fill="rgba(255,255,255,0.7)" fontFamily="monospace"
        style={{ userSelect: 'none' }}>
        #{node.id}
      </text>
    </g>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GraphVisualizer({ open, onClose, graphData, currentUserId }) {
  const svgRef = useRef(null)
  const [pan, setPan] = useState({ x: 0, y: 0, scale: 1 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [mode, setMode] = useState('none') // 'none' | 'cycles' | 'routes'
  const [infoOpen, setInfoOpen] = useState(false)

  const SVG_W = 700, SVG_H = 520

  useEffect(() => {
    if (open) { setPan({ x: 0, y: 0, scale: 1 }); setMode('none') }
  }, [open])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const nodes = graphData?.nodes || []
  const rawEdges = graphData?.edges || []
  const hasCycles = graphData?.hasCycles || false

  const aggEdges = useMemo(() => aggregateEdges(rawEdges), [rawEdges])
  const pos = useMemo(() => buildLayout(nodes, currentUserId, SVG_W, SVG_H), [nodes, currentUserId])
  const maxWeight = useMemo(() => Math.max(...aggEdges.map(e => Number(e.weight) || 0), 1), [aggEdges])
  const cycleNodes = useMemo(() => detectCycleNodes(nodes, aggEdges), [nodes, aggEdges])
  const routeReach = useMemo(() => currentUserId ? bfsReachable(currentUserId, aggEdges) : null, [currentUserId, aggEdges])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    setPan(p => ({
      ...p,
      scale: Math.min(3, Math.max(0.25, p.scale * factor))
    }))
  }, [])

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    setDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }, [pan])

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return
    setPan(p => ({ ...p, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }))
  }, [dragging, dragStart])

  const handleMouseUp = useCallback(() => setDragging(false), [])

  const resetView = () => setPan({ x: 0, y: 0, scale: 1 })
  const zoom = (d) => setPan(p => ({ ...p, scale: Math.min(3, Math.max(0.25, p.scale * d)) }))

  function nodeHighlight(nodeId) {
    if (mode === 'none') return null
    if (mode === 'cycles') return cycleNodes.has(nodeId) ? 'cycle' : null
    if (mode === 'routes') return routeReach?.nodes.has(nodeId) ? 'route' : null
    return null
  }
  function nodeDim(nodeId) {
    if (mode === 'none') return false
    if (mode === 'cycles') return !cycleNodes.has(nodeId)
    if (mode === 'routes') return !routeReach?.nodes.has(nodeId)
    return false
  }
  function edgeHighlight(e) {
    const key = `${e.from}__${e.to}`
    if (mode === 'none') return null
    if (mode === 'cycles') return (cycleNodes.has(e.from) && cycleNodes.has(e.to)) ? 'cycle' : null
    if (mode === 'routes') return routeReach?.edges.has(key) ? 'route' : null
    return null
  }
  function edgeDim(e) {
    if (mode === 'none') return false
    if (mode === 'cycles') return !(cycleNodes.has(e.from) && cycleNodes.has(e.to))
    if (mode === 'routes') return !routeReach?.edges.has(`${e.from}__${e.to}`)
    return false
  }

  if (!open) return null

  const isEmpty = nodes.length === 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col"
        style={{ width: '95vw', maxWidth: 1100, height: '92vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 font-mono">
              Transfer Network Graph
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {nodes.length} nodes · {aggEdges.length} unique connections · {rawEdges.length} total transfers
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasCycles && (
              <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium font-mono">
                ⚠ Circular patterns detected
              </span>
            )}
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors text-lg">
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">

          {/* Sidebar */}
          <div className="w-64 flex-shrink-0 border-r border-gray-100 flex flex-col bg-gray-50 overflow-y-auto">
            <div className="p-4 space-y-4">

              {/* Highlight controls */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Highlight mode
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => setMode(m => m === 'cycles' ? 'none' : 'cycles')}
                    disabled={!hasCycles}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all border ${
                      mode === 'cycles'
                        ? 'bg-red-500 text-white border-red-500 shadow-sm'
                        : hasCycles
                          ? 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                          : 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
                    }`}>
                    <span className="mr-2">🔴</span>
                    Show circular patterns
                    {!hasCycles && <span className="block text-[10px] mt-0.5 opacity-60">No cycles found</span>}
                  </button>

                  <button
                    onClick={() => setMode(m => m === 'routes' ? 'none' : 'routes')}
                    disabled={!currentUserId}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all border ${
                      mode === 'routes'
                        ? 'bg-green-500 text-white border-green-500 shadow-sm'
                        : 'bg-white text-green-600 border-green-200 hover:bg-green-50'
                    }`}>
                    <span className="mr-2">🟢</span>
                    Show my routes (BFS)
                  </button>

                  {mode !== 'none' && (
                    <button onClick={() => setMode('none')}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-500 border border-gray-200 hover:bg-gray-100 transition-colors">
                      ✕ Clear highlight
                    </button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Stats
                </p>
                <div className="space-y-1.5">
                  {[
                    ['Users in network', nodes.length],
                    ['Unique connections', aggEdges.length],
                    ['Total transfers', rawEdges.length],
                    ['Cycle nodes', cycleNodes.size || '—'],
                    ['Reachable from you', routeReach?.nodes.size ?? '—'],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-mono font-semibold text-gray-800">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setInfoOpen(o => !o)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors bg-white">
                  <span>What does this show?</span>
                  <span className="text-gray-400">{infoOpen ? '▲' : '▼'}</span>
                </button>
                {infoOpen && (
                  <div className="px-3 py-3 text-xs text-gray-600 space-y-3 bg-white border-t border-gray-100">
                    <div>
                      <p className="font-semibold text-red-600 mb-1">🔴 Cycles</p>
                      <p className="text-gray-500 leading-relaxed">
                        Money flows in a loop: A→B→C→A. Indicates potential laundering or coordinated fraud between accounts.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-green-600 mb-1">🟢 Routes (BFS)</p>
                      <p className="text-gray-500 leading-relaxed">
                        All users reachable from your account via transfers. Shows your direct and indirect financial network.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700 mb-1">Edge thickness</p>
                      <p className="text-gray-500 leading-relaxed">
                        Thicker lines = larger total amount transferred between two users. Numbers show accumulated total.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative bg-slate-950 overflow-hidden"
            style={{ cursor: dragging ? 'grabbing' : 'grab' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}>

            {isEmpty ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                <p className="text-5xl mb-3 opacity-30">⬡</p>
                <p className="text-sm">No transfer connections yet</p>
                <p className="text-xs mt-1 opacity-60">Make transfers to build your network</p>
              </div>
            ) : (
              <svg
                ref={svgRef}
                className="w-full h-full select-none"
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                preserveAspectRatio="xMidYMid meet"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}>

                <defs>
                  {['normal', 'cycle', 'route'].map(type => {
                    const col = type === 'cycle' ? '#ef4444' : type === 'route' ? '#22c55e' : '#94a3b8'
                    return (
                      <marker key={type} id={`arrow-${type}`}
                        markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L8,3 z" fill={col} />
                      </marker>
                    )
                  })}
                </defs>

                <g transform={`translate(${pan.x} ${pan.y}) scale(${pan.scale})`}>
                  {aggEdges.map((e, i) => (
                    <Edge key={i} edge={e} pos={pos} maxWeight={maxWeight}
                      highlight={edgeHighlight(e)} dim={edgeDim(e)} />
                  ))}
                  {nodes.map(n => (
                    <Node key={n.id} node={n} pos={pos}
                      isCurrent={n.id === currentUserId}
                      highlight={nodeHighlight(n.id)}
                      dim={nodeDim(n.id)} />
                  ))}
                </g>
              </svg>
            )}

            {/* Zoom controls */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-1">
              {[
                { label: '+', action: () => zoom(1.2) },
                { label: '⌂', action: resetView },
                { label: '−', action: () => zoom(0.8) },
              ].map(({ label, action }) => (
                <button key={label} onClick={action}
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-mono backdrop-blur-sm transition-colors flex items-center justify-center">
                  {label}
                </button>
              ))}
            </div>

            {/* Zoom level indicator */}
            <div className="absolute bottom-4 left-4 text-xs text-slate-500 font-mono">
              {Math.round(pan.scale * 100)}% · scroll to zoom · drag to pan
            </div>
          </div>
        </div>

        {/* Legend footer */}
        <div className="flex items-center gap-6 px-6 py-2.5 border-t border-gray-100 bg-gray-50 flex-shrink-0 text-xs text-gray-500 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> You
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-500 inline-block" /> Other users
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> In a cycle
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Reachable route
          </span>
          <span className="flex items-center gap-1.5 ml-2">
            <span className="inline-block h-0.5 w-6 bg-slate-400" style={{ borderTop: '2px solid' }} />
            thicker = more $$$
          </span>
        </div>
      </div>
    </div>
  )
}
