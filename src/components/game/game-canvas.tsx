"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

interface GameCanvasProps {
  displayName?: string
}

export default function GameCanvas({ displayName }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<import("phaser").Game | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    let game: import("phaser").Game

    async function boot() {
      const Phaser = (await import("phaser")).default
      const { CityScene } = await import("./city-scene")

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 900,
        height: 840,
        backgroundColor: "#080810",
        parent: containerRef.current!,
        physics: {
          default: "arcade",
          arcade: { gravity: { x: 0, y: 0 }, debug: false },
        },
        scene: CityScene,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        render: {
          antialias: true,
          pixelArt: false,
        },
      }

      game = new Phaser.Game(config)
      gameRef.current = game

      game.events.on("ready", () => {
        game.scene.start("CityScene", { displayName: displayName ?? "You" })
      })
    }

    boot()

    const handleEnter = (e: Event) => {
      const { href } = (e as CustomEvent<{ href: string }>).detail
      router.push(href)
    }
    window.addEventListener("realm:enter-building", handleEnter)

    return () => {
      window.removeEventListener("realm:enter-building", handleEnter)
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [displayName, router])

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl overflow-hidden border border-white/8"
      style={{
        background: "#080810",
        aspectRatio: "900 / 840",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    />
  )
}
