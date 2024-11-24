import mongoose from "mongoose";

const { Schema } = mongoose;

const appointmentSchema = new Schema({
    clientName: { type: String },
    clientPhone: { type: String },
    date: { type: String },
    initTime: { type: String },
    finalTime: { type: String },
    userInfo: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    centerInfo: {
        type:Schema.Types.ObjectId,
        ref:"Center"
    },
    services:[{}],

    remarks: {type:String},
    createdBy: { type: String},
    status: {type: String},
    createdAt: {type: String}

});

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;