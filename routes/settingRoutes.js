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

        // codigo para separar el large del small logo y guardarlos separados en la base de datos
        const isLarge =  files.find(e => e.originalname.includes('large-l-ino24'))
        const isSmall =  files.find(e => e.originalname.includes('small-l-ino24'))
        if(isLarge){
            const cloudinaryResult = await cloudinaryUploadFiles([isLarge], 'sergioR')
            settings.logo = cloudinaryResult
        }
        if(isSmall){
            const cloudinaryResult = await cloudinaryUploadFiles([isSmall], 'sergioR')
            settings.smallLogo = cloudinaryResult
        }


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

        //de dispara esta funciona si la ediccion viene con alguna imagen de logo
        if(files.length > 0){
            const isSetting = await SettingModel.findById(settingId)

            const isLarge =  files.find(e => e.originalname.includes('large-l-ino24'))
            const isSmall =  files.find(e => e.originalname.includes('small-l-ino24'))

            let fileToDelete = []

            //codigo para separar small de large loco editarlos y eliminar el correspondiente
            if(isLarge){
                // console.log('si hay large')
                const cloudinaryResult = await cloudinaryUploadFiles([isLarge], 'sergioR')
                req.body.logo = cloudinaryResult
                fileToDelete = [...fileToDelete, ...isSetting?.logo]
                // console.log(fileToDelete,'en large')
            }
            if(isSmall){
                // console.log('si hay small')
                const cloudinaryResult = await cloudinaryUploadFiles([isSmall], 'sergioR')
                req.body.smallLogo = cloudinaryResult
                fileToDelete = [...fileToDelete, ...isSetting?.smallLogo]
                // console.log(fileToDelete, 'en small')
            }
            //aqui los elimina del cloudinary
            for (const item of fileToDelete) {
                // console.log(item.cloudinary_id)
                await cloudinaryDeleteOneFile(item.cloudinary_id)
            }
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