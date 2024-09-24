import mongoose from "mongoose";

const { Schema } = mongoose;

const settingSchema = new Schema({
    primaryColor: { type: String },
    companyAddress:{type:String},
    companyId:{type:String},
    secondaryColor: { type: String },
    logo: [{}],
    smallLogo:[{}],
    status:{type:String, default:'active'} //options are   active / suspended
});

const Setting = mongoose.model('Setting', settingSchema);

export default Setting;
