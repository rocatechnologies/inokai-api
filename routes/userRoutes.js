import express from "express";
import mongoose from "mongoose";
import User from "../models/userModels.js";
import Center from "../models/centerModels.js";
import Setting from "../models/settingModels.js";
import bcryptjs from "bcryptjs";
import { servicesDb } from "../servicesDb.js";

import generarJWT from "../helpers/generarJWT.js";
import doesDatabaseExist from "../helpers/doesDatabaseExist.js";
import { gettingAllCentersHelper } from "../helpers/dbHelpers.js";
import { isAdmin, isAuth, isOwnerAdmin } from "../utils.js";
// import Employee from "../models/employeeModels.js";

const userRouter = express.Router();

// LOGIN A USER PUBLICA TODOS PUEDEN INTENTAR LOGEARSE
userRouter.post("/login/:selectedDB", async (req, res) => {
	console.log(`en ruta login de ${req.params.selectedDB}`);

	try {
		const { selectedDB } = req.params;
		const { email, password } = req.body;

		// Verificar si la base de datos seleccionada existe
		const dbExists = await doesDatabaseExist(selectedDB);
		if (!dbExists) {
			return res
				.status(404)
				.json({ message: "La base de datos seleccionada no existe" });
		}

		// conectandome a la base de dato seleccionada y seleccionando modelo
		const db = mongoose.connection.useDb(selectedDB);
		const userModelSelected = db.model("User", User.schema);
		const SettingModel = db.model('Setting',Setting.schema) 


		// esta es una validadcion para restringir el acceso a cuentas suspendidas
		const setting = await SettingModel.findOne({})
		if(setting?.status == 'suspended'){
			return res.status(403).json({message:'Cuenta Suspendida'})
		}

		const isUserDb = await userModelSelected.findOne({ email });



		// checkeando credenciales email y password
		if (!isUserDb)
			return res.status(404).json({ message: "credenciales no validas" });
	    if(!bcryptjs.compareSync(password, isUserDb.password)){
            return res.status(401).json({message:'Credenciales no validas'})
        }

		const userAuthenticated = {
			email: isUserDb.email,
			name: isUserDb.name,
			role: isUserDb.role,
			token: generarJWT(isUserDb._id),
			company: selectedDB,
		};

		res.json(userAuthenticated);
	} catch (error) {
		console.log(error);
	}
});


// CREAR EMPRESA, CENTRO Y SU USUARIO(ADMIN)  (SOLO EL OwnerAdmin puede hacer esta accion)
userRouter.post("/crear-empresa/", isOwnerAdmin, async (req, res) => {
	console.log("en crear empresa");
	try {
		// const { selectedDB } = req.params;
		const { name, email, DNI, password, companyName, centers } = req.body;

		// Verificar si la base de datos seleccionada existe
		const dbExists = await doesDatabaseExist(companyName);

		if (dbExists) {
			return res
				.status(404)
				.json({ message: "este nombre para base de datos ya esta en uso" });
		}

		const db = mongoose.connection.useDb(companyName);

		const isUserDb = await db.model("User", User.schema).findOne({ email, DNI });
		if (isUserDb) {
			return res.status(400).json({ message: "Usuario ya registrado" });
		}

		const Users = db.model("User", User.schema);
		const Centers = db.model("Center", Center.schema);

		// encriptamos la pass
        const hashedPass =  bcryptjs.hashSync(password)

		await Users.create({
			name,
			email,
			DNI,
			password: hashedPass,
			role: "admin",
		});

		await Centers.create(centers);

		res
			.status(200)
			.send(`Empresa y usuario creados exitosamente. ${companyName}`);
	} catch (error) {
		console.log(error);
	}
});

// ENDPOINT PARA OBTENER TODAS LAS BASE DE DATOS Y SU USUARIO ADMIN DE TODO EL CLUSTER (SOLO EL OwnerAdmin puede hacer esta accion)
userRouter.get("/databases", isOwnerAdmin, async (req, res) => {
	console.log("da todas las base de datos al owner");
	try {
		// Obtener la lista de todas las bases de datos
		const adminDb = mongoose.connection.db.admin();
		const databaseList = (await adminDb.listDatabases()).databases;

		// para sacar el nombre de base de datos y el usuario admin
		const databasesInfo = [];
		for (const dbInfo of databaseList) {
			const dbName = dbInfo.name;


			if (dbName == "admin" || dbName == "local") {
				continue;
			}

			// Obtener la colección de usuarios en la base de datos actual
			const db = mongoose.connection.useDb(dbName);
			const userModelSelected = db.model("User", User.schema);

			const users = await userModelSelected.findOne({ role: "admin" });

			if (users) {
				databasesInfo.push({
					dbName: dbName,
					users: users,
				});
			}
		}

		// console.log(databaseList);
		// console.log(databasesInfo);
		res.json(databasesInfo);
	} catch (error) {
		console.error("Error al obtener la lista de bases de datos:", error);
		res.status(500).json({ error: "Error interno del servidor" });
	}
});

//OBTENER TODAS LOS CENTROS, Y EL USUARIO ADMIN DE ESOS CENTROS (SOLO EL OwnerAdmin puede hacer esta accion)
userRouter.get("/get-empresa/:selectedDB", isOwnerAdmin, async (req, res) => {
	console.log("en get-empresa");
	try {
		const { selectedDB } = req.params;

		const db = mongoose.connection.useDb(selectedDB);

		const collections = await db.listCollections();
		const data = {};

		for (const collectionInfo of collections) {
			const collectionName = collectionInfo.name;
			const collection = db.collection(collectionName);
			const documents = await collection.find().toArray();
			data[collectionName] = documents;
		}

		const rest = {
			centers: data.centers,
			users: data.users[0],
		};

		// console.log(rest)

		res.json(rest);
	} catch (error) {
		console.log(error);
		res.json({ message: "error en el servidor" });
	}
});

//EDITAR USUARIO ADMIN DE UNA EMPRESA
//:id  es el id del administrador de la empresa
userRouter.put("/edit-admin/:selectedDB/:id", isOwnerAdmin, async (req, res) => {
	console.log('endpoint editar admin de una empresa')
	try {
		const { selectedDB, id } = req.params;

		// conectandome a la base de dato seleccionada y seleccionando modelo
		const db = mongoose.connection.useDb(selectedDB);
		const userModelSelected = db.model("User", User.schema);

		const isUserDb = await userModelSelected.findByIdAndUpdate(id, req.body);

		console.log(isUserDb);

		res.json({ message: "usuario actulizado" });
	} catch (error) {
		console.log(error);
		res.json({ message: "error en el servidor" });
	}
});

//EDITAR CENTRO DE UNA EMPRESA SOLO EL OWNER APP PUEDE (SOLO EL OwnerAdmin puede hacer esta accion)
//:id es el id del centro a editar
userRouter.put("/edit-center/:selectedDB/:id", isOwnerAdmin, async (req, res) => {
	try {
		const { selectedDB, id } = req.params;

		// conectandome a la base de dato seleccionada y seleccionando modelo
		const db = mongoose.connection.useDb(selectedDB);
		const centerModelSelected = db.model("Center", Center.schema);

		const isCenterDb = await centerModelSelected.findByIdAndUpdate(
			id,
			req.body
		);

		console.log(isCenterDb);

		res.json({ message: "center actulizado" });
	} catch (error) {
		console.log(error);
		res.json({ message: "error en el servidor" });
	}
});

//crear centro de una empresa (SOLO EL OwnerAdmin puede hacer esta accion)
userRouter.post("/create-center/:selectedDB", isOwnerAdmin, async (req, res) => {
	console.log("endpoint para crear centro de una empresa");
	try {
		const { selectedDB } = req.params;

		const db = mongoose.connection.useDb(selectedDB);
		const Centers = db.model("Center", Center.schema);

		await Centers.create(req.body);

		res.json({ message: "working" });
	} catch (error) {
		console.log(error);
		res.json({ message: "error en el servidor" });
	}
});

//eliminar centros y sus empleados asociados (SOLO EL OwnerAdmin puede hacer esta accion)
userRouter.delete("/delete-center/:selectedDB/:id", isOwnerAdmin, async (req, res) => {
	try {
		const { selectedDB, id } = req.params;

		// conectandome a la base de dato seleccionada y seleccionando modelo
		const db = mongoose.connection.useDb(selectedDB);
		const centerModelSelected = db.model("Center", Center.schema);
		const userModel = db.model("User", User.schema);

		const employess = await userModel.deleteMany({ centerInfo: id });
		const isCenterDeleted = await centerModelSelected.findByIdAndDelete(id);

		// console.log(isCenterDeleted);
		// console.log(employess)

		res.json({ message: "centro y sus empleados eliminados" });
	} catch (error) {
		console.log(error);
		res.json({ message: "error en el servidor" });
	}
});

// Endpoint para eliminar una base de datos dinámicamente (SOLO EL OwnerAdmin puede hacer esta accion)
//:dbName es el nombre de la empresa a eliminar la cual es el nombre de la base de datos
userRouter.delete("/databases/:dbName", isOwnerAdmin, async (req, res) => {
	try {
		const { dbName } = req.params;

		// Verificar si la base de datos existe antes de intentar eliminarla
		const databaseExists = await doesDatabaseExist(dbName);
		if (!databaseExists) {
			return res.status(404).json({ message: "La base de datos no existe" });
		}

		// Eliminar la base de datos
		await mongoose.connection.useDb(dbName).dropDatabase();

		res.json(`La base de datos '${dbName}' ha sido eliminada exitosamente`);
	} catch (error) {
		console.error("Error al eliminar la base de datos:", error);
		res.status(500).json({ error: "Error interno del servidor" });
	}
});





///////////// ENDPOINTS PARA ADMIN NORMAL(gerente de una empresa y sus centros)

//get all centers
userRouter.get("/get-all-centers/:selectedDB", isAuth, isAdmin, async (req, res) => {
	console.log("en coseguir todos los centros");
	try {
		const { selectedDB } = req.params;

		//selecting database
		const db = mongoose.connection.useDb(selectedDB);

		//getting all collection centers
		const allCenters = await gettingAllCentersHelper(db);

		// const centerModels = db.model('Center', Center.schema)

		res.json(allCenters);
	} catch (error) {
		console.log(error);
		res.json({ message: "error en el servidor" });
	}
});

//create empleado en el centro
userRouter.post("/create-employee/:selectedDB/:centerId", isAuth, isAdmin, async (req, res) => {
	console.log("endpoint crear empleado");
	try {
		//1. proceso de obtner los params los datos del frontend, y seleccionar la base de datos
		const { selectedDB, centerId } = req.params;
		const { name, email, DNI, phone, password, services } = req.body;
		const db = mongoose.connection.useDb(selectedDB);

		//2. aqui se hace referencias a los schema de las bases de datos que se usaran en el endpont
		const Users = db.model("User", User.schema);
		const Centers = db.model("Center", Center.schema);

		//3. aqui solo se busca si el empleado ya existe para no dejarlo crear de nuevo
		const isEmployee = await Users.findOne({ $or: [{ email }, { DNI }] });
		if (isEmployee) {
			return res.status(400).json({ message: "Empleado ya registrado" });
		}

		/**4.
		 * aqui servicios ya que el formato que ocupo es diferente solo obtengo los datos del frontend
		 * hago un mapeo con los servicios que tengo aqui en el archivo y reemplazo los daatos
		 * aqui los servicios ya van con la propiedad de color
		 */
		const matchingServices = servicesDb.filter((serviceDb) => {
			return req.body.services.some((selectedService) => {
				return serviceDb.serviceName === selectedService.serviceName;
			});
		});

	    //  here we encrypt the password
		const hashedPass =  bcryptjs.hashSync(password)

		// return res.json('hola')
		const employee = await Users.create({
			name,
			email,
			phone,
			DNI,
			password: hashedPass,
			services: matchingServices,
			role: "employee",
			centerInfo: centerId,
		});

		const centers = await Centers.findById(centerId);
		centers.userInfo.push(employee._id);

		await centers.save();

		res.json({ message: "empleado creado exitosamente" });
	} catch (error) {
		console.log(error);
		res.json({ message: "error en el servidor" });
	}
});

//editar empleado
userRouter.put("/edit-employee/:selectedDB/:employeeId", isAuth, isAdmin, async (req, res) => {
	console.log("en editar empleado");
	try {
		const { selectedDB, employeeId } = req.params;

		const db = mongoose.connection.useDb(selectedDB);
		const UserModel = db.model("User", User.schema);

		/*
		 * hago un mapeo con los servicios que tengo aqui en el archivo y reemplazo los daatos
		 * aqui los servicios ya van con la propiedad de color
		 */
		const matchingServices = servicesDb.filter((serviceDb) => {
			return req.body.services.some((selectedService) => {
				return serviceDb.serviceName === selectedService.serviceName;
			});
		});

		req.body.services = matchingServices;

		await UserModel.findByIdAndUpdate(employeeId, req.body);

		res.json({ message: "empleado actulizado" });
	} catch (error) {
		console.log(error);
		res.json({ message: "error en el servidor" });
	}
});

//editar correo de empleado
userRouter.patch("/edit-employee-email/:selectedDB/:employeeEmail",isAuth, isAdmin, async (req, res) => {
		console.log("en editar email");
		try {
			const { selectedDB, employeeEmail } = req.params;
			const { email } = req.body;

			const db = mongoose.connection.useDb(selectedDB);
			const UserModel = db.model("User", User.schema);

			const isUser = await UserModel.findOne({ email });

			if (isUser) {
				return res.json({ message: "Empleado con este correo ya existe" });
			}

			const newEmail = await User.findOne({ email: employeeEmail });

			newEmail.email = email;

			await newEmail.save();

			res.json({ message: "email actulizado" });
		} catch (error) {
			console.log(error);
			res.json({ message: "error en el servidor" });
		}
	}
);

//eliminar empleado
userRouter.delete("/delete-employee/:selectedDB/:id", isAuth, isAdmin, async (req, res) => {
	try {
		const { selectedDB, id } = req.params;

		const db = mongoose.connection.useDb(selectedDB);
		const UserModel = db.model("User", User.schema);

		const isEmployeeDeleted = await UserModel.findByIdAndDelete(id);

		res.json({ message: "employee deleted" });
	} catch (error) {
		console.log(error);
		res.json({ message: "error en el servidor" });
	}
});

//conseguir todos los empleados de una empresa
userRouter.get("/get-all-employees/:selectedDB", isAuth, isAdmin, async (req, res) => {
	console.log("en la de user get all employees");

	try {
		const { selectedDB } = req.params;

		const db = mongoose.connection.useDb(selectedDB);
		const Users = db.model("User", User.schema);
		const CenterModel = db.model("Center", Center.schema); // Modelo de Center

		const users = await Users.find()
			.populate("centerInfo", "centerName")
			.exec();
		// console.log(employees);

		const userOutput = users.filter((item) => item.role != "admin");

		// console.log(userOutput)
		res.json(userOutput);
	} catch (error) {
		console.log(error);
		res.json({ message: "error en el servidor" });
	}
});

export default userRouter;
