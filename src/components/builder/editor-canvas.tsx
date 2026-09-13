"use client"

import { useEffect, useRef } from "react"
import type { EditorScene } from "./editor-scene"

interface EditorCanvasProps {
  onSceneReady?: (scene: EditorScene) => void
}

export default function EditorCanvas({ onSceneReady }: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef      = useRef<import("phaser").Game | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    let game: import("phaser").Game

    async function boot() {
      const Phaser = (await import("phaser")).default
      const { EditorScene: Scene } = await import("./editor-scene")

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        backgroundColor: "#ffffff",
        parent: containerRef.current!,
        scene: Scene,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        render: { antialias: true, pixelArt: false },
      }

      game = new Phaser.Game(config)
      gameRef.current = game

      game.events.on("ready", () => {
        const scene = game.scene.getScene("EditorScene") as EditorScene
        onSceneReady?.(scene)
      })
    }

    boot()

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [onSceneReady])

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />
}
