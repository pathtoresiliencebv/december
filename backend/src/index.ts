import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chat";
import containerRoutes from "./routes/containers";
import { initializeDatabase, testConnection } from "./services/database.js";

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "user-id"],
};

app.use(cors(corsOptions));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({
      status: "healthy",
      database: dbConnected ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.use("/containers", containerRoutes);
app.use("/chat", chatRoutes);

const PORT = process.env.PORT || 4000;

// Initialize database and start server
async function startServer() {
  try {
    console.log("Initializing database...");
    await initializeDatabase();
    console.log("Database initialized successfully");

    console.log("Testing database connection...");
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error("Database connection failed");
    }

    app.listen(PORT, () => {
      console.log(`Docker Container API running on port ${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

export default app;
