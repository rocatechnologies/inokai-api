import express from "express";
import mongoose from "mongoose";
import Contact from "../models/contactsModels.js"; 
import { isAuth } from "../utils.js"; 

const contactRouter = express.Router();

// Create a new contact
contactRouter.post("/:selectedDB", isAuth, async (req, res) => {
    try {
        const { selectedDB } = req.params; // Get the selected database
        const { centerInfo, firstName, lastName, phone1, phone2, email, observations } = req.body;

        // Select the database
        const db = mongoose.connection.useDb(selectedDB);
        const ContactModel = db.model("Contact", Contact.schema); // Use the schema directly

        const newContact = new ContactModel({
            centerInfo,
            firstName,
            lastName,
            phone1,
            phone2,
            email,
            observations,
            editable: true // Default value
        });

        const savedContact = await newContact.save();
        res.status(201).json(savedContact);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating contact" });
    }
});

// Get all contacts by centerId
contactRouter.get("/:selectedDB", isAuth, async (req, res) => {
    try {
        const { selectedDB } = req.params;
        const { centerInfo } = req.query; // Get centerId from query parameters

        // Select the database
        const db = mongoose.connection.useDb(selectedDB);
        const ContactModel = db.model("Contact", Contact.schema); // Use the schema directly

        const contacts = await ContactModel.find({ centerInfo: centerInfo }); // Find contacts by centerId
        res.json(contacts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching contacts" });
    }
});

// Update a contact
contactRouter.put("/:selectedDB/:contactId", isAuth, async (req, res) => {
    try {
        const { selectedDB, contactId } = req.params; // Get the selected database and contactId
        const db = mongoose.connection.useDb(selectedDB);
        const ContactModel = db.model("Contact", Contact.schema); // Use the schema directly

        const updatedContact = await ContactModel.findByIdAndUpdate(contactId, req.body, { new: true });
        
        if (!updatedContact) {
            return res.status(404).json({ message: "Contact not found" });
        }

        res.json(updatedContact);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating contact" });
    }
});

// Delete a contact
contactRouter.delete("/:selectedDB/:contactId", isAuth, async (req, res) => {
    try {
        const { selectedDB, contactId } = req.params; // Get the selected database and contactId
        const db = mongoose.connection.useDb(selectedDB);
        const ContactModel = db.model("Contact", Contact.schema); // Use the schema directly

        const deletedContact = await ContactModel.findByIdAndDelete(contactId);
        
        if (!deletedContact) {
            return res.status(404).json({ message: "Contact not found" });
        }

        res.json({ message: "Contact deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting contact" });
    }
});

export default contactRouter;
