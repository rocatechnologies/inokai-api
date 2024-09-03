import mongoose from "mongoose";

const { Schema } = mongoose;

const specialitySchema = new Schema({
    specialityName:{type:String}
});

const Speciality = mongoose.model('Speciality', specialitySchema);

export default Speciality;
