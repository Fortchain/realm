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
        backgroundColor: "#1a2438",
        parent: containerRef.current!,
        scene: CityScene,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        render: { antialias: true, pixelArt: false },
      }

      game = new Phaser.Game(config)
      gameRef.current = game

      game.events.on("ready", () => {
        game.scene.start("CityScene", { displayName: displayName ?? "You" })
      })
    }

    boot()

    const handleEnter = (e: Event) => {
      const { href } = (e as CustomEvent<{ href: string; id: string }>).detail
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
      className="absolute inset-0 w-full h-full"
      style={{ background: "#1a2438" }}
    />
  )
}
