// notesRoutes.js
import express from "express";
import mongoose from "mongoose";
import Note from "../models/notesModel.js";
import { isAuth } from "../utils.js";

const noteRouter = express.Router();

// Crear una nueva nota
noteRouter.post("/:selectedDB", isAuth, async (req, res) => {
    try {
        const { selectedDB } = req.params;
        const { centerInfo, text } = req.body;
        const date = new Date().toLocaleDateString("es-ES"); // Formato DD/MM/AAAA

        const db = mongoose.connection.useDb(selectedDB);
        const NoteModel = db.model("Note", Note.schema);

        const newNote = new NoteModel({
            centerInfo,
            text,
            date,
        });

        const savedNote = await newNote.save();
        res.status(201).json(savedNote);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating note" });
    }
});

// Obtener todas las notas por centerInfo
noteRouter.get("/:selectedDB", isAuth, async (req, res) => {
    try {
        const { selectedDB } = req.params;
        const { centerInfo } = req.query;

        const db = mongoose.connection.useDb(selectedDB);
        const NoteModel = db.model("Note", Note.schema);

        const notes = await NoteModel.find({ centerInfo });
        res.json(notes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching notes" });
    }
});

// Obtener todas las notas sin filtrar por centro
noteRouter.get("/:selectedDB/all", isAuth, async (req, res) => {
    try {
        const { selectedDB } = req.params;

        const db = mongoose.connection.useDb(selectedDB);
        const NoteModel = db.model("Note", Note.schema);

        const notes = await NoteModel.find();
        res.json(notes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching notes" });
    }
});

// Actualizar una nota
noteRouter.put("/:selectedDB/:noteId", isAuth, async (req, res) => {
    try {
        const { selectedDB, noteId } = req.params;
        const { text } = req.body;

        const db = mongoose.connection.useDb(selectedDB);
        const NoteModel = db.model("Note", Note.schema);

        const updatedNote = await NoteModel.findByIdAndUpdate(noteId, { text }, { new: true });

        if (!updatedNote) {
            return res.status(404).json({ message: "Note not found" });
        }

        res.json(updatedNote);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating note" });
    }
});

// Eliminar una nota
noteRouter.delete("/:selectedDB/:noteId", isAuth, async (req, res) => {
    try {
        const { selectedDB, noteId } = req.params;

        const db = mongoose.connection.useDb(selectedDB);
        const NoteModel = db.model("Note", Note.schema);

        const deletedNote = await NoteModel.findByIdAndDelete(noteId);

        if (!deletedNote) {
            return res.status(404).json({ message: "Note not found" });
        }

        res.json({ message: "Note deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting note" });
    }
});

export default noteRouter;
