import express from 'express'
import mongoose from 'mongoose'
import Setting from '../models/settingModels.js'
import doesDatabaseExist from '../helpers/doesDatabaseExist.js'
import { upload } from '../helpers/multer.js'
import { cloudinaryUploadFiles, cloudinaryDeleteOneFile  } from '../helpers/cloudinaryConfig.js'


import {isOwnerAdmin } from '../utils.js'

const settingRouter = express.Router()


/// solo role owneradmin tiene acceso a estos endpoint
settingRouter.post('/crear-settings/:selectedDB', isOwnerAdmin, upload, async(req,res)=>{
    console.log('endpoint crear settings')

    try {
        const {selectedDB} = req.params

        const files = req.files

        // inicializando y conectandome a base de datos
        const db = mongoose.connection.useDb(selectedDB)
        const SettingModel = db.model('Setting',Setting.schema)
        
        const settings = new SettingModel(req.body)


        
        if(files.length > 0){
            // console.log(files)
            const cloudinaryResult = await cloudinaryUploadFiles(files, 'sergioR')
            settings.logo = cloudinaryResult
        }

        // console.log(settings)
        await settings.save()

        res.json({message:'setting creados sactifactoriamente'})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:'hubo un error en el servidor'})
    }

})

/// solo role owneradmin tiene acceso a estos endpoint
settingRouter.put('/edit-settings/:selectedDB/:settingId', isOwnerAdmin, upload, async(req,res)=>{
    console.log('endpoint edit settings')

    try {
        const {selectedDB, settingId} = req.params
        const files = req.files

        // inicializando y conectandome a base de datos
        const db = mongoose.connection.useDb(selectedDB)
        const SettingModel = db.model('Setting',Setting.schema)

        if(files.length > 0){
            const isSetting = await SettingModel.findById(settingId)
            const fileToDelete = isSetting.logo
            const cloudinaryResult = await cloudinaryUploadFiles(files, 'sergioR')

            for (const item of fileToDelete) {
                console.log(item.cloudinary_id)
                await cloudinaryDeleteOneFile(item.cloudinary_id)
            }
            req.body.logo = cloudinaryResult
        }

        await SettingModel.findByIdAndUpdate(settingId, req.body)

        res.json({message:'setting editado sactifactoriamente'})
    } catch (error) {
        console.log(error)
        res.status(500).json({message:'hubo un error en el servidor'})
    }

})




/**este endpoint es publico ya que es necesario para ver el estado de la company
 * ya que solo es un setting por empresa , ese es el motivo que usamos findOne
 * ya que solo se crear un setting y permitira editar solo ese mismo
 */
settingRouter.get('/get-settings/:selectedDB', async(req,res)=>{
    console.log('endpoint get settings')
    try {

        const {selectedDB} = req.params
        
        const dbExists = await doesDatabaseExist(selectedDB)
        if (!dbExists) {
            return res
            .status(404)
            .json({ message: "La base de datos seleccionada no existe" });
		}
        
        // inicializando y conectandome a base de datos
        const db = mongoose.connection.useDb(selectedDB)
        const SettingModel = db.model('Setting',Setting.schema)

        const setting = await SettingModel.findOne({})

        res.json(setting)
        
    } catch (error) {
        console.log(error)
        res.status(500).json({message:'hubo un error en el servidor'})
    }
})




export default settingRouter