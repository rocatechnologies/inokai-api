import mongoose from "mongoose";

const { Schema } = mongoose;

const serviceSchema = new Schema({
    serviceName:{type:String},
    duration:{type:String},
    color: { type: String },
    specialities:[{}]

});

const Service = mongoose.model('Service', serviceSchema);

export default Service;
