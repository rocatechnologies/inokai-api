import express from "express";
import mongoose from "mongoose";
import User from "../models/userModels.js";
import Appointment from "../models/appointmentModels.js";
import { servicesDb } from "../servicesDb.js";
import { isAuth } from "../utils.js";
import Service from "../models/servicesModels.js";

const appointmentRouter = express.Router();

/* get all employees of a center by employee logged in
este es para obtener los datos que van el el select del formulario crear cita en el frontend
asi los usuarios podran agendar citas de otros colegas seleccionando su nombre en crear citas
*/
appointmentRouter.get("/get-all-employees/:selectedDB",isAuth,async (req, res) => {
		console.log("en conseguir todos los empleados");

		try {
			const { selectedDB } = req.params;
			const { centerInfo } = req.user;

			//selecting database
			const db = mongoose.connection.useDb(selectedDB);
			const UserModel = db.model("User", User.schema);

			const isEmployees = await UserModel.find({ centerInfo }).select("name");
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
appointmentRouter.get("/get-all-appointments/:selectedDB",isAuth,async (req, res) => {
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
appointmentRouter.put("/edit-appointment/:selectedDB/:appointmentId",isAuth,async (req, res) => {
		console.log("endpoint editar cita");
		try {
			const { selectedDB, appointmentId } = req.params;
			//selecting the db
			const db = mongoose.connection.useDb(selectedDB);
			const appointmentModel = db.model("Appointment", Appointment.schema);
			const servicesModel = db.model("Service", Service.schema);

			const getAllServices = await servicesModel.find()

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
appointmentRouter.delete("/cancel-appointment/:selectedDB/:appointmentId",isAuth,async (req, res) => {
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
en este metodo ya obtenemos los datos de la cita que vienen del frontend para poderla crear y el id del usuario al que estara la cita relacionada
*/
appointmentRouter.post("/create-appointment/:selectedDB/:userId",isAuth,async (req, res) => {
		console.log("endpoint crear cita");
		try {
			const { selectedDB, userId } = req.params;

			const { clientName, clientPhone, date, initTime, finalTime, services } =req.body;

			//selecting db
			const db = mongoose.connection.useDb(selectedDB);
			const appointmentModel = db.model("Appointment", Appointment.schema);
			const servicesModel = db.model("Service", Service.schema);

			const getAllServices = await servicesModel.find()


			// Verificar si hay conflictos de horario
			const checkEmployee = await appointmentModel.find({	userInfo: userId,date});
			const isTimeConflict = checkEmployee.some((appointment) => {
				if (appointment.isCancel) {
					console.log('no hay conflictos');
					return false;
					
				}
                console.log(' hay conflictos');
				const existingStartTime = new Date(`01/01/2000 ${appointment.initTime}`);
				console.log('existingStartTime:' + `${appointment.initTime}`);
				const existingEndTime = new Date(`01/01/2000 ${appointment.finalTime}`);
				console.log('existingEndTime:' + `${appointment.finalTime}`);
				const newClientName = new String (`${clientName}`);
				console.log('newClientName:' + `${clientName}`);
				const existingClientName = new String (`${appointment.clientName}`);
				console.log('existingClientName:' + `${appointment.clientName}`);
				const newStartTime = new Date(`01/01/2000 ${initTime}`);
				console.log('newStartTime:' + `${initTime}`);
				const newEndTime = new Date(`01/01/2000 ${finalTime}`);
				console.log('newEndTime:' + `${finalTime}`);

                
				// Verificar si hay solapamiento de horario
				if (
					newStartTime.getTime() === existingStartTime.getTime() && // Nuevo inicio coincide exactamente
					newEndTime.getTime() === existingEndTime.getTime() && // Nuevo final coincide exactamente
					clientName === appointment.clientName // El mismo cliente
					 // Nuevo horario completamente cubre el horario existente
				) {
					console.log(' hay conflictos tras validar');
					return true; // Hay conflicto de horario

				}
				console.log('no hay conflictos tras validar');
				return false; // no hay conflictos
			});

			if (isTimeConflict) {
				return res.status(400).json({message:"El horario seleccionado está ocupado. Por favor, elige otro horario.",});
			}

			/**4.
			 * hago un mapeo con los servicios que tengo aqui en el archivo y reemplazo los daatos
			 * aqui los servicios ya van con la propiedad de color
			 */
			const matchingServices = getAllServices.filter((serviceFromDb) => {
				return req.body.services.some((selectedService) => {
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
			});

			res.json({ message: "cita creada exitosamente" });
		} catch (error) {
			console.log(error);
			res.json({ message: "error en el servidor" });
		}
	}
);



//obtener citas que ofrece una empresa, 
appointmentRouter.get('/get-services/:selectedDB' , isAuth, async(req,res)=>{
	console.log('obtener citas')
	try {

		const {selectedDB} = req.params

		//selecting db
		const db = mongoose.connection.useDb(selectedDB);
		const servicesModel = db.model("Service", Service.schema);

		const getAllServices = await servicesModel.find()
		res.json(getAllServices)
		
	} catch (error) {
		console.log(error);
		res.json({ message: "error en el servidor" });
	}
})

export default appointmentRouter;
