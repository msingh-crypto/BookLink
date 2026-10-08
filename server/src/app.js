const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const healthRoutes = require("./routes/health");

const app = express();

app.use(cors());
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

module.exports = app;
