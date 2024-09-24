import mongoose from "mongoose";

const { Schema } = mongoose;

const serviceSchema = new Schema({
    serviceName:{type:String},
    duration:{type:String},
    color: { type: String },
    specialities:[{ type: Schema.Types.ObjectId, ref: 'Speciality' }]

});

const Service = mongoose.model('Service', serviceSchema);

export default Service;
