const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Guardar códigos temporales
const CODIGOS = {};
const EXPIRACION_CODIGO = 5 * 60 * 1000;

// 🔵 Enviar código usando API de Brevo (NO SMTP)
app.post("/enviar-codigo", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send("Falta el correo");

  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  CODIGOS[email] = { codigo, timestamp: Date.now() };

  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { email: process.env.BREVO_SENDER },
        to: [{ email }],
        subject: "✨ Verifica tu cuenta · Gremio",
        htmlContent: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Código de verificación</h2>
            <p>Tu código es:</p>
            <h1>${codigo}</h1>
            <p>Este código es válido por 5 minutos.</p>
          </div>
        `
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    res.send("Código enviado");
  } catch (err) {
    console.error("Error API Brevo:", err.response?.data || err.message);
    res.status(500).send("Error al enviar correo");
  }
});

// ✔ Verificar código
app.post("/verificar-codigo", (req, res) => {
  const { email, codigoIngresado } = req.body;

  if (!email || !codigoIngresado)
    return res.status(400).send("Faltan datos");

  const registro = CODIGOS[email];
  if (!registro) return res.status(401).send("Código incorrecto");

  const { codigo, timestamp } = registro;
  const ahora = Date.now();

  if (ahora - timestamp > EXPIRACION_CODIGO) {
    delete CODIGOS[email];
    return res.status(401).send("Código expirado");
  }

  if (codigo === codigoIngresado) {
    delete CODIGOS[email];
    res.send("Código correcto");
  } else {
    res.status(401).send("Código incorrecto");
  }
});

// Render usa su propio puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
