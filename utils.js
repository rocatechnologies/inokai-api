import jwt from "jsonwebtoken";
import User from "./models/userModels.js";
import mongoose from "mongoose";

//middleware to check authentication
//middleware to check authentication
export const isAuth = async (req, res, next) => {

    const { selectedDB } = req.params;

	let token;

	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith("Bearer")
	) {
		try {
			token = req.headers.authorization.split(" ")[1];

			const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const db = mongoose.connection.useDb(selectedDB)

            const UserModel = db.model('User', User.schema)

			req.user = await UserModel.findById(decoded.id).select("-password");
			const testingt = await UserModel.findOne({_id: decoded.id}).select("-password");

			if (req.user == null) {
				return res
					.status(401)
					.json({ message: "usuario no existe en base de datos" });
			}

			return next();
		} catch (error) {
			return res.status(404).json({ message: "hubo un error" });
		}
	}

	if (!token) {
		return res.status(401).json({ message: "no hay token(no autorizado)" });
	}

	next();
};

export const isAdmin = (req, res, next) => {
	
	if (req.user.role != 'admin') {
		return res.status(401).send({ message: "you are not an Admin" });
	}

	next();
};



export const isOwnerAdmin =async (req, res, next) => {
	let token;

	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith("Bearer")
	) {
		try {
			token = req.headers.authorization.split(" ")[1];

			const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const db = mongoose.connection.useDb('ownerAdmin')

			console.log(decoded)

            const UserModel = db.model('User', User.schema)

			req.ownerAdmin = await UserModel.findById(decoded.id).select("-password");
			// const testingt = await UserModel.findOne({_id: decoded.id}).select("-password");

			if (req.ownerAdmin == null) {
				return res
					.status(401)
					.json({ message: "usuario no existe en base de datos" });
			}

			if (req.ownerAdmin.role != 'ownerAdmin') {
				return res.status(401).send({ message: "you are not an Owner Admin" });
			}
		

			return next();
		} catch (error) {
			return res.status(404).json({ message: "hubo un error" });
		}
	}

	if (!token) {
		return res.status(401).json({ message: "no hay token(no autorizado)" });
	}

	next();
};

