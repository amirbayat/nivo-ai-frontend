import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { useMe } from '@/queries/auth.queries'
import { usePlans } from '@/queries/plans.queries'
import { SalesChatbot } from '@/components/sales/SalesChatbot'
import { ExitIntentModal } from '@/components/sales/ExitIntentModal'

// ── InView observer (MutationObserver برای عناصر async مثل plan cards) ───────
function useInViewObserver() {
  useEffect(() => {
    const seen = new WeakSet<Element>()
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('inview'); io.unobserve(e.target) }
      }),
      { threshold: 0.1 },
    )

    function observeNew() {
      document.querySelectorAll('[data-anim]').forEach(el => {
        if (!seen.has(el)) { seen.add(el); io.observe(el) }
      })
    }

    observeNew()
    const mo = new MutationObserver(observeNew)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => { io.disconnect(); mo.disconnect() }
  }, [])
}

// ── Animated counter ─────────────────────────────────────────────────────────
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect()
      let start: number
      const tick = (t: number) => {
        if (!start) start = t
        const p = Math.min((t - start) / 1200, 1)
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * to))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.7 })
    io.observe(el)
    return () => io.disconnect()
  }, [to])
  return <span ref={ref}>{val.toLocaleString('fa-IR')}{suffix}</span>
}

// ── Neural network SVG (hero illustration) ───────────────────────────────────
const NN = {
  nodes: [
    { cx: 70,  cy: 90,  r: 7,  c: '#10B981' },
    { cx: 70,  cy: 170, r: 7,  c: '#10B981' },
    { cx: 70,  cy: 250, r: 7,  c: '#10B981' },
    { cx: 220, cy: 90,  r: 7,  c: '#7C3AED' },
    { cx: 220, cy: 170, r: 7,  c: '#7C3AED' },
    { cx: 220, cy: 250, r: 7,  c: '#7C3AED' },
    { cx: 370, cy: 130, r: 10, c: '#0EA5E9' },
    { cx: 370, cy: 210, r: 10, c: '#0EA5E9' },
  ],
  edges: [
    [0,3],[0,4],[0,5],[1,3],[1,4],[1,5],[2,3],[2,4],[2,5],
    [3,6],[3,7],[4,6],[4,7],[5,6],[5,7],
  ] as [number, number][],
}

function NeuralSVG() {
  return (
    <svg viewBox="0 0 440 340" className="w-full h-auto" aria-hidden="true">
      <defs>
        <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#020C18" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="220" cy="170" rx="200" ry="150" fill="url(#bgGrad)" />

      {/* Edges + flowing dots */}
      {NN.edges.map(([fi, ti], i) => {
        const f = NN.nodes[fi], t = NN.nodes[ti]
        const dur = 1.8 + (i % 5) * 0.35
        return (
          <g key={i}>
            <line x1={f.cx} y1={f.cy} x2={t.cx} y2={t.cy}
              stroke={f.c} strokeOpacity="0.14" strokeWidth="1.2" />
            <circle r="2.8" fill={f.c} opacity="0">
              <animateMotion dur={`${dur}s`} repeatCount="indefinite"
                begin={`${i * 0.22}s`} calcMode="linear"
                path={`M${f.cx},${f.cy} L${t.cx},${t.cy}`} />
              <animate attributeName="opacity"
                values="0;1;1;0" keyTimes="0;0.08;0.82;1"
                dur={`${dur}s`} repeatCount="indefinite" begin={`${i * 0.22}s`} />
            </circle>
          </g>
        )
      })}

      {/* Nodes */}
      {NN.nodes.map((n, i) => (
        <g key={i} filter="url(#glow)">
          <circle cx={n.cx} cy={n.cy} r={n.r + 3} fill="none"
            stroke={n.c} strokeOpacity="0.35" strokeWidth="1">
            <animate attributeName="r" values={`${n.r+2};${n.r+9};${n.r+2}`}
              dur={`${2.2 + (i % 3) * 0.6}s`} repeatCount="indefinite" begin={`${i * 0.28}s`} />
            <animate attributeName="stroke-opacity" values="0.4;0;0.4"
              dur={`${2.2 + (i % 3) * 0.6}s`} repeatCount="indefinite" begin={`${i * 0.28}s`} />
          </circle>
          <circle cx={n.cx} cy={n.cy} r={n.r} fill={n.c} fillOpacity="0.92">
            <animate attributeName="r" values={`${n.r};${n.r+1.5};${n.r}`}
              dur={`${1.6 + (i % 4) * 0.3}s`} repeatCount="indefinite" begin={`${i * 0.18}s`} />
          </circle>
          <circle cx={n.cx - n.r * 0.3} cy={n.cy - n.r * 0.3}
            r={n.r * 0.38} fill="white" fillOpacity="0.28" />
        </g>
      ))}

      {/* Layer labels */}
      {[{ x: 70, l: 'ورودی' }, { x: 220, l: 'پردازش' }, { x: 370, l: 'خروجی' }].map(({ x, l }) => (
        <text key={l} x={x} y="300" textAnchor="middle" fontSize="11"
          fill="#475569" fontFamily="inherit">{l}</text>
      ))}
    </svg>
  )
}

// ── Feature SVG icons ─────────────────────────────────────────────────────────
function IconZap() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="size-8">
      <path d="M22 4L8 22h12l-2 14 14-18H20L22 4z" stroke="#10B981" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" fill="none">
        <animate attributeName="stroke-dasharray" values="0 100;60 100" dur="1s" fill="freeze" begin="0.3s" />
      </path>
    </svg>
  )
}
function IconShield() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="size-8">
      <path d="M20 4L6 10v9c0 8.3 5.9 16 14 18 8.1-2 14-9.7 14-18V10L20 4z"
        stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 20l4 4 8-8" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
function IconChat() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="size-8">
      <path d="M8 10h18a2 2 0 012 2v12a2 2 0 01-2 2H14l-6 4V12a2 2 0 012-2z"
        stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 10v-2a2 2 0 00-2-2H12a2 2 0 00-2 2v10l4-2.5"
        stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
    </svg>
  )
}
function IconLayers() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="size-8">
      <path d="M6 26l14 8 14-8" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
      <path d="M6 20l14 8 14-8" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.75" />
      <path d="M6 14l14-8 14 8-14 8L6 14z" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Global starfield background ───────────────────────────────────────────────
const STARS = Array.from({ length: 110 }, (_, i) => ({
  cx: ((i * 97.3 + 13) % 100).toFixed(2),
  cy: ((i * 61.8 + 7)  % 100).toFixed(2),
  r:  (0.18 + (i % 5) * 0.10).toFixed(2),
  dur: (2.2 + (i % 9) * 0.9).toFixed(1),
  beg: ((i * 0.37) % 9).toFixed(2),
  oMax: (0.15 + (i % 4) * 0.18).toFixed(2),
}))

const NEBULAS = [
  { cx: '5%',  cy: '10%', rx: '520px', ry: '420px', c1: '#10B981', dur: 28 },
  { cx: '55%', cy: '55%', rx: '620px', ry: '500px', c1: '#7C3AED', dur: 36 },
  { cx: '30%', cy: '35%', rx: '440px', ry: '360px', c1: '#0EA5E9', dur: 44 },
  { cx: '75%', cy: '75%', rx: '380px', ry: '300px', c1: '#7C3AED', dur: 22 },
]

function GlobalBackground() {
  return (
    <div className="pointer-events-none fixed inset-0" style={{ zIndex: -1 }} aria-hidden="true">
      {/* Slowly drifting nebula blobs (CSS) */}
      {NEBULAS.map((n, i) => (
        <div key={i} className="nebula-blob absolute rounded-full" style={{
          left: n.cx, top: n.cy,
          width: n.rx, height: n.ry,
          background: `radial-gradient(circle, ${n.c1}09 0%, transparent 70%)`,
          animationName: `nebulaDrift${(i % 2) + 1}`,
          animationDuration: `${n.dur}s`,
          animationDelay: `${i * 3}s`,
        }} />
      ))}

      {/* Twinkling stars + scan lines (SVG) */}
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {STARS.map((s, i) => (
          <circle key={i} cx={`${s.cx}%`} cy={`${s.cy}%`} r={s.r} fill="white">
            <animate attributeName="opacity" values={`0;${s.oMax};0`}
              dur={`${s.dur}s`} repeatCount="indefinite" begin={`${s.beg}s`} />
          </circle>
        ))}
        {[14, 37, 61, 84].map((x, i) => (
          <line key={i} x1={`${x}%`} y1="0" x2={`${x + 9}%`} y2="100%"
            stroke="#10B981" strokeWidth="0.4" strokeOpacity="0">
            <animate attributeName="stroke-opacity" values="0;0.05;0.05;0"
              keyTimes="0;0.25;0.75;1" dur={`${14 + i * 6}s`}
              repeatCount="indefinite" begin={`${i * 4}s`} />
          </line>
        ))}
      </svg>
    </div>
  )
}

// ── Section ambient glow + drifting dots ─────────────────────────────────────
function SectionGlow({
  c1 = '#10B981',
  c2 = '#7C3AED',
  flip = false,
  seed = 0,
}: {
  c1?: string
  c2?: string
  flip?: boolean
  seed?: number
}) {
  const W = 1400, H = 600
  const dots = Array.from({ length: 16 }, (_, i) => {
    const s = (seed * 97 + i * 73 + 11)
    return {
      cx: 80  + (s * 73  % (W - 160)),
      cy: 40  + (s * 41  % (H - 80)),
      mx: (s * 31 + 7)  % 110 - 55,
      my: (s * 17 + 13) % 80  - 40,
      r: 1.4 + (i % 4) * 0.55,
      c: i % 2 === 0 ? c1 : c2,
      dur: 10 + (i % 6) * 2.5,
      beg: ((s * 7 + 3) % 10) * 0.75,
      oMax: (0.18 + (i % 4) * 0.09).toFixed(2),
    }
  })

  const l1side = flip ? 'right' : 'left'
  const l2side = flip ? 'left'  : 'right'
  const l1x    = flip ? '90%'   : '10%'
  const l2x    = flip ? '10%'   : '90%'

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Lamp 1 — corner source, primary colour */}
      <div style={{
        position: 'absolute',
        [l1side]: '-8%', top: '-18%',
        width: '60%', height: '85%',
        background: `radial-gradient(ellipse at ${l1x} 0%, ${c1}1f 0%, ${c1}09 36%, transparent 72%)`,
        borderRadius: '50%',
      }} />
      {/* Lamp 2 — opposite corner, secondary colour */}
      <div style={{
        position: 'absolute',
        [l2side]: '-8%', bottom: '-18%',
        width: '58%', height: '80%',
        background: `radial-gradient(ellipse at ${l2x} 100%, ${c2}1a 0%, ${c2}07 36%, transparent 70%)`,
        borderRadius: '50%',
      }} />
      {/* Accent — soft centre-top wash */}
      <div style={{
        position: 'absolute',
        left: '15%', top: '-6%',
        width: '70%', height: '48%',
        background: `radial-gradient(ellipse at 50% 0%, ${c1}0d 0%, transparent 65%)`,
      }} />

      {/* Drifting dots */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {dots.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.c} opacity="0">
            <animate attributeName="cx"
              values={`${d.cx};${d.cx + d.mx};${d.cx - d.mx * 0.35};${d.cx}`}
              keyTimes="0;0.38;0.72;1"
              dur={`${d.dur}s`} repeatCount="indefinite" begin={`${d.beg}s`} />
            <animate attributeName="cy"
              values={`${d.cy};${d.cy + d.my};${d.cy - d.my * 0.5};${d.cy}`}
              keyTimes="0;0.38;0.72;1"
              dur={`${d.dur}s`} repeatCount="indefinite" begin={`${d.beg}s`} />
            <animate attributeName="opacity"
              values={`0;${d.oMax};${d.oMax};0`}
              keyTimes="0;0.18;0.82;1"
              dur={`${d.dur}s`} repeatCount="indefinite" begin={`${d.beg}s`} />
          </circle>
        ))}
      </svg>
    </div>
  )
}

// ── Decorative SVG components ─────────────────────────────────────────────────
function FloatingParticles() {
  const P = [
    { l: '8%',  t: '22%', s: 3,   c: '#10B981', dk: 'drift1', dur: 12, del: 0   },
    { l: '15%', t: '68%', s: 4,   c: '#7C3AED', dk: 'drift2', dur: 16, del: 1.5 },
    { l: '82%', t: '15%', s: 3,   c: '#0EA5E9', dk: 'drift3', dur: 14, del: 3   },
    { l: '90%', t: '55%', s: 4,   c: '#10B981', dk: 'drift4', dur: 18, del: 0.8 },
    { l: '26%', t: '45%', s: 2,   c: '#7C3AED', dk: 'drift1', dur: 10, del: 4   },
    { l: '68%', t: '78%', s: 3,   c: '#0EA5E9', dk: 'drift2', dur: 15, del: 2   },
    { l: '50%', t: '30%', s: 2.5, c: '#10B981', dk: 'drift3', dur: 11, del: 6   },
    { l: '35%', t: '85%', s: 3,   c: '#7C3AED', dk: 'drift4', dur: 13, del: 1   },
    { l: '88%', t: '38%', s: 2,   c: '#0EA5E9', dk: 'drift1', dur: 9,  del: 5   },
    { l: '60%', t: '60%', s: 3.5, c: '#10B981', dk: 'drift2', dur: 17, del: 2.5 },
    { l: '5%',  t: '88%', s: 2.5, c: '#0EA5E9', dk: 'drift3', dur: 14, del: 3.5 },
    { l: '45%', t: '10%', s: 3,   c: '#7C3AED', dk: 'drift4', dur: 12, del: 7   },
    { l: '73%', t: '42%', s: 2,   c: '#10B981', dk: 'drift1', dur: 19, del: 4.5 },
    { l: '20%', t: '92%', s: 3,   c: '#0EA5E9', dk: 'drift2', dur: 8,  del: 1.2 },
    { l: '55%', t: '72%', s: 1.5, c: '#7C3AED', dk: 'drift3', dur: 20, del: 9   },
  ]
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {P.map((p, i) => (
        <div key={i} className="particle" style={{
          left: p.l, top: p.t,
          width: p.s + 'px', height: p.s + 'px',
          backgroundColor: p.c,
          animationName: `${p.dk}, fadeParticle`,
          animationDuration: `${p.dur}s, ${p.dur * 0.9}s`,
          animationDelay: `${p.del}s, ${p.del}s`,
        }} />
      ))}
    </div>
  )
}

function WaveDivider({ flip = false }: { flip?: boolean }) {
  const raw = useId()
  const uid = 'w' + raw.replace(/[^a-z0-9]/gi, '')
  return (
    <div style={{ lineHeight: 0, overflow: 'hidden', transform: flip ? 'scaleY(-1)' : undefined }} aria-hidden="true">
      <svg viewBox="0 0 1440 64" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 64 }}>
        <defs>
          <linearGradient id={`${uid}f`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#10B981" stopOpacity="0.22" />
            <stop offset="48%"  stopColor="#7C3AED" stopOpacity="0.17" />
            <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.22" />
          </linearGradient>
          <linearGradient id={`${uid}s`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#10B981" stopOpacity="0.55" />
            <stop offset="48%"  stopColor="#7C3AED" stopOpacity="0.40" />
            <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.55" />
          </linearGradient>
          <filter id={`${uid}g`} x="-10%" y="-80%" width="120%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {/* Filled body */}
        <path
          d="M0,32 C200,58 480,6 720,30 C960,54 1240,8 1440,32 L1440,64 L0,64Z"
          fill={`url(#${uid}f)`}
        />
        {/* Glowing crest */}
        <path
          d="M0,32 C200,58 480,6 720,30 C960,54 1240,8 1440,32"
          fill="none"
          stroke={`url(#${uid}s)`}
          strokeWidth="1.5"
          filter={`url(#${uid}g)`}
        />
      </svg>
    </div>
  )
}

function OrbitSVG() {
  return (
    <svg viewBox="-150 -150 300 300" className="pointer-events-none absolute inset-0 w-full h-full opacity-25" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <circle cx="0" cy="0" r="55"  fill="none" stroke="#10B981" strokeWidth="0.8" strokeDasharray="3 6" />
      <circle cx="0" cy="0" r="88"  fill="none" stroke="#7C3AED" strokeWidth="0.8" strokeDasharray="2 8" />
      <circle cx="0" cy="0" r="122" fill="none" stroke="#0EA5E9" strokeWidth="0.8" strokeDasharray="2 10" />
      <circle r="3.5" fill="#10B981">
        <animateMotion dur="5s" repeatCount="indefinite" path="M0,0 m-55,0 a55,55 0 1,0 110,0 a55,55 0 1,0-110,0"/>
      </circle>
      <circle r="2.5" fill="#10B981" fillOpacity="0.6">
        <animateMotion dur="5s" repeatCount="indefinite" begin="2.5s" path="M0,0 m-55,0 a55,55 0 1,0 110,0 a55,55 0 1,0-110,0"/>
      </circle>
      <circle r="3" fill="#7C3AED">
        <animateMotion dur="8s" repeatCount="indefinite" path="M0,0 m-88,0 a88,88 0 1,0 176,0 a88,88 0 1,0-176,0"/>
      </circle>
      <circle r="2" fill="#7C3AED" fillOpacity="0.5">
        <animateMotion dur="8s" repeatCount="indefinite" begin="4s" path="M0,0 m-88,0 a88,88 0 1,0 176,0 a88,88 0 1,0-176,0"/>
      </circle>
      <circle r="2.5" fill="#0EA5E9">
        <animateMotion dur="13s" repeatCount="indefinite" path="M0,0 m-122,0 a122,122 0 1,0 244,0 a122,122 0 1,0-244,0"/>
      </circle>
      <circle r="2" fill="#0EA5E9" fillOpacity="0.5">
        <animateMotion dur="13s" repeatCount="indefinite" begin="6.5s" path="M0,0 m-122,0 a122,122 0 1,0 244,0 a122,122 0 1,0-244,0"/>
      </circle>
    </svg>
  )
}

function CircuitLines() {
  const tracks = [
    { y: 80,  c: '#10B981', dur: 7,  begin: 0   },
    { y: 200, c: '#7C3AED', dur: 9,  begin: 1.5 },
    { y: 320, c: '#0EA5E9', dur: 6,  begin: 3   },
    { y: 440, c: '#10B981', dur: 11, begin: 2.2 },
  ]
  const nodes = [120, 400, 680]
  return (
    <svg className="pointer-events-none absolute inset-0 w-full h-full" viewBox="0 0 800 520"
      preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={{ opacity: 0.07 }}>
      {tracks.map((t, i) => (
        <g key={i}>
          <line x1="0" y1={t.y} x2="800" y2={t.y} stroke={t.c} strokeWidth="1" />
          <circle r="3" fill={t.c}>
            <animateMotion dur={`${t.dur}s`} repeatCount="indefinite" begin={`${t.begin}s`} path={`M0,${t.y} L800,${t.y}`} />
            <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.05;0.95;1" dur={`${t.dur}s`} repeatCount="indefinite" begin={`${t.begin}s`} />
          </circle>
          <circle r="2" fill={t.c} fillOpacity="0.5">
            <animateMotion dur={`${t.dur}s`} repeatCount="indefinite" begin={`${t.begin + t.dur * 0.5}s`} path={`M0,${t.y} L800,${t.y}`} />
            <animate attributeName="opacity" values="0;0.7;0.7;0" keyTimes="0;0.05;0.95;1" dur={`${t.dur}s`} repeatCount="indefinite" begin={`${t.begin + t.dur * 0.5}s`} />
          </circle>
        </g>
      ))}
      {nodes.map((x, i) => (
        <g key={i}>
          <line x1={x} y1="0" x2={x} y2="520" stroke="#10B981" strokeWidth="0.5" />
          {tracks.map((t) => (
            <circle key={t.y} cx={x} cy={t.y} r="3" fill="#020C18" stroke="#10B981" strokeWidth="1">
              <animate attributeName="stroke-opacity" values="0.3;1;0.3" dur="3.5s" repeatCount="indefinite" begin={`${(x + t.y) * 0.003}s`} />
            </circle>
          ))}
        </g>
      ))}
    </svg>
  )
}

// ── Sections ──────────────────────────────────────────────────────────────────
function Navbar({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <header className={clsx(
      'fixed top-0 right-0 left-0 z-50 transition-all duration-300',
      scrolled ? 'bg-[#020C18]/90 backdrop-blur-md border-b border-white/5' : 'bg-transparent',
    )}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-xl font-extrabold tracking-tight text-white">
          <span className="text-emerald-400">ni</span>vo
        </Link>
        <nav className="flex items-center gap-2">
          {isLoggedIn ? (
            <Link to="/chat"
              className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors">
              رفتن به چت ←
            </Link>
          ) : (
            <>
              <Link to="/login"
                className="rounded-xl px-5 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                ورود
              </Link>
              <Link to="/login"
                className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors">
                ثبت‌نام رایگان
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden px-6 pt-24 pb-16">
      {/* Background grid */}
      <div className="bg-grid pointer-events-none absolute inset-0" />
      {/* Floating particles */}
      <FloatingParticles />
      {/* Gradient blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-32 top-1/4 size-[500px] rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute -left-32 bottom-1/4 size-[400px] rounded-full bg-violet-600/8 blur-[100px]" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-16 lg:grid-cols-2">
        {/* Text side */}
        <div className="hero-text order-2 lg:order-1">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400">
            <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
            دستیار هوش مصنوعی فارسی
          </div>
          <h1 className="text-4xl font-extrabold leading-[1.15] text-white sm:text-5xl lg:text-6xl">
            همه چیز با
            <span className="relative mx-2 inline-block">
              <span className="relative z-10 text-emerald-400">یه سوال</span>
              <span className="absolute inset-x-0 bottom-1 h-3 -skew-x-3 bg-emerald-500/15 rounded" />
            </span>
            شروع می‌شه
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-400">
            نیوو مثل یه همکار باهوش کنارته — می‌پرسی، می‌فهمه، جواب می‌ده.
            از نوشتن ایمیل تا تحلیل داده، وقتت رو آزاد کن.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={isLoggedIn ? '/chat' : '/login'}
              className="btn-cta-glow inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-7 py-3.5 text-base font-semibold text-white hover:bg-emerald-400 active:scale-95 transition-all">
              شروع رایگان
              <svg viewBox="0 0 16 16" fill="none" className="size-4">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <a href="#features"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 px-7 py-3.5 text-base font-medium text-slate-300 hover:border-slate-500 hover:text-white transition-all">
              ببین چطوره
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-600">بدون نیاز به کارت بانکی · رایگان شروع کن</p>
        </div>

        {/* SVG side */}
        <div className="float-svg order-1 lg:order-2">
          <NeuralSVG />
        </div>
      </div>
    </section>
  )
}

function StatsBar() {
  const stats = [
    { label: 'کاربر فعال', value: 10000, suffix: '+' },
    { label: 'پیام پردازش‌شده', value: 500000, suffix: '+' },
    { label: 'درصد رضایت', value: 98, suffix: '٪' },
  ]
  return (
    <div className="relative overflow-hidden border-y border-white/5 bg-white/[0.02] px-6 py-10">
      <SectionGlow c1="#10B981" c2="#0EA5E9" seed={1} flip />
      <div className="mx-auto grid max-w-4xl grid-cols-3 gap-6 text-center relative">
        {stats.map(s => (
          <div key={s.label} data-anim="true">
            <div className="text-3xl font-extrabold text-white sm:text-4xl">
              <Counter to={s.value} suffix={s.suffix} />
            </div>
            <div className="mt-1 text-sm text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FeaturesSection() {
  const features = [
    {
      Icon: IconZap,
      title: 'پاسخ‌های فوری',
      desc: 'مدل‌های GPT-4o و GPT-4o mini — سریع‌ترین و دقیق‌ترین پاسخ به سوالاتت.',
      bg: 'from-emerald-500/10 to-transparent',
      border: 'border-emerald-500/15 hover:border-emerald-500/40',
    },
    {
      Icon: IconShield,
      title: 'حریم خصوصی کامل',
      desc: 'مکالمات روی سرورهای داخل ایران، رمزنگاری‌شده و کاملاً خصوصی.',
      bg: 'from-violet-600/10 to-transparent',
      border: 'border-violet-500/15 hover:border-violet-500/40',
    },
    {
      Icon: IconChat,
      title: 'فارسی‌خوان واقعی',
      desc: 'درک عمیق زبان فارسی، ادبیات و اصطلاحات — نه یه ترجمه دستوری ساده.',
      bg: 'from-cyan-500/10 to-transparent',
      border: 'border-cyan-500/15 hover:border-cyan-500/40',
    },
    {
      Icon: IconLayers,
      title: 'انتخاب آزاد مدل',
      desc: 'از رایگان تا طلایی — هر پلنی متناسب با نیاز و بودجه‌ات.',
      bg: 'from-emerald-500/10 to-transparent',
      border: 'border-emerald-500/15 hover:border-emerald-500/40',
    },
  ]

  return (
    <section id="features" className="px-6 py-24 relative overflow-hidden">
      <SectionGlow c1="#10B981" c2="#7C3AED" seed={2} />
      <CircuitLines />
      <div className="mx-auto max-w-6xl relative z-10">
        <div className="mb-14 text-center" data-anim="true">
          <p className="mb-2 text-sm font-medium text-emerald-400 uppercase tracking-widest">قابلیت‌ها</p>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">چرا نیوو؟</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div key={f.title} data-anim="true" data-d={String(i + 1)}
              className={clsx(
                'feature-card relative overflow-hidden rounded-2xl border bg-gradient-to-b p-6 transition-all duration-300',
                f.bg, f.border,
              )}>
              <div className="mb-4 size-12 rounded-xl bg-white/5 flex items-center justify-center">
                <f.Icon />
              </div>
              <h3 className="font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); io.disconnect() }
    }, { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const steps = [
    { n: '۱', title: 'ثبت‌نام رایگان', desc: 'فقط شماره موبایلت — بدون کارت بانکی.' },
    { n: '۲', title: 'سوالت رو بپرس', desc: 'هر چیزی — از کد نویسی تا خلاصه‌سازی متن.' },
    { n: '۳', title: 'نتیجه بگیر', desc: 'پاسخ دقیق، در ثانیه — نه ساعت.' },
  ]

  return (
    <section className="relative overflow-hidden px-6 py-24 bg-white/[0.01]">
      <SectionGlow c1="#7C3AED" c2="#0EA5E9" seed={3} flip />
      <div className="mx-auto max-w-5xl relative" ref={ref}>
        <div className="mb-14 text-center" data-anim="true">
          <p className="mb-2 text-sm font-medium text-violet-400 uppercase tracking-widest">نحوه شروع</p>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">سه قدم کافیه</h2>
        </div>

        {/* Steps with animated connector */}
        <div className="relative">
          {/* Connector SVG */}
          <div className="absolute top-8 right-[16.5%] left-[16.5%] hidden lg:block" aria-hidden="true">
            <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="h-px w-full">
              <line x1="0" y1="4" x2="100" y2="4"
                stroke="url(#connGrad)" strokeWidth="1"
                strokeDasharray="100" strokeLinecap="round"
                style={{
                  strokeDashoffset: inView ? 0 : 100,
                  transition: 'stroke-dashoffset 1.4s ease 0.4s',
                }}
              />
              <defs>
                <linearGradient id="connGrad" x1="0" x2="100%" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#10B981" />
                  <stop offset="0.5" stopColor="#7C3AED" />
                  <stop offset="1" stopColor="#0EA5E9" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.n} data-anim="true" data-d={String(i + 1)}
                className="flex flex-col items-center text-center lg:items-center">
                <div className={clsx(
                  'relative mb-5 flex size-16 items-center justify-center rounded-full text-xl font-extrabold',
                  'border-2 bg-[#020C18] transition-all duration-700',
                  inView
                    ? ['border-emerald-500 text-emerald-400', 'border-violet-500 text-violet-400', 'border-cyan-500 text-cyan-400'][i]
                    : 'border-slate-700 text-slate-600',
                )}>
                  {s.n}
                  {inView && (
                    <span className={clsx(
                      'absolute inset-0 rounded-full animate-ping opacity-20',
                      ['bg-emerald-400', 'bg-violet-400', 'bg-cyan-400'][i],
                    )} style={{ animationDelay: `${i * 0.3}s` }} />
                  )}
                </div>
                <h3 className="mb-2 font-bold text-white">{s.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ChatbotSection() {
  return (
    <section className="relative overflow-hidden px-6 py-24">
      <SectionGlow c1="#0EA5E9" c2="#10B981" seed={4} />
      <div className="mx-auto max-w-2xl text-center relative">
        <div data-anim="true">
          <p className="mb-2 text-sm font-medium text-cyan-400 uppercase tracking-widest">دستیار فروش</p>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            نمی‌دونی از کجا شروع کنی؟
          </h2>
          <p className="mt-3 text-slate-400">
            بذار نیوو با چند سوال کوتاه بهت بگه دقیقاً کجا می‌تونه کمکت کنه.
          </p>
        </div>
        <div className="mt-10" data-anim="true" data-d="2">
          <SalesChatbot source="homepage" />
        </div>
      </div>
    </section>
  )
}

function PricingSection() {
  const { data: plans, isLoading, isError } = usePlans()
  return (
    <section id="pricing" className="relative overflow-hidden px-6 py-24 bg-white/[0.01]">
      <SectionGlow c1="#7C3AED" c2="#10B981" seed={5} flip />
      <div className="mx-auto max-w-5xl relative">
        <div className="mb-14 text-center" data-anim="true">
          <p className="mb-2 text-sm font-medium text-emerald-400 uppercase tracking-widest">قیمت‌گذاری</p>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">پلنی که مناسبته</h2>
          <p className="mt-3 text-slate-400">از رایگان شروع کن، هر وقت خواستی ارتقا بده</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="size-9 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <svg viewBox="0 0 24 24" fill="none" className="size-10 text-slate-600">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-slate-500 text-sm">بارگذاری پلن‌ها ناموفق بود</p>
            <a href="#pricing" className="text-xs text-emerald-500 hover:underline">تلاش مجدد</a>
          </div>
        ) : !plans?.length ? (
          <p className="py-16 text-center text-slate-600 text-sm">پلنی تعریف نشده</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {plans?.map((plan, i) => {
              const isFree = plan.priceMonthly === 0
              const isPopular = i === 1
              return (
                <div key={plan.id} data-anim="true" data-d={String(i + 1)}
                  className={clsx(
                    'relative flex flex-col rounded-2xl border p-7 transition-all duration-300',
                    isPopular
                      ? 'border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_40px_rgba(16,185,129,0.1)]'
                      : 'border-white/8 bg-white/[0.02] hover:border-white/15',
                  )}>
                  {isPopular && (
                    <div className="absolute -top-3 right-1/2 translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-xs font-bold text-white">
                      محبوب‌ترین
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    <div className="mt-3 flex items-baseline gap-1">
                      {isFree ? (
                        <span className="text-4xl font-extrabold text-emerald-400">رایگان</span>
                      ) : (
                        <>
                          <span className="text-4xl font-extrabold text-white">
                            {(plan.priceMonthly / 10).toLocaleString('fa-IR')}
                          </span>
                          <span className="text-slate-500 text-sm">تومان/ماه</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ul className="mb-8 flex-1 space-y-3">
                    {[
                      `${plan.dailyFreeTokens.toLocaleString('fa-IR')} توکن رایگان روزانه`,
                      plan.monthlyTotalTokens > 0 ? `${(plan.monthlyTotalTokens / 1000).toLocaleString('fa-IR')}K توکن ماهانه` : null,
                      'پشتیبانی ۲۴/۷',
                    ].filter(Boolean).map(feat => (
                      <li key={feat} className="flex items-center gap-2.5 text-sm text-slate-300">
                        <svg viewBox="0 0 16 16" fill="none" className="size-4 shrink-0 text-emerald-500">
                          <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <Link to="/login"
                    className={clsx(
                      'block rounded-xl py-3 text-center text-sm font-semibold transition-all active:scale-95',
                      isPopular
                        ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                        : 'border border-white/15 text-slate-300 hover:border-white/30 hover:text-white',
                    )}>
                    {isFree ? 'شروع رایگان' : 'خرید پلن'}
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null)
  const faqs = [
    { q: 'پلن رایگان محدودیت زمانی داره؟', a: 'نه، پلن رایگان همیشگیه. روزانه توکن رایگان دریافت می‌کنی — تا ابد.' },
    { q: 'پرداخت چطور انجام می‌شه؟', a: 'از طریق درگاه زرین‌پال با کارت‌های بانکی ایرانی — امن و آنی.' },
    { q: 'می‌تونم پلنمو عوض کنم؟', a: 'بله. هر زمان می‌تونی پلنت رو ارتقا بدی، بلافاصله اعمال می‌شه.' },
    { q: 'داده‌هام کجا ذخیره می‌شن؟', a: 'روی سرورهای داخل ایران، رمزنگاری‌شده. مکالمات فقط مال توئه.' },
  ]
  return (
    <section className="relative overflow-hidden px-6 py-24">
      <SectionGlow c1="#0EA5E9" c2="#7C3AED" seed={6} />
      <div className="mx-auto max-w-2xl relative">
        <div className="mb-12 text-center" data-anim="true">
          <p className="mb-2 text-sm font-medium text-slate-400 uppercase tracking-widest">سوالات</p>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">سوالات متداول</h2>
        </div>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} data-anim="true" data-d={String(i % 3 + 1)}
              className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] transition-all duration-200 hover:border-white/12">
              <button onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-4 text-right text-sm font-medium text-slate-200 hover:text-white transition-colors">
                <span>{faq.q}</span>
                <svg viewBox="0 0 20 20" fill="none" className={clsx('size-4 shrink-0 text-slate-500 transition-transform duration-200', open === i && '-rotate-180')}>
                  <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div className={clsx(
                'overflow-hidden transition-all duration-300',
                open === i ? 'max-h-40' : 'max-h-0',
              )}>
                <p className="border-t border-white/5 px-6 pb-4 pt-3 text-sm leading-relaxed text-slate-400">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CtaSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="relative overflow-hidden px-6 py-24">
      <SectionGlow c1="#10B981" c2="#7C3AED" seed={7} flip />
      <div className="mx-auto max-w-3xl text-center relative" data-anim="true">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/10 to-transparent p-14">
          {/* Orbit animation */}
          <OrbitSVG />
          {/* Ambient glow */}
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 size-80 rounded-full bg-emerald-500/15 blur-[80px]" />
          <p className="relative mb-2 text-sm font-medium text-emerald-400 uppercase tracking-widest">شروع کن</p>
          <h2 className="relative text-3xl font-extrabold text-white sm:text-4xl">
            همین الان رایگان شروع کن
          </h2>
          <p className="relative mt-3 text-slate-400">
            بدون نیاز به کارت بانکی · در ۳۰ ثانیه آماده‌ای
          </p>
          <div className="relative mt-8">
            <Link to={isLoggedIn ? '/chat' : '/login'}
              className="btn-cta-glow inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-9 py-4 text-lg font-semibold text-white hover:bg-emerald-400 active:scale-95 transition-all">
              {isLoggedIn ? 'رفتن به چت' : 'شروع رایگان'}
              <svg viewBox="0 0 16 16" fill="none" className="size-4">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white/5 px-6 py-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 text-sm text-slate-600">
        <span>
          <span className="text-emerald-400/70 font-bold">ni</span>
          <span className="font-bold">vo</span>
          {' '}· دستیار هوش مصنوعی
        </span>
        <div className="flex gap-6">
          <a href="#pricing" className="hover:text-slate-400 transition-colors">قیمت‌ها</a>
          <Link to="/login" className="hover:text-slate-400 transition-colors">ورود</Link>
        </div>
      </div>
    </footer>
  )
}

// ── Root ─────────────────────────────────────────────────────────────────────
export function LandingPage() {
  useInViewObserver()
  const { data: me } = useMe()
  const isLoggedIn = !!me

  useEffect(() => {
    if (!window.location.hash) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [])

  return (
    <div className="relative min-h-screen bg-[#020C18] text-slate-100" dir="rtl">
      <GlobalBackground />
      <style>{`
        /* InView animations */
        [data-anim] {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        [data-anim].inview { opacity: 1; transform: translateY(0); }
        [data-anim][data-d="1"] { transition-delay: 0.08s; }
        [data-anim][data-d="2"] { transition-delay: 0.18s; }
        [data-anim][data-d="3"] { transition-delay: 0.28s; }
        [data-anim][data-d="4"] { transition-delay: 0.38s; }

        /* Hero text entrance */
        @keyframes heroIn {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-text > * { animation: heroIn 0.8s ease both; }
        .hero-text > *:nth-child(1) { animation-delay: 0.05s; }
        .hero-text > *:nth-child(2) { animation-delay: 0.18s; }
        .hero-text > *:nth-child(3) { animation-delay: 0.30s; }
        .hero-text > *:nth-child(4) { animation-delay: 0.42s; }
        .hero-text > *:nth-child(5) { animation-delay: 0.52s; }

        /* SVG float */
        @keyframes floatY {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-14px); }
        }
        .float-svg { animation: floatY 5s ease-in-out infinite; }

        /* CTA glow */
        @keyframes ctaGlow {
          0%, 100% { box-shadow: 0 0 18px rgba(16,185,129,0.35); }
          50%       { box-shadow: 0 0 35px rgba(16,185,129,0.65); }
        }
        .btn-cta-glow { animation: ctaGlow 2.5s ease-in-out infinite; }

        /* Background grid */
        .bg-grid {
          background-image:
            linear-gradient(rgba(16,185,129,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,0.035) 1px, transparent 1px);
          background-size: 48px 48px;
        }

        /* Feature card hover */
        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.3);
        }

        /* Nebula blobs */
        .nebula-blob { animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        @keyframes nebulaDrift1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(70px,-55px)} }
        @keyframes nebulaDrift2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-65px,70px)} }

        /* Floating particles */
        @keyframes drift1 { 0%,100%{transform:translate(0,0)} 33%{transform:translate(28px,-42px)} 66%{transform:translate(-12px,18px)} }
        @keyframes drift2 { 0%,100%{transform:translate(0,0)} 33%{transform:translate(-35px,28px)} 66%{transform:translate(22px,-14px)} }
        @keyframes drift3 { 0%,100%{transform:translate(0,0)} 33%{transform:translate(18px,38px)} 66%{transform:translate(-28px,-22px)} }
        @keyframes drift4 { 0%,100%{transform:translate(0,0)} 33%{transform:translate(-22px,-32px)} 66%{transform:translate(35px,12px)} }
        @keyframes fadeParticle { 0%,100%{opacity:0} 30%,70%{opacity:0.45} }
        .particle { position:absolute; border-radius:50%; animation-timing-function:ease-in-out; animation-iteration-count:infinite; }
      `}</style>

      <Navbar isLoggedIn={isLoggedIn} />
      <Hero isLoggedIn={isLoggedIn} />
      <StatsBar />
      <WaveDivider />
      <FeaturesSection />
      <WaveDivider flip />
      <HowItWorks />
      <WaveDivider />
      <ChatbotSection />
      <PricingSection />
      <WaveDivider flip />
      <FaqSection />
      <CtaSection isLoggedIn={isLoggedIn} />
      <Footer />
      <ExitIntentModal />
    </div>
  )
}
