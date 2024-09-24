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
    specialities:[{ type: Schema.Types.ObjectId, ref: 'Speciality' }], //anado este nuevo campo para darle un nuevo atributo llamado especialidad

    isAvailable: { 
        type: String, 
        enum: ["yes", "no", "not applicable"],
        default: "yes"  // 'yes' para disponible, 'no' para no disponible, y 'not applicable' para roles que no sean employee
    }

});


// Middleware para establecer isAvailable según el role
userSchema.pre('save', function (next) {
    if (this.role !== 'employee') {
        this.isAvailable = "not applicable";  // Si el role no es 'employee', asigna "not applicable"
    }
    next();
});

const User = mongoose.model('User', userSchema);

export default User;
