// notesModels.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const notesSchema = new Schema({
  text: { type: String, required: true },
  date: { type: String, required: true }, // Formato DD/MM/AAAA como string
  centerInfo: { type: Schema.Types.ObjectId, ref: 'Center', required: true }, // Referencia a un documento de "Center"
});

// Crear el modelo a partir del esquema
const Note = mongoose.model('Note', notesSchema);

export default Note;