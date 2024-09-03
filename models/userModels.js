import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema({
    name: { type: String },
    email: { type: String },
    DNI:{ type: String, required: true },
    phone: { type: String },
    password: { type: String },
    role:{type:String,default:'ownerAdmin' },  //ownerAdmin(dueno de la app) o admin(gerentes de los centros) o employee(empleados de los centros)
    centerInfo: {
        type:Schema.Types.ObjectId,
        ref:"Center"
    },
    services:[{}],
    specialities:[{}] //anado este nuevo campo para darle un nuevo atributo llamado especialidad

});

const User = mongoose.model('User', userSchema);

export default User;
