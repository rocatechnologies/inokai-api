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
appointmentRouter.get(
	"/get-all-appointments/:selectedDB",
	isAuth,
	async (req, res) => {
	  console.log("En conseguir todos los appointments");
  
	  try {
		const { selectedDB } = req.params;
		const { centerInfo } = req.user;
		const { filterDate, filterCenter } = req.query;
  
		console.log(filterDate, "viendo el filter date");
		console.log(centerInfo, "viendo el center info");
  
		// Seleccionar base de datos
		const db = mongoose.connection.useDb(selectedDB);
		const appointmentModel = db.model("Appointment", Appointment.schema);
		const userModel = db.model("User", User.schema);
  
		// Construcción de la query de citas
		const appointmentQuery = {
		  centerInfo: filterCenter || centerInfo,
		  date: filterDate,
		  status: { $in: ["confirmed", "no-show", ""] }, // Buscar citas con estado "confirmed" o ""
		};
  
		// Obtener citas y usuarios
		const [appointments, allUsers] = await Promise.all([
		  appointmentModel
			.find(appointmentQuery)
			.populate("userInfo") // Incluye información del usuario asociado
			.exec(),
		  userModel.find({ centerInfo }).sort({ order: 1 }), // Ordenar usuarios por `order`
		]);
  
		const usersInAppointments = [];
		const emailSet = new Set();
		const appointments2 = [];
  
		// Formatear datos de citas
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
			user_id: userData?._id, // Manejar el caso en que no haya usuario asociado
			centerInfo: data.centerInfo,
			services: data.services,
			remarks: data.remarks,
			createdAt: data.createdAt,
			createdBy: data.createdBy,
			status: data.status,
		  };
  
		  appointments2.push(myObjet);
  
		  if (userData && !emailSet.has(userData.email)) {
			emailSet.add(userData.email);
			usersInAppointments.push({
			  email: userData.email,
			  name: userData.name,
			  user_id: userData._id,
			  profileImgUrl: userData.profileImgUrl,
			  order: userData.order, // Asegúrate de incluir `order`
			});
		  }
		}
  
		// Agregar usuarios sin citas al resultado
		const usersWithoutAppointments = allUsers
		  .filter((user) => !emailSet.has(user.email))
		  .map((user) => ({
			email: user.email,
			name: user.name,
			user_id: user._id,
			profileImgUrl: user.profileImgUrl,
			order: user.order, // Asegúrate de incluir `order`
		  }));
  
		usersInAppointments.push(...usersWithoutAppointments);
  
		// Ordenar `usersInAppointments` por `order` (ascendente)
		usersInAppointments.sort((a, b) => a.order - b.order);
  
		res.json({ appointments2, usersInAppointments });
	  } catch (error) {
		console.error(error);
		res.status(500).json({ message: "Error en el servidor" });
	  }
	}
  );
/////////////////////// get week appointments by user 
appointmentRouter.get(
    "/get-user-week-appointments/:selectedDB",
    isAuth,
    async (req, res) => {
      console.log("En conseguir citas del usuario para la semana");
  
      try {
        const { selectedDB } = req.params;
        const { userId, date } = req.query; // `userId` y `date` enviados desde el frontend
  
        if (!userId || !date) {
          return res
            .status(400)
            .json({ message: "Por favor proporciona el userId y la fecha." });
        }
  
        // Seleccionar base de datos
        const db = mongoose.connection.useDb(selectedDB);
        const appointmentModel = db.model("Appointment", Appointment.schema);
        const userModel = db.model("User", User.schema);
  
        // Calcular inicio y fin de la semana (lunes a domingo)
        const givenDate = new Date(date);
        const startOfWeek = new Date(givenDate);
        const endOfWeek = new Date(givenDate);
  
        startOfWeek.setDate(givenDate.getDate() - givenDate.getDay() + 1); // Lunes
        startOfWeek.setHours(0, 0, 0, 0); // Comienza a medianoche
        endOfWeek.setDate(givenDate.getDate() - givenDate.getDay() + 7); // Domingo
        endOfWeek.setHours(23, 59, 59, 999); // Termina al final del día
  
        // Convertir fechas a cadenas
        const formatToMMDDYYYY = (date) => {
          const month = (date.getMonth() + 1).toString().padStart(2, "0");
          const day = date.getDate().toString().padStart(2, "0");
          const year = date.getFullYear();
          return `${month}/${day}/${year}`;
        };
  
        const formattedStartOfWeek = formatToMMDDYYYY(startOfWeek);
        const formattedEndOfWeek = formatToMMDDYYYY(endOfWeek);
  
        console.log("Rango de la semana:", formattedStartOfWeek, formattedEndOfWeek);
  
        // Construir query
        const query = {
            userInfo: userId,
            date: {
              $gte: formatToMMDDYYYY(startOfWeek),
              $lte: formatToMMDDYYYY(endOfWeek),
            },
          };
    
  
        // Obtener citas del usuario
        const userAppointments = await appointmentModel.find(query).populate("userInfo");
  
        console.log("Citas del usuario:", userAppointments);
  
        // Formatear respuesta
        const formattedAppointments = userAppointments.map((appointment) => ({
          _id: appointment._id,
          clientName: appointment.clientName,
          clientPhone: appointment.clientPhone,
          date: appointment.date,
          initTime: appointment.initTime,
          finalTime: appointment.finalTime,
          isCancel: appointment.isCancel,
          centerInfo: appointment.centerInfo,
          services: appointment.services,
          remarks: appointment.remarks,
          createdAt: appointment.createdAt,
          createdBy: appointment.createdBy,
          status: appointment.status,
          userInfo: appointment.userInfo
            ? {
                _id: appointment.userInfo._id,
                name: appointment.userInfo.name,
                email: appointment.userInfo.email,
                profileImgUrl: appointment.userInfo.profileImgUrl,
              }
            : null,
        }));
  
        res.json({ appointments2: formattedAppointments, usersInAppointments: [formattedAppointments[0]['userInfo']], });

      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error en el servidor" });
      }
    }
  );



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
			req.body.modifiedAt = new Date();

			await appointmentModel.findByIdAndUpdate(appointmentId, req.body);

			res.json({ message: "cita editada exitosamente" });
		} catch (error) {
			console.log(error);
		}
	}
);

// cancelar cita
appointmentRouter.delete(
	"/cancel-appointment/:selectedDB/:appointmentId",
	isAuth,
	async (req, res) => {
		console.log("endpoint cancelar cita");
		try {
			const { selectedDB, appointmentId } = req.params;

			const db = mongoose.connection.useDb(selectedDB);
			const appointmentModel = db.model("Appointment", Appointment.schema);

			const updatedAppointment = await appointmentModel.findByIdAndUpdate(
				appointmentId,
				{ status: "canceled", modifiedAt: new Date() },
				{ new: true }
			);

			if (!updatedAppointment) {
				return res.status(404).json({ message: "Cita no encontrada" });
			}

			res.json({
				message: "Cita cancelada y estado actualizado exitosamente",
				appointment: updatedAppointment,
			});
		} catch (error) {
			console.log(error);
			res.status(500).json({ message: "Error en el servidor" });
		}
	}
);
// noswhow cita
appointmentRouter.put(
	"/no-show-appointment/:selectedDB/:appointmentId",
	isAuth,
	async (req, res) => {
		console.log("endpoint cambiar a No presentado cita");
		try {
			const { selectedDB, appointmentId } = req.params;

			const db = mongoose.connection.useDb(selectedDB);
			const appointmentModel = db.model("Appointment", Appointment.schema);

			const updatedAppointment = await appointmentModel.findByIdAndUpdate(
				appointmentId,
				{ status: "no-show", modifiedAt: new Date() },
				{ new: true }
			);

			if (!updatedAppointment) {
				return res.status(404).json({ message: "Cita no encontrada" });
			}

			res.json({
				message: "Cita no presentada y estado actualizado exitosamente",
				appointment: updatedAppointment,
			});
		} catch (error) {
			console.log(error);
			res.status(500).json({ message: "Error en el servidor" });
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
				return res.status(400).json({
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
				createdBy: "Manual",
				createdAt: new Date(),
				status: "confirmed",
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

appointmentRouter.get("/filter/:selectedDB", isAuth, async (req, res) => {
	try {
		const { selectedDB } = req.params;
		const { clientName, clientPhone, centerInfo } = req.query;

		// Seleccionar la base de datos correspondiente
		const db = mongoose.connection.useDb(selectedDB);
		const appointmentModels = db.model("Appointment", Appointment.schema);

		// Construir el filtro de búsqueda
		let searchCriteria = {};

		console.log(req.user.centerInfo);

		// Función para normalizar texto eliminando acentos y caracteres diacríticos
		function normalizeText(text) {
			return text
				.normalize("NFD") // Descomponer caracteres como á en a + ́
				.replace(/[\u0300-\u036f]/g, "") // Eliminar diacríticos
				.toLowerCase(); // Convertir a minúsculas para comparación uniforme
		}

		// Si el query 'clientName' está presente
		if (clientName) {
			const normalizedClientName = normalizeText(clientName);

			searchCriteria.$or = [
				{
					clientName: {
						$regex: clientName,
						$options: "i", // Insensible a mayúsculas
					},
				},
				{
					clientName: {
						$regex: normalizedClientName,
						$options: "i", // Insensible a mayúsculas
					},
				},
			];
		}

		// Si el query 'clientPhone' está presente
		if (clientPhone) {
			searchCriteria.clientPhone = { $regex: clientPhone, $options: "i" };
		}

		// Manejar el filtro de centerInfo
		if (req.centerInfo && req.centerInfo.trim() !== "") {
			searchCriteria.centerInfo = req.centerInfo;
		} else {
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

appointmentRouter.post("/horario-manual/:selectedDB", async (req, res) => {
	console.log("=== En horario manual ===");

	const { date, employee, startTime, endTime, type } = req.body; // Añadimos el campo type
	const { selectedDB } = req.params;

	console.log("Entrada recibida:");
	console.log("Database seleccionada:", selectedDB);
	console.log("Datos del body:", { date, employee, startTime, endTime, type });

	const db = mongoose.connection.useDb(selectedDB);
	const appointmentModel = db.model("Appointment", Appointment.schema);
	const userModel = db.model("User", User.schema);

	try {
		// Validar entrada
		if (!date || !employee || !startTime || !endTime) {
			console.log("Faltan datos obligatorios:", {
				date,
				employee,
				startTime,
				endTime,
			});
			return res
				.status(400)
				.json({ message: "Todos los campos son obligatorios" });
		}

		// Obtener el usuario
		console.log("Buscando usuario con ID:", employee);
		const user = await userModel.findById(employee);
		if (!user) {
			console.log("Usuario no encontrado.");
			return res.status(404).json({ message: "Empleado no encontrado" });
		}

		console.log("Usuario encontrado:", user);

		const centerId = user.centerInfo;
		if (!centerId) {
			console.log("Centro no asignado al empleado.");
			return res
				.status(404)
				.json({ message: "Centro no asignado al empleado" });
		}

		console.log("Centro asignado al empleado:", centerId);

        // Borrar citas existentes para ese día y empleado
        console.log("Eliminando citas existentes para el día:", date);
        await appointmentModel.deleteMany({
            date: date,
            userInfo: employee,
            clientName: { $in: ["Libre", "Baja", "Vacaciones", "Año Nuevo","Compensado", "Reyes", "Festivo", "Fuera de horario"] }
        });
        console.log("Citas eliminadas para el empleado en la fecha especificada.");

		// Borrar citas existentes para ese día y empleado
		console.log("Eliminando citas existentes para el día:", date);
		await appointmentModel.deleteMany({
			date: date,
			userInfo: employee,
			clientName: {
				$in: [
					"Libre",
					"Baja",
					"Vacaciones",
					"Año Nuevo",
					"Reyes",
					"Festivo",
					"Fuera de horario",
				],
			},
		});
		console.log("Citas eliminadas para el empleado en la fecha especificada.");

		// Crear nuevas citas basadas en horario
		const appointments = [];
		const formattedStartTime = moment(startTime, "HH:mm").format("HH:mm");
		const formattedEndTime = moment(endTime, "HH:mm").format("HH:mm");

		console.log("Hora de inicio formateada:", formattedStartTime);
		console.log("Hora de fin formateada:", formattedEndTime);

		if (type) {
			// Si type viene rellenado, crear una cita con ese tipo como clientName
			console.log("Creando cita con tipo:", type);
			appointments.push({
				clientName: type,
				clientPhone: type,
				date: date,
				initTime: formattedStartTime,
				finalTime: formattedEndTime,
				userInfo: user._id,
				centerInfo: centerId,
			});
		} else {
			// Si type no viene, comportamiento predeterminado
			console.log("Creando citas predeterminadas (Fuera de horario).");
			if (formattedStartTime !== "10:00") {
				console.log(
					"Añadiendo cita 'Fuera de horario' antes de la hora de entrada."
				);
				appointments.push({
					clientName: "Fuera de horario",
					clientPhone: "Fuera de horario",
					date: date,
					initTime: "10:00",
					finalTime: formattedStartTime,
					userInfo: user._id,
					centerInfo: centerId,
					status: "confirmed",
				});
			}

			if (formattedEndTime !== "22:00") {
				console.log(
					"Añadiendo cita 'Fuera de horario' después de la hora de salida."
				);
				appointments.push({
					clientName: "Fuera de horario",
					clientPhone: "Fuera de horario",
					date: date,
					initTime: formattedEndTime,
					finalTime: "22:00",
					userInfo: user._id,
					centerInfo: centerId,
					status: "confirmed",
				});
			}
		}

		console.log("Citas preparadas para insertar:", appointments);

		if (appointments.length > 0) {
			console.log("Insertando citas en la base de datos.");
			await appointmentModel.bulkWrite(
				appointments.map((app) => ({ insertOne: { document: app } }))
			);
		} else {
			console.log("No hay citas para insertar.");
		}

		console.log(
			"Proceso completado. Total citas creadas:",
			appointments.length
		);
		res.status(200).json({
			message: "Horario manual establecido correctamente",
			citasCreadas: appointments.length,
		});
	} catch (error) {
		console.error("Error durante el proceso:", error);
		res.status(500).send("Error al establecer el horario manual");
	}
});

appointmentRouter.post(
	"/intercambio-horarios/:selectedDB",
	async (req, res) => {
		console.log("En intercambio de horarios");

		const { employee1, employee2, date1, date2 } = req.body;
		const { selectedDB } = req.params;

		const db = mongoose.connection.useDb(selectedDB);
		const appointmentModel = db.model("Appointment", Appointment.schema);
		const userModel = db.model("User", User.schema);

		try {
			// Validar entrada
			if (!employee1 || !employee2 || !date1 || !date2) {
				return res
					.status(400)
					.json({ message: "Todos los campos son obligatorios" });
			}

			// Validar usuarios
			const user1 = await userModel.findById(employee1);
			const user2 = await userModel.findById(employee2);

			if (!user1 || !user2) {
				return res
					.status(404)
					.json({ message: "Uno o ambos empleados no encontrados" });
			}

			// Formatear fechas
			const formattedDate1 = moment
				.tz(date1, "MM/DD/YYYY", "Europe/Madrid")
				.format("MM/DD/YYYY");
			const formattedDate2 = moment
				.tz(date2, "MM/DD/YYYY", "Europe/Madrid")
				.format("MM/DD/YYYY");

			// Filtrar citas relevantes para ambos empleados y días
			const appointmentsEmployee1 = await appointmentModel.find({
				date: formattedDate1,
				userInfo: employee1,
				clientName: {
					$in: [
						"Libre",
						"Baja",
						"Vacaciones",
						"Año Nuevo",
						"Reyes",
						"Festivo",
						"Fuera de horario",
					],
				},
			});

			const appointmentsEmployee2 = await appointmentModel.find({
				date: formattedDate2,
				userInfo: employee2,
				clientName: {
					$in: [
						"Libre",
						"Baja",
						"Vacaciones",
						"Año Nuevo",
						"Reyes",
						"Festivo",
						"Fuera de horario",
					],
				},
			});

			// Validar que haya citas para intercambiar
			if (
				appointmentsEmployee1.length === 0 ||
				appointmentsEmployee2.length === 0
			) {
				return res
					.status(404)
					.json({ message: "No hay citas disponibles para intercambiar" });
			}

			// Cambiar los días y empleados de las citas
			const updatedAppointments1 = appointmentsEmployee1.map((app) => ({
				...app._doc,
				date: formattedDate2,
				userInfo: employee2,
				centerInfo: user2.centerInfo, // Cambiar el centro si es diferente
			}));
        // Filtrar citas relevantes para ambos empleados y días
        // const appointmentsEmployee1 = await appointmentModel.find({
        //     date: formattedDate1,
        //     userInfo: employee1,
        //     clientName: { $in: ["Libre", "Baja", "Vacaciones", "Año Nuevo","Compensado", "Reyes", "Festivo", "Fuera de horario"] }
        // });

        // const appointmentsEmployee2 = await appointmentModel.find({
        //     date: formattedDate2,
        //     userInfo: employee2,
        //     clientName: { $in: ["Libre", "Baja", "Vacaciones", "Año Nuevo","Compensado", "Reyes", "Festivo", "Fuera de horario"] }
        // });

			const updatedAppointments2 = appointmentsEmployee2.map((app) => ({
				...app._doc,
				date: formattedDate1,
				userInfo: employee1,
				centerInfo: user1.centerInfo, // Cambiar el centro si es diferente
			}));

			// Eliminar las citas antiguas
			await appointmentModel.deleteMany({
				$or: [
					{ date: formattedDate1, userInfo: employee1 },
					{ date: formattedDate2, userInfo: employee2 },
				],
			});

			// Insertar las nuevas citas actualizadas
			await appointmentModel.insertMany([
				...updatedAppointments1,
				...updatedAppointments2,
			]);

			res.status(200).json({
				message: "Intercambio de horarios realizado correctamente",
				citasIntercambiadas: {
					empleado1: updatedAppointments1.length,
					empleado2: updatedAppointments2.length,
				},
			});
		} catch (error) {
			console.error(error);
			res.status(500).send("Error al realizar el intercambio de horarios");
		}
	}
);

// Endpoint para importar el CSV y crear las citas
// recibe un query que es una fecha y hay que borrar todas las citas en esa fecha
appointmentRouter.post("/generar-horarios/:selectedDB", async (req, res) => {
	console.log("en generar horarios");

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
			const startOfMonth = momentDate
				.clone()
				.startOf("month")
				.format("MM/DD/YYYY");
			const endOfMonth = momentDate.clone().endOf("month").format("MM/DD/YYYY");

			await appointmentModel.deleteMany({
				date: { $gte: startOfMonth, $lte: endOfMonth },
				clientName: {
					$in: [
						"Libre",
						"Baja",
						"Vacaciones",
						"Año Nuevo",
						"Reyes",
						"Festivo",
						"Fuera de horario",
					],
				},
				centerInfo: centerId,
			});
		}

		const promises = results.map(async (row) => {
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

			const date = moment
				.tz(Fecha, "MM/DD/YYYY", "Europe/Madrid")
				.format("MM/DD/YYYY");

			const appointments = [];

			if (
				[
					"Libre",
					"Baja",
					"Vacaciones",
					"Año Nuevo",
					"Reyes",
					"Festivo",
				].includes(Hora_Entrada)
			) {
				appointments.push({
					clientName: Hora_Entrada,
					clientPhone: Hora_Entrada,
					date: date,
					initTime: "10:00",
					finalTime: "22:00",
					userInfo: user._id,
					centerInfo: center._id,
					status: "confirmed",
				});
			} else {
				const formattedHora_Entrada = moment(Hora_Entrada, "HH:mm:ss").format(
					"HH:mm"
				);
				const formattedHora_Salida = moment(Hora_Salida, "HH:mm:ss").format(
					"HH:mm"
				);

				if (formattedHora_Entrada !== "10:00") {
					appointments.push({
						clientName: "Fuera de horario",
						clientPhone: "Fuera de horario",
						date: date,
						initTime: "10:00",
						finalTime: formattedHora_Entrada,
						userInfo: user._id,
						centerInfo: center._id,
						status: "confirmed",
					});
				}

				if (formattedHora_Salida !== "22:00") {
					appointments.push({
						clientName: "Fuera de horario",
						clientPhone: "Fuera de horario",
						date: date,
						initTime: formattedHora_Salida,
						finalTime: "22:00",
						userInfo: user._id,
						centerInfo: center._id,
						status: "confirmed",
					});
				}
			}

			if (appointments.length > 0) {
				await appointmentModel.bulkWrite(
					appointments.map((app) => ({ insertOne: { document: app } }))
				);
				citasPorEmpleado[ID_Trabajador] =
					(citasPorEmpleado[ID_Trabajador] || 0) + appointments.length;
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

// Conseguir todos los empleados de una empresa v2
appointmentRouter.get("/get-all-employees-v2/:selectedDB", async (req, res) => {
	console.log("En la de user get all employees");
	
	try {
	  const { selectedDB } = req.params;
	  const { centerId } = req.query; // Obtener el centerId de los parámetros de consulta
  
	  // Validar base de datos
	  if (!selectedDB || typeof selectedDB !== "string") {
		return res.status(400).json({ message: "Base de datos no válida." });
	  }
  
	  if (!centerId || typeof centerId !== "string") {
		return res.status(400).json({ message: "centerId no proporcionado o no válido." });
	  }
  
	  const db = mongoose.connection.useDb(selectedDB);
	  const Users = db.model("User", User.schema);
  
	  // Obtener empleados con el nombre del centro usando aggregate
	  const users = await Users.aggregate([
		{ 
		  $match: { 
			role: { $ne: "admin" }, 
			centerInfo: new mongoose.Types.ObjectId(centerId) // Corregido: usar 'new' al instanciar ObjectId
		  } 
		},
		{
		  $lookup: {
			from: "centers", // Nombre de la colección de centros
			localField: "centerInfo", // Campo en la colección de usuarios
			foreignField: "_id", // Campo en la colección de centros
			as: "centerDetails" // Nombre del campo resultante con los datos del centro
		  }
		},
		{
		  $unwind: "$centerDetails" // Desenrolla el array de resultados
		},
		{
			$project: {
			  name: 1,
			  DNI: 1,
			  email: 1,
			  role: 1,
			  order: 1, // Asegúrate de incluir el campo `order` en el resultado
			  "centerDetails.centerName": 1 // Ajustado para reflejar el nombre del centro correctamente
			}
		  },
		  {
			$sort: { order: 1 } // Ordenar por el campo `order` en orden ascendente
		  }
		]);
  
	  res.json(users);
	} catch (error) {
	  console.error("Error al obtener empleados:", error);
	  res.status(500).json({ message: "Error en el servidor. Por favor, intenta más tarde." });
	}
  });
    
export default appointmentRouter;