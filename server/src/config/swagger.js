const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "BookLink API Documentation",
      version: "1.0.0",
      description: "MVC REST API for BookLink platform endpoints",
    },
    servers: [
      {
        url: "http://localhost:5001",
        description: "Local Development Server",
      },
    ],
  },
  // Path to the API docs inside routes/controllers
  apis: ["./src/routes/*.js", "./src/controllers/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
