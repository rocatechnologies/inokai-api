import express from "express";
import cron from "node-cron";
import axios from "axios";
const router = express.Router();

router.get("/keep-alive", (req, res) => {
	res.send("El servidor Render está activo.");
});

const obtenerFechaHoraActual = () => {
	const fechaHoraActual = new Date();

	const año = fechaHoraActual.getFullYear();
	const mes = String(fechaHoraActual.getMonth() + 1).padStart(2, "0");
	const dia = String(fechaHoraActual.getDate()).padStart(2, "0");
	const horas = String(fechaHoraActual.getHours()).padStart(2, "0");
	const minutos = String(fechaHoraActual.getMinutes()).padStart(2, "0");
	const segundos = String(fechaHoraActual.getSeconds()).padStart(2, "0");

	const fechaFormateada = `${año}-${mes}-${dia}`;
	const horaFormateada = `${horas}:${minutos}:${segundos}`;

	return { fecha: fechaFormateada, hora: horaFormateada };
};

// Función para realizar la solicitud HTTP al servidor Render
const mantenerServidorActivo = async () => {
	const fechaHoraActual = obtenerFechaHoraActual();
	console.log("Fecha actual:", fechaHoraActual.fecha);
	console.log("Hora actual:", fechaHoraActual.hora);
	try {
		// Realizar la solicitud GET al endpoint para mantener el servidor Render activo

		const { data } = await axios(process.env.URL_CRON);

		console.log(
			`El servidor Render está activo. fecha ${fechaHoraActual.fecha} hora ${fechaHoraActual.hora}`
		);
	} catch (error) {
		console.error("Error al realizar la solicitud:", error.message);
		// Aquí puedes agregar lógica adicional para manejar el error, como enviar una notificación o intentar nuevamente.
	}
};

// Programar la tarea para que se ejecute cada 10 minutos
cron.schedule("*/10 * * * *", mantenerServidorActivo);
// cron.schedule("*/10 * * * * *", mantenerServidorActivo);


export default router;