from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
from routes import auth_routes, customer_routes, invoice_routes, reminder_routes, prediction_routes
from seed_data import seed_database
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

load_dotenv()
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Payment Reminder Assistant",
    version="1.0.0",
    description="AI-Powered Payment Collection System with ML Risk Prediction and Claude AI Email Generation"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(customer_routes.router, prefix="/api/customers", tags=["Customers"])
app.include_router(invoice_routes.router, prefix="/api/invoices", tags=["Invoices"])
app.include_router(reminder_routes.router, prefix="/api/reminders", tags=["Reminders"])
app.include_router(prediction_routes.router, prefix="/api/predictions", tags=["Predictions & AI"])

@app.on_event("startup")
async def startup_event():
    seed_database()
    from ml.predictor import ensure_model_trained
    ensure_model_trained()
    print("\n✅ AI Payment Reminder API is running!")
    print("   Swagger Docs: http://localhost:8000/docs")
    print("   Frontend:     http://localhost:3000\n")

@app.get("/")
def root():
    return {
        "message": "AI Payment Reminder Assistant API",
        "status": "running",
        "version": "1.0.0",
        "docs": "http://localhost:8000/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

# Mount the React build folder 
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

frontend_build = os.path.join(
    BASE_DIR,
    "frontend_build"
)

if os.path.exists(frontend_build):

    app.mount(
        "/static",
        StaticFiles(directory=os.path.join(frontend_build, "static")),
        name="static"
    )

    @app.get("/{full_path:path}")
    async def serve_react(full_path: str):

        api_prefixes = (
            "api",
            "docs",
            "redoc",
            "openapi.json"
        )

        if full_path.startswith(api_prefixes):
            return

        return FileResponse(
            os.path.join(frontend_build, "index.html")
        )