const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const healthRoutes = require("./routes/health");
const authRoutes = require("./routes/auth");
const listingRoutes = require("./routes/listingRoutes");
const adminRouter = require("./routes/admin");

const app = express();
app.disable("x-powered-by");

app.use(
  cors({
    origin:
      process.env.CLIENT_ORIGIN ||
      "http://localhost:3000" ||
      "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

// Serve interactive API Docs
const swaggerUiOptions = {
  customCss: ".swagger-ui .topbar { display: none }",
};

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerUiOptions),
);

// API Routes
app.use("/api", healthRoutes);
app.use("/api", authRoutes);
app.use("/api", listingRoutes);
app.use("/api/admin", adminRouter);

module.exports = app;
