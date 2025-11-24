const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config(); // Para usar variables de entorno

const app = express();
app.use(cors());
app.use(express.json());

// Guardar códigos temporales en memoria
const CODIGOS = {};
const EXPIRACION_CODIGO = 5 * 60 * 1000; // 5 minutos

// 🔵 CONFIGURACIÓN BREVO SMTP
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_HOST,
  port: process.env.BREVO_PORT,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
});

// 📩 ENVIAR CÓDIGO
app.post("/enviar-codigo", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send("Falta el correo");

  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  CODIGOS[email] = { codigo, timestamp: Date.now() };

  try {
    await transporter.sendMail({
      from: process.env.BREVO_USER,
      to: email,
      subject: "✨ Verifica tu cuenta en GREMIO",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Código de verificación</h2>
          <p>Tu código es:</p>
          <h1>${codigo}</h1>
          <p>Este código es válido por 5 minutos.</p>
        </div>
      `,
    });

    res.send("Código enviado");
  } catch (err) {
    console.error("Error SMTP:", err);
    res.status(500).send("Error al enviar correo");
  }
});

// ✔ VERIFICAR CÓDIGO
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

// 🔥 Render usa process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
