
import express from "express";
import mongoose from "mongoose";
import User from "../models/userModels.js";
import Appointment from "../models/appointmentModels.js";
import Speciality from "../models/specialitiesModels.js";
// import { servicesDb } from "../servicesDb.js";
import { isAdmin, isAuth, isOwnerAdmin } from "../utils.js";
import Service from "../models/servicesModels.js";

import moment from "moment-timezone";

const appointmentRouter = express.Router();

/* get all employees of a center by employee logged in
este es para obtener los datos que van el el select del formulario crear cita en el frontend
asi los usuarios podran agendar citas de otros colegas seleccionando su nombre en crear citas
*/
appointmentRouter.get(
	"/get-all-employees/:selectedDB",
	isAuth,
	async (req, res) => {
		console.log("en conseguir todos los empleados");

		try {
			const { selectedDB } = req.params;
			const { centerInfo } = req.user;

			//selecting database
			const db = mongoose.connection.useDb(selectedDB);
			const UserModel = db.model("User", User.schema);

			const isEmployees = await UserModel.find({
				centerInfo,
				isAvailable: "yes",
			}).select("name");
			res.json(isEmployees);
		} catch (error) {
			console.log(error);
			res.json({ message: "error en el servidor" });
		}
	}
);

/* get all appointments of a center by day based on user logged in
	esta parte es la que hace funcionar el calendario mandando todas las citas y horas de ese dia
	ademas tiene un filtro para navegar para dias anteriores
*/
appointmentRouter.get(
	"/get-all-appointments/:selectedDB",
	isAuth,
	async (req, res) => {
		console.log("en conseguir todos los appointments");

		try {
			const { selectedDB } = req.params;
			const { centerInfo } = req.user;
			const { filterDate, filterCenter } = req.query;

			//selecting database
			const db = mongoose.connection.useDb(selectedDB);
			const appointmentModel = db.model("Appointment", Appointment.schema);

			//lo defino porque necesito el populate del user nada mas
			db.model("User", User.schema);

			const query = {
				centerInfo: filterCenter || centerInfo,
				date: filterDate,
			};

			const appointments = await appointmentModel
				.find(query)
				.populate("userInfo");

			const usersInAppointments = [];
			const emailSet = new Set();
			const appointments2 = [];
			//aqui es para formatear los datos
			for (let i = 0; i < appointments.length; i++) {
				const userData = appointments[i]["userInfo"];

				const data = appointments[i];

				const myObjet = {
					_id: data._id,
					clientName: data.clientName,
					clientPhone: data.clientPhone,
					date: data.date,
					initTime: data.initTime,
					finalTime: data.finalTime,
					isCancel: data.isCancel,
					userInfo: data.userInfo,
					user_id: data["userInfo"]["_id"],
					cenetrInfo: data.centerInfo,
					services: data.services,
					remarks: data.remarks,
				};

				appointments2.push(myObjet);

				if (!emailSet.has(userData.email)) {
					emailSet.add(userData.email);
					usersInAppointments.push({
						email: userData.email,
						name: userData.name,
						user_id: userData._id,
					});
				}
			}

			res.json({ appointments2, usersInAppointments });
		} catch (error) {
			console.log(error);
			res.json({ message: "error en el servidor" });
		}
	}
);

//editar cita
appointmentRouter.put(
	"/edit-appointment/:selectedDB/:appointmentId",
	isAuth,
	async (req, res) => {
		console.log("endpoint editar cita");
		try {
			const { selectedDB, appointmentId } = req.params;
			//selecting the db
			const db = mongoose.connection.useDb(selectedDB);
			const appointmentModel = db.model("Appointment", Appointment.schema);
			const servicesModel = db.model("Service", Service.schema);

			const getAllServices = await servicesModel.find();

			//reemplazando los servicios del frontend con los del backenc que estan completos
			const matchingServices = getAllServices.filter((serviceFromDb) => {
				return req.body.services.some((selectedService) => {
					return serviceFromDb.serviceName === selectedService.serviceName;
				});
			});
			req.body.services = matchingServices;

			await appointmentModel.findByIdAndUpdate(appointmentId, req.body);

			res.json({ message: "cita editada exitosamente" });
		} catch (error) {
			console.log(error);
		}
	}
);

//eliminar cita
appointmentRouter.delete(
	"/cancel-appointment/:selectedDB/:appointmentId",
	isAuth,
	async (req, res) => {
		console.log("endpoint cancelar cita");
		try {
			const { selectedDB, appointmentId } = req.params;
			//selecting the db
			const db = mongoose.connection.useDb(selectedDB);
			const appointmentModel = db.model("Appointment", Appointment.schema);

			await appointmentModel.findByIdAndDelete(appointmentId);

			res.json({ message: "cita cancelado status cambiado exitosamente" });
		} catch (error) {
			console.log(error);
		}
	}
);

/*create cita en el centro
en este metodo ya obtenemos los datos de la cita que vienen del frontend para poderla crear y el id del usuario/emplealdo al que estara la cita relacionada
*/
appointmentRouter.post(
	"/create-appointment/:selectedDB/:userId",
	isAuth,
	async (req, res) => {
		console.log("endpoint crear cita");
		try {
			const { selectedDB, userId } = req.params;

			const {
				clientName,
				clientPhone,
				date,
				initTime,
				finalTime,
				services,
				remarks,
			} = req.body;

			//selecting db
			const db = mongoose.connection.useDb(selectedDB);
			const appointmentModel = db.model("Appointment", Appointment.schema);
			const servicesModel = db.model("Service", Service.schema);

			const getAllServices = await servicesModel.find();

			// Verificar si hay conflictos de horario
			const checkEmployee = await appointmentModel.find({
				userInfo: userId,
				date,
			});
			const isTimeConflict = checkEmployee.some((appointment) => {
				if (appointment.isCancel) {
					console.log("no hay conflictos");
					return false;
				}
				const existingStartTime = new Date(
					`01/01/2000 ${appointment.initTime}`
				);
				const existingEndTime = new Date(`01/01/2000 ${appointment.finalTime}`);
				const newStartTime = new Date(`01/01/2000 ${initTime}`);
				const newEndTime = new Date(`01/01/2000 ${finalTime}`);

				// evita citas duplicadas
				if (
					newStartTime.getTime() === existingStartTime.getTime() && // Nuevo inicio coincide exactamente
					newEndTime.getTime() === existingEndTime.getTime() && // Nuevo final coincide exactamente
					clientName === appointment.clientName // El mismo cliente
				) {
					console.log(" hay conflictos tras validar");
					return true; // Hay conflicto de horario
				}
				console.log("no hay conflictos tras validar");
				return false; // no hay conflictos
			});

			if (isTimeConflict) {
				return res
					.status(400)
					.json({
						message:
							"El horario seleccionado está ocupado. Por favor, elige otro horario.",
					});
				// return false;
			}

			/**4.
			 * hago un mapeo con los servicios que tengo aqui en el archivo y reemplazo los daatos
			 * aqui los servicios ya van con la propiedad de color
			 */
			const matchingServices = getAllServices.filter((serviceFromDb) => {
				return services.some((selectedService) => {
					return serviceFromDb.serviceName === selectedService.serviceName;
				});
			});

			await appointmentModel.create({
				clientName,
				clientPhone,
				date,
				initTime,
				finalTime,
				services: matchingServices,
				userInfo: userId,
				centerInfo: req.user.centerInfo,
				remarks,
			});

			res.json({ message: "cita creada exitosamente" });
		} catch (error) {
			console.log(error);
			res.json({ message: "error en el servidor" });
		}
	}
);

///////////////////  RUTAS PARA SERVICES
//obtener todas las citas que ofrece una empresa,
appointmentRouter.get("/get-services/:selectedDB", isAuth, async (req, res) => {
	console.log("obtener citas");
	try {
		const { selectedDB } = req.params;

		//selecting db
		const db = mongoose.connection.useDb(selectedDB);
		const servicesModel = db.model("Service", Service.schema);

		const getAllServices = await servicesModel.find();
		res.json(getAllServices);
	} catch (error) {
		console.log(error);
		res.json({ message: "error en el servidor" });
	}
});

// crear nuevos services de una empresa
appointmentRouter.post(
	"/create-services/:selectedDB",
	isOwnerAdmin,
	async (req, res) => {
		console.log("obtener citas");
		try {
			const { selectedDB } = req.params;

			//selecting db
			const db = mongoose.connection.useDb(selectedDB);
			const servicesModel = db.model("Service", Service.schema);

			await servicesModel.create(req.body);

			res.json({ message: "working" });
		} catch (error) {
			console.log(error);
			res.json({ message: "error en el servidor" });
		}
	}
);

// editar services de una empresa
appointmentRouter.put(
	"/edit-services/:selectedDB/:id",
	isOwnerAdmin,
	async (req, res) => {
		try {
			const { selectedDB, id } = req.params;

			// conectandome a la base de dato seleccionada y seleccionando modelo
			const db = mongoose.connection.useDb(selectedDB);
			const servicesModel = db.model("Services", Service.schema);

			const isCenterDb = await servicesModel.findByIdAndUpdate(id, req.body);

			console.log(isCenterDb);

			res.json({ message: "service actualizado" });
		} catch (error) {
			console.log(error);
			res.json({ message: "error en el servidor" });
		}
	}
);

// se deja publica ya que el owneradmin y admin pueden acceder a ella
// si se controlara por autenticacion se tendria que repiter dos veces el mismo endpoint-
// uno para admin y otro para owneradmin
appointmentRouter.get("/get-specialities/:selectedDB", async (req, res) => {
	console.log("obtener citas");
	try {
		const { selectedDB } = req.params;

		//selecting db
		const db = mongoose.connection.useDb(selectedDB);
		const specialityModel = db.model("Speciality", Speciality.schema);

		const getAllSpecialities = await specialityModel.find();
		res.json(getAllSpecialities);
	} catch (error) {
		console.log(error);
		res.json({ message: "error en el servidor" });
	}
});

//este es en la parte del frontend para se abre un modal y se puede buscar una cita
appointmentRouter.get("/filter/:selectedDB", isAuth, async (req, res) => {
	console.log("endpoint filter");
	try {
		const { selectedDB } = req.params;
		const { clientName, clientPhone, centerInfo } = req.query; // Obtener los parámetros de búsqueda desde el query

		// Seleccionar la base de datos correspondiente
		const db = mongoose.connection.useDb(selectedDB);
		// const userModels = db.model("User", User.schema);

		const appointmentModels = db.model("Appointment", Appointment.schema);

		// Construir el filtro de búsqueda
		let searchCriteria = {};

		console.log(req.user.centerInfo);

		// Si el query 'name' está presente, agregar al filtro (usando una expresión regular para búsqueda parcial)
		if (clientName) {
			searchCriteria.clientName = { $regex: new RegExp(clientName, "i") }; // 'i' para que sea case-insensitive
		}

		// Si el query 'phone' está presente, agregar al filtro (usando una expresión regular para búsqueda parcial)
		if (clientPhone) {
			searchCriteria.clientPhone = { $regex: new RegExp(clientPhone, "i") }; // 'i' para que sea case-insensitive
		}

		if (req.user.centerInfo) {
			searchCriteria.centerInfo = req.user.centerInfo; // 'i' para que sea case-insensitive
		} else {
			// console.log('aqui')
			searchCriteria.centerInfo = centerInfo;
		}

		// Ejecutar la consulta con los criterios de búsqueda
		const results = await appointmentModels.find(searchCriteria);

		res.json(results); // Devolver los resultados filtrados
	} catch (error) {
		console.log(error);
		res.json({ message: "error en el servidor" });
	}
});

// Endpoint para importar el CSV y crear las citas
// recibe un query que es una fecha y hay que borrar todas las citas en esa fecha
appointmentRouter.post("/generar-horarios/:selectedDB", async (req, res) => {
	console.log('en generar horarios')

	
const results = req.body; 
const { dateToDelete, centerId } = req.query;
let filasProcesadas = 0;
const citasPorEmpleado = {};
const { selectedDB } = req.params;
const db = mongoose.connection.useDb(selectedDB);
const appointmentModel = db.model("Appointment", Appointment.schema);
const userModel = db.model("User", User.schema);

try {
    if (dateToDelete && centerId) {
        const momentDate = moment.tz(dateToDelete, "MM/DD/YYYY", "Europe/Madrid");
        const startOfMonth = momentDate.clone().startOf('month').format("MM/DD/YYYY");
        const endOfMonth = momentDate.clone().endOf('month').format("MM/DD/YYYY");

        await appointmentModel.deleteMany({
            date: { $gte: startOfMonth, $lte: endOfMonth },
            clientName: { $in: ["Libre", "Baja", "Vacaciones", "Año Nuevo", "Reyes", "Festivo", "Fuera de horario"] },
            centerInfo: centerId
        });
    }

    const promises = results.map(async row => {
        filasProcesadas++;
        const { ID_Trabajador, Fecha, Hora_Entrada, Hora_Salida } = {
            ID_Trabajador: row.ID_Trabajador?.trim(),
            Fecha: row.Fecha?.trim(),
            Hora_Entrada: row.Hora_Entrada?.trim(),
            Hora_Salida: row.Hora_Salida?.trim(),
        };

        if (!ID_Trabajador || ID_Trabajador.trim() === "") return;
        const trabajadorUppercase = ID_Trabajador.toUpperCase();
        const user = await userModel.findOne({ DNI: trabajadorUppercase });
        if (!user) return;

        const center = user.centerInfo;
        if (!center) return;

        const date = moment.tz(Fecha, "MM/DD/YYYY", "Europe/Madrid").format("MM/DD/YYYY");

        const appointments = [];

        if (["Libre", "Baja", "Vacaciones", "Año Nuevo", "Reyes", "Festivo"].includes(Hora_Entrada)) {
            appointments.push({
                clientName: Hora_Entrada,
                clientPhone: Hora_Entrada,
                date: date,
                initTime: "10:00:00",
                finalTime: "22:00:00",
                userInfo: user._id,
                centerInfo: center._id,
            });
        } else {
            const formattedHora_Entrada = moment(Hora_Entrada, "HH:mm:ss").format("HH:mm:ss");
            const formattedHora_Salida = moment(Hora_Salida, "HH:mm:ss").format("HH:mm:ss");

            if (formattedHora_Entrada !== "10:00:00") {
                appointments.push({
                    clientName: "Fuera de horario",
                    clientPhone: "Fuera de horario",
                    date: date,
                    initTime: "10:00:00",
                    finalTime: formattedHora_Entrada,
                    userInfo: user._id,
                    centerInfo: center._id,
                });
            }

            if (formattedHora_Salida !== "22:00:00") {
                appointments.push({
                    clientName: "Fuera de horario",
                    clientPhone: "Fuera de horario",
                    date: date,
                    initTime: formattedHora_Salida,
                    finalTime: "22:00:00",
                    userInfo: user._id,
                    centerInfo: center._id,
                });
            }
        }

        if (appointments.length > 0) {
            await appointmentModel.bulkWrite(appointments.map(app => ({ insertOne: { document: app } })));
            citasPorEmpleado[ID_Trabajador] = (citasPorEmpleado[ID_Trabajador] || 0) + appointments.length;
        }
    });

    await Promise.all(promises);

    res.status(200).json({
        message: "Citas importadas exitosamente",
        filasProcesadas,
        citasPorEmpleado,
    });
} catch (error) {
    console.error(error);
    res.status(500).send("Error al importar citas");
}

});






export default appointmentRouter;
