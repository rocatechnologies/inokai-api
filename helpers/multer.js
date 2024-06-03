
import multer from 'multer'
import path from 'path'

const upload = multer({
    storage:multer.diskStorage({}),
    filename:function(req,file,cb){
        console.log(file.originalname)
        cb(null,file.originalname)
    },

    fileFilter:function(req,file,callback){
        var ext = path.extname(file.originalname)
        if(ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg' && ext !== '.gif') { //just accepting those types of files
            return callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE'))
        }
        callback(null, true)
    },

    limits:{fileSize:5000000,files:3,fieldSize: 25 * 1024 * 1024}
}).array('uploadImages')

export {upload}
