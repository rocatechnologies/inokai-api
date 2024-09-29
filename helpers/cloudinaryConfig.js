import { v2 as cloudinary } from "cloudinary";



cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
/*
    this function helps you to upload multiple raw files to cloudinary
    parameter files => it is the information of the files you want to upload this info is provided by multer
    parameter folder => you can send the name of the folder you want to upload the files it can also be a string
*/
const cloudinaryUploadFiles = async (files, folder) => {
  console.log('aqui en la func')
  try {
    const filesCloudinaryInfo = [];

    for (const file of files) {
      const { path, originalname } = file;
      const newPath = await cloudinary.uploader.upload(path, {
        // resource_type: "raw", // this is to accept any type of document likes office docuemnt if you are just only acept image do not use this option
        //folder: `actas/${folder}`,//this works when you create a root folder in home and want to create folder inside there for your project
        folder:folder, // this will create the folder just in the root directory of cloudinary the home folder
        use_filename: true,
        unique_filename: true,
        filename_override: originalname,
      });

      const resolve = {
        cloudinary_id: newPath.public_id,
        cloudinary_url: newPath.secure_url,
        originalname: file.originalname,
      };
      filesCloudinaryInfo.push(resolve);
    }
    // console.log(filesCloudinaryInfo,'aqui')

    return filesCloudinaryInfo;

  } catch (error) {
    console.log(error);
  }
};


//this delete one file or list of file if you use a loop to pass all the prublic id to delete
const cloudinaryDeleteOneFile = async(public_id)=>{
  console.log(public_id ,'en la funcion')
    const result = await cloudinary.uploader.destroy(public_id)
    // console.log(result,'result eliminar')
    return result
}



export {cloudinaryUploadFiles,cloudinaryDeleteOneFile}