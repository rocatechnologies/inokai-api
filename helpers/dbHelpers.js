import Center from "../models/centerModels.js";

const getDocuments = async(db, collectionName)=>{
    const collection = db.collection(collectionName);
    const documents = await collection.find().toArray();
    // data[collectionName] = documents;

    return collectionName = documents
} 




const gettingAllCentersHelper = async(dataBase)=>{
    const userModelSelected = dataBase.model("Center", Center.schema);
    const centers = await userModelSelected.find().select("-address  -__v")
    return centers
}




export {
    getDocuments,
    gettingAllCentersHelper
} 