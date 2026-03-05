from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="XPRIN-Picasso API", version="0.1.0")

# Permitir peticiones desde el frontend (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # en produccion cambiar por la URL de Cloudflare
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "proyecto": "xprin-picasso", "version": "0.1.0"}


@app.get("/")
def root():
    return {"mensaje": "XPRIN-Picasso API funcionando"}