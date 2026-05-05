from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import sessions, ai, auth, events
from app.core.database import init_db
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="StudyAI Production Backend")

# CORS for Flutter web / local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB on startup
@app.on_event("startup")
def on_startup():
    init_db()

# Routers
app.include_router(sessions.router)
app.include_router(ai.router)
app.include_router(events.router)
# app.include_router(auth.router) # To be implemented

@app.get("/")
async def root():
    return {"message": "StudyAI API is online", "version": "1.0.0"}
