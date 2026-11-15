import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, Line, OrbitControls, useGLTF } from '@react-three/drei'
import { AdditiveBlending, CanvasTexture, BufferGeometry, Float32BufferAttribute, SRGBColorSpace, MeshBasicMaterial, Box3, EdgesGeometry, MOUSE, TOUCH, Vector3 } from 'three'

const ROOM_URL = import.meta.env.BASE_URL + 'room-blender.glb'
const PIXEL_RATIO = 0.75

// World-space viewing directions: wall art faces into the room (-X),
// shelf frames face forward (+Z), and tabletop objects benefit from elevation.
const objectViews = {
  resume: { direction: [-0.5, 1, 0.2], fill: 0.55 },
  linkedin: { direction: [-1, 0.12, 0.08], fill: 0.48 },
  Monitor: { direction: [-1, 0.22, 0.18], fill: 0.56 },
  Chessboard: { direction: [-0.25, 0.35, 1], fill: 0.52 },
  Book: { direction: [-0.35, 1, 0.6], fill: 0.48 },
  Poster: { direction: [-1, 0.04, 0.08], fill: 0.64 },
  Poker: { direction: [0.08, 0.12, 1], fill: 0.56 },
  AWS: { direction: [0.08, 0.12, 1], fill: 0.56 },
  'VSA.001': { direction: [0.08, 0.12, 1], fill: 0.56 },
  Cap: { direction: [-1, 0.65, 0.3], fill: 0.48 },
  YorkRegion: { direction: [-1, 0, 0.03], fill: 0.58, offsetX: 0.10 },
  SMB: { direction: [-1, 0.04, 0.08], fill: 0.56 },
  'Port.001': { direction: [-1, 0.04, 0.08], fill: 0.58 },
  BoomBox: { direction: [-1, 0.18, 0.12], fill: 0.54 },
}

const projects = [
  { title: 'Skribble Park', image: 'skribble-park.png', link: 'https://github.com/JudeTruong/ScribblePark', description: "Skribble Park is a hackathon project where visitors could draw a plant or an animal. We used a neural network to identify their drawings and add them to a community park built in Three.js!" },
  { title: 'Night Bus Management System', image: 'night-bus.webp', imageScale: 0.88, imageOffsetY: -0.06, description: "Partnering with KW AccessAbility in Kitchener, I helped modernize their paper-based night bus system. We built an application to track vehicle metrics, plan routes, and help coordinate drivers." },
  { title: 'Cloud Autoscaling', image: 'cloud-autoscaling.png', description: "For my directed research project, I built and analyzed cloud autoscaling techniques in a trace-based simulation. I compared infrastructure costs and SLA violations to identify the most effective approaches." },
  { title: 'Accessibuddy', image: 'accessibuddy.ico', description: "Accessibuddy was my first hackathon project. It used the Google Maps API and Toronto’s open data to create an interactive map with route planning and points of interest, such as restrooms and public benches, to give senior citizens greater autonomy and independence when travelling." },
  { title: 'BlueCall', image: 'bluecall.png', description: "BlueCall is an AI-powered compliance workflow that uses automated calling, SMS upload links, dashboard filters, and admin review workflows to reduce manual spreadsheet tracking for WSIB subcontractors." },
]

const entries = [
  { objectName: 'resume', label: 'Resume', content: <p>Here’s my resume! Click the paper again to open the PDF.</p> },
  { objectName: 'linkedin', label: 'LinkedIn', content: <p>Check out my LinkedIn! Click the badge again to open my profile.</p> },
  {
    objectName: 'Chessboard', fallbackNames: ['ChessBoard', 'chessboard', 'Chess', 'chess'], label: 'Chess',
    content: <>
      <p className="chess-description">My dad taught me how to play chess when I was 10, and I’ve been playing ever since. Add me on Chess.com!</p>
      <a href="https://link.chess.com/friend/hFnie1" target="_blank" rel="noreferrer">Add me on Chess.com</a>
    </>,
  },
  { objectName: 'Monitor', label: 'Projects' },
  {
    objectName: 'Book', label: 'Currently Reading',
    content: <p>I’m currently reading The Committed by Viet Thanh Nguyen. I’m looking forward to a sequel, and I’d love recommendations for what to read next!</p>,
  },
  {
    objectName: 'Poster', label: 'TRON: Legacy',
    content: <p>TRON: Legacy is my favourite movie of all time. My dad showed it to me when I was 14, and it’s the reason I wanted to study computer science!</p>,
  },
  {
    objectName: 'Poker', label: 'Laurier Poker Club',
    content: <p>I was never that good at poker, but in spite of that, I’m president of the Laurier Poker Club! We regularly host tournaments and collaborate with other schools through the Ontario University Poker League.</p>,
  },
  {
    objectName: 'AWS', label: 'AWS Student Builder Group',
    content: <p>I’ve always been interested in cloud computing, so when I heard an AWS Student Builder Group was coming to Laurier, I applied immediately. Now I’m VP of Events and help educate students about AWS and its applications through workshops, speaker panels, networking events, and hackathons!</p>,
  },
  {
    objectName: 'Cap', label: 'Education',
    content: <p>I’m pursuing a Bachelor of Science in Computer Science at Wilfrid Laurier University and expect to graduate in April 2027.</p>,
  },
  {
    objectName: 'YorkRegion', label: 'York Region',
    content: <p>As a Technical Support Assistant at York Region, I used Python and Power Automate to cut down on manual work and built Power BI dashboards to help the IT team report on support tickets. I also worked with teams across the organization to migrate legacy content, update workflows, and track IT equipment from inventory to disposal. I helped maintain internal systems and devices and performed network security testing.</p>,
  },
  {
    objectName: 'SMB', label: 'SMB CIO',
    content: <p>My first internship was as an Application Analyst at SMB CIO. I supported client applications in Zoho CRM and Zoho Creator and wrote Deluge scripts to automate repetitive tasks. I worked with clients and internal teams to turn business requirements into application updates and resolve issues. I also mapped and cleaned data for migrations and wrote documentation for internal tools and client-facing systems.</p>,
  },
  {
    objectName: 'BoomBox', label: 'Music',
    content: <>
      <p>I listen to so much random music. Feel free to suggest anything I’m missing out on!</p>
      <p>Playing: 8-bit Gaming Pixel Chill Lofi — Purple Waves Synthwave Music</p>
      <p><a href="https://open.spotify.com/user/fdapedrkx50whyy3bg86xhqt6" target="_blank" rel="noreferrer">Listen to my Spotify</a></p>
    </>,
  },
  {
    objectName: 'VSA.001', fallbackNames: ['VSA'], label: 'Laurier VSA',
    content: <p>I joined the Laurier Vietnamese Student Association during my first month at university. I’ve been with the club every year since, and now I’m its president. Each year, we organize events to promote Vietnamese culture and connect students on campus. This club has given me amazing friends and mentors and helped me build my collaboration and leadership skills.</p>,
  },
  {
    objectName: 'Port.001', fallbackNames: ['Port'], label: 'PORT',
    content: <p>I started Port Consulting last summer to put my experience to use as a freelancer. For my first project, I built a check-in system for a local fitness studio that matches visitors to member records, flags unmatched names or payment issues for staff review, and provides a dashboard to track metrics. I also worked with the owner to identify ways to improve member follow-up and retention. I currently have a few projects on the go, but I’m always looking for more work. Feel free to reach out!</p>,
  },
]

const categories = [
  { label: 'Projects', objects: ['Monitor'] },
  { label: 'Experience', objects: ['YorkRegion', 'SMB', 'Port.001'] },
  { label: 'Extracurriculars', objects: ['VSA.001', 'AWS', 'Poker'] },
  { label: 'About', objects: ['Book', 'Cap'] },
  { label: 'Interests', objects: ['Poster', 'BoomBox', 'Chessboard'] },
]


const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Bitcount+Prop+Single:wght@700&family=IBM+Plex+Mono:wght@400;600&display=swap');

  .portfolio-room {
    --ink: #eff4ff;
    --accent: #ffd477;
    --pixel-font: 'Bitcount Prop Single', 'Courier New', monospace;
    position: relative;
    isolation: isolate;
    width: 100%;
    height: 100dvh;
    overflow: hidden;
    color: var(--ink);
    background: linear-gradient(#76b6ec, #b9dbf6 56%, #eaf5ff);
  }
  .portfolio-room[data-night='true'] { background: linear-gradient(#080e23, #19223c 60%, #30334c); }
  .portfolio-room[data-night='true'] .room-clouds { opacity: 0.15; }
  .room-clouds {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .room-clouds::before, .room-clouds::after {
    content: '';
    position: absolute;
    inset: 0;
    width: calc(100% + 1000px);
    background-image:
      radial-gradient(ellipse 140px 36px at 180px 30%, #ffffffa8, transparent 75%),
      radial-gradient(ellipse 210px 48px at 580px 65%, #ffffff8c, transparent 75%),
      radial-gradient(ellipse 120px 30px at 880px 44%, #ffffffad, transparent 75%);
    background-size: 1000px 100%;
    background-repeat: repeat-x;
    animation: cloud-drift 150s linear infinite;
    will-change: transform;
  }
  .room-clouds::after {
    opacity: 0.55;
    top: 18%;
    animation-duration: 230s;
    animation-delay: -80s;
  }
  @keyframes cloud-drift {
    from { transform: translateX(-1000px); }
    to { transform: translateX(0); }
  }
  .room-controls {
    position: absolute; bottom: 16px; left: 16px; z-index: 10;
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    font: 12px/1.5 'IBM Plex Mono', monospace;
  }
  .room-controls span { color: #111a31; background: #ffffffcc; padding: 6px 10px; }
  .desk-link-tooltip {
    white-space: nowrap; pointer-events: none;
    padding: 10px 14px; color: #ffd477; background: #111a31;
    border: 2px solid #9bb3d9; box-shadow: 4px 4px 0 #070c18;
    font: 700 1rem/1.3 var(--pixel-font);
  }
  .retro-stage { position: absolute; inset: 0; touch-action: none; }
  .room-ui { position: absolute; z-index: 30; pointer-events: none; }
  .room-ui .retro-stage, .room-ui button, .room-ui a, .room-ui .retro-panel { pointer-events: auto; }
  .retro-stage canvas { image-rendering: pixelated; }
  .portfolio-room[data-projects="true"] canvas { image-rendering: auto; }
  .retro-menu {
    position: absolute;
    z-index: 10;
    top: 16px;
    left: 16px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    pointer-events: none;
  }
  .retro-button, .retro-panel {
    box-sizing: border-box;
    color: var(--ink);
    background: #111a31;
    border: 2px solid #9bb3d9;
    border-radius: 0;
    box-shadow: inset 0 0 0 2px #263956, 4px 4px 0 #070c18;
  }
  .retro-button {
    pointer-events: auto;
    cursor: pointer;
    font: 700 1rem/1 var(--pixel-font);
  }
  .retro-button { padding: 9px 12px; text-transform: uppercase; }
  .retro-button:hover, .retro-button[aria-pressed='true'] {
    background: #233655;
    border-color: var(--accent);
    color: var(--accent);
  }
  .retro-button:focus-visible, .retro-panel a:focus-visible {
    outline: 2px dashed var(--accent);
    outline-offset: 4px;
  }
  .retro-arrow {
    position: absolute;
    z-index: 12;
    top: 50%;
    transform: translateY(-50%);
    width: 56px;
    height: 62px;
    padding: 0;
    font: 700 2rem/1 monospace;
  }
  .retro-prev { left: 16px; }
  .retro-next { right: 16px; }
  .retro-panel .retro-counter {
    color: var(--accent);
    margin: 8px 0 0;
  }

  .retro-panel {
    position: absolute;
    z-index: 11;
    top: 76px;
    right: 84px;
    width: min(350px, calc(100% - 32px));
    max-height: calc(100% - 92px);
    overflow-y: auto;
    padding: 16px;
    text-align: left;
    font: 400 0.875rem/1.6 'IBM Plex Mono', monospace;
    animation: panel-open 140ms steps(3, end) both;
  }
  @keyframes panel-open {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .retro-panel header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding-bottom: 12px;
    border-bottom: 2px solid #526b93;
  }
  .retro-panel h2 {
    margin: 0;
    color: var(--accent);
    font: 700 1.5rem/1 var(--pixel-font);
    text-transform: uppercase;
  }
  .chess-description { min-height: 3.2em; margin: 16px 0; }
  .retro-panel h3 { font: 700 1.2rem/1.2 var(--pixel-font); }
  .retro-panel a { color: var(--accent); text-underline-offset: 3px; }
  @media (max-width: 760px) {
    .retro-menu { right: 16px; flex-direction: row; flex-wrap: wrap; }
    .retro-panel { top: auto; right: 16px; bottom: 16px; max-height: 36%; }
    .retro-arrow { width: 44px; height: 50px; }
    .room-controls { bottom: auto; top: 135px; }
    .room-controls span { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .room-clouds::before, .room-clouds::after, .retro-panel { animation: none; }
  }
`

function ignoreRaycast() {}

function Outline({ points, active, phase, reducedMotion }) {
  const line = useRef(null)

  useFrame(({ clock }) => {
    if (!line.current) return

    const time = Math.floor(clock.elapsedTime * 8) / 8
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.5 + phase)
    line.current.material.opacity = active ? 1 : reducedMotion ? 0.8 : 0.68 + pulse * 0.2
  })

  return (
    <Line
      ref={line}
      points={points}
      segments
      color="white"
      lineWidth={active ? 6 : 2.5}
      transparent
      opacity={active ? 1 : 0.8}
      depthWrite={false}
      polygonOffset
      polygonOffsetFactor={-1}
      polygonOffsetUnits={-2}
      toneMapped={false}
      raycast={ignoreRaycast}
      renderOrder={2}
    />
  )
}

function ProjectScreen({ scene, project }) {
  const gl = useThree((state) => state.gl)
  const geometry = useMemo(() => {
    const monitor = scene.getObjectByName('Monitor')
    if (!monitor) return null
    monitor.updateWorldMatrix(true, false)
    // Corners of the inset display in this exported monitor's local coordinates.
    const corners = [[2.34, 52.639, 27.814], [2.34, 52.639, -27.814],
      [7.97, 21.7, 27.814], [7.97, 21.7, -27.814]]
    const points = corners.flatMap((point) => new Vector3(...point).applyMatrix4(monitor.matrixWorld).toArray())
    const result = new BufferGeometry()
    result.setAttribute('position', new Float32BufferAttribute(points, 3))
    result.setAttribute('uv', new Float32BufferAttribute([0, 1, 1, 1, 0, 0, 1, 0], 2))
    result.setIndex([0, 2, 1, 2, 3, 1])
    result.computeVertexNormals()
    return result
  }, [scene])
  const [texture, setTexture] = useState(null)
  useEffect(() => {
    let cancelled = false
    let map
    setTexture(null)
    const image = new Image()
    image.onload = () => {
      if (cancelled) return
      const canvas = document.createElement('canvas')
      canvas.width = Math.min(4096, gl.capabilities.maxTextureSize, Math.max(2048, image.naturalWidth));
      canvas.height = Math.round(canvas.width * 9 / 16)
      const context = canvas.getContext('2d')
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      const scale = Math.min(canvas.width / image.width, canvas.height / image.height) * (project.imageScale ?? 1)
      const width = image.width * scale, height = image.height * scale
      context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2 + canvas.height * (project.imageOffsetY ?? 0), width, height)
      map = new CanvasTexture(canvas)
      map.colorSpace = SRGBColorSpace
      map.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy())
      setTexture(map)
    }
    image.src = import.meta.env.BASE_URL + 'projects/' + project.image
    return () => { cancelled = true; map?.dispose() }
  }, [project, gl])
  useEffect(() => () => geometry?.dispose(), [geometry])
  if (!geometry || !texture) return null
  return <mesh geometry={geometry} raycast={ignoreRaycast}>
    <meshBasicMaterial map={texture} toneMapped={false} polygonOffset polygonOffsetFactor={-2} />
  </mesh>
}

function LampLighting({ scene, night }) {
  const glowMap = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const context = canvas.getContext('2d')
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255,235,185,0.95)')
    gradient.addColorStop(0.18, 'rgba(255,198,110,0.65)')
    gradient.addColorStop(0.5, 'rgba(255,160,65,0.18)')
    gradient.addColorStop(1, 'rgba(255,150,60,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 64, 64)
    return new CanvasTexture(canvas)
  }, [])
  useEffect(() => () => glowMap.dispose(), [glowMap])
  const bulbs = useMemo(() => ['NighstandBulb', 'LampBulb'].flatMap((name) => {
    const object = scene.getObjectByName(name)
    if (!object) return []
    return [{ name, object, position: new Box3().setFromObject(object).getCenter(new Vector3()) }]
  }), [scene])
  const roomBounds = useMemo(() => new Box3().setFromObject(scene), [scene])
  const center = roomBounds.getCenter(new Vector3())

  useEffect(() => {
    const originals = []
    bulbs.forEach(({ object }) => object.traverse((mesh) => {
      if (!mesh.isMesh) return
      const original = mesh.material
      const makeGlow = (material) => {
        const copy = night
          ? new MeshBasicMaterial({ color: '#fff1c9', toneMapped: false })
          : material.clone()
        if (night) copy.color.multiplyScalar(0.25)
        return copy
      }
      mesh.material = Array.isArray(original) ? original.map(makeGlow) : makeGlow(original)
      originals.push([mesh, original])
    }))
    return () => originals.forEach(([mesh, original]) => {
      const copies = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      copies.forEach((material) => material.dispose())
      mesh.material = original
    })
  }, [bulbs, night])

  return <>
    {bulbs.map(({ name, position }) => (
      <group key={name} position={position}>
        <pointLight color="#ffbe78" intensity={night ? 162.5 : 0} distance={55} decay={2} />
        {night && <sprite scale={name === 'LampBulb' ? [5, 5, 1] : [2.8, 2.8, 1]} raycast={ignoreRaycast} renderOrder={3}>
          <spriteMaterial map={glowMap} transparent opacity={0.1875} blending={AdditiveBlending}
            depthWrite={false} depthTest={false} toneMapped={false} />
        </sprite>}
      </group>
    ))}
    <pointLight position={[center.x, roomBounds.max.y - 1, center.z]}
      color="#ffd19a" intensity={night ? 1100 : 0} distance={85} decay={2} />
  </>
}

function MusicParticles({ scene, playing, reducedMotion }) {
  const group = useRef(null)
  const position = useMemo(() => {
    const box = scene.getObjectByName('BoomBox')
    return box ? new Box3().setFromObject(box).getCenter(new Vector3()) : new Vector3()
  }, [scene])
  useFrame(({ clock }) => {
    if (!group.current || !playing || reducedMotion) return
    group.current.children.forEach((particle, index) => {
      const progress = (clock.elapsedTime * 0.25 + index / 16) % 1
      const phase = index * 2.4
      particle.position.set(-1.5 + Math.sin(phase + progress * 4) * 1.5,
        1 + progress * 6, Math.cos(phase + progress * 3) * 2)
      const pulse = 0.7 + 0.3 * Math.sin(clock.elapsedTime * Math.PI * 4)
      particle.scale.setScalar((0.7 + Math.sin(progress * Math.PI) * 0.5) * pulse)
      particle.material.opacity = Math.sin(progress * Math.PI) * 0.8
    })
  })
  return <group ref={group} position={position} visible={playing && !reducedMotion}>
    {Array.from({ length: 16 }, (_, index) => <mesh key={index} raycast={ignoreRaycast}>
      <sphereGeometry args={[0.12, 6, 4]} />
      <meshBasicMaterial color={index % 2 ? '#ffd477' : '#8de9ff'} transparent depthWrite={false} toneMapped={false} />
    </mesh>)}
  </group>
}

function ContactPhone() {
  const [hovered, setHovered] = useState(false)
  const canvas = useThree((state) => state.gl.domElement)
  const texture = useMemo(() => {
    const surface = document.createElement('canvas')
    surface.width = 384; surface.height = 640
    const ctx = surface.getContext('2d')
    ctx.fillStyle = '#18263e'; ctx.fillRect(0, 0, 384, 640)
    ctx.fillStyle = '#a7edda'; ctx.font = 'bold 43px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('Contact', 192, 325); ctx.fillText('me!', 192, 380)
    ctx.strokeStyle = '#a7edda'; ctx.lineWidth = 7
    ctx.strokeRect(112, 160, 160, 100)
    ctx.beginPath(); ctx.moveTo(112, 160); ctx.lineTo(192, 220); ctx.lineTo(272, 160); ctx.stroke()
    ctx.fillStyle = '#e9f1ff'; ctx.font = '24px sans-serif'; ctx.fillText('Let’s connect', 192, 460)
    const map = new CanvasTexture(surface); map.colorSpace = SRGBColorSpace
    return map
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  useEffect(() => {
    if (!hovered) return
    const previous = canvas.style.cursor; canvas.style.cursor = 'pointer'
    return () => { canvas.style.cursor = previous }
  }, [hovered, canvas])
  return <group position={[12.8, 6.94, 13.65]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
    onPointerMove={(event) => { event.stopPropagation(); setHovered(true) }}
    onPointerOut={() => setHovered(false)}
    onClick={(event) => { event.stopPropagation(); if (event.delta < 5) window.location.href = 'mailto:judenttruong@gmail.com' }}>
    <mesh><boxGeometry args={[1.65, 2.9, 0.22]} /><meshStandardMaterial color="#121722" /></mesh>
    <mesh position={[0, 0, 0.12]}>
      <planeGeometry args={[1.4, 2.5]} /><meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
    <Line points={[[-0.825,-1.45,0.13],[0.825,-1.45,0.13],[0.825,1.45,0.13],[-0.825,1.45,0.13],[-0.825,-1.45,0.13]]}
      color="white" lineWidth={hovered ? 5 : 2} raycast={ignoreRaycast} toneMapped={false} />
    {hovered && <Html center position={[0, 2.4, 0]} style={{ pointerEvents: 'none' }}>
      <div className="desk-link-tooltip">Contact me!</div>
    </Html>}
  </group>
}

function DeskLinks({ activeEntry, onSelect, canOpen }) {
  const [hovered, setHovered] = useState(null)
  const canvas = useThree((state) => state.gl.domElement)
  const textures = useMemo(() => {
    function create(kind) {
      const canvas = document.createElement('canvas')
      canvas.width = 512; canvas.height = kind === 'resume' ? 680 : 320
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = kind === 'resume' ? '#fffdf4' : '#0a66c2'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = kind === 'resume' ? '#17263a' : '#ffffff'
      if (kind === 'resume') {
        ctx.font = 'bold 43px sans-serif'; ctx.fillText('JUDE TRUONG', 35, 76)
        ctx.font = '26px sans-serif'; ctx.fillText('RESUME', 35, 120)
        ctx.fillRect(35, 147, 442, 4)
        for (let section = 0; section < 3; section++) {
          ctx.fillStyle = '#17263a'; ctx.fillRect(35, 185 + section * 130, 165, 12)
          ctx.fillStyle = '#9ca7b4'
          for (let row = 0; row < 4; row++) ctx.fillRect(35, 215 + section * 130 + row * 19, row === 3 ? 290 : 430, 6)
        }
        ctx.fillStyle = '#17263a'; ctx.font = '24px sans-serif'; ctx.fillText('Click to open PDF', 35, 638)
      } else {
        ctx.font = 'bold 124px sans-serif'; ctx.fillText('in', 35, 138)
        ctx.font = 'bold 39px sans-serif'; ctx.fillText('Jude Truong', 35, 210)
        ctx.font = '27px sans-serif'; ctx.fillText('Connect on LinkedIn', 35, 267)
      }
      const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace
      return texture
    }
    return { resume: create('resume'), linkedin: create('linkedin') }
  }, [])
  useEffect(() => () => Object.values(textures).forEach((texture) => texture.dispose()), [textures])
  useEffect(() => {
    if (!hovered) return
    const previous = canvas.style.cursor; canvas.style.cursor = 'pointer'
    return () => { canvas.style.cursor = previous }
  }, [hovered, canvas])
  const links = [
    { id: 'resume', position: [14.5, 6.84, -1.25], rotation: [-Math.PI / 2, 0, -Math.PI / 2], size: [3, 4], url: import.meta.env.BASE_URL + 'JudeTruongResume.pdf' },
    { id: 'linkedin', position: [16.8, 8.15, 13.7], rotation: [0, -Math.PI / 2, 0], size: [2.6, 1.65], url: 'https://www.linkedin.com/in/jude-truong-4a7b182a1/' },
  ]
  return <>
    {links.map((link) => <mesh key={link.id} position={link.position} rotation={link.rotation}
      onPointerMove={(event) => { event.stopPropagation(); setHovered(link.id) }}
      onPointerOut={() => setHovered(null)}
      onClick={(event) => {
        event.stopPropagation()
        if (event.delta >= 5) return
        if (activeEntry?.objectName === link.id) {
          if (canOpen()) window.open(link.url, '_blank', 'noopener,noreferrer')
        } else onSelect(entries.find((entry) => entry.objectName === link.id))
      }}>
      <planeGeometry args={link.size} />
      <meshBasicMaterial map={textures[link.id]} color={hovered === link.id ? '#ffe3a4' : '#ffffff'} toneMapped={false} />
      <Line points={[
        [-link.size[0] / 2, -link.size[1] / 2, 0.02],
        [link.size[0] / 2, -link.size[1] / 2, 0.02],
        [link.size[0] / 2, link.size[1] / 2, 0.02],
        [-link.size[0] / 2, link.size[1] / 2, 0.02],
        [-link.size[0] / 2, -link.size[1] / 2, 0.02],
      ]} color="white" lineWidth={hovered === link.id ? 5 : 2.5}
        raycast={ignoreRaycast} toneMapped={false} depthWrite={false} />
    </mesh>)}
    {hovered && <Html center position={[
      links.find((link) => link.id === hovered).position[0],
      links.find((link) => link.id === hovered).position[1] + 2.5,
      links.find((link) => link.id === hovered).position[2],
    ]} style={{ pointerEvents: 'none' }} zIndexRange={[20, 0]}>
      <div className="desk-link-tooltip" role="tooltip">
        {hovered === 'linkedin' ? 'Check out my LinkedIn!' : "Here’s my resume!"}
      </div>
    </Html>}
    <mesh position={[16.9, 7.24, 13.7]}>
      <boxGeometry args={[0.3, 0.9, 0.3]} /><meshStandardMaterial color="#8796aa" />
    </mesh>
    <mesh position={[16.8, 6.87, 13.7]}>
      <boxGeometry args={[1.2, 0.14, 2.7]} /><meshStandardMaterial color="#24344b" />
    </mesh>
  </>
}

function Room({ onSelect, onTargets, activeEntry, reducedMotion, resetKey, night, onToggleNight, project, musicPlaying, onToggleMusic }) {
  const { scene: source } = useGLTF(ROOM_URL)
  const scene = useMemo(() => source.clone(true), [source])
  // The chessboard consists of separate small squares beneath the nightstand.
  const chessZone = useMemo(() => ({
    position: new Vector3(-0.6, 3.5, -6.5),
    size: new Vector3(7, 4, 7),
  }), [])
  const mouseMotion = useRef(null)
  const deskMouse = useMemo(() => {
    const object = scene.getObjectByName('mouse')
    return object ? { object, origin: object.position.clone() } : null
  }, [scene])
  function isDeskMouse(object) {
    for (let current = object; current; current = current.parent) {
      if (current === deskMouse?.object) return true
    }
    return false
  }
  useFrame((_, delta) => {
    if (!deskMouse || mouseMotion.current === null) return
    mouseMotion.current += delta
    const duration = reducedMotion ? 0.35 : 1.4
    const progress = Math.min(mouseMotion.current / duration, 1)
    // The desktop's left/right direction is the room's Z axis.
    const distance = reducedMotion ? 0.25 : 1.2
    deskMouse.object.position.z = deskMouse.origin.z - Math.sin(progress * Math.PI * 2) * distance
    if (progress === 1) {
      deskMouse.object.position.copy(deskMouse.origin)
      mouseMotion.current = null
    }
  })
  const switchTarget = useMemo(() => {
    const object = scene.getObjectByName('switch')
    if (!object) return null
    const bounds = new Box3().setFromObject(object)
    const position = bounds.getCenter(new Vector3())
    const size = bounds.getSize(new Vector3())
    const points = []
    object.traverse((mesh) => {
      if (!mesh.isMesh || !mesh.geometry) return
      const edges = new EdgesGeometry(mesh.geometry, 35)
      const vertices = edges.getAttribute('position')
      for (let i = 0; i < vertices.count; i++) {
        points.push(new Vector3().fromBufferAttribute(vertices, i).applyMatrix4(mesh.matrixWorld))
      }
      edges.dispose()
    })
    position.x -= 0.3
    return { position, points, size: [Math.max(size.x, 1), Math.max(size.y, 2.5), Math.max(size.z, 2)] }
  }, [scene])
  const canvas = useThree((state) => state.gl.domElement)
  const [hovered, setHovered] = useState(null)
  const screenMaterials = useRef([])
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)
  const flight = useRef(null)
  const viewportSize = useThree((state) => state.size)
  const roomBounds = useMemo(() => new Box3().setFromObject(scene), [scene])

  useEffect(() => {
    // Trackpad pinch should zoom the scene, not pan/zoom the entire page.
    const preventPageZoom = (event) => { if (event.ctrlKey) event.preventDefault() }
    canvas.addEventListener('wheel', preventPageZoom, { passive: false })
    return () => canvas.removeEventListener('wheel', preventPageZoom)
  }, [canvas])

  const { targets, targetsByObject } = useMemo(() => {
    scene.updateMatrixWorld(true)
    const targets = entries.flatMap((entry) => {
      if (entry.objectName === 'resume' || entry.objectName === 'linkedin') {
        const resume = entry.objectName === 'resume'
        const center = new Vector3(...(resume ? [14.5, 6.84, -1.25] : [16.8, 8.15, 13.7]))
        const size = new Vector3(...(resume ? [4, 0.1, 3] : [0.1, 1.65, 2.6]))
        return [{ entry, object: null, points: [], bounds: new Box3().setFromCenterAndSize(center, size) }]
      }
      if (entry.objectName === 'Chessboard') {
        return [{ entry, object: null, points: [], bounds: new Box3().setFromCenterAndSize(chessZone.position, chessZone.size) }]
      }
      const object = [entry.objectName, ...(entry.fallbackNames ?? [])]
        .map((name) => scene.getObjectByName(name))
        .find(Boolean)
      if (!object) return []

      const bounds = new Box3().setFromObject(object)
      if (bounds.isEmpty()) return []

      const points = []
      function addEdges(geometry, transform) {
        const edges = new EdgesGeometry(geometry, 35)
        const positions = edges.getAttribute('position')
        for (let index = 0; index < positions.count; index += 2) {
          const start = transform(new Vector3().fromBufferAttribute(positions, index))
          const end = transform(new Vector3().fromBufferAttribute(positions, index + 1))
          if (['YorkRegion', 'SMB', 'Port.001'].includes(entry.objectName)) {
            const center = bounds.getCenter(new Vector3())
            const size = bounds.getSize(new Vector3())
            const axes = ['x', 'y', 'z'].sort((a, b) => size[b] - size[a]).slice(0, 2)
            const midpoint = start.clone().add(end).multiplyScalar(0.5)
            if (axes.every((axis) => Math.abs(midpoint[axis] - center[axis]) < size[axis] * 0.38)) continue
          }
          points.push(start, end)
        }
        edges.dispose()
      }

      // Use the exported frame's real edges, preserving its opening and rotation.
      object.traverse((mesh) => {
        if (!mesh.isMesh || !mesh.geometry?.getAttribute('position')) return
        // These materials belong to the decorative landscape behind the artwork,
        // not the wooden frame. Their mesh edges look like cracks over the logo.
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        if (['YorkRegion', 'SMB', 'Port.001'].includes(entry.objectName) &&
            !materials.some((material) => /^(DD9944|66747e6cad134|SMB|Port)/.test(material?.name ?? ''))) return
        addEdges(mesh.geometry, (point) => point.applyMatrix4(mesh.matrixWorld))
      })

      return [{ entry, object, points, bounds }]
    })
    return { targets, targetsByObject: new Map(targets.filter(({ object }) => object).map(({ entry, object }) => [object, entry])) }
  }, [scene, chessZone])

  useEffect(() => {
    if (!import.meta.env.DEV) return

    const found = new Set(targets.map(({ entry }) => entry.objectName))
    const missing = entries.filter(({ objectName }) => !found.has(objectName))
    if (missing.length) {
      console.warn('Portfolio props missing from room-blender.glb:', missing.map(({ objectName }) => objectName))
    }
  }, [targets])

  useEffect(() => {
    onTargets(targets.map(({ entry }) => entry.objectName))
  }, [onTargets, targets])

  useEffect(() => {
    if (!controls) return

    const destination = targets.find(({ entry }) => entry === activeEntry)
    controls.enableDamping = false
    controls.update() // Clear residual orbit momentum before driving the camera.
    const start = {
      position: camera.position.clone(),
      target: controls.target.clone(),
      zoom: camera.zoom,
    }

    const target = roomBounds.getCenter(new Vector3())
    const size = roomBounds.getSize(new Vector3())
    const direction = new Vector3(-40, 32, 48).normalize()
    const right = new Vector3().crossVectors(camera.up, direction).normalize()
    const up = new Vector3().crossVectors(direction, right).normalize()
    const width = Math.abs(right.x) * size.x + Math.abs(right.y) * size.y + Math.abs(right.z) * size.z
    const height = Math.abs(up.x) * size.x + Math.abs(up.y) * size.y + Math.abs(up.z) * size.z
    const home = {
      target,
      position: target.clone().addScaledVector(direction, Math.max(size.length() * 2, 80)),
      zoom: Math.min(viewportSize.width / (width * 1.2), viewportSize.height / (height * 1.2)),
    }
    controls.minZoom = Math.min(8, home.zoom * 0.5)
    let end = home

    if (destination) {
      const target = destination.bounds.getCenter(new Vector3())
      const preset = objectViews[destination.entry.objectName]
      const direction = new Vector3(...preset.direction).normalize()
      const right = new Vector3().crossVectors(camera.up, direction).normalize()
      const up = new Vector3().crossVectors(direction, right).normalize()
      const size = destination.bounds.getSize(new Vector3())
      // Fit the projected bounds at the preset angle, not the previous orbit angle.
      const width = Math.abs(right.x) * size.x + Math.abs(right.y) * size.y + Math.abs(right.z) * size.z
      const height = Math.abs(up.x) * size.x + Math.abs(up.y) * size.y + Math.abs(up.z) * size.z
      const spanX = camera.right - camera.left
      const spanY = camera.top - camera.bottom
      const desktop = canvas.clientWidth > 760
      const zoom = Math.max(8, Math.min(250,
        spanX * (desktop ? 0.42 : 0.7) / Math.max(width, 0.001),
        spanY * (desktop ? preset.fill : 0.38) / Math.max(height, 0.001),
      ))
      // Leave space for the information panel on desktop and below on mobile.
      if (desktop) target.addScaledVector(right, spanX * (preset.offsetX ?? 0.16) / zoom)
      else target.addScaledVector(up, -spanY * 0.12 / zoom)
      const distance = Math.max(home.position.distanceTo(home.target), size.length() * 2, 1)
      end = {
        target,
        position: target.clone().addScaledVector(direction, distance),
        zoom,
      }
    }

    flight.current = { start, end, elapsed: 0, returning: !destination }
    controls.enabled = false

    return () => {
      flight.current = null
      controls.enabled = true
      controls.enableDamping = !reducedMotion
    }
  }, [activeEntry, camera, canvas, controls, targets, resetKey, roomBounds, viewportSize.width, viewportSize.height, reducedMotion])

  useFrame((_, delta) => {
    const move = flight.current
    if (!move || !controls) return

    move.elapsed += delta
    const progress = reducedMotion ? 1 : Math.min(move.elapsed / 0.7, 1)
    const eased = progress * progress * (3 - 2 * progress)
    camera.position.lerpVectors(move.start.position, move.end.position, eased)
    controls.target.lerpVectors(move.start.target, move.end.target, eased)
    camera.zoom = move.start.zoom + (move.end.zoom - move.start.zoom) * eased
    camera.updateProjectionMatrix()
    controls.update()

    if (progress === 1) {
      flight.current = null
      controls.enabled = true
      controls.enableDamping = !reducedMotion
    }
  })

  function isSwitch(object) {
    for (let current = object; current; current = current.parent) {
      if (current.name.toLowerCase() === 'switch') return true
    }
    return false
  }

  function findEntry(object) {
    for (let current = object; current; current = current.parent) {
      const entry = targetsByObject.get(current)
      if (entry) return entry
    }
    return null
  }

  useEffect(() => {
    if (!hovered) return
    const previous = canvas.style.cursor
    canvas.style.cursor = 'pointer'
    return () => { canvas.style.cursor = previous }
  }, [canvas, hovered])

  useEffect(() => {
    const screen = scene.getObjectByName('MonitorScreen')
    if (!screen) return

    const copies = []
    const originals = []

    function copyMaterial(original) {
      if (!original?.emissive) return original
      const material = original.clone()
      material.emissive.set('#63baff')
      material.emissiveIntensity = 0.08
      copies.push(material)
      return material
    }

    screen.traverse((mesh) => {
      if (!mesh.isMesh || !mesh.material) return
      const original = mesh.material
      originals.push([mesh, original])
      mesh.material = Array.isArray(original) ? original.map(copyMaterial) : copyMaterial(original)
    })

    screenMaterials.current = copies
    return () => {
      for (const [mesh, original] of originals) mesh.material = original
      for (const material of copies) material.dispose()
      screenMaterials.current = []
    }
  }, [scene])

  useFrame((_, delta) => {
    const goal = hovered === 'Monitor' || activeEntry?.objectName === 'Monitor' ? 0.75 : 0.08
    const blend = reducedMotion ? 1 : 1 - Math.exp(-10 * delta)
    for (const material of screenMaterials.current) {
      material.emissiveIntensity += (goal - material.emissiveIntensity) * blend
    }
  })

  return (
    <>
      <primitive
        object={scene}
        onPointerMove={(event) => {
          event.stopPropagation()
          setHovered(isDeskMouse(event.object) ? 'mouse' : isSwitch(event.object) ? 'switch' : findEntry(event.object)?.objectName ?? null)
        }}
        onPointerOut={() => setHovered(null)}
        onClick={(event) => {
          event.stopPropagation()
          if (isDeskMouse(event.object) && event.delta < 5) {
            if (mouseMotion.current === null) mouseMotion.current = 0
            return
          }
          if (isSwitch(event.object) && event.delta < 5) {
            onToggleNight()
            return
          }
          const entry = findEntry(event.object)
          if (entry && event.delta < 5) {
            if (entry.objectName === 'BoomBox') onToggleMusic()
            onSelect(entry)
          }
        }}
      />

      <mesh position={chessZone.position}
        onPointerOver={(event) => { event.stopPropagation(); setHovered('Chessboard') }}
        onPointerMove={(event) => { event.stopPropagation(); setHovered('Chessboard') }}
        onPointerOut={() => setHovered(null)}
        onClick={(event) => {
          event.stopPropagation()
          if (event.delta < 5) onSelect(entries.find((entry) => entry.objectName === 'Chessboard'))
        }}>
        <boxGeometry args={chessZone.size.toArray()} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {switchTarget && <mesh position={switchTarget.position}
        onPointerOver={(event) => { event.stopPropagation(); setHovered('switch') }}
        onPointerMove={(event) => { event.stopPropagation(); setHovered('switch') }}
        onPointerOut={() => setHovered(null)}
        onClick={(event) => { event.stopPropagation(); if (event.delta < 5) onToggleNight() }}>
        <boxGeometry args={switchTarget.size} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>}
      {switchTarget && <Outline points={switchTarget.points} active={hovered === 'switch'}
        phase={0} reducedMotion={reducedMotion} />}
      <ContactPhone />
      <DeskLinks activeEntry={activeEntry} onSelect={onSelect} canOpen={() => !flight.current} />
      <ProjectScreen scene={scene} project={project} />
      <LampLighting scene={scene} night={night} />
      <MusicParticles scene={scene} playing={musicPlaying} reducedMotion={reducedMotion} />

      {targets.map(({ entry, points }, index) => points.length > 0 && (
        <Outline
          key={entry.objectName}
          points={points}
          phase={index * 1.4}
          active={hovered === entry.objectName || activeEntry === entry}
          reducedMotion={reducedMotion}
        />
      ))}
    </>
  )
}

function ViewportUI({ children }) {
  const [style, setStyle] = useState({ inset: 0 })
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const update = () => setStyle({
      left: viewport.offsetLeft, top: viewport.offsetTop,
      width: viewport.width * viewport.scale, height: viewport.height * viewport.scale,
      transform: `scale(${1 / viewport.scale})`, transformOrigin: 'top left',
    })
    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => { viewport.removeEventListener('resize', update); viewport.removeEventListener('scroll', update) }
  }, [])
  return <div className="room-ui" style={style}>{children}</div>
}

export default function App() {
  const [musicPlaying, setMusicPlaying] = useState(false)
  const music = useRef(null)
  const [musicError, setMusicError] = useState('')
  function toggleMusic() {
    if (!music.current) {
      const player = new Audio(import.meta.env.BASE_URL + 'audio/boombox-lofi.m4a')
      player.loop = true
      player.volume = 0.25
      player.preload = 'none'
      player.onplay = () => setMusicPlaying(true)
      player.onpause = () => setMusicPlaying(false)
      player.onerror = () => { setMusicPlaying(false); setMusicError('Music could not load. Try again.') }
      music.current = player
    }
    const player = music.current
    setMusicError('')
    if (!player.paused) player.pause()
    else void player.play().catch(() => { setMusicPlaying(false); setMusicError('Could not play music. Please try again.') })
  }
  useEffect(() => () => {
    if (music.current) {
      music.current.pause()
      music.current.removeAttribute('src')
      music.current.load()
    }
  }, [])
  const [projectIndex, setProjectIndex] = useState(0)
  const [night, setNight] = useState(false)
  const audioContext = useRef(null)
  function toggleNight() {
    setNight((value) => !value)
    // A short mechanical click synthesized locally; no audio download required.
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      const context = audioContext.current ??= new AudioContext()
      void context.resume().catch(() => {})
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.055), context.sampleRate)
      const samples = buffer.getChannelData(0)
      for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.exp(-i / (context.sampleRate * 0.009))
      const source = context.createBufferSource()
      const filter = context.createBiquadFilter()
      const gain = context.createGain()
      source.buffer = buffer
      filter.type = 'highpass'
      filter.frequency.value = 900
      gain.gain.value = 0.22
      source.connect(filter).connect(gain).connect(context.destination)
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect() }
      source.start()
    } catch { /* Lighting remains usable when audio is unavailable. */ }
  }
  useEffect(() => () => { void audioContext.current?.close().catch(() => {}) }, [])
  const [activeEntry, setActiveEntry] = useState(null)
  const [resetKey, setResetKey] = useState(0)
  function resetRoom() {
    setActiveEntry(null)
    setResetKey((value) => value + 1)
  }
  const [availableNames, setAvailableNames] = useState([])
  const activeCategory = categories.find(({ objects }) => objects.includes(activeEntry?.objectName))

  function getCategoryEntries(category) {
    return category.objects
      .filter((name) => name === 'Chessboard' || availableNames.includes(name))
      .map((name) => entries.find(({ objectName }) => objectName === name))
  }

  const currentEntries = activeCategory ? getCategoryEntries(activeCategory) : []
  const activeIndex = currentEntries.indexOf(activeEntry)

  const viewingProjects = activeEntry?.objectName === 'Monitor'
  const itemCount = viewingProjects ? projects.length : currentEntries.length
  const itemIndex = viewingProjects ? projectIndex : activeIndex
  function browse(direction) {
    if (viewingProjects) {
      setProjectIndex((index) => (index + direction + projects.length) % projects.length)
      return
    }
    if (currentEntries.length < 2) return
    const index = (activeIndex + direction + currentEntries.length) % currentEntries.length
    setActiveEntry(currentEntries[index])
  }
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveEntry(null)
        setResetKey((value) => value + 1)
      }
    }

    update()
    query.addEventListener('change', update)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      query.removeEventListener('change', update)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <main className="portfolio-room" data-night={night} data-projects={viewingProjects}>
      <ViewportUI>
      <style>{styles}</style>
      <div className="room-clouds" aria-hidden="true" />

      <div className="retro-stage">
        <Canvas
          resize={{ offsetSize: true }}
          orthographic
          dpr={viewingProjects ? [1, 2] : PIXEL_RATIO}
          camera={{ position: [-40, 32, 48], near: 0.01, far: 500 }}
          gl={{ alpha: true, antialias: false }}
        >
          <hemisphereLight args={['#dceeff', '#b8a28b', night ? 0.12 : 1.35]} />
          <directionalLight color="#fff1d7" position={[5, 9, 6]} intensity={night ? 0 : 2.4} />
          <directionalLight color="#b5d5ff" position={[-5, 4, -3]} intensity={night ? 0.08 : 0.65} />

          <OrbitControls
            makeDefault
            enableDamping={!reducedMotion}
            dampingFactor={0.08}
            rotateSpeed={0.55}
            zoomSpeed={0.7}
            panSpeed={0.6}
            minPolarAngle={Math.PI / 8}
            maxPolarAngle={Math.PI / 2 - 0.05}
            minAzimuthAngle={-Math.PI / 2 + 0.03}
            maxAzimuthAngle={0.12}
            minZoom={8}
            maxZoom={250}
            mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
            touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
          />

          <Suspense fallback={null}>

              <Room
                onSelect={(entry) => { setActiveEntry(entry); setResetKey((value) => value + 1) }}
                onTargets={setAvailableNames}
                musicPlaying={musicPlaying}
                onToggleMusic={toggleMusic}
                project={projects[projectIndex]}
                night={night}
                onToggleNight={toggleNight}
                resetKey={resetKey}
                activeEntry={activeEntry}
                reducedMotion={reducedMotion}
              />

          </Suspense>
        </Canvas>
      </div>

      <div className="room-controls">
        <button className="retro-button" type="button" onClick={resetRoom}>Reset view</button>
        {musicError && <span role="alert">{musicError}</span>}
        <span>Drag to rotate · Scroll / pinch to zoom · Right-drag to pan · Click an object</span>
      </div>

      <nav className="retro-menu" aria-label="Portfolio sections">
        {categories.map((category) => {
          const first = getCategoryEntries(category)[0]
          const fallback = entries.find(({ objectName }) => objectName === category.objects[0])

          return (
            <button
              key={category.label}
              className="retro-button"
              type="button"
              aria-pressed={activeCategory === category}
              onClick={() => { setActiveEntry(first ?? fallback); setResetKey((value) => value + 1) }}
            >
              {category.label}
            </button>
          )
        })}
      </nav>

      {itemCount > 1 && (
        <>
          <button className="retro-button retro-arrow retro-prev" type="button" aria-label="Previous item" onClick={() => browse(-1)}>◀</button>
          <button className="retro-button retro-arrow retro-next" type="button" aria-label="Next item" onClick={() => browse(1)}>▶</button>
        </>
      )}

      {activeEntry && (
        <section key={activeEntry.objectName} className="retro-panel" aria-labelledby="retro-section-title">
          <header>
            <h2 id="retro-section-title">{activeEntry.label}</h2>
            <button className="retro-button" type="button" onClick={resetRoom}>
              Room View
            </button>
          </header>
          {itemCount > 1 && (
            <p className="retro-counter">{itemIndex + 1} / {itemCount}</p>
          )}
          {activeEntry.objectName === 'Book' && <p>
          </p>}
          {activeEntry.objectName === 'BoomBox' && <button className="retro-button" type="button" aria-pressed={musicPlaying} onClick={toggleMusic}>
            {musicPlaying ? 'Pause music' : 'Play music'}
          </button>}
          {viewingProjects ? <div aria-live="polite">
            <h3>{projects[projectIndex].title}</h3>
            {projects[projectIndex].description && <p>{projects[projectIndex].description}</p>}
            {projects[projectIndex].link && <a href={projects[projectIndex].link} target="_blank" rel="noreferrer">View project on GitHub</a>}
          </div> : activeEntry.content}
        </section>
      )}
      </ViewportUI>
    </main>
  )
}
