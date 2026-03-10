import { useState } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, useFBX } from "@react-three/drei"

function PrinterModel({ printer }) {

    const modelPath =
        printer === "uv600"
            ? "/models/xP UV 600 HD TEXTURE/xP UV 600 HD TEXTURE.fbx"
            : "/models/XP UV 601 HD/XP UV 601 HD.fbx"

    const model = useFBX(modelPath)

    return <primitive object={model} scale={0.01} />
}

export default function PrinterViewer({ printer }) {

    const [modal, setModal] = useState(null)

    return (
        <div style={{ width: "100%", height: "500px", position: "relative" }}>

            <Canvas camera={{ position: [0, 2, 5] }}>

                <ambientLight intensity={1} />
                <directionalLight position={[5, 5, 5]} />

                <PrinterModel printer={printer} />

                {/* HOTSPOTS */}

                <mesh position={[1, 0.5, 0]} onClick={() => setModal("cabezal")}>
                    <sphereGeometry args={[0.02, 16, 16]} />
                    <meshStandardMaterial color="yellow" emissive="yellow" />
                </mesh>

                <mesh position={[-1, 0.3, 0]} onClick={() => setModal("panel")}>
                    <sphereGeometry args={[0.02, 16, 16]} />
                    <meshStandardMaterial color="yellow" emissive="yellow" />
                </mesh>

                <mesh position={[0.5, 0.6, 0.4]} onClick={() => setModal("boquilla")}>
                    <sphereGeometry args={[0.02, 16, 16]} />
                    <meshStandardMaterial color="yellow" emissive="yellow" />
                </mesh>

                <mesh position={[0, -0.2, 0.5]} onClick={() => setModal("tinta")}>
                    <sphereGeometry args={[0.02, 16, 16]} />
                    <meshStandardMaterial color="yellow" emissive="yellow" />
                </mesh>

                <mesh position={[0.8, -0.1, -0.4]} onClick={() => setModal("estatica")}>
                    <sphereGeometry args={[0.02, 16, 16]} />
                    <meshStandardMaterial color="yellow" emissive="yellow" />
                </mesh>

                <mesh position={[-0.6, 0.2, -0.6]} onClick={() => setModal("purificador")}>
                    <sphereGeometry args={[0.02, 16, 16]} />
                    <meshStandardMaterial color="yellow" emissive="yellow" />
                </mesh>

                <mesh position={[0, -0.5, 0]} onClick={() => setModal("estructura")}>
                    <sphereGeometry args={[0.02, 16, 16]} />
                    <meshStandardMaterial color="yellow" emissive="yellow" />
                </mesh>

                <OrbitControls />

            </Canvas>


            {/* MODALES */}

            {modal === "cabezal" && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-white text-black p-6 rounded-lg shadow-xl w-[400px]">
                    <h2 className="text-xl font-bold mb-2">
                        Cabezales EPSON i3200 HD U1
                    </h2>
                    <p>
                        La XP UV 600 HD TEXTURE incorpora cuatro cabezales
                        EPSON i3200 HD U1 de alta precisión compatibles con
                        CMYK, Blanco y Barniz para lograr impresiones de
                        alta resolución.
                    </p>
                    <button
                        className="mt-4 bg-red-600 text-white px-4 py-2 rounded"
                        onClick={() => setModal(null)}
                    >
                        Cerrar
                    </button>
                </div>
            )}

            {modal === "panel" && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-white text-black p-6 rounded-lg shadow-xl w-[400px]">
                    <h2 className="text-xl font-bold mb-2">
                        Panel táctil LCD inteligente
                    </h2>
                    <p>
                        Panel LCD que permite controlar fácilmente
                        la impresora y configurar los procesos de
                        impresión de forma sencilla.
                    </p>
                    <button
                        className="mt-4 bg-red-600 text-white px-4 py-2 rounded"
                        onClick={() => setModal(null)}
                    >
                        Cerrar
                    </button>
                </div>
            )}

            {modal === "boquilla" && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-white text-black p-6 rounded-lg shadow-xl w-[400px]">
                    <h2 className="text-xl font-bold mb-2">
                        Boquilla inclinada de alta precisión
                    </h2>
                    <p>
                        Diseño exclusivo de boquilla inclinada que optimiza
                        la aplicación de tinta y mejora la definición en
                        la impresión UV DTF.
                    </p>
                    <button
                        className="mt-4 bg-red-600 text-white px-4 py-2 rounded"
                        onClick={() => setModal(null)}
                    >
                        Cerrar
                    </button>
                </div>
            )}

            {modal === "tinta" && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-white text-black p-6 rounded-lg shadow-xl w-[400px]">
                    <h2 className="text-xl font-bold mb-2">
                        Sistema de tinta CMYK + Blanco + Barniz
                    </h2>
                    <p>
                        Sistema avanzado que permite imprimir con
                        efecto cristal en un solo paso utilizando
                        tinta CMYK, blanco y barniz.
                    </p>
                    <button
                        className="mt-4 bg-red-600 text-white px-4 py-2 rounded"
                        onClick={() => setModal(null)}
                    >
                        Cerrar
                    </button>
                </div>
            )}

            {modal === "estatica" && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-white text-black p-6 rounded-lg shadow-xl w-[400px]">
                    <h2 className="text-xl font-bold mb-2">
                        Eliminador de estática integrado
                    </h2>
                    <p>
                        Sistema que elimina la electricidad estática
                        durante la impresión para garantizar estabilidad
                        y una aplicación uniforme de la tinta.
                    </p>
                    <button
                        className="mt-4 bg-red-600 text-white px-4 py-2 rounded"
                        onClick={() => setModal(null)}
                    >
                        Cerrar
                    </button>
                </div>
            )}

            {modal === "purificador" && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-white text-black p-6 rounded-lg shadow-xl w-[400px]">
                    <h2 className="text-xl font-bold mb-2">
                        Purificador de olores
                    </h2>
                    <p>
                        Purificador integrado que mejora el entorno
                        de trabajo eliminando los vapores generados
                        durante el proceso de impresión UV.
                    </p>
                    <button
                        className="mt-4 bg-red-600 text-white px-4 py-2 rounded"
                        onClick={() => setModal(null)}
                    >
                        Cerrar
                    </button>
                </div>
            )}

            {modal === "estructura" && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-white text-black p-6 rounded-lg shadow-xl w-[400px]">
                    <h2 className="text-xl font-bold mb-2">
                        Estructura industrial robusta
                    </h2>
                    <p>
                        Diseño robusto y duradero que garantiza estabilidad
                        durante la impresión y una larga vida útil en
                        entornos de producción profesional.
                    </p>
                    <button
                        className="mt-4 bg-red-600 text-white px-4 py-2 rounded"
                        onClick={() => setModal(null)}
                    >
                        Cerrar
                    </button>
                </div>
            )}

        </div>
    )
}