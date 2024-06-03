import mongoose from "mongoose";
// Función para verificar si una base de datos existe
async function doesDatabaseExist(dbName) {
	const databaseList = await mongoose.connection.db.admin().listDatabases();
	return databaseList.databases.some((db) => db.name === dbName);
}

export default doesDatabaseExist