const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config(); // Importar dotenv para usar variables de entorno

const app = express();
app.use(cors());
app.use(express.json());

const CODIGOS = {}; // Guardar códigos temporales
const EXPIRACION_CODIGO = 5 * 60 * 1000; // 5 minutos en milisegundos

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Usar variable de entorno
    pass: process.env.EMAIL_PASS, // Usar variable de entorno
  },
});

let correosEnviadosHoy = 0; // Contador de correos enviados hoy
let fechaUltimoReinicio = new Date().toDateString(); // Fecha del último reinicio del contador

app.post("/enviar-codigo", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send("Falta el correo");

  // Reiniciar el contador si es un nuevo día
  const fechaActual = new Date().toDateString();
  if (fechaActual !== fechaUltimoReinicio) {
    correosEnviadosHoy = 0;
    fechaUltimoReinicio = fechaActual;
  }

  // Verificar si se ha alcanzado el límite diario
  if (correosEnviadosHoy >= 499) {
    return res.status(429).send("Límite diario de correos alcanzado. Intenta mañana.");
  }

  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  CODIGOS[email] = { codigo, timestamp: Date.now() }; // Guardar código con timestamp

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER, // Usar variable de entorno
      to: email,
      subject: "✨ Verifica tu cuenta en GREMIO",
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px; text-align: center;">
          <div style="max-width: 500px; margin: auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #3498db; margin-bottom: 20px;">¡Bienvenido a GREMIO! 👋</h2>
            <p style="font-size: 16px; color: #333;">Gracias por registrarte en nuestra plataforma.</p>
            <p style="font-size: 16px; color: #333;">Tu código de verificación es:</p>
            <div style="font-size: 24px; font-weight: bold; background-color: #e0f7fa; color: #00796b; padding: 10px 20px; border-radius: 6px; display: inline-block; margin: 20px 0;">
              ${codigo}
            </div>
            <p style="color: #666;">Este código es válido por unos minutos. Si no solicitaste este código, podés ignorar este correo.</p>
            <hr style="margin: 30px 0;">
            <small style="color: #aaa;">© ${new Date().getFullYear()} GREMIO. Todos los derechos reservados.</small>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    correosEnviadosHoy++; // Incrementar el contador de correos enviados
    res.send("Código enviado");
  } catch (err) {
    console.error("Error al enviar correo", err);
    res.status(500).send("Error al enviar correo");
  }
});

app.post("/verificar-codigo", (req, res) => {
  const { email, codigoIngresado } = req.body;
  if (!email || !codigoIngresado) return res.status(400).send("Faltan datos");

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

app.listen(3000, () => {
});
