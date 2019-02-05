//const Document = require('node-pdfbox');
import * as path from "path"

//const ack = require('ack-host/ack-node')
//const pdfBoxJarPath = path.join(__dirname,'pdfbox-app-2.0.3.jar')
const ackPdfBoxPath = require.resolve("ack-pdfbox")
const ackPdfBoxJarPath = path.join(ackPdfBoxPath, "../", "dist","ackpdfbox-1.0-SNAPSHOT-jar-with-dependencies.jar")
//const ackPdfBoxJarPath = path.join(__dirname, "ackpdfbox-1.0-SNAPSHOT-jar-with-dependencies.jar")
//const pdfBoxJarPath = path.join(__dirname,"ackpdfbox-1.0-SNAPSHOT-jar-with-dependencies.jar")
import * as fs from "fs"

function opsOntoSpawnArgs(options, sArgs){
  for(let name in options){
    if(!options[name] || !options[name].toString)continue;//value not a string, skip it
    sArgs.push( '-'+name )
    sArgs.push( options[name].toString() )
  }
}

function figureOutAndOptions(outputPathOrOptions, options?){
  let outputPath = ''
  
  if(outputPathOrOptions){//2nd arg defined?
    if(outputPathOrOptions.split){//is string for output path?
      outputPath = outputPathOrOptions
    }else{
      options = outputPathOrOptions//its actually options
    }
  }

  options = {...options}//param and clone

  return {options:options, outputPath:outputPath}
}

const Commander = {
  embedFormFields(pdfPath, fieldArray, outPdfPath, options){
    const jsonFilePath = getTempFilePath('json','tempAcroformJson_')
    const sArgs = ['-jar', ackPdfBoxJarPath, 'fill', pdfPath, jsonFilePath, outPdfPath]
    
    if(options && options.flatten){
      sArgs.push('-flatten')
      sArgs.push('true')
    }
    
    fieldArray = JSON.stringify(fieldArray, null, 2)

    return new Promise(function(res,rej){
      fs.writeFile(jsonFilePath, fieldArray, err=>{
        if(err)return rej(err)
        res({
          processor:'embedFormFields',
          args:sArgs,
          jsonFilePath:jsonFilePath
        })
      })
    })
  },
  addImages(pdfPathOrBuffer, imgPathArray, options){
    options = options ? {...options} : {}//clone
    const sArgs = ['-jar', ackPdfBoxJarPath, 'add-image']
    const fromFile = pdfPathOrBuffer.constructor==String
    let toBuffer = false
    let deleteOut = false
    let promise = Promise.resolve(pdfPathOrBuffer)
    const tempPath = getTempFilePath('pdf','addImages')
    const imagePaths = []
    let buffDelete = null

    function cleanup( x? ){
      if(deleteOut && options.out==tempPath){
        fs.unlink(options.out,e=>e)
      }

      imagePaths.forEach(item=>{
        if(item.isBase64)fs.unlink(item.path,e=>e)
      })

      if(buffDelete){
        fs.unlink(buffDelete,e=>e)
      }

      return x
    }

    //discover pdf or buffer to pdf-file
    if(fromFile){
      sArgs.push( pdfPathOrBuffer )
      deleteOut = options.toBuffer || !options.out
      options.out = deleteOut ? tempPath : options.out
    }else{
      deleteOut = true
      toBuffer = !options.out
      options.out = options.out || tempPath
      promise = promise.then( ()=>bufferToFile(pdfPathOrBuffer,'pdf','addImages'))
      .then(buffPath=>{
        buffDelete = buffPath
        sArgs.push(buffPath)
      })
    }

    if(options.toBuffer){
      toBuffer = options.toBuffer
      delete options.toBuffer
    }

    //add image args (possibly cast base64 to file)
    return promise.then(()=>{
      const promises = []

      if(imgPathArray.constructor!=Array){
        imgPathArray = [imgPathArray]
      }

      imgPathArray.forEach(item=>{
        promises.push(
          imgDefToPath(item)
          .then(imgPath=>{
            imagePaths.push({path:imgPath, isBase64:item!=imgPath})
            sArgs.push(imgPath)
          })
        )
      })
      
      return Promise.all(promises)
    })
    .then(()=>{
      opsOntoSpawnArgs(options, sArgs)
      return {
        processor:'addImages', cleanup:cleanup, args:sArgs,
        toBuffer:toBuffer, deleteOut:deleteOut, out:options.out
      }
    })
  },
  getFormFields:function(pdfPath){
    return {processor:'getFormFields', args:['-jar', ackPdfBoxJarPath, 'read', pdfPath]}
  },
  sign:function(pdfPath, outputPathOrOptions, options){
    let args = figureOutAndOptions(outputPathOrOptions, options)
    const sArgs = ['-jar', ackPdfBoxJarPath, 'sign']

    sArgs.push(args.options.keyStore)
    delete args.options.keyStore
    
    sArgs.push(args.options.password)
    delete args.options.password
    
    sArgs.push(pdfPath)
    delete args.options.pdfPath

    opsOntoSpawnArgs(args.options, sArgs)

    if(args.outputPath){
      sArgs.push('-out')
      sArgs.push(args.outputPath)
    }

    return {processor:'sign', args:sArgs}
  },
  encrypt(pdfPath, outputPathOrOptions, options){
    let args = figureOutAndOptions(outputPathOrOptions, options)
    const sArgs = ['-jar', ackPdfBoxJarPath, 'Encrypt', pdfPath]

    //password is actually -U and must be changed out
    if(args.options.password){
      args.options.U = args.options.password
      delete args.options.password
    }
    opsOntoSpawnArgs(args.options, sArgs)

    if(args.outputPath){
      sArgs.push(args.outputPath)
    }

    return {processor:'encrypt', args:sArgs}
  },
  decrypt(pdfPath, outputPathOrOptions, options){
    let args = figureOutAndOptions(outputPathOrOptions, options)
    const sArgs = ['-jar', ackPdfBoxJarPath, 'Decrypt', pdfPath]

    opsOntoSpawnArgs(args.options, sArgs)

    if(args.outputPath){
      sArgs.push(args.outputPath)
    }

    return {processor:'decrypt', args:sArgs}
  },
  pdfToImage(pdfPath, options){
    options = options || {}
    options.endPage = 1
    const sArgs = ['-jar', ackPdfBoxJarPath, 'pdftoimage', pdfPath]
    opsOntoSpawnArgs(options, sArgs)
    return {processor:'pdfToImage', args:sArgs}
  }
}

const Processor = {
  sign:function(command){
    return promiseJavaSpawn(command.args)
    .then(test=>{
      if(test && test.search && test.search('java.security.cert.CertificateExpiredException')){
        const err = new Error(test)
        err["details"] = "signing certificate is invalid"
        err["code"] = 498
        throw err
      }
    })
  },
  addImages:function(command){
    return promiseJavaSpawn(command.args)
    .then(res=>command.toBuffer ? fileToBuffer(command.out, command.deleteOut) : res)
    .then(x=>command.cleanup(x))
    .catch(e=>{
      command.cleanup()
      throw e
    })
  },
  embedFormFields:function(command){
    return promiseJavaSpawn(command.args)
    .then(data=>{
      fs.unlink(command.jsonFilePath,function(){})
      return data
    })
    .catch(e=>{
      fs.unlink(command.jsonFilePath,function(){})
      throw e
    })
  }
}

function promiseJavaSpawn(sArgs):Promise<string>{
  return new Promise((res,rej)=>{
    const dataArray = []
    const spawn = require('child_process').spawn;

    //Hackish and may need eventual change. Real issue is Java outputting extra logging    
    //sArgs.unshift('-Xmx2048m')//set memory to prevent Java verbose log of "Picked up _JAVA_OPTIONS: -Xmx2048m -Xms512m"
    //sArgs.unshift('-Xms512m')//set memory to prevent Java verbose log of "Picked up _JAVA_OPTIONS: -Xmx2048m -Xms512m"
    
    const ls = spawn('java', sArgs);
    let spawnError = null

    const upgradeError = err=>{
      if(!err)return err

      if(err.message){
        let msg = err.msg
        msg += '\njava-exec-args:'+ JSON.stringify(sArgs)
        err = new Error(msg)
      }else if(err.split){
        let msg = err
        msg += '\njava-exec-args:'+ JSON.stringify(sArgs)
        err = new Error(msg)
      }

      return err
    }

    ls.stdout.on('data', data=>dataArray.push(data));
    ls.stderr.on('data', data=>dataArray.push(data));

    ls.stdout.on('error', err=>spawnError=err)
    ls.stderr.on('error', err=>spawnError=err)

    ls.on('close', code=>{
      if(spawnError){
        return rej( upgradeError(spawnError) )
      }

      const output = dataArray.join('')//bring all cli data together

      if(
          output.substring(0, 6)=='Error:'
      ||  output.substring(0, 9)=='Exception'
      ||  output.substring(0, 6)=='Usage:'
      ||  output.search('java.io')>=0
      ){
        return rej( upgradeError(output) )
      }

      res( output )
    })
  })
}

export class PdfBoxCliWrap{
  public static jarPath = ackPdfBoxJarPath//helpful ref to where Jar file lives

  static promiseJavaSpawn(sArgs){
    return promiseJavaSpawn(sArgs)
  }

  /** Returns array of objects
  @pdfPath - The PDF file to read form fields from
  */
  static getFormFields(pdfPath){
    const sArgs = Commander.getFormFields(pdfPath).args
    return promiseJavaSpawn(sArgs)
    .then( res=>trimJavaResponseToJson(res) )
    .then(data=>{
      data = data.trim()
      if(data.substring(data.length-1)==','){
        data = data.substring(0, data.length-1)//somehow a comma is being added?
      }

      return JSON.parse(data)
    })
  }
  
  /** Returns object of objects where key is fullyQualifiedName of PDF Acroform field
  @pdfPath - The PDF file to read form fields from
  */
  static getFormFieldsAsObject(pdfPath){
    return this.getFormFields(pdfPath)
    .then(data=>{
      const rtnOb = {}
      for(let x=0; x < data.length; ++x){
        rtnOb[ data[x].fullyQualifiedName ] = data[x]
      }
      return rtnOb
    })
  }

  /**
    @pdfPath - The PDF file to encrypt
    @outputPathOrOptions - The file to save the document to. If left blank then it will be the same as the input file || options
    @options{
      password Password to the PDF or certificate in keystore.
      keyStore Path to keystore that holds certificate to decrypt the document. This is only required if the document is encrypted with a certificate, otherwise only the password is required.
      tsa
    }

  */
  static sign(pdfPath, outputPathOrOptions, options){
    const command = Commander.sign(pdfPath, outputPathOrOptions, options)
    return Processor.sign(command)
  }

  /** see sign method */
  static signToBuffer(pdfPath, outputPathOrOptions, options?){
    let args = figureOutAndOptions(outputPathOrOptions, options)
    const writePath = getTempFilePath('pdf', 'tempSign')

    return this.sign(pdfPath, writePath, args.options)
    .then(msg=>fileToBuffer(writePath, true))
  }

  /** see sign method */
  static signByBuffer(buffer, options){
    let writePath = null
    return bufferToFile(buffer,'pdf','signByBuffer')
    .then( tempSignPath=>writePath=tempSignPath )
    .then( ()=>this.signToBuffer(writePath, options) )
    .then(data=>{
      fs.unlink(writePath,e=>e)
      return data
    })
    .catch(e=>{
      fs.unlink(writePath,e=>e)
      throw e
    })
  }

  /** Takes array of objects and sets values of PDF Acroform fields
    @pdfPath - The PDF file to read form fields from
    @fieldArray - Array of PDF field definitions
    @outPdfPath - Where to write PDF that has been filled
    @options - {
      flatten:false
    }
  */
  static embedFormFields(pdfPath, fieldArray, outPdfPath, options?){
    return Commander.embedFormFields(pdfPath, fieldArray, outPdfPath, options)
    .then(command=>Processor.embedFormFields(command))
  }

  /** Takes objects of objects and sets values of PDF Acroform fields
  @pdfPath - The PDF file to read form fields from
  @fieldArray - Array of PDF field definitions
  @outPdfPath - Where to write PDF that has been filled
  */
  static embedFormFieldsByObject(pdfPath, fields, outPdfPath){
    const fieldArray = []
    for(let x in fields){
      fieldArray.push( fields[x] )
    }
    return this.embedFormFields(pdfPath, fieldArray, outPdfPath);
  }

  /**
    @pdfPath - The PDF file to encrypt
    @outputPathOrOptions - The file to save the document to. If left blank then it will be the same as the input file || options
    @options - {
      O                          The owner password to the PDF, ignored if -certFile is specified.
      U                          The user password to the PDF, ignored if -certFile is specified.
      password                   Alias of option U
      certFile                   Path to X.509 cert file.
      canAssemble                true  Set the assemble permission.
      canExtractContent          true  Set the extraction permission.
      canExtractForAccessibility true  Set the extraction permission.
      canFillInForm              true  Set the fill in form permission.
      canModify                  true  Set the modify permission.
      canModifyAnnotations       true  Set the modify annots permission.
      canPrint                   true  Set the print permission.
      canPrintDegraded           true  Set the print degraded permission.
      keyLength                  40, 128 or 256  The number of bits for the encryption key. For 128 and above bits Java Cryptography Extension (JCE) Unlimited Strength Jurisdiction Policy Files must be installed.
    }
  */
  static encrypt(pdfPath, outputPathOrOptions, options){
    const sArgs = Commander.encrypt(pdfPath, outputPathOrOptions, options).args
    return promiseJavaSpawn(sArgs)
    .then( res=>trimJavaResponseToJson(res) )
  }

  static encryptToBuffer(pdfPath, options){
    let args = figureOutAndOptions(options)
    const encTempPath = getTempFilePath('pdf','encryptToBuffer')

    return this.encrypt(pdfPath, encTempPath, options)
    .then(()=>fileToBuffer(encTempPath, true))
  }

  /**
    @pdfPath - The PDF file to encrypt
    @outputPathOrOptions - The file to save the document to. If left blank then it will be the same as the input file || options
    @options - {
      password Password to the PDF or certificate in keystore.
      keyStore Path to keystore that holds certificate to decrypt the document. This is only required if the document is encrypted with a certificate, otherwise only the password is required.
      alias    The alias to the certificate in the keystore.
    }
  */
  static decrypt(pdfPath, outputPathOrOptions, options){
    const sArgs = Commander.decrypt(pdfPath, outputPathOrOptions, options).args
    return promiseJavaSpawn(sArgs)
    .then( res=>trimJavaResponseToJson(res) )
  }

  static decryptToBuffer(pdfPath, options){
    let args = figureOutAndOptions(options)
    const decTempPath = getTempFilePath('pdf','decryptToBuffer')

    return this.decrypt(pdfPath, decTempPath, options)
    .then(msg=>fileToBuffer(decTempPath, true))
  }

  static encryptByBuffer(buffer, options){
    let encTempPath = null
    
    return bufferToFile(buffer, 'pdf', 'encryptByBuffer')
    .then(path=>encTempPath=path)
    .then(()=>this.encryptToBuffer(encTempPath, options))
    .then(buffer=>{
      fs.unlink(encTempPath,e=>e)
      return buffer
    })
    .catch(e=>{
      fs.unlink(encTempPath,e=>e)
      throw e
    })
  }

  static decryptByBuffer(buffer, options){
    let wPath = null
    return bufferToFile(buffer, 'pdf', 'decryptByBuffer')
    .then(writePath=>wPath=writePath)
    .then(()=>this.decryptToBuffer(wPath, options))
    .then(buffer=>{
      fs.unlink(wPath,e=>e)
      return buffer
    })
    .catch(e=>{
      fs.unlink(wPath,e=>e)
      throw e
    })
  }

  /** produces png/jpg images in same folder as pdf
    @pdfPath - The PDF file to make images from
    @options{
      password      : The password to the PDF document.
      imageType=jpg : The image type to write to. Currently only jpg or png.
      outputPrefix  : Name of PDF document The prefix to the image file.
      startPage=1   : The first page to convert, one based.
      endPage=1       : The last page to convert, one based.
      nonSeq        : false Use the new non sequential parser.
    }
  */
  static pdfToImage(pdfPath, options){
    const sArgs = Commander.pdfToImage(pdfPath, options).args
    return promiseJavaSpawn(sArgs).then(paths=>paths[0])
  }

  /** produces png/jpg images in same folder as pdf
    @pdfPathOrBuffer - A buffer-of-pdf or pdf-file-path to work with
    @options{
      password      : The password to the PDF document.
      imageType=jpg : The image type to write to. Currently only jpg or png.
      outputPrefix  : Name of PDF document The prefix to the image file.
      startPage=1   : The first page to convert, one based.
      endPage=1     : The last page to convert, one based.
      nonSeq        : false Use the new non sequential parser.
      mode          : default=files, base64-array, buffer-array
    }
  */
  static pdfToImages(pdfPathOrBuffer, options){
    const fromFile = pdfPathOrBuffer.constructor==String
    let buffDelete = null
    const sArgs = ['-jar', ackPdfBoxJarPath, 'pdftoimage']

    let promise = Promise.resolve(pdfPathOrBuffer)
    let fileprefix = ''

    if(fromFile){
      fileprefix = pdfPathOrBuffer.split(path.sep).pop()
      sArgs.push( pdfPathOrBuffer )
    }else{
      promise = promise.then( buffer=>bufferToFile(buffer,'pdf','pdfToImages'))
      .then(buffPath=>{
        buffDelete = buffPath
        fileprefix = buffPath.split(path.sep).pop()
        sArgs.push(buffPath)
      })
    }

    options = options || {}
    let mode = options.mode ? options.mode : 'files'
    const imgSuffix = options.imageType||'jpg'

    delete options.mode

    promise = promise.then(()=>{
      opsOntoSpawnArgs(options, sArgs)
      return promiseJavaSpawn(sArgs)
    })
    .then( res=>trimJavaResponseToJson(res) )
    .then( res=>JSON.parse( res ) )

    switch(mode){
      case 'base64-array':
        promise = promise.then(imgPathArrayToBase64s)
        break;

      case 'buffer-array':
        promise = promise.then(imgPathArrayToBuffers)
        break;
    }

    function cleanup( input? ){
      if(buffDelete){
        fs.unlink(buffDelete,e=>e)
      }
      return input
    }

    return promise
    .catch(e=>{
      cleanup()
      throw e
    })
    .then(cleanup)
  }

  /** Insert a single image into a PDF or append multi images as individual pages
    @pdfPathOrBuffer - A buffer-of-pdf or pdf-file-path to work with
    @imagesPath - The file image(s) to append to document. Allows multiple image arguments, which is great for appending photos as pages. Allows base64 strings.
    @options{
      out    : The file to save the decrypted document to. If left blank then it will be the same as the input file || options
      page   : The page number where to drop image. Use -1 to append on a new page
      x      : The x cord where to drop image
      y      : The y cord where to drop image. Use -1 for top
      width  : default is image width. Accepts percent width
      height : default is image height  
    }
  */  
  static addImages(pdfPathOrBuffer, imgPathArray, options){
    let promise = Commander.addImages(pdfPathOrBuffer, imgPathArray, options)
    let command = {cleanup:()=>0}//foo
    
    return promise.then(command=>Processor.addImages(command))
  }

  static promiseDelete(path, ignoreFileNotFound){
    return new Promise(function(res,rej){
      fs.unlink(path,e=>{
        if(e){
          if(e.message && e.message.indexOf('ENOENT')>=0){
            return res()//file didn't exist
          }
          return rej(e)
        }
        
        res()
      })
    })
  }
}

let tempCounter = 0
function getTempFileName(ext, prefix){
  return '_' + (prefix||'tempBufferFile') + (++tempCounter) + '.'+ (ext||'pdf')
}

function getTempFilePath(ext, prefix){
  return path.join(process.cwd(), getTempFileName(ext, prefix)) 
}

const base64ImgDef = 'data:image/'
function isBase64Image(item){
  return item.substring(0, base64ImgDef.length)==base64ImgDef
}

function base64ToFile(item){
  const extDef = item.substring(base64ImgDef.length,base64ImgDef.length+4)
  const ext = extDef.split(';')[0]
  
  const base64 = item.replace(/^[^,]+,/, "");
  item = getTempFilePath(ext,'imgDefToPath')
  
  return new Promise(function(res,rej){      
    fs.writeFile(item, base64, 'base64', function(err){
      if(err)return rej(err)
      res(item)
    })
  })
}

function imgDefToPath(item){
  const isBase64 = isBase64Image(item)

  let promise = Promise.resolve(item)
  
  if(isBase64){
    promise = promise.then(item=>base64ToFile(item))
  }

  return promise
}

function imgPathArrayToBuffers(
  imgFiles
):Promise<any[]>{
  const promises = []
  imgFiles.forEach(imgPath=>{
    const promise = new Promise(function(res,rej){
      fs.readFile(imgPath,(err,data)=>{
        if(err)return rej(err)
        res(data)
      })
    })
    .then(data=>{
      fs.unlink(imgPath,e=>e)
      return data
    })
    promises.push( promise )
  })
  return Promise.all(promises)
}

function imgPathArrayToBase64s(imgFiles){
  return imgPathArrayToBuffers(imgFiles)
  .then( buffers=>buffers.map(bufferToString) )
}

function bufferToString(buffer){
  return buffer.toString('base64')
}

function bufferToFile(buffer, ext, prefix):Promise<string>{
  const buffTempPath = getTempFilePath((ext||'pdf'), (prefix||'bufferToFile'))
  return new Promise(function(res,rej){
    fs.writeFile(buffTempPath,buffer,(err)=>{
      if(err)return rej(err)
      res(buffTempPath)
    })
  })
}

function fileToBuffer(readPath, deleteFile){
  return new Promise(function(res,rej){
    fs.readFile(readPath,(err,buffer)=>{
      if(deleteFile){
        fs.unlink(readPath,e=>e)
      }
      
      if(err)return rej(err)
      
      res(buffer)
    })
  })
}

/** hack to remove JAVA verbose logging.
  TODO: we need to turn off verbose logging
  CAUSE: Sometimes we are getting Java extra message of "Picked up _JAVA_OPTIONS: -Xmx2048m -Xms512m"
*/
function trimJavaResponseToJson(string){
  if( string.search('Picked up _JAVA_OPTIONS')>=0 ){
    return string.replace(/^[^\[\{]*/,'')
  }

  return string
}