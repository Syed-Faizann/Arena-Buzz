import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import express from "express";
import cors from "cors";
import "dotenv/config";
import session from "express-session";
import MongoStore from "connect-mongo";
import { connectDB } from "./lib/db.js";
import { initSuperAdmin } from "./lib/initAdmin.js";
import authRoutes from "./routes/auth.route.js";
import contestRoutes from "./routes/contest.route.js";
import adminRoutes from "./routes/admin.route.js";
import organizationRoutes from "./routes/organization.route.js";
import subscriptionRoutes from "./routes/subscription.route.js";
import supportRoutes from "./routes/support.route.js";
import notificationRoutes from "./routes/notification.route.js";
import leaderboardRoutes from "./routes/leaderboard.route.js";

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const app = express();

app.use(
    cors({
        origin: FRONTEND_URL,
        credentials: true,
    })
);
app.use(
    express.json({
        limit: "50mb",
        verify: (req, res, buf) => {
            if (req.originalUrl?.startsWith("/api/subscription/webhook")) {
                req.rawBody = buf;
            }
        },
    })
);
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Session connected to MongoDB
app.use(
    session({
        secret: process.env.SESSION_SECRET || "fantsy_buzz_secret_key",
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URL,
            collectionName: "sessions",
            ttl: 14 * 24 * 60 * 60, // 14 days
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 14,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
        },
    })
);

app.use("/api/auth", authRoutes);
app.use("/api/contests", contestRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/org", organizationRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

app.get("/", (req, res) => {
    res.send("Backend API is running");
});

async function main() {
    await connectDB();
    await initSuperAdmin();
    app.listen(PORT, () => {
        console.log(`Backend running on http://localhost:${PORT}`);
    });
}

main();
