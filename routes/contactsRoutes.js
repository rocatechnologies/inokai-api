import express from "express";
import mongoose from "mongoose";
import Contact from "../models/contactsModels.js"; 
import { isAuth } from "../utils.js"; 

const contactRouter = express.Router();

//create
contactRouter.post("/", isAuth, async (req, res) => {
    try {
        const { centerIds, firstName, lastName, phone1, phone2, email, observations } = req.body;

        const newContact = new Contact({
            centerIds,
            firstName,
            lastName,
            phone1,
            phone2,
            email,
            observations,
            editable: true // Default value, can be changed based on your requirements
        });

        const savedContact = await newContact.save();
        res.status(201).json(savedContact);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating contact" });
    }
});

//getall
contactRouter.get("/:selectedDB", isAuth, async (req, res) => {
    try {
        const { selectedDB } = req.params;
        const { centerId } = req.query; // Get centerId from query parameters

        // Select the database
        const db = mongoose.connection.useDb(selectedDB);
        const ContactModel = db.model("Contact", Contact.schema);

        const contacts = await ContactModel.find({ centerIds: centerId }); // Find contacts by centerId
        res.json(contacts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching contacts" });
    }
});

//update
contactRouter.put("/:selectedDB/:contactId", isAuth, async (req, res) => {
    try {
        const { selectedDB, contactId } = req.params;
        const db = mongoose.connection.useDb(selectedDB);
        const ContactModel = db.model("Contact", Contact.schema);

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
//borrar
contactRouter.delete("/:selectedDB/:contactId", isAuth, async (req, res) => {
    try {
        const { selectedDB, contactId } = req.params;
        const db = mongoose.connection.useDb(selectedDB);
        const ContactModel = db.model("Contact", Contact.schema);

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
