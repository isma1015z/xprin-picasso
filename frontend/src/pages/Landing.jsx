import PrinterViewer from "../components/PrinterViewer"
import { useState } from "react"

export function Landing() {

  const [printer, setPrinter] = useState("uv600")

  return (
    <div className="min-h-screen bg-red-700 text-white flex flex-col items-center justify-center">

      <div className="absolute top-6 left-8">
        <h1 className="font-xprin">
          XPRIN-Picasso
        </h1>
      </div>

      <div className="mt-16 bg-white text-black rounded-xl shadow-xl p-6 w-[700px]">

        <select
          value={printer}
          onChange={(e) => setPrinter(e.target.value)}
          className="mb-4 p-2 rounded border"
        >
          <option value="uv600">XP UV 600 HD</option>
          <option value="uv601">XP UV 601 HD</option>
        </select>

        <h2 className="text-2xl font-bold mb-4 text-center">
          {printer === "uv600" ? "XP UV 600 HD" : "XP UV 601 HD"}
        </h2>

        <PrinterViewer printer={printer} />

      </div>

    </div>
  )
}