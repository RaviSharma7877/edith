"use client"

import { useEffect, useRef, useState } from "react"

// Particle color palette — warm multicolor (matches screenshots)
const COLORS = [
  [220, 53, 69],   // red
  [255, 107, 53],  // orange-red
  [255, 165, 0],   // orange
  [255, 200, 0],   // yellow
  [40, 167, 69],   // green
  [23, 162, 184],  // teal
  [0, 123, 255],   // blue
  [111, 66, 193],  // purple
  [232, 62, 140],  // pink
  [108, 117, 125], // gray
]

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  width: number
  height: number
  rotation: number
  rotationSpeed: number
  color: number[]
  opacity: number
  life: number    // 0–1, decrements each frame
  decay: number
}

function createParticle(cx: number, cy: number): Particle {
  const angle = Math.random() * Math.PI * 2
  const speed = 1.5 + Math.random() * 4.5
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  return {
    x: cx + (Math.random() - 0.5) * 40,
    y: cy + (Math.random() - 0.5) * 40,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    width: 4 + Math.random() * 8,
    height: 2 + Math.random() * 4,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.2,
    color,
    opacity: 1,
    life: 1,
    decay: 0.004 + Math.random() * 0.006,
  }
}

interface WelcomeScreenProps {
  userName?: string
  onComplete: () => void
  duration?: number
}

export function WelcomeScreen({
  userName,
  onComplete,
  duration = 3000,
}: WelcomeScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter")
  const startTimeRef = useRef(Date.now())

  // Spawn burst of particles on mount and periodically
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const spawnBurst = (count: number) => {
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      for (let i = 0; i < count; i++) {
        particlesRef.current.push(createParticle(cx, cy))
      }
    }

    // Initial burst
    spawnBurst(120)

    // Continuous small burst every 200ms to keep it alive
    const interval = setInterval(() => spawnBurst(18), 200)

    return () => clearInterval(interval)
  }, [])

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current = particlesRef.current.filter((p) => p.life > 0)

      for (const p of particlesRef.current) {
        // Physics: slight anti-gravity (negative gravity) for upward lift
        p.vy -= 0.015           // anti-gravity lift
        p.vx *= 0.995           // air resistance
        p.vy *= 0.995
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotationSpeed
        p.life -= p.decay
        p.opacity = Math.max(0, p.life)

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = `rgb(${p.color[0]},${p.color[1]},${p.color[2]})`
        // Draw pill/confetti shape
        const r = Math.min(p.width, p.height) / 2
        ctx.beginPath()
        ctx.moveTo(-p.width / 2 + r, -p.height / 2)
        ctx.lineTo(p.width / 2 - r, -p.height / 2)
        ctx.arcTo(p.width / 2, -p.height / 2, p.width / 2, -p.height / 2 + r, r)
        ctx.lineTo(p.width / 2, p.height / 2 - r)
        ctx.arcTo(p.width / 2, p.height / 2, p.width / 2 - r, p.height / 2, r)
        ctx.lineTo(-p.width / 2 + r, p.height / 2)
        ctx.arcTo(-p.width / 2, p.height / 2, -p.width / 2, p.height / 2 - r, r)
        ctx.lineTo(-p.width / 2, -p.height / 2 + r)
        ctx.arcTo(-p.width / 2, -p.height / 2, -p.width / 2 + r, -p.height / 2, r)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }

      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener("resize", resize)
    }
  }, [])

  // Phase timer
  useEffect(() => {
    startTimeRef.current = Date.now()

    const holdTimer = setTimeout(() => setPhase("hold"), 200)
    const exitTimer = setTimeout(() => setPhase("exit"), duration - 400)
    const doneTimer = setTimeout(() => onComplete(), duration)

    return () => {
      clearTimeout(holdTimer)
      clearTimeout(exitTimer)
      clearTimeout(doneTimer)
    }
  }, [duration, onComplete])

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-400 ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
      style={{ transitionTimingFunction: "ease-out" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        aria-hidden
      />

      <div
        className={`relative z-10 flex flex-col items-center gap-4 transition-all duration-500 ${
          phase === "enter"
            ? "opacity-0 translate-y-3 scale-95"
            : phase === "exit"
            ? "opacity-0 -translate-y-2 scale-105"
            : "opacity-100 translate-y-0 scale-100"
        }`}
      >
        <span className="text-[#37322F] text-4xl font-semibold font-serif tracking-tight select-none">
          {userName ? `Welcome, ${userName.split(" ")[0]}.` : "Welcome to Edith."}
        </span>
        <span className="text-[#605A57] text-base font-normal font-sans">
          Setting up your workspace…
        </span>
      </div>
    </div>
  )
}
