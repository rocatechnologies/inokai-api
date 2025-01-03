import mongoose from "mongoose";

const { Schema } = mongoose;

const centerSchema = new Schema({
    centerName: { type: String },
    address: { type: String },
    userInfo: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    phoneNumber: {type: String },
});

const Center = mongoose.model('Center', centerSchema);

export default Center;
