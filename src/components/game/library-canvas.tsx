"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { LibraryZone } from "./library-interior-scene"

interface LibraryCanvasProps {
  displayName?: string
  onZoneChange?: (zone: LibraryZone) => void
}

export default function LibraryCanvas({ displayName, onZoneChange }: LibraryCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<import("phaser").Game | null>(null)
  const router = useRouter()
  const [hoveredZone, setHoveredZone] = useState<LibraryZone>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    let game: import("phaser").Game

    async function boot() {
      const Phaser = (await import("phaser")).default
      const { LibraryInteriorScene } = await import("./library-interior-scene")

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 1000,
        height: 820,
        backgroundColor: "#0e0c14",
        parent: containerRef.current!,
        physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } },
        scene: LibraryInteriorScene,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        render: { antialias: true, pixelArt: false },
      }

      game = new Phaser.Game(config)
      gameRef.current = game

      game.events.on("ready", () => {
        game.scene.start("LibraryInteriorScene", { displayName: displayName ?? "You" })
      })
    }

    boot()

    const handleExit = () => router.push("/city")
    const handleZoneHover = (e: Event) => {
      const zone = (e as CustomEvent<{ zone: LibraryZone }>).detail.zone
      setHoveredZone(zone)
    }
    const handleZoneEnter = (e: Event) => {
      const zone = (e as CustomEvent<{ zone: LibraryZone }>).detail.zone
      onZoneChange?.(zone)
    }

    window.addEventListener("realm:exit-building", handleExit)
    window.addEventListener("realm:library-zone-hover", handleZoneHover)
    window.addEventListener("realm:library-zone", handleZoneEnter)

    return () => {
      window.removeEventListener("realm:exit-building", handleExit)
      window.removeEventListener("realm:library-zone-hover", handleZoneHover)
      window.removeEventListener("realm:library-zone", handleZoneEnter)
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [displayName, router, onZoneChange])

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden border border-white/8"
        style={{ background: "#0e0c14", aspectRatio: "1000 / 820", maxWidth: "1000px", margin: "0 auto" }}
      />

      {/* Zone hover hints */}
      {hoveredZone && hoveredZone !== "exit" && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-950/80 border border-blue-500/30 rounded-full px-4 py-1.5 text-xs text-blue-300 font-semibold backdrop-blur pointer-events-none">
          {hoveredZone === "professor" && "💬 Prof. Elena's Corner — press E to chat"}
          {hoveredZone === "books" && "📖 Book Stacks — press E to research"}
          {hoveredZone === "tables" && "🪑 Study Tables — press E to open notes"}
        </div>
      )}
    </div>
  )
}
