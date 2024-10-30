import express from "express";
import cors from "cors";
import "dotenv/config";
import mongoose from "mongoose";


const server = express();

// server.use(express.json());
// server.use(express.urlencoded({ extended: true }));
server.use(express.json({ limit: '50mb' }));
server.use(express.urlencoded({ limit: '50mb', extended: true })); 

server.use(cors());


import userRouter from "./routes/userRoutes.js";
import appointmentRouter from "./routes/appointmentRoutes.js";
import settingRouter from "./routes/settingRoutes.js";
import contactRouter from "./routes/contactsRoutes.js";
import cronRouter from './routes/cronRoute.js'

server.use('/api/cron', cronRouter)
server.use("/api/users", userRouter);
server.use('/api/appointment', appointmentRouter)
server.use('/api/settings', settingRouter)
server.use('/api/contacts', contactRouter)

mongoose.set("strictQuery", false);
mongoose
	.connect(process.env.MONGO_URI)
	.then(() => console.log("Data Base Connected"))
	.catch((err) => console.log(err));

const PORT = 4000 || process.env.PORT;
server.listen(PORT, () => {
	console.log("server running");
});


