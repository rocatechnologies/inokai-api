// contactModel.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const contactsSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone1: { type: String, required: true },
  phone2: { type: String, required: false },
  email: { type: String, required: true },
  observations: { type: String, required: false },
  editable: { type: Boolean, default: true }, // New editable attribute
  centerInfo: [{ type: Schema.Types.ObjectId, ref: 'Center' }], // Array of Center ObjectIds
});

// Create a model from the schema
const Contact = mongoose.model('Contact', contactsSchema);

export default Contact;